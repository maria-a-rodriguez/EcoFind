import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "EcoFind",
        short_name: "EcoFind",
        description: "Reporte ciudadano de residuos y vertimientos cerca del páramo de Chingaza",
        theme_color: "#12201B",
        background_color: "#12201B",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // Cachea la app para que abra y funcione sin conexión;
        // los reportes se guardan localmente y se envían cuando vuelve la señal.
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
  ],
});
