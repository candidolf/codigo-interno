// @lovable.dev/vite-tanstack-config already includes the TanStack Start, React,
// Tailwind and TypeScript path plugins. Adding them again would duplicate plugins.
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "vercel",
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
