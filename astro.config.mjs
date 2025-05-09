// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import netlify from "@astrojs/netlify";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ["@supabase/supabase-js"],
    },
    define: {
      "process.env.SUPABASE_URL": JSON.stringify(process.env.PUBLIC_SUPABASE_URL),
      "process.env.SUPABASE_KEY": JSON.stringify(process.env.PUBLIC_SUPABASE_KEY),
    },
  },
  adapter: netlify({
    edgeMiddleware: false,
    cacheOnDemandPages: false,
    includeFiles: ["./node_modules/@supabase/supabase-js/**/*"],
  }),
  experimental: { session: true },
});
