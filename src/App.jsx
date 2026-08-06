import React, { useState, useRef, useMemo } from "react";
import {
  Home,
  Camera,
  MapPin,
  ClipboardList,
  Droplets,
  Trash2,
  Leaf,
  AlertTriangle,
  Check,
  ChevronDown,
  Users,
  Calendar,
  Sun,
  Moon,
  Sparkles,
  Recycle,
  MessageSquareText,
} from "lucide-react";

// ---- Design tokens ----
// Display: Space Grotesk · Body: IBM Plex Sans · Data/mono: IBM Plex Mono

const THEMES = {
  dark: {
    bg: "#12201B",
    frame: "#0A130F",
    surface: "#1C2C25",
    surfaceAlt: "#24362C",
    border: "#24362C",
    water: "#5FA8D3",
    lichen: "#9DBB6F",
    ochre: "#D9A441",
    warn: "#E08A6B",
    textPrimary: "#EDF3EA",
    textMuted: "#93A99A",
    navBg: "#0F1C17",
    contour: "#9DBB6F",
    mapBg: "#182720",
    mapPark: "#2C4A34",
    mapRoad: "#3A4A40",
    mapBlock: "#233830",
  },
  light: {
    bg: "#F2F5EE",
    frame: "#D9E0D2",
    surface: "#FFFFFF",
    surfaceAlt: "#E9EFE2",
    border: "#DCE4D4",
    water: "#2E7CA6",
    lichen: "#5C8A3D",
    ochre: "#B9821F",
    warn: "#C25B39",
    textPrimary: "#16241C",
    textMuted: "#5C6F63",
    navBg: "#E9EFE2",
    contour: "#5C8A3D",
    mapBg: "#EAF0E2",
    mapPark: "#CFE0BE",
    mapRoad: "#C7D0BE",
    mapBlock: "#DCE5D0",
  },
};

const CATEGORY_DEFS = [
  { id: "plastico", label: "Plástico de un solo uso", desc: "Botellas, bolsas, empaques", icon: Trash2, key: "ochre" },
  { id: "vertimiento", label: "Vertimiento en agua", desc: "Químicos o aguas residuales en ríos o quebradas", icon: Droplets, key: "water" },
  { id: "organico", label: "Residuo orgánico", desc: "Restos de comida u otro material biodegradable", icon: Leaf, key: "lichen" },
  { id: "otro", label: "Otro / incumplimiento", desc: "Cualquier otra afectación al páramo", icon: AlertTriangle, key: "warn" },
];

const SIZE_DEFS = [
  { id: "puntual", label: "Puntual" },
  { id: "moderado", label: "Moderado" },
  { id: "extendido", label: "Extendido" },
];
const SIZE_WEIGHT = { puntual: 1, moderado: 2, extendido: 3 };

const SEED_REPORTS = [
  { id: 1, category: "plastico", size: "moderado", lat: 4.6784, lng: -74.0428, time: "hace 2 días", photo: null },
  { id: 2, category: "plastico", size: "puntual", lat: 4.6786, lng: -74.043, time: "hace 2 días", photo: null },
  { id: 3, category: "vertimiento", size: "extendido", lat: 4.6782, lng: -74.0425, time: "hace 1 día", photo: null },
  { id: 4, category: "organico", size: "puntual", lat: 4.6759, lng: -74.0451, time: "hace 4 días", photo: null },
  { id: 5, category: "otro", size: "moderado", lat: 4.6771, lng: -74.0407, time: "hace 3 días", photo: null },
];

const STATUS_META = {
  completada: { label: "Completada" },
  en_proceso: { label: "En curso" },
  proxima: { label: "Próxima" },
};

const INITIAL_JORNADAS = [
  {
    id: 1,
    title: "Piloto — Parque El Virrey",
    date: "26 jul 2026",
    statusKey: "completada",
    participantes: 14,
    kgTotal: 46.5,
    desglose: [
      { id: "plastico", label: "Plástico", key: "ochre", bolsas: 9, destino: "Planta de reciclaje aliada" },
      { id: "vertimiento", label: "Vertimiento", key: "water", bolsas: 2, destino: "Evidencia entregada a la CAR" },
      { id: "organico", label: "Orgánico", key: "lichen", bolsas: 4, destino: "Compostaje comunitario" },
    ],
    testimonios: [{ id: 1, nombre: "Camila R.", texto: "Excelente jornada, muy organizada. Aprendimos bastante sobre el páramo mientras recogíamos." }],
  },
  {
    id: 2,
    title: "Sendero Palacio — Chingaza (amortiguación)",
    date: "6 ago 2026",
    statusKey: "en_proceso",
    participantes: 20,
    kgTotal: 0,
    desglose: [
      { id: "plastico", label: "Plástico", key: "ochre", bolsas: 0, destino: "Planta de reciclaje aliada" },
      { id: "vertimiento", label: "Vertimiento", key: "water", bolsas: 0, destino: "Evidencia entregada a la CAR" },
      { id: "organico", label: "Orgánico", key: "lichen", bolsas: 0, destino: "Compostaje comunitario" },
    ],
    testimonios: [],
  },
  {
    id: 3,
    title: "Zona de amortiguación — Chingaza (2ª fase)",
    date: "20 sep 2026",
    statusKey: "proxima",
    participantes: 0,
    kgTotal: 0,
    desglose: [],
    testimonios: [],
  },
];

function ContourBackdrop({ color, opacity = 0.12 }) {
  const lines = Array.from({ length: 7 });
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity }}>
      {lines.map((_, i) => {
        const y = 20 + i * 40;
        const wobble = 14 + (i % 3) * 6;
        const d = `M0,${y} C 80,${y - wobble} 140,${y + wobble} 200,${y} S 340,${y - wobble} 400,${y}`;
        return <path key={i} d={d} fill="none" stroke={color} strokeWidth="1" />;
      })}
    </svg>
  );
}

function useMapProjection(reports) {
  return useMemo(() => {
    const lats = reports.map((r) => r.lat);
    const lngs = reports.map((r) => r.lng);
    const minLat = Math.min(...lats) - 0.0015;
    const maxLat = Math.max(...lats) + 0.0015;
    const minLng = Math.min(...lngs) - 0.0015;
    const maxLng = Math.max(...lngs) + 0.0015;
    return (lat, lng) => {
      const x = 40 + ((lng - minLng) / (maxLng - minLng || 0.0001)) * 320;
      const y = 250 - ((lat - minLat) / (maxLat - minLat || 0.0001)) * 210;
      return { x, y };
    };
  }, [reports]);
}

export default function ChingazaApp() {
  const [theme, setTheme] = useState("dark");
  const c = THEMES[theme];

  const [tab, setTab] = useState("inicio");
  const [reports, setReports] = useState(SEED_REPORTS);
  const [jornadas, setJornadas] = useState(INITIAL_JORNADAS);
  const [expandedId, setExpandedId] = useState(2);
  const [testInput, setTestInput] = useState({ jornadaId: 2, nombre: "", texto: "" });
  const [form, setForm] = useState({ category: null, size: null, photo: null, analyzing: false, aiSuggested: false });
  const [gps, setGps] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef(null);
  const project = useMapProjection(reports);

  const totalReportes = reports.length;
  const kgJornadas = jornadas.filter((j) => j.statusKey === "completada").reduce((a, j) => a + j.kgTotal, 0);
  const jornadasActivas = jornadas.filter((j) => j.statusKey !== "proxima");
  const todosTestimonios = jornadas.flatMap((j) => j.testimonios.map((t) => ({ ...t, jornadaTitle: j.title, jornadaId: j.id })));

  function captureGps() {
    const lat = 4.676 + (Math.random() - 0.5) * 0.01;
    const lng = -74.043 + (Math.random() - 0.5) * 0.01;
    setGps({ lat: lat.toFixed(5), lng: lng.toFixed(5) });
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setForm((f) => ({ ...f, photo: url, analyzing: true, aiSuggested: false }));
    setTimeout(() => {
      const pick = CATEGORY_DEFS[Math.floor(Math.random() * CATEGORY_DEFS.length)];
      setForm((f) => ({ ...f, category: pick.id, analyzing: false, aiSuggested: true }));
    }, 1100);
  }

  function chooseCategory(id) {
    setForm((f) => ({ ...f, category: id, aiSuggested: false }));
  }

  function submitReport() {
    if (!form.category || !form.size || !gps) return;
    const newReport = { id: reports.length + 1, category: form.category, size: form.size, lat: parseFloat(gps.lat), lng: parseFloat(gps.lng), time: "justo ahora", photo: form.photo };
    setReports((r) => [newReport, ...r]);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setForm({ category: null, size: null, photo: null, analyzing: false, aiSuggested: false });
      setGps(null);
      setTab("inicio");
    }, 1400);
  }

  const catInfo = (id) => CATEGORY_DEFS.find((x) => x.id === id) || CATEGORY_DEFS[3];

  const heatBins = useMemo(() => {
    const cols = 4;
    const rows = 3;
    const cellW = 320 / cols;
    const cellH = 210 / rows;
    const bins = {};
    reports.forEach((r) => {
      const { x, y } = project(r.lat, r.lng);
      const col = Math.min(cols - 1, Math.max(0, Math.floor((x - 40) / cellW)));
      const row = Math.min(rows - 1, Math.max(0, Math.floor((y - 40) / cellH)));
      const key = `${col}-${row}`;
      const weight = SIZE_WEIGHT[r.size] || 1;
      if (!bins[key]) bins[key] = { col, row, weight: 0, count: 0 };
      bins[key].weight += weight;
      bins[key].count += 1;
    });
    return Object.values(bins).map((b) => ({ ...b, cx: 40 + b.col * cellW + cellW / 2, cy: 40 + b.row * cellH + cellH / 2 }));
  }, [reports, project]);

  function heatColor(weight) {
    if (weight >= 5) return c.warn;
    if (weight >= 3) return c.ochre;
    return c.lichen;
  }

  function updateBolsas(jornadaId, catId, delta) {
    setJornadas((js) => js.map((j) => (j.id === jornadaId ? { ...j, desglose: j.desglose.map((d) => (d.id === catId ? { ...d, bolsas: Math.max(0, d.bolsas + delta) } : d)) } : j)));
  }

  function updateKg(jornadaId, value) {
    const v = Math.max(0, Number(value) || 0);
    setJornadas((js) => js.map((j) => (j.id === jornadaId ? { ...j, kgTotal: v } : j)));
  }

  function finalizarJornada(jornadaId) {
    setJornadas((js) => js.map((j) => (j.id === jornadaId ? { ...j, statusKey: "completada" } : j)));
  }

  function addTestimonio() {
    if (!testInput.texto.trim()) return;
    setJornadas((js) =>
      js.map((j) =>
        j.id === testInput.jornadaId
          ? { ...j, testimonios: [...j.testimonios, { id: Date.now(), nombre: testInput.nombre.trim() || "Anónimo", texto: testInput.texto.trim() }] }
          : j
      )
    );
    setTestInput((f) => ({ ...f, nombre: "", texto: "" }));
  }

  const statusColor = (key) => (key === "completada" ? c.lichen : key === "en_proceso" ? c.water : c.ochre);

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", display: "flex", justifyContent: "center", padding: "20px 8px" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      />
      <div
        style={{
          width: 360,
          height: 700,
          background: c.bg,
          borderRadius: 34,
          border: `6px solid ${c.frame}`,
          boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          transition: "background 0.25s ease",
        }}
      >
        {/* status bar */}
        <div style={{ padding: "10px 20px 6px", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: c.textMuted }}>
          <span>EcoFind</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>9:41</span>
            <div
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Cambiar modo día / noche"
              style={{ width: 26, height: 26, borderRadius: 13, background: c.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: `1px solid ${c.border}` }}
            >
              {theme === "dark" ? <Moon size={13} color={c.lichen} /> : <Sun size={13} color={c.ochre} />}
            </div>
          </div>
        </div>

        {/* header */}
        <div style={{ padding: "6px 20px 14px", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <ContourBackdrop color={c.contour} opacity={theme === "dark" ? 0.16 : 0.14} />
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, fontWeight: 700, color: c.textPrimary }}>
              {tab === "inicio" && "Monitoreo Chingaza"}
              {tab === "reportar" && "Nuevo reporte"}
              {tab === "mapa" && "Mapa de reportes"}
              {tab === "jornadas" && "Jornadas"}
              {tab === "testimonios" && "Testimonios"}
            </div>
            <div style={{ fontSize: 11, color: c.lichen, marginTop: 2 }}>
              {tab === "inicio" && "Vigilancia ciudadana del sistema hídrico"}
              {tab === "reportar" && "Solo foto y ubicación · la recolección se hace en jornadas"}
              {tab === "mapa" && "Zonas con más reportes acumulados"}
              {tab === "jornadas" && "Registro de recolección de bolsas por jornada"}
              {tab === "testimonios" && "Cómo le pareció la iniciativa a quienes participaron"}
            </div>
          </div>
        </div>

        {/* content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
          {tab === "inicio" && (
            <div>
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <div style={{ background: c.surface, borderRadius: 14, padding: "14px 16px", flex: 1, border: `1px solid ${c.border}` }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 600, color: c.water }}>{totalReportes}</div>
                  <div style={{ fontSize: 11, color: c.textMuted, marginTop: 4 }}>Reportes totales</div>
                </div>
                <div style={{ background: c.surface, borderRadius: 14, padding: "14px 16px", flex: 1, border: `1px solid ${c.border}` }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 600, color: c.lichen }}>{kgJornadas.toFixed(1)}</div>
                  <div style={{ fontSize: 11, color: c.textMuted, marginTop: 4 }}>Kg recolectados</div>
                  <div style={{ fontSize: 10, color: c.lichen, marginTop: 2 }}>en jornadas finalizadas</div>
                </div>
              </div>

              <div style={{ background: c.surface, borderRadius: 14, padding: 16, border: `1px solid ${c.border}`, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Calendar size={16} color={c.water} />
                  <span style={{ fontSize: 12, color: c.textMuted }}>Jornada en curso ahora</span>
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, color: c.textPrimary, fontWeight: 600 }}>Sendero Palacio — Chingaza</div>
                <div style={{ fontSize: 12, color: c.water, marginTop: 2 }}>Registrando recolección de bolsas en vivo</div>
              </div>

              <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 8, fontWeight: 600 }}>Reportes recientes</div>
              {reports.slice(0, 4).map((r) => {
                const cat = catInfo(r.category);
                const Icon = cat.icon;
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${c.border}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: c.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={16} color={c[cat.key]} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: c.textPrimary }}>{cat.label}</div>
                      <div style={{ fontSize: 10, color: c.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {r.lat.toFixed(4)}, {r.lng.toFixed(4)} · {r.time}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: c.textMuted, textTransform: "capitalize" }}>{r.size}</div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "reportar" && (
            <div>
              {submitted ? (
                <div style={{ marginTop: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 26, background: c.lichen, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={26} color={c.bg} />
                  </div>
                  <div style={{ color: c.textPrimary, fontFamily: "'Space Grotesk', sans-serif" }}>Reporte enviado</div>
                  <div style={{ color: c.textMuted, fontSize: 11, textAlign: "center", padding: "0 30px" }}>La recolección real se coordina en la próxima jornada de esta zona</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 8, fontWeight: 600 }}>Foto</div>
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: "none" }} />
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{ height: 120, borderRadius: 12, border: `1.5px dashed ${c.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", background: form.photo ? `url(${form.photo}) center/cover` : c.surface, marginBottom: 10 }}
                  >
                    {!form.photo && (
                      <>
                        <Camera size={22} color={c.lichen} />
                        <span style={{ fontSize: 11, color: c.textMuted }}>Tomar o cargar foto</span>
                      </>
                    )}
                  </div>

                  {form.analyzing && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                      <Sparkles size={13} color={c.water} />
                      <span style={{ fontSize: 11, color: c.water }}>Analizando foto con IA…</span>
                    </div>
                  )}
                  {form.aiSuggested && !form.analyzing && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, background: c.surfaceAlt, borderRadius: 8, padding: "7px 10px" }}>
                      <Sparkles size={13} color={c.water} />
                      <span style={{ fontSize: 11, color: c.textPrimary }}>La IA sugirió esta categoría — corrígela abajo si no es correcta</span>
                    </div>
                  )}

                  <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 8, fontWeight: 600 }}>Categoría</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                    {CATEGORY_DEFS.map((cat) => {
                      const Icon = cat.icon;
                      const active = form.category === cat.id;
                      return (
                        <div
                          key={cat.id}
                          onClick={() => chooseCategory(cat.id)}
                          style={{ border: active ? `1.5px solid ${c[cat.key]}` : `1px solid ${c.border}`, background: active ? c.surfaceAlt : c.surface, borderRadius: 10, padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", textAlign: "center", position: "relative", minHeight: 84 }}
                        >
                          {active && form.aiSuggested && <Sparkles size={11} color={c.water} style={{ position: "absolute", top: 6, right: 6 }} />}
                          <Icon size={18} color={c[cat.key]} />
                          <span style={{ fontSize: 10, color: c.textPrimary, fontWeight: 600 }}>{cat.label}</span>
                          <span style={{ fontSize: 9, color: c.textMuted, lineHeight: 1.25 }}>{cat.desc}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 4, fontWeight: 600 }}>Extensión aproximada</div>
                  <div style={{ fontSize: 10, color: c.textMuted, marginBottom: 8 }}>Una estimación visual, no un peso — eso se mide en la jornada</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {SIZE_DEFS.map((s) => {
                      const active = form.size === s.id;
                      return (
                        <div key={s.id} onClick={() => setForm((f) => ({ ...f, size: s.id }))} style={{ flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 10, border: active ? `1.5px solid ${c.water}` : `1px solid ${c.border}`, background: active ? c.surfaceAlt : c.surface, color: c.textPrimary, fontSize: 11, cursor: "pointer" }}>
                          {s.label}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 8, fontWeight: 600 }}>Ubicación</div>
                  {gps ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 18 }}>
                      <MapPin size={15} color={c.water} />
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: c.textPrimary }}>{gps.lat}, {gps.lng}</span>
                    </div>
                  ) : (
                    <div onClick={captureGps} style={{ display: "flex", alignItems: "center", gap: 8, background: c.surface, border: `1px dashed ${c.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 18, cursor: "pointer" }}>
                      <MapPin size={15} color={c.textMuted} />
                      <span style={{ fontSize: 12, color: c.textMuted }}>Capturar ubicación GPS</span>
                    </div>
                  )}

                  <button
                    onClick={submitReport}
                    disabled={!form.category || !form.size || !gps}
                    style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: !form.category || !form.size || !gps ? c.surfaceAlt : c.lichen, color: !form.category || !form.size || !gps ? c.textMuted : c.bg, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, cursor: !form.category || !form.size || !gps ? "not-allowed" : "pointer" }}
                  >
                    Enviar reporte
                  </button>
                </>
              )}
            </div>
          )}

          {tab === "mapa" && (
            <div>
              <div style={{ position: "relative", height: 290, borderRadius: 14, overflow: "hidden", background: c.mapBg, border: `1px solid ${c.border}`, marginBottom: 12 }}>
                <svg viewBox="0 0 400 300" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                  <path d="M60,70 C 40,110 45,170 70,210 C 100,250 160,255 200,230 C 235,210 230,150 210,110 C 190,70 130,45 60,70 Z" fill={c.mapPark} />
                  <path d="M0,95 C 90,85 200,100 400,90" stroke={c.mapRoad} strokeWidth="6" fill="none" />
                  <path d="M0,205 C 100,215 220,195 400,210" stroke={c.mapRoad} strokeWidth="6" fill="none" />
                  <path d="M260,0 C 250,90 270,200 245,300" stroke={c.mapRoad} strokeWidth="5" fill="none" />
                  <path d="M55,255 C 90,220 80,160 110,120 C 130,90 150,70 170,45" stroke={c.water} strokeWidth="3" fill="none" opacity="0.75" />
                  {[[285, 40, 34, 22], [330, 75, 26, 26], [295, 130, 30, 20], [340, 165, 24, 30], [300, 220, 32, 22], [20, 30, 24, 18]].map(([x, y, w, h], i) => (
                    <rect key={i} x={x} y={y} width={w} height={h} rx="3" fill={c.mapBlock} />
                  ))}
                  {heatBins.map((b, i) => (
                    <circle key={i} cx={b.cx} cy={b.cy} r={26 + b.weight * 9} fill={heatColor(b.weight)} opacity={0.22 + Math.min(b.weight, 6) * 0.05} />
                  ))}
                  {reports.map((r) => {
                    const { x, y } = project(r.lat, r.lng);
                    const cat = catInfo(r.category);
                    return <circle key={r.id} cx={x} cy={y} r="7" fill={c[cat.key]} stroke={theme === "dark" ? c.bg : "#fff"} strokeWidth="2" />;
                  })}
                </svg>
                <div style={{ position: "absolute", bottom: 8, left: 10, fontSize: 9, color: c.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>mapa ilustrativo · Parque El Virrey</div>
              </div>

              <div style={{ display: "flex", gap: 14, marginBottom: 10, flexWrap: "wrap" }}>
                {CATEGORY_DEFS.map((cat) => (
                  <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: c[cat.key] }} />
                    <span style={{ fontSize: 10, color: c.textMuted }}>{cat.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: "8px 12px" }}>
                <span style={{ fontSize: 10, color: c.textMuted }}>Concentración de reportes:</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: c.lichen }} />
                  <span style={{ fontSize: 9, color: c.textMuted }}>Baja</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: c.ochre }} />
                  <span style={{ fontSize: 9, color: c.textMuted }}>Media</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: c.warn }} />
                  <span style={{ fontSize: 9, color: c.textMuted }}>Alta</span>
                </div>
              </div>
            </div>
          )}

          {tab === "jornadas" && (
            <div>
              {jornadas.map((j) => {
                const expanded = expandedId === j.id;
                const totalBolsas = j.desglose.reduce((a, d) => a + d.bolsas, 0);
                return (
                  <div key={j.id} style={{ background: c.surface, borderRadius: 14, border: `1px solid ${c.border}`, marginBottom: 12, overflow: "hidden" }}>
                    <div
                      onClick={() => setExpandedId(expanded ? null : j.id)}
                      style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }}
                    >
                      <div>
                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, color: c.textPrimary, fontWeight: 600 }}>{j.title}</div>
                        <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{j.date}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                          <div style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, background: `${statusColor(j.statusKey)}22`, color: statusColor(j.statusKey) }}>
                            {STATUS_META[j.statusKey].label}
                          </div>
                          {j.statusKey === "proxima" && <span style={{ fontSize: 10, color: c.textMuted }}>Requiere autorización PNN</span>}
                        </div>
                      </div>
                      <ChevronDown size={16} color={c.textMuted} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
                    </div>

                    {expanded && (
                      <div style={{ padding: "0 14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, color: c.textMuted, fontSize: 11 }}>
                          <Users size={13} />
                          <span>{j.participantes} participantes</span>
                        </div>

                        {j.statusKey === "proxima" && (
                          <div style={{ fontSize: 11, color: c.textMuted, background: c.surfaceAlt, borderRadius: 10, padding: 12 }}>
                            Aún no inicia. Cuando comience, aquí se podrá registrar la recolección de bolsas por categoría y los kg totales.
                          </div>
                        )}

                        {j.statusKey !== "proxima" && (
                          <>
                            <div style={{ fontSize: 11, color: c.textMuted, fontWeight: 600, marginBottom: 8 }}>
                              {j.statusKey === "en_proceso" ? "Registrar recolección de bolsas" : "Recolección de bolsas"}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                              {j.desglose.map((d) => (
                                <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: c.surfaceAlt, borderRadius: 10, padding: "8px 10px" }}>
                                  <span style={{ fontSize: 12, color: c.textPrimary }}>{d.label}</span>
                                  {j.statusKey === "en_proceso" ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <button onClick={() => updateBolsas(j.id, d.id, -1)} style={{ width: 24, height: 24, borderRadius: 12, border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary, cursor: "pointer" }}>–</button>
                                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: c.textPrimary, minWidth: 14, textAlign: "center" }}>{d.bolsas}</span>
                                      <button onClick={() => updateBolsas(j.id, d.id, 1)} style={{ width: 24, height: 24, borderRadius: 12, border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary, cursor: "pointer" }}>+</button>
                                    </div>
                                  ) : (
                                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: c[d.key] }}>{d.bolsas} bolsas</span>
                                  )}
                                </div>
                              ))}
                            </div>

                            <div style={{ fontSize: 11, color: c.textMuted, fontWeight: 600, marginBottom: 6 }}>Kg totales pesados</div>
                            {j.statusKey === "en_proceso" ? (
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={j.kgTotal}
                                onChange={(e) => updateKg(j.id, e.target.value)}
                                style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, marginBottom: 14 }}
                              />
                            ) : (
                              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, color: c.lichen, marginBottom: 14 }}>{j.kgTotal} kg</div>
                            )}

                            {j.statusKey === "en_proceso" && (
                              <button
                                onClick={() => finalizarJornada(j.id)}
                                disabled={totalBolsas === 0}
                                style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: totalBolsas === 0 ? c.surfaceAlt : c.water, color: totalBolsas === 0 ? c.textMuted : c.bg, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, cursor: totalBolsas === 0 ? "not-allowed" : "pointer" }}
                              >
                                Finalizar jornada
                              </button>
                            )}

                            {j.statusKey === "completada" && (
                              <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 10 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                                  <Recycle size={12} color={c.textMuted} />
                                  <span style={{ fontSize: 10, color: c.textMuted, fontWeight: 600 }}>Destino final</span>
                                </div>
                                {j.desglose.map((d) => (
                                  <div key={d.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: c.textMuted, padding: "2px 0" }}>
                                    <span>{d.label}</span>
                                    <span style={{ color: c.textPrimary }}>{d.destino}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === "testimonios" && (
            <div>
              <div style={{ background: c.surface, borderRadius: 14, padding: 14, border: `1px solid ${c.border}`, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: c.textMuted, fontWeight: 600, marginBottom: 8 }}>Dejar un testimonio</div>
                <select
                  value={testInput.jornadaId}
                  onChange={(e) => setTestInput((f) => ({ ...f, jornadaId: Number(e.target.value) }))}
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.surfaceAlt, color: c.textPrimary, fontSize: 11, marginBottom: 8 }}
                >
                  {jornadasActivas.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
                <input
                  placeholder="Tu nombre (opcional)"
                  value={testInput.nombre}
                  onChange={(e) => setTestInput((f) => ({ ...f, nombre: e.target.value }))}
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.surfaceAlt, color: c.textPrimary, fontSize: 11, marginBottom: 8 }}
                />
                <textarea
                  placeholder="¿Cómo te pareció la jornada o la iniciativa?"
                  value={testInput.texto}
                  onChange={(e) => setTestInput((f) => ({ ...f, texto: e.target.value }))}
                  rows={3}
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.surfaceAlt, color: c.textPrimary, fontSize: 11, marginBottom: 10, resize: "none", fontFamily: "'IBM Plex Sans', sans-serif" }}
                />
                <button
                  onClick={addTestimonio}
                  disabled={!testInput.texto.trim()}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: !testInput.texto.trim() ? c.surfaceAlt : c.lichen, color: !testInput.texto.trim() ? c.textMuted : c.bg, fontSize: 12, fontWeight: 600, cursor: !testInput.texto.trim() ? "not-allowed" : "pointer" }}
                >
                  Publicar testimonio
                </button>
              </div>

              <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 8, fontWeight: 600 }}>{todosTestimonios.length} testimonios</div>
              {todosTestimonios.map((t) => (
                <div key={t.id} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: c.water, marginBottom: 4 }}>{t.jornadaTitle}</div>
                  <div style={{ fontSize: 11, color: c.lichen, fontWeight: 600, marginBottom: 3 }}>{t.nombre}</div>
                  <div style={{ fontSize: 11, color: c.textPrimary, lineHeight: 1.4 }}>{t.texto}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* bottom nav */}
        <div style={{ display: "flex", borderTop: `1px solid ${c.border}`, background: c.navBg, padding: "8px 4px 12px" }}>
          {[
            { id: "inicio", label: "Inicio", icon: Home },
            { id: "reportar", label: "Reportar", icon: Camera },
            { id: "mapa", label: "Mapa", icon: MapPin },
            { id: "jornadas", label: "Jornadas", icon: ClipboardList },
            { id: "testimonios", label: "Testim.", icon: MessageSquareText },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <div key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", padding: "4px 0" }}>
                <Icon size={17} color={active ? c.lichen : c.textMuted} />
                <span style={{ fontSize: 8.5, color: active ? c.lichen : c.textMuted }}>{t.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
