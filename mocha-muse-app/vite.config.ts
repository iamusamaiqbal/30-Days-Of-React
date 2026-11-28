import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    sourcemap: false,
    assetsInlineLimit: 0, // images stay as files
    rollupOptions: {
      output: {
        // Firebase and React change rarely: separate files that browsers can keep cached between releases.
        manualChunks(id) {
          if (id.includes("node_modules/@firebase/auth") || id.includes("node_modules/firebase/auth")) return "firebase-auth";
          if (id.includes("node_modules/@firebase") || id.includes("node_modules/firebase")) return "firebase";
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) return "react";
        },
      },
    },
  },
});
