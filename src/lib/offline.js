// EcoFind — cola de reportes pendientes.
// Cuando no hay señal (típico en las zonas de amortiguación), el reporte se
// guarda aquí, dentro del celular, y se envía cuando vuelve la conexión.
//
// Usamos IndexedDB y no localStorage porque IndexedDB guarda la foto como
// archivo binario. En localStorage habría que convertirla a texto, ocupa un
// tercio más y el navegador solo permite unos 5 MB en total: con tres o
// cuatro fotos ya se llenaría.

const DB_NAME = "ecofind";
const STORE = "pendientes";
const disponible = typeof indexedDB !== "undefined";

function abrir() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function transaccion(modo, fn) {
  if (!disponible) return null;
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, modo);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => {
      db.close();
      resolve(req ? req.result : null);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}

export async function addPendiente(reporte) {
  return transaccion("readwrite", (store) => store.add({ ...reporte, createdAt: Date.now() }));
}

export async function listPendientes() {
  try {
    const res = await transaccion("readonly", (store) => store.getAll());
    return res || [];
  } catch (err) {
    console.error("No se pudo leer la cola de pendientes:", err);
    return [];
  }
}

export async function deletePendiente(id) {
  return transaccion("readwrite", (store) => store.delete(id));
}
