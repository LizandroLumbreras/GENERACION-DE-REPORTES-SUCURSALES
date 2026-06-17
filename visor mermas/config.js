// ===============================
// FIREBASE CONFIG
// ===============================

const firebaseConfig = {
  apiKey: "AIzaSyCK5nb6u2CGRJ8AB1aPlRn54b97bdeAFeM",
  authDomain: "inventariopv-643f1.firebaseapp.com",
  projectId: "inventariopv-643f1",
  storageBucket: "inventariopv-643f1.firebasestorage.app",
  messagingSenderId: "96242533231",
  appId: "1:96242533231:web:aae75a18fbaf9840529e9a"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();


// ===============================
// CONFIGURACION APP
// ===============================

const APP_NAME = "Dashboard Mermas y Devoluciones";
const APP_VERSION = "1.0.1";


// ===============================
// COLECCIONES SOPORTADAS
// ===============================

const COLECCIONES_MERMA = [
  "MERMA",
  "MERMAS",
  "merma",
  "mermas"
];

const COLECCIONES_DEVOLUCION = [
  "DEVOLUCION",
  "DEVOLUCIONES",
  "devolucion",
  "devoluciones"
];


// ===============================
// FORMATOS
// ===============================

const money = valor =>
  Number(valor || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN"
  });

const number = valor =>
  Number(valor || 0).toLocaleString("es-MX");

function normalizarFecha(fecha) {
  if (!fecha) return null;

  // Firebase Timestamp
  if (fecha && typeof fecha.toDate === "function") {
    return fecha.toDate();
  }

  // Timestamp serializado: { seconds, nanoseconds }
  if (fecha && typeof fecha.seconds === "number") {
    return new Date(fecha.seconds * 1000);
  }

  const d = new Date(fecha);

  return isNaN(d.getTime()) ? null : d;
}

function fechaCorta(fecha) {
  const d = normalizarFecha(fecha);

  if (!d) {
    return fecha || "";
  }

  return d.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function fechaISO(fecha) {
  const d = normalizarFecha(fecha);

  if (!d) return "";

  return d.toISOString().substring(0, 10);
}


// ===============================
// PRODUCTOS Y TOTALES FLEXIBLES
// ===============================

function obtenerProductos(movimiento) {
  if (!movimiento) return [];

  if (Array.isArray(movimiento.productos)) {
    return movimiento.productos;
  }

  if (Array.isArray(movimiento.items)) {
    return movimiento.items;
  }

  if (Array.isArray(movimiento.detalle)) {
    return movimiento.detalle;
  }

  return [];
}

function calcularTotales(movimiento) {
  const productos = obtenerProductos(movimiento);

  const piezasProductos = productos.reduce(
    (acc, p) =>
      acc + Number(p.cantidad || p.piezas || 0),
    0
  );

  const costoProductos = productos.reduce(
    (acc, p) =>
      acc + Number(
        p.subtotalCosto ||
        p.costoTotal ||
        p.totalCosto ||
        0
      ),
    0
  );

  const ventaProductos = productos.reduce(
    (acc, p) =>
      acc + Number(
        p.subtotalVenta ||
        p.ventaTotal ||
        p.totalVenta ||
        0
      ),
    0
  );

  return {
    piezas: Number(
      movimiento.totales?.piezas ??
      movimiento.piezas ??
      piezasProductos ??
      0
    ),

    costoEstimado: Number(
      movimiento.totales?.costoEstimado ??
      movimiento.costoEstimado ??
      costoProductos ??
      0
    ),

    ventaEstimado: Number(
      movimiento.totales?.ventaEstimado ??
      movimiento.ventaEstimado ??
      ventaProductos ??
      0
    )
  };
}


// ===============================
// LEE COLECCIONES FLEXIBLES
// ===============================

async function leerColeccionFlexible(docRef, nombres) {
  const documentos = [];
  const encontradas = [];

  for (const nombre of nombres) {
    try {
      const snap = await docRef
        .collection(nombre)
        .get();

      if (!snap.empty) {
        encontradas.push(nombre);

        snap.forEach(doc => {
          documentos.push({
            id: doc.id,
            coleccion: nombre,
            data: doc.data()
          });
        });
      }

    } catch (error) {
      console.warn(
        "No se pudo leer colección:",
        nombre,
        error
      );
    }
  }

  if (!documentos.length) {
    return null;
  }

  console.log(
    "Colecciones encontradas:",
    encontradas,
    "Registros:",
    documentos.length
  );

  return {
    nombres: encontradas,
    documentos
  };
}


// ===============================
// OBTENER SUCURSALES
// ===============================

async function obtenerSucursales() {
  const snap = await db
    .collection("TIENDAS")
    .get();

  return snap.docs
    .map(doc => doc.id)
    .sort((a, b) => a.localeCompare(b, "es"));
}
