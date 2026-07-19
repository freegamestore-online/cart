import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        advancedChunks: {
          groups: [{ name: "babylon", test: /node_modules[\\/]@babylonjs/ }],
        },
      },
    },
  },
});
