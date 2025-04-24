import { sequence } from "astro:middleware";
import { rateLimiter } from "./middleware/rate-limiter";

// Define middleware sequence
export const onRequest = sequence(
  rateLimiter
  // Add more middleware here if needed
);
