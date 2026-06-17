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
const APP_VERSION = "1.0.0";


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
// FORMATO MONEDA
// ===============================

const money = valor =>
  Number(valor || 0)
    .toLocaleString(
      "es-MX",
      {
        style: "currency",
        currency: "MXN"
      }
    );


// ===============================
// FORMATO NUMERO
// ===============================

const number = valor =>
  Number(valor || 0)
    .toLocaleString("es-MX");


// ===============================
// FECHA CORTA
// ===============================

function fechaCorta(fecha){

  if(!fecha) return "";

  try{

    return new Date(fecha)
      .toLocaleString("es-MX");

  }catch{

    return fecha;

  }

}


// ===============================
// LEE COLECCION FLEXIBLE
// MERMA / MERMAS
// DEVOLUCION / DEVOLUCIONES
// ===============================

async function leerColeccionFlexible(
  docRef,
  nombres
){

  for(const nombre of nombres){

    try{

      const snap =
        await docRef
          .collection(nombre)
          .get();

      if(!snap.empty){

        console.log(
          "Colección encontrada:",
          nombre,
          "Registros:",
          snap.size
        );

        return {
          nombre,
          snap
        };

      }

    }catch(error){

      console.log(
        "No existe:",
        nombre
      );

    }

  }

  return null;

}


// ===============================
// OBTENER SUCURSALES
// ===============================

async function obtenerSucursales(){

  const snap =
    await db
      .collection("TIENDAS")
      .get();

  return snap.docs.map(
    doc => doc.id
  );

}
