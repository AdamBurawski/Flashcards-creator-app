// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import netlify from "@astrojs/netlify/functions";

// Lepsze wsparcie dla zmiennych środowiskowych
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY || "";

// https://astro.build/config
export default defineConfig({
  site: "https://flashcards-creator.netlify.app",
  output: "server",
  integrations: [
    react({
      include: ["**/*.tsx"],
      experimentalReactChildren: false, // Wyłączamy eksperymentalne funkcje
    }),
    sitemap(),
  ],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ["@supabase/supabase-js"],
    },
    define: {
      "process.env.PUBLIC_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "process.env.PUBLIC_SUPABASE_KEY": JSON.stringify(supabaseKey),
      "process.env.SUPABASE_URL": JSON.stringify(supabaseUrl),
      "process.env.SUPABASE_KEY": JSON.stringify(supabaseKey),
    },
    build: {
      minify: true,
      sourcemap: true, // Dodajemy sourcemaps dla lepszego debugowania
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom"],
          },
        },
      },
      chunkSizeWarningLimit: 1000, // Zwiększamy limit rozmiaru chunków
    },
    optimizeDeps: {
      include: ["react", "react-dom"], // Jawnie włączamy React do optymalizacji
    },
  },
  adapter: netlify({
    edgeMiddleware: false, // Wyłączenie edge middleware, aby używać standardowych funkcji Node.js
  }),
  experimental: { session: true },
});
