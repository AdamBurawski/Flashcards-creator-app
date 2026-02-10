import { defineMiddleware } from "astro:middleware";

interface RateLimitConfig {
  windowMs: number; // The time window in milliseconds
  maxRequests: number; // Maximum number of requests allowed in the time window
  message: string; // Error message to return when rate limited
}

// Default configurations for different endpoints
const defaultConfigs: Record<string, RateLimitConfig> = {
  // More restrictive limits for creation endpoints
  "POST:/api/flashcards": {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    message: "Too many flashcards creation requests, please try again later.",
  },
  "POST:/api/generations": {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 AI generation requests per minute
    message: "Too many generation requests, please try again later.",
  },
  // More permissive limits for read operations
  "GET:/api/flashcards": {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 reads per minute
    message: "Too many read requests, please try again later.",
  },
  // Default fallback for any route not explicitly defined
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: "Too many requests, please try again later.",
  },
};

// In-memory store for rate limiting
// Note: This will reset on server restart. For production, consider using Redis or another persistent store
const inMemoryStore: Record<string, { count: number; resetTime: number }> = {};

/**
 * Checks if a request exceeds the rate limit
 * @param key The unique key for this rate limit (usually IP + route)
 * @param config Rate limit configuration for this route
 * @returns Object indicating if the request is allowed and remaining quota
 */
async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = Date.now();

  // Use in-memory store for rate limiting
  if (!inMemoryStore[key] || inMemoryStore[key].resetTime < now) {
    // Initialize or reset the counter
    inMemoryStore[key] = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: new Date(now + config.windowMs) };
  }

  // Increment the counter
  inMemoryStore[key].count += 1;

  // Check if over limit
  const allowed = inMemoryStore[key].count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - inMemoryStore[key].count);
  const resetAt = new Date(inMemoryStore[key].resetTime);

  return { allowed, remaining, resetAt };
}

/**
 * Gets the client IP address from the request
 */
function getClientIp(request: Request): string {
  // Check for forwarded IP (when behind a proxy/load balancer)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // Fallback to a default IP if we can't determine the real one
  return "127.0.0.1";
}

/**
 * Determines the rate limit key from the request
 */
function getRateLimitKey(request: Request): string {
  const ip = getClientIp(request);
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;

  // Use method + path as the rate limit scope
  return `${ip}:${method}:${path}`;
}

/**
 * Gets the appropriate rate limit config for the request
 */
function getConfigForRequest(request: Request): RateLimitConfig {
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;

  // Look up specific config for this method + path
  const key = `${method}:${path}`;
  return defaultConfigs[key] || defaultConfigs.default;
}

/**
 * Rate limiting middleware
 */
export const rateLimiter = defineMiddleware(async ({ request }, next) => {
  // Skip rate limiting for non-API requests
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) {
    return await next();
  }

  // Get rate limit config for this request
  const config = getConfigForRequest(request);

  // Generate a unique key for this client + route
  const key = getRateLimitKey(request);

  // Check rate limit
  const { allowed, remaining, resetAt } = await checkRateLimit(key, config);

  if (!allowed) {
    // Return rate limit error
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: config.message,
        resetAt: resetAt.toISOString(),
      }),
      {
        status: 429, // Too Many Requests
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": config.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.floor(resetAt.getTime() / 1000).toString(),
          "Retry-After": Math.ceil((resetAt.getTime() - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // Process the request normally
  const response = await next();

  // Add rate limit headers to the response
  const newResponse = new Response(response.body, response);
  newResponse.headers.set("X-RateLimit-Limit", config.maxRequests.toString());
  newResponse.headers.set("X-RateLimit-Remaining", remaining.toString());
  newResponse.headers.set("X-RateLimit-Reset", Math.floor(resetAt.getTime() / 1000).toString());

  return newResponse;
});
