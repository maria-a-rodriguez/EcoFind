import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Home,
  Camera,
  MapPin,
  ClipboardList,
  Droplets,
  Trash2,
  Trash,
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
import RealMap from "./components/RealMap.jsx";
import { supabaseEnabled } from "./lib/supabaseClient.js";
import {
  fetchReports,
  insertReport,
  deleteReport,
  fetchJornadas,
  updateBolsasRemote,
  updateKgRemote,
  updateParticipantesRemote,
  finalizarJornadaRemote,
  addTestimonioRemote,
  signIn,
  signOut,
  getSession,
  subscribeAuth,
  createJornada,
  deleteJornada,
} from "./lib/db.js";

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

// Datos de ejemplo: SOLO se usan si Supabase no está conectado.
// Los contadores van en cero para no mostrar resultados que no han ocurrido.
const SEED_REPORTS = [
  { id: 1, category: "plastico", size: "moderado", lat: 4.6784, lng: -74.0428, time: "ejemplo", photo: null },
  { id: 2, category: "vertimiento", size: "extendido", lat: 4.6782, lng: -74.0425, time: "ejemplo", photo: null },
  { id: 3, category: "organico", size: "puntual", lat: 4.6759, lng: -74.0451, time: "ejemplo", photo: null },
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
    participantes: 0,
    kgTotal: 0,
    desglose: [
      { id: "plastico", label: "Plástico", key: "ochre", bolsas: 0, destino: "Planta de reciclaje aliada" },
      { id: "vertimiento", label: "Vertimiento", key: "water", bolsas: 0, destino: "Evidencia entregada a la CAR" },
      { id: "organico", label: "Orgánico", key: "lichen", bolsas: 0, destino: "Compostaje comunitario" },
    ],
    testimonios: [],
  },
  {
    id: 2,
    title: "Sendero Palacio — Chingaza (amortiguación)",
    date: "6 ago 2026",
    statusKey: "en_proceso",
    participantes: 0,
    kgTotal: 0,
    desglose: [
      { id: "plastico", label: "Plástico", key: "ochre", bolsas: 0, destino: "Planta de reciclaje aliada" },
      { id: "vertimiento", label: "Vertimiento", key: "water", bolsas: 0, destino: "Evidencia entregada a la CAR" },
      { id: "organico", label: "Orgánico", key: "lichen", bolsas: 0, destino: "Compostaje comunitario" },
    ],
    testimonios: [],
  },
];

// --- Reportes propios de este dispositivo ---
// El ciudadano no tiene cuenta, así que guardamos en el navegador los IDs de
// los reportes que se enviaron desde aquí. Solo esos muestran botón de borrar.
const MIS_REPORTES_KEY = "ecofind_mis_reportes";

function loadMisReportes() {
  try {
    const raw = localStorage.getItem(MIS_REPORTES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function saveMisReportes(ids) {
  try {
    localStorage.setItem(MIS_REPORTES_KEY, JSON.stringify(ids));
  } catch {
    /* si el navegador bloquea el almacenamiento, la app sigue funcionando */
  }
}

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

export default function ChingazaApp() {
  const [theme, setTheme] = useState("dark");
  const c = THEMES[theme];

  const [tab, setTab] = useState("inicio");
  const [reports, setReports] = useState(supabaseEnabled ? [] : SEED_REPORTS);
  const [jornadas, setJornadas] = useState(supabaseEnabled ? [] : INITIAL_JORNADAS);
  const [loadingData, setLoadingData] = useState(supabaseEnabled);
  const [expandedId, setExpandedId] = useState(null);
  const [testInput, setTestInput] = useState({ jornadaId: null, nombre: "", texto: "" });
  const [form, setForm] = useState({ category: null, size: null, photo: null, photoFile: null });
  const [gps, setGps] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef(null);

  // Reportes enviados desde este dispositivo
  const [misReportes, setMisReportes] = useState([]);
  const [verMisReportes, setVerMisReportes] = useState(false);
  const [verTodosReportes, setVerTodosReportes] = useState(false);
  const [reporteError, setReporteError] = useState("");

  // Sesión de organizador (solo ustedes pueden crear/editar/borrar jornadas)
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "", error: "" });
  const [showNewJornada, setShowNewJornada] = useState(false);
  const [newJornada, setNewJornada] = useState({ title: "", date: "" });
  const [jornadaError, setJornadaError] = useState("");

  useEffect(() => {
    setMisReportes(loadMisReportes());
  }, []);

  useEffect(() => {
    if (!supabaseEnabled) return;
    getSession().then((s) => setIsAdmin(!!s));
    const unsubscribe = subscribeAuth((s) => setIsAdmin(!!s));
    return unsubscribe;
  }, []);

  // Al abrir la app, si ya conectaste Supabase, trae los datos reales.
  // Si no, se queda con los datos de ejemplo para que la demo siga funcionando.
  useEffect(() => {
    if (!supabaseEnabled) return;
    (async () => {
      try {
        const [realReports, realJornadas] = await Promise.all([fetchReports(), fetchJornadas()]);
        if (realReports) setReports(realReports);
        if (realJornadas) setJornadas(realJornadas);
      } catch (e) {
        console.error("Error cargando datos de Supabase:", e);
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);

  const totalReportes = reports.length;
  const kgJornadas = jornadas.filter((j) => j.statusKey === "completada").reduce((a, j) => a + j.kgTotal, 0);
  const jornadasActivas = jornadas.filter((j) => j.statusKey !== "proxima");
  const jornadaEnCurso = jornadas.find((j) => j.statusKey === "en_proceso");
  const todosTestimonios = jornadas.flatMap((j) => j.testimonios.map((t) => ({ ...t, jornadaTitle: j.title, jornadaId: j.id })));

  const esMio = useCallback((r) => misReportes.includes(String(r.id)), [misReportes]);
  const misReportesVisibles = reports.filter(esMio);

  // Si la jornada seleccionada para testimonios desaparece (por ejemplo,
  // porque se borró), pasamos a la primera jornada disponible.
  useEffect(() => {
    if (!jornadasActivas.length) {
      if (testInput.jornadaId !== null) setTestInput((f) => ({ ...f, jornadaId: null }));
      return;
    }
    if (!jornadasActivas.some((j) => j.id === testInput.jornadaId)) {
      setTestInput((f) => ({ ...f, jornadaId: jornadasActivas[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornadas]);

  function captureGps() {
    setGpsError("");
    if (!navigator.geolocation) {
      setGpsError("Este navegador no puede entregar la ubicación. Escríbela manualmente al organizador.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) });
        setGpsLoading(false);
      },
      () => {
        setGpsLoading(false);
        setGpsError("No se pudo obtener la ubicación. Activa el permiso de ubicación del navegador e inténtalo otra vez.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // Punto aproximado para demostraciones en salón, cuando no hay GPS disponible.
  function usarUbicacionDemo() {
    const lat = 4.676 + (Math.random() - 0.5) * 0.01;
    const lng = -74.043 + (Math.random() - 0.5) * 0.01;
    setGps({ lat: lat.toFixed(5), lng: lng.toFixed(5) });
    setGpsError("");
  }

  // Achica la foto antes de enviarla: las funciones serverless rechazan
  // peticiones grandes y una foto de celular pesa varios MB.
  function resizeImage(file, maxSide = 1400, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const escala = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * escala) || img.width;
        const h = Math.round(img.height * escala) || img.height;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        canvas.toBlob(
          (blob) => (blob ? resolve({ blob, dataUrl }) : reject(new Error("no_se_pudo_comprimir"))),
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("no_se_pudo_leer_la_imagen"));
      };
      img.src = url;
    });
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, photo: URL.createObjectURL(file), photoFile: file }));
    try {
      const { blob, dataUrl } = await resizeImage(file);
      setForm((f) => ({ ...f, photo: dataUrl, photoFile: blob }));
    } catch (err) {
      // Si el navegador no puede comprimirla, se sube la foto original.
      console.error("No se pudo comprimir la foto:", err?.message || err);
    }
  }

  function chooseCategory(id) {
    setForm((f) => ({ ...f, category: id }));
  }

  function registrarComoMio(id) {
    const next = [...new Set([...misReportes, String(id)])];
    setMisReportes(next);
    saveMisReportes(next);
  }

  async function submitReport() {
    if (!form.category || !form.size || !gps) return;
    const lat = parseFloat(gps.lat);
    const lng = parseFloat(gps.lng);
    setSubmitted(true);

    if (supabaseEnabled) {
      try {
        const saved = await insertReport({ category: form.category, size: form.size, lat, lng, photoFile: form.photoFile });
        if (saved?.id) registrarComoMio(saved.id);
        const fresh = await fetchReports();
        if (fresh) setReports(fresh);
      } catch (err) {
        console.error("Error guardando el reporte:", err);
      }
    } else {
      const newId = Date.now();
      const newReport = { id: newId, category: form.category, size: form.size, lat, lng, time: "justo ahora", photo: form.photo };
      setReports((r) => [newReport, ...r]);
      registrarComoMio(newId);
    }

    setTimeout(() => {
      setSubmitted(false);
      setForm({ category: null, size: null, photo: null, photoFile: null });
      setGps(null);
      setGpsError("");
      setTab("inicio");
    }, 1400);
  }

  async function handleDeleteReport(reporte) {
    const mio = esMio(reporte);
    const ok = window.confirm(
      mio
        ? "¿Borrar este reporte? No se puede recuperar."
        : "Este reporte no se envió desde este dispositivo. Lo estás borrando como organizador y no se puede recuperar. ¿Continuar?"
    );
    if (!ok) return;
    setReporteError("");
    try {
      if (supabaseEnabled) await deleteReport(reporte.id);
      setReports((rs) => rs.filter((r) => String(r.id) !== String(reporte.id)));
      const next = misReportes.filter((x) => x !== String(reporte.id));
      setMisReportes(next);
      saveMisReportes(next);
    } catch (err) {
      console.error("Error borrando el reporte:", err);
      setReporteError("No se pudo borrar el reporte. Revisa los permisos de borrado en Supabase.");
    }
  }

  const catInfo = useCallback((id) => CATEGORY_DEFS.find((x) => x.id === id) || CATEGORY_DEFS[3], []);

  async function handleLogin() {
    const { error } = await signIn(loginForm.email, loginForm.password);
    if (error) {
      setLoginForm((f) => ({ ...f, error: "Correo o contraseña incorrectos" }));
    } else {
      setLoginForm({ email: "", password: "", error: "" });
      setShowLogin(false);
    }
  }

  async function handleLogout() {
    await signOut();
  }

  async function submitNewJornada() {
    if (!newJornada.title.trim() || !newJornada.date.trim()) return;
    setJornadaError("");
    try {
      await createJornada(newJornada.title.trim(), newJornada.date.trim());
      const fresh = await fetchJornadas();
      if (fresh) setJornadas(fresh);
      setNewJornada({ title: "", date: "" });
      setShowNewJornada(false);
    } catch (err) {
      console.error("Error creando la jornada:", err);
      setJornadaError("No se pudo crear la jornada. Revisa la conexión y vuelve a intentarlo.");
    }
  }

  async function handleDeleteJornada(j) {
    const ok = window.confirm(`¿Borrar la jornada "${j.title}"? También se borran sus bolsas registradas y sus testimonios.`);
    if (!ok) return;
    setJornadaError("");
    try {
      if (supabaseEnabled) await deleteJornada(j.id);
      setJornadas((js) => js.filter((x) => x.id !== j.id));
      if (expandedId === j.id) setExpandedId(null);
    } catch (err) {
      console.error("Error borrando la jornada:", err);
      setJornadaError("No se pudo borrar la jornada. Faltan las políticas de borrado en Supabase (jornadas, jornada_desglose y testimonios).");
    }
  }

  function updateBolsas(jornadaId, catId, delta) {
    let rowId = null;
    let nextValue = 0;
    setJornadas((js) =>
      js.map((j) => {
        if (j.id !== jornadaId) return j;
        return {
          ...j,
          desglose: j.desglose.map((d) => {
            if (d.id !== catId) return d;
            nextValue = Math.max(0, d.bolsas + delta);
            rowId = d.rowId;
            return { ...d, bolsas: nextValue };
          }),
        };
      })
    );
    if (supabaseEnabled && rowId) updateBolsasRemote(rowId, nextValue);
  }

  function updateKg(jornadaId, value) {
    const v = Math.max(0, Number(value) || 0);
    setJornadas((js) => js.map((j) => (j.id === jornadaId ? { ...j, kgTotal: v } : j)));
    if (supabaseEnabled) updateKgRemote(jornadaId, v);
  }

  function updateParticipantes(jornadaId, delta) {
    let next = 0;
    setJornadas((js) =>
      js.map((j) => {
        if (j.id !== jornadaId) return j;
        next = Math.max(0, j.participantes + delta);
        return { ...j, participantes: next };
      })
    );
    if (supabaseEnabled) updateParticipantesRemote(jornadaId, next);
  }

  function finalizarJornada(jornadaId) {
    setJornadas((js) => js.map((j) => (j.id === jornadaId ? { ...j, statusKey: "completada" } : j)));
    if (supabaseEnabled) finalizarJornadaRemote(jornadaId);
  }

  async function addTestimonio() {
    if (!testInput.texto.trim() || !testInput.jornadaId) return;
    const nombre = testInput.nombre.trim() || "Anónimo";
    const texto = testInput.texto.trim();
    const jornadaId = testInput.jornadaId;

    if (supabaseEnabled) {
      try {
        const saved = await addTestimonioRemote(jornadaId, nombre, texto);
        setJornadas((js) => js.map((j) => (j.id === jornadaId ? { ...j, testimonios: [...j.testimonios, { id: saved.id, nombre, texto }] } : j)));
      } catch (err) {
        console.error("Error guardando el testimonio:", err);
      }
    } else {
      setJornadas((js) => js.map((j) => (j.id === jornadaId ? { ...j, testimonios: [...j.testimonios, { id: Date.now(), nombre, texto }] } : j)));
    }
    setTestInput((f) => ({ ...f, nombre: "", texto: "" }));
  }

  const statusColor = (key) => (key === "completada" ? c.lichen : key === "en_proceso" ? c.water : c.ochre);
  const listaReportes = verMisReportes ? misReportesVisibles : verTodosReportes ? reports : reports.slice(0, 4);

  return (
    <div className="ecofind-page" style={{ fontFamily: "'IBM Plex Sans', sans-serif", background: c.bg }}>
      <style>{`
        html, body, #root { margin: 0; padding: 0; height: 100%; }
        .ecofind-page {
          min-height: 100dvh;
          width: 100%;
          display: flex;
          justify-content: center;
          box-sizing: border-box;
        }
        .ecofind-shell {
          width: 100%;
          max-width: 480px;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
        }
        @media (min-width: 640px) {
          .ecofind-page { justify-content: center; }
        }
      `}</style>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      />
      <div
        className="ecofind-shell"
        style={{
          background: c.bg,
          transition: "background 0.25s ease",
        }}
      >
        {/* status bar */}
        <div style={{ padding: "10px 20px 6px", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: c.textMuted }}>
          <span>EcoFind</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
          {tab === "inicio" && loadingData && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 60, color: c.textMuted, fontSize: 12 }}>
              <Sparkles size={20} color={c.lichen} />
              <span>Cargando datos reales…</span>
            </div>
          )}
          {tab === "inicio" && !loadingData && (
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
                {jornadaEnCurso ? (
                  <>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, color: c.textPrimary, fontWeight: 600 }}>{jornadaEnCurso.title}</div>
                    <div style={{ fontSize: 12, color: c.water, marginTop: 2 }}>Registrando recolección de bolsas en vivo</div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: c.textMuted }}>No hay ninguna jornada en curso. Los reportes ciudadanos se siguen recibiendo.</div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: c.textMuted, fontWeight: 600 }}>{verMisReportes ? "Mis reportes" : "Reportes recientes"}</span>
                {misReportesVisibles.length > 0 && (
                  <button
                    onClick={() => setVerMisReportes((v) => !v)}
                    style={{ fontSize: 10, color: c.water, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    {verMisReportes ? "Ver todos" : `Ver los míos (${misReportesVisibles.length})`}
                  </button>
                )}
              </div>

              {isAdmin && (
                <div style={{ fontSize: 10, color: c.textMuted, background: c.surfaceAlt, borderRadius: 8, padding: "7px 10px", marginBottom: 8 }}>
                  Sesión de organizador: puedes borrar cualquier reporte, incluidos los de prueba antiguos.
                </div>
              )}

              {reporteError && (
                <div style={{ fontSize: 10, color: c.warn, background: c.surfaceAlt, borderRadius: 8, padding: "7px 10px", marginBottom: 8 }}>{reporteError}</div>
              )}

              {listaReportes.length === 0 && (
                <div style={{ fontSize: 11, color: c.textMuted, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: 12 }}>
                  {verMisReportes ? "Todavía no has enviado reportes desde este dispositivo." : "Aún no hay reportes. El primero se registra desde la pestaña Reportar."}
                </div>
              )}

              {listaReportes.map((r) => {
                const cat = catInfo(r.category);
                const Icon = cat.icon;
                const mio = esMio(r);
                const puedeBorrar = mio || isAdmin;
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${c.border}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: c.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={16} color={c[cat.key]} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: c.textPrimary }}>{cat.label}</div>
                      <div style={{ fontSize: 10, color: c.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {Number(r.lat).toFixed(4)}, {Number(r.lng).toFixed(4)} · {r.time}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: c.textMuted, textTransform: "capitalize" }}>{r.size}</div>
                    {puedeBorrar && (
                      <button
                        onClick={() => handleDeleteReport(r)}
                        title={mio ? "Borrar mi reporte" : "Borrar reporte (organizador)"}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", opacity: mio ? 1 : 0.7 }}
                      >
                        <Trash size={14} color={c.warn} />
                      </button>
                    )}
                  </div>
                );
              })}

              {!verMisReportes && reports.length > 4 && (
                <button
                  onClick={() => setVerTodosReportes((v) => !v)}
                  style={{ width: "100%", marginTop: 10, padding: "8px", borderRadius: 8, border: `1px solid ${c.border}`, background: "none", color: c.water, fontSize: 11, cursor: "pointer" }}
                >
                  {verTodosReportes ? "Ver solo los recientes" : `Ver los ${reports.length} reportes`}
                </button>
              )}
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
                  <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
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
                    <div style={{ marginBottom: 18 }}>
                      <div onClick={captureGps} style={{ display: "flex", alignItems: "center", gap: 8, background: c.surface, border: `1px dashed ${c.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
                        <MapPin size={15} color={c.textMuted} />
                        <span style={{ fontSize: 12, color: c.textMuted }}>{gpsLoading ? "Buscando ubicación…" : "Capturar ubicación GPS"}</span>
                      </div>
                      {gpsError && (
                        <div style={{ marginTop: 8, background: c.surfaceAlt, borderRadius: 8, padding: "8px 10px" }}>
                          <div style={{ fontSize: 10, color: c.warn, marginBottom: 6 }}>{gpsError}</div>
                          <button onClick={usarUbicacionDemo} style={{ fontSize: 10, color: c.water, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                            Usar un punto aproximado (solo para demostraciones)
                          </button>
                        </div>
                      )}
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
              <div style={{ position: "relative", height: 340, borderRadius: 14, overflow: "hidden", border: `1px solid ${c.border}`, marginBottom: 12 }}>
                <RealMap reports={reports} catInfo={catInfo} colors={c} theme={theme} />
              </div>

              <div style={{ display: "flex", gap: 14, marginBottom: 10, flexWrap: "wrap" }}>
                {CATEGORY_DEFS.map((cat) => (
                  <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: c[cat.key] }} />
                    <span style={{ fontSize: 10, color: c.textMuted }}>{cat.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: c.textMuted, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: "8px 12px" }}>
                Mapa real (OpenStreetMap) · la mancha de calor muestra dónde se acumulan más reportes
              </div>
            </div>
          )}

          {tab === "jornadas" && (
            <div>
              {supabaseEnabled && (
                <div style={{ marginBottom: 14 }}>
                  {isAdmin ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: c.surfaceAlt, borderRadius: 10, padding: "8px 12px" }}>
                      <span style={{ fontSize: 11, color: c.lichen }}>Conectada como organizador</span>
                      <button onClick={handleLogout} style={{ fontSize: 11, color: c.textMuted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                        Salir
                      </button>
                    </div>
                  ) : showLogin ? (
                    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: 12 }}>
                      <input
                        placeholder="Correo"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.surfaceAlt, color: c.textPrimary, fontSize: 11, marginBottom: 6 }}
                      />
                      <input
                        placeholder="Contraseña"
                        type="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.surfaceAlt, color: c.textPrimary, fontSize: 11, marginBottom: 6 }}
                      />
                      {loginForm.error && <div style={{ fontSize: 10, color: c.warn, marginBottom: 6 }}>{loginForm.error}</div>}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={handleLogin} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: c.lichen, color: c.bg, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          Entrar
                        </button>
                        <button onClick={() => setShowLogin(false)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${c.border}`, background: "none", color: c.textMuted, fontSize: 12, cursor: "pointer" }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowLogin(true)}
                      style={{ fontSize: 11, color: c.textMuted, background: "none", border: `1px solid ${c.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
                    >
                      Acceso organizador
                    </button>
                  )}
                </div>
              )}

              {isAdmin && (
                <div style={{ marginBottom: 14 }}>
                  {showNewJornada ? (
                    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: 12 }}>
                      <input
                        placeholder="Nombre de la jornada"
                        value={newJornada.title}
                        onChange={(e) => setNewJornada((f) => ({ ...f, title: e.target.value }))}
                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.surfaceAlt, color: c.textPrimary, fontSize: 11, marginBottom: 6 }}
                      />
                      <input
                        placeholder="Fecha (ej: 20 sep 2026)"
                        value={newJornada.date}
                        onChange={(e) => setNewJornada((f) => ({ ...f, date: e.target.value }))}
                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.surfaceAlt, color: c.textPrimary, fontSize: 11, marginBottom: 8 }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={submitNewJornada} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: c.lichen, color: c.bg, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          Crear jornada
                        </button>
                        <button onClick={() => setShowNewJornada(false)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${c.border}`, background: "none", color: c.textMuted, fontSize: 12, cursor: "pointer" }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewJornada(true)}
                      style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px dashed ${c.border}`, background: "none", color: c.lichen, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      + Nueva jornada
                    </button>
                  )}
                </div>
              )}

              {jornadaError && (
                <div style={{ fontSize: 10, color: c.warn, background: c.surfaceAlt, borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>{jornadaError}</div>
              )}

              {jornadas.length === 0 && !loadingData && (
                <div style={{ fontSize: 11, color: c.textMuted, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: 12 }}>
                  No hay jornadas registradas. Inicia sesión como organizador para crear la primera.
                </div>
              )}

              {jornadas.map((j) => {
                const expanded = expandedId === j.id;
                const totalBolsas = j.desglose.reduce((a, d) => a + d.bolsas, 0);
                // El organizador puede corregir datos también en jornadas ya
                // finalizadas (por ejemplo, ajustar los kg que quedaron mal).
                const canEdit = isAdmin && j.statusKey !== "proxima";
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
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteJornada(j);
                            }}
                            title="Borrar jornada"
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}
                          >
                            <Trash size={15} color={c.warn} />
                          </button>
                        )}
                        <ChevronDown size={16} color={c.textMuted} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
                      </div>
                    </div>

                    {expanded && (
                      <div style={{ padding: "0 14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, color: c.textMuted, fontSize: 11 }}>
                            <Users size={13} />
                            <span>Asistencia</span>
                          </div>
                          {canEdit ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <button onClick={() => updateParticipantes(j.id, -1)} style={{ width: 24, height: 24, borderRadius: 12, border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary, cursor: "pointer" }}>–</button>
                              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: c.textPrimary, minWidth: 20, textAlign: "center" }}>{j.participantes}</span>
                              <button onClick={() => updateParticipantes(j.id, 1)} style={{ width: 24, height: 24, borderRadius: 12, border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary, cursor: "pointer" }}>+</button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: c.textPrimary, fontFamily: "'IBM Plex Mono', monospace" }}>{j.participantes}</span>
                          )}
                        </div>

                        {j.statusKey === "proxima" && (
                          <div style={{ fontSize: 11, color: c.textMuted, background: c.surfaceAlt, borderRadius: 10, padding: 12 }}>
                            Aún no inicia. Cuando comience, aquí se podrá registrar la recolección de bolsas por categoría y los kg totales.
                          </div>
                        )}

                        {j.statusKey !== "proxima" && (
                          <>
                            <div style={{ fontSize: 11, color: c.textMuted, fontWeight: 600, marginBottom: 8 }}>
                              {canEdit ? "Registrar recolección de bolsas" : "Recolección de bolsas"}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                              {j.desglose.map((d) => (
                                <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: c.surfaceAlt, borderRadius: 10, padding: "8px 10px" }}>
                                  <span style={{ fontSize: 12, color: c.textPrimary }}>{d.label}</span>
                                  {canEdit ? (
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
                            {canEdit ? (
                              <>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={j.kgTotal}
                                  onChange={(e) => updateKg(j.id, e.target.value)}
                                  style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, marginBottom: 6 }}
                                />
                                <div style={{ fontSize: 10, color: c.textMuted, marginBottom: 14 }}>Escribe 0 si la jornada todavía no se ha pesado.</div>
                              </>
                            ) : (
                              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, color: c.lichen, marginBottom: 14 }}>{j.kgTotal} kg</div>
                            )}

                            {canEdit && j.statusKey === "en_proceso" && (
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
                {jornadasActivas.length === 0 ? (
                  <div style={{ fontSize: 11, color: c.textMuted }}>Todavía no hay jornadas iniciadas para comentar.</div>
                ) : (
                  <>
                    <select
                      value={testInput.jornadaId ?? ""}
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
                  </>
                )}
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
