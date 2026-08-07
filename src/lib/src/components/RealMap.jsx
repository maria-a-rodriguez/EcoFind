import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

const SIZE_WEIGHT = { puntual: 1, moderado: 2, extendido: 3 };

export default function RealMap({ reports, catInfo, colors, theme }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);
  const heatRef = useRef(null);

  // Crea el mapa una sola vez
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const center = reports.length
      ? [reports[0].lat, reports[0].lng]
      : [4.6768, -74.0431]; // Parque El Virrey, Bogotá

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(center, 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; colaboradores de OpenStreetMap",
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redibuja marcadores y capa de calor cuando cambian los reportes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    layerGroupRef.current.clearLayers();
    if (heatRef.current) {
      map.removeLayer(heatRef.current);
      heatRef.current = null;
    }

    reports.forEach((r) => {
      const cat = catInfo(r.category);
      L.circleMarker([r.lat, r.lng], {
        radius: 8,
        color: theme === "dark" ? "#12201B" : "#ffffff",
        weight: 2,
        fillColor: colors[cat.key],
        fillOpacity: 0.95,
      })
        .bindPopup(`<b>${cat.label}</b><br/>${r.size || ""}`)
        .addTo(layerGroupRef.current);
    });

    if (reports.length) {
      const heatPoints = reports.map((r) => [r.lat, r.lng, SIZE_WEIGHT[r.size] || 1]);
      heatRef.current = L.heatLayer(heatPoints, { radius: 45, blur: 35, maxZoom: 17 }).addTo(map);
    }
  }, [reports, catInfo, colors, theme]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
