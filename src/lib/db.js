import { supabase, supabaseEnabled } from "./supabaseClient.js";

export async function fetchReports() {
  if (!supabaseEnabled) return null; // null = "usa los datos locales de ejemplo"
  const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    category: r.category,
    size: r.size,
    lat: r.lat,
    lng: r.lng,
    localidad: r.localidad,
    photo: r.photo_url,
    createdAt: r.created_at,
  }));
}

export async function insertReport({ category, size, localidad, lat, lng, photoFile }) {
  if (!supabaseEnabled) return null;
  let photo_url = null;
  if (photoFile) {
    const path = `report-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("photos")
      .upload(path, photoFile, { contentType: photoFile.type || "image/jpeg" });
    if (!upErr) {
      const { data } = supabase.storage.from("photos").getPublicUrl(path);
      photo_url = data.publicUrl;
    }
  }
  const { data, error } = await supabase
    .from("reports")
    .insert({ category, size, localidad, lat, lng, photo_url })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Borrar un reporte. La app solo ofrece este botón en los reportes que se
// enviaron desde este mismo dispositivo (ver "mis reportes" en App.jsx).
export async function deleteReport(reportId) {
  if (!supabaseEnabled) return;
  const { error } = await supabase.from("reports").delete().eq("id", reportId);
  if (error) throw error;
}

export async function fetchJornadas() {
  if (!supabaseEnabled) return null;
  const { data: jornadas, error } = await supabase.from("jornadas").select("*").order("id");
  if (error) throw error;
  const { data: desglose } = await supabase.from("jornada_desglose").select("*");
  const { data: testimonios } = await supabase.from("testimonios").select("*").order("created_at");
  return jornadas.map((j) => ({
    id: j.id,
    title: j.title,
    date: j.date,
    hora: j.hora || "",
    lugar: j.lugar || "",
    statusKey: j.status_key,
    participantes: j.participantes,
    kgTotal: Number(j.kg_total),
    desglose: (desglose || [])
      .filter((d) => d.jornada_id === j.id)
      .map((d) => ({ id: d.category_id, label: d.label, key: d.color_key, bolsas: d.bolsas, destino: d.destino, rowId: d.id })),
    testimonios: (testimonios || []).filter((t) => t.jornada_id === j.id).map((t) => ({ id: t.id, nombre: t.nombre, texto: t.texto })),
  }));
}

export async function updateBolsasRemote(rowId, bolsas) {
  if (!supabaseEnabled) return;
  await supabase.from("jornada_desglose").update({ bolsas }).eq("id", rowId);
}

export async function updateDestinoRemote(rowId, destino) {
  if (!supabaseEnabled) return;
  await supabase.from("jornada_desglose").update({ destino }).eq("id", rowId);
}

export async function updateKgRemote(jornadaId, kgTotal) {
  if (!supabaseEnabled) return;
  await supabase.from("jornadas").update({ kg_total: kgTotal }).eq("id", jornadaId);
}

export async function updateParticipantesRemote(jornadaId, participantes) {
  if (!supabaseEnabled) return;
  await supabase.from("jornadas").update({ participantes }).eq("id", jornadaId);
}

const CATEGORIAS_BASE = [
  { category_id: "solido", label: "Residuo sólido", color_key: "ochre", destino: "Recicladores de oficio autorizados" },
  { category_id: "vertimiento", label: "Vertimiento", color_key: "water", destino: "Evidencia entregada a la CAR" },
  { category_id: "escombros", label: "Escombros", color_key: "concrete", destino: "Escombrera autorizada" },
];

export async function updateJornadaDatosRemote(jornadaId, { title, date, hora, lugar }) {
  if (!supabaseEnabled) return;
  const { error } = await supabase.from("jornadas").update({ title, date, hora, lugar }).eq("id", jornadaId);
  if (error) throw error;
}

export async function iniciarJornadaRemote(jornadaId) {
  if (!supabaseEnabled) return;
  await supabase.from("jornadas").update({ status_key: "en_proceso" }).eq("id", jornadaId);

  // Si la jornada se creó sin categorías (por ejemplo, las de ejemplo del
  // inicio), se las agregamos para poder contar bolsas.
  const { data: existentes } = await supabase.from("jornada_desglose").select("id").eq("jornada_id", jornadaId);
  if (!existentes || existentes.length === 0) {
    await supabase.from("jornada_desglose").insert(CATEGORIAS_BASE.map((cat) => ({ jornada_id: jornadaId, bolsas: 0, ...cat })));
  }
}

export async function finalizarJornadaRemote(jornadaId) {
  if (!supabaseEnabled) return;
  await supabase.from("jornadas").update({ status_key: "completada" }).eq("id", jornadaId);
}

export async function addTestimonioRemote(jornadaId, nombre, texto) {
  if (!supabaseEnabled) return null;
  const { data, error } = await supabase
    .from("testimonios")
    .insert({ jornada_id: jornadaId, nombre, texto })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Clasificación de imagen por IA real (llama a la función serverless /api/classify)
export async function classifyPhoto(base64Image) {
  const res = await fetch("/api/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64Image }),
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* la respuesta no era JSON (por ejemplo, un 404 de Vercel en HTML) */
  }

  if (!res.ok) {
    // El detalle sirve para depurar desde la consola del navegador.
    throw new Error(payload?.detail || payload?.error || `La función respondió ${res.status}`);
  }
  return payload; // { category, confidence, detalle }
}

// --- Acceso de organizador (solo ustedes, no los ciudadanos) ---

export async function signIn(email, password) {
  if (!supabaseEnabled) return { error: "supabase_disabled" };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

export async function signOut() {
  if (!supabaseEnabled) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabaseEnabled) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function subscribeAuth(callback) {
  if (!supabaseEnabled) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function createJornada(title, date, hora = "", lugar = "") {
  if (!supabaseEnabled) return null;
  const { data: jornada, error } = await supabase
    .from("jornadas")
    .insert({ title, date, hora, lugar, status_key: "proxima", participantes: 0, kg_total: 0 })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("jornada_desglose").insert(CATEGORIAS_BASE.map((cat) => ({ jornada_id: jornada.id, bolsas: 0, ...cat })));
  return jornada;
}

// Borrar una jornada completa. Se borran primero los datos que dependen de
// ella (testimonios y desglose de bolsas) y al final la jornada.
export async function deleteJornada(jornadaId) {
  if (!supabaseEnabled) return;

  const { error: errTest } = await supabase.from("testimonios").delete().eq("jornada_id", jornadaId);
  if (errTest) throw errTest;

  const { error: errDes } = await supabase.from("jornada_desglose").delete().eq("jornada_id", jornadaId);
  if (errDes) throw errDes;

  const { error } = await supabase.from("jornadas").delete().eq("id", jornadaId);
  if (error) throw error;
}
