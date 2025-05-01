import { sequence } from "astro:middleware";
import { rateLimiter } from "./middleware/rate-limiter";
import { authMiddleware } from "./middleware/auth";
import { protectedRoutesMiddleware } from "./middleware/protected-routes";

// Define middleware sequence
export const onRequest = sequence(
  rateLimiter,
  authMiddleware,
  protectedRoutesMiddleware
  // Add more middleware here if needed
);
