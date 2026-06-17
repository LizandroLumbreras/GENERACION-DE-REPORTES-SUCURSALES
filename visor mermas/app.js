const $ = id => document.getElementById(id);

let movimientos = [];
let chartMermas = null;
let chartDevoluciones = null;

// ===============================
// SUCURSALES FIJAS
// ===============================

const SUCURSALES_FIJAS = [
  "ALLENDE 1",
  "ALLENDE 2",
  "CENTRAL",
  "MONTEMORELOS",
  "OSITO",
  "PROVILEON",
  "RIO VERDE",
  "RUTA1",
  "RUTA2"
];

// ===============================
// COLECCIONES
// ===============================

const COLECCIONES_MERMA_APP = [
  "MERMAS",
  "MERMA",
  "mermas",
  "merma",
  "Mermas",
  "Merma"
];

const COLECCIONES_DEVOLUCION_APP = [
  "DEVOLUCIONES",
  "DEVOLUCION",
  "devoluciones",
  "devolucion",
  "Devoluciones",
  "Devolucion",
  "DEVOLUCIÓN"
];

// ===============================
// INICIO
// ===============================

window.addEventListener("load", async () => {
  try {
    prepararEventos();

    await cargarDashboard();

  } catch (error) {
    console.error(error);

    alert(
      "Error cargando información.\nRevisa consola."
    );
  }
});

// ===============================
// EVENTOS
// ===============================

function prepararEventos() {
  const btnFiltrar = $("btnFiltrar");
  const btnExportar = $("btnExportar");
  const cerrarModal = $("cerrarModal");

  if (btnFiltrar) {
    btnFiltrar.addEventListener(
      "click",
      aplicarFiltros
    );
  }

  if (btnExportar) {
    btnExportar.addEventListener(
      "click",
      exportarExcel
    );
  }

  if (cerrarModal) {
    cerrarModal.addEventListener(
      "click",
      () => {
        $("modalDetalle").style.display = "none";
      }
    );
  }

  window.addEventListener("click", e => {
    if (e.target === $("modalDetalle")) {
      $("modalDetalle").style.display = "none";
    }
  });
}

// ===============================
// DASHBOARD
// ===============================

async function cargarDashboard() {
  movimientos = [];

  const sucursales = await obtenerSucursalesApp();

  llenarComboSucursales(sucursales);

  for (const sucursal of sucursales) {
    await cargarSucursalApp(sucursal);
  }

  pintarDashboard(movimientos);

  $("ultimaActualizacion").textContent =
    "Actualizado: " +
    new Date().toLocaleString("es-MX");

  console.log("Movimientos finales:", movimientos);
}

async function obtenerSucursalesApp() {
  const set = new Set();

  SUCURSALES_FIJAS.forEach(s => {
    set.add(normalizarTextoApp(s));
  });

  try {
    const snap = await db
      .collection("TIENDAS")
      .get();

    snap.docs.forEach(doc => {
      const id = normalizarTextoApp(doc.id);

      if (id && id !== "CONFIG") {
        set.add(id);
      }
    });

  } catch (error) {
    console.warn(
      "No se pudieron leer sucursales:",
      error
    );
  }

  return [...set]
    .filter(s => s !== "CONFIG")
    .sort((a, b) => a.localeCompare(b, "es"));
}

function llenarComboSucursales(sucursales) {
  const select = $("filtroSucursal");

  if (!select) return;

  select.innerHTML = `
    <option value="">
      Todas las sucursales
    </option>
  `;

  sucursales.forEach(sucursal => {
    const option = document.createElement("option");

    option.value = sucursal;
    option.textContent = sucursal;

    select.appendChild(option);
  });

  console.log("Sucursales en combo:", sucursales);
}

// ===============================
// CARGA DE DATOS FIRESTORE
// ===============================

async function cargarSucursalApp(sucursal) {
  const variantes = variantesSucursalApp(sucursal);

  console.log("Buscando sucursal:", sucursal);
  console.log("Variantes:", variantes);

  for (const nombreDoc of variantes) {
    const tiendaRef = db
      .collection("TIENDAS")
      .doc(nombreDoc);

    await cargarColeccionesDeTipo(
      tiendaRef,
      nombreDoc,
      sucursal,
      "MERMA",
      COLECCIONES_MERMA_APP
    );

    await cargarColeccionesDeTipo(
      tiendaRef,
      nombreDoc,
      sucursal,
      "DEVOLUCION",
      COLECCIONES_DEVOLUCION_APP
    );
  }
}

async function cargarColeccionesDeTipo(
  tiendaRef,
  nombreDoc,
  sucursal,
  tipo,
  colecciones
) {
  for (const nombreColeccion of colecciones) {
    try {
      const snap = await tiendaRef
        .collection(nombreColeccion)
        .get();

      console.log(
        `Ruta revisada: TIENDAS/${nombreDoc}/${nombreColeccion}`,
        "Registros:",
        snap.size
      );

      snap.forEach(doc => {
        const data = doc.data();

        const movimiento = {
          id: doc.id,
          sucursal: normalizarTextoApp(sucursal),
          tipo,
          coleccion: nombreColeccion,
          ...data
        };

        movimiento.productos =
          obtenerProductosApp(movimiento);

        movimiento.totales =
          calcularTotalesApp(movimiento);

        movimientos.push(movimiento);
      });

    } catch (error) {
      console.warn(
        "Error leyendo:",
        `TIENDAS/${nombreDoc}/${nombreColeccion}`,
        error
      );
    }
  }
}

// ===============================
// NORMALIZAR DATOS
// ===============================

function normalizarTextoApp(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase();
}

function variantesSucursalApp(sucursal) {
  const limpia = String(sucursal || "").trim();

  const capitalizada = limpia
    .toLowerCase()
    .replace(/\b\w/g, letra => letra.toUpperCase());

  return [...new Set([
    limpia,
    limpia.toUpperCase(),
    limpia.toLowerCase(),
    capitalizada
  ])];
}

function obtenerProductosApp(movimiento) {
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

  if (Array.isArray(movimiento.productosSeleccionados)) {
    return movimiento.productosSeleccionados;
  }

  if (Array.isArray(movimiento.listaProductos)) {
    return movimiento.listaProductos;
  }

  return [];
}

function calcularTotalesApp(movimiento) {
  const productos = obtenerProductosApp(movimiento);

  const piezasProductos = productos.reduce(
    (acc, p) =>
      acc + Number(
        p.cantidad ||
        p.piezas ||
        p.qty ||
        0
      ),
    0
  );

  const costoProductos = productos.reduce(
    (acc, p) =>
      acc + Number(
        p.subtotalCosto ||
        p.costoTotal ||
        p.totalCosto ||
        p.costo ||
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
        p.venta ||
        0
      ),
    0
  );

  return {
    piezas: Number(
      movimiento.totales?.piezas ??
      movimiento.piezas ??
      movimiento.totalPiezas ??
      piezasProductos ??
      0
    ),

    costoEstimado: Number(
      movimiento.totales?.costoEstimado ??
      movimiento.costoEstimado ??
      movimiento.totalCosto ??
      costoProductos ??
      0
    ),

    ventaEstimado: Number(
      movimiento.totales?.ventaEstimado ??
      movimiento.ventaEstimado ??
      movimiento.totalVenta ??
      ventaProductos ??
      0
    )
  };
}

// ===============================
// FECHAS Y FORMATOS
// ===============================

function normalizarFechaApp(fecha) {
  if (!fecha) return null;

  if (fecha && typeof fecha.toDate === "function") {
    return fecha.toDate();
  }

  if (fecha && typeof fecha.seconds === "number") {
    return new Date(fecha.seconds * 1000);
  }

  const d = new Date(fecha);

  return isNaN(d.getTime()) ? null : d;
}

function fechaCortaApp(fecha) {
  const d = normalizarFechaApp(fecha);

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

function fechaISOApp(fecha) {
  const d = normalizarFechaApp(fecha);

  if (!d) return "";

  return d.toISOString().substring(0, 10);
}

function moneyApp(valor) {
  return Number(valor || 0).toLocaleString(
    "es-MX",
    {
      style: "currency",
      currency: "MXN"
    }
  );
}

function numberApp(valor) {
  return Number(valor || 0).toLocaleString("es-MX");
}

function obtenerFechaMovimiento(movimiento) {
  return (
    movimiento.creadoEnLocal ||
    movimiento.creadoEn ||
    movimiento.fecha ||
    movimiento.fechaRegistro ||
    movimiento.fechaMovimiento ||
    movimiento.timestamp ||
    ""
  );
}

// ===============================
// PINTAR DASHBOARD
// ===============================

function pintarDashboard(datos) {
  actualizarIndicadores(datos);
  renderHistorial(datos);
  renderGraficas(datos);
}

function actualizarIndicadores(datos = movimientos) {
  const mermas = datos.filter(
    x => x.tipo === "MERMA"
  );

  const devoluciones = datos.filter(
    x => x.tipo === "DEVOLUCION"
  );

  $("totalMermas").textContent =
    numberApp(mermas.length);

  $("totalDevoluciones").textContent =
    numberApp(devoluciones.length);

  $("piezasMermadas").textContent =
    numberApp(sumarCampo(mermas, "piezas"));

  $("piezasDevueltas").textContent =
    numberApp(sumarCampo(devoluciones, "piezas"));

  $("costoMermas").textContent =
    moneyApp(sumarCampo(mermas, "costoEstimado"));

  $("costoDevoluciones").textContent =
    moneyApp(sumarCampo(devoluciones, "costoEstimado"));

  $("ventaMermas").textContent =
    moneyApp(sumarCampo(mermas, "ventaEstimado"));

  $("ventaDevoluciones").textContent =
    moneyApp(sumarCampo(devoluciones, "ventaEstimado"));
}

function sumarCampo(datos, campo) {
  return datos.reduce(
    (acc, item) =>
      acc + Number(item.totales?.[campo] || 0),
    0
  );
}

// ===============================
// TABLA
// ===============================

function renderHistorial(datos = movimientos) {
  const tbody = $("tablaHistorial");

  if (!tbody) return;

  tbody.innerHTML = "";

  const ordenados = [...datos].sort((a, b) => {
    const fa = fechaISOApp(
      obtenerFechaMovimiento(a)
    );

    const fb = fechaISOApp(
      obtenerFechaMovimiento(b)
    );

    return fb.localeCompare(fa);
  });

  if (!ordenados.length) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td colspan="8" style="text-align:center;color:#777;">
        No hay movimientos para mostrar
      </td>
    `;

    tbody.appendChild(tr);
    return;
  }

  ordenados.forEach(movimiento => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        ${fechaCortaApp(
          obtenerFechaMovimiento(movimiento)
        )}
      </td>

      <td>
        ${movimiento.sucursal || ""}
      </td>

      <td>
        ${movimiento.tipo || ""}
      </td>

      <td>
        ${movimiento.folio || ""}
      </td>

      <td>
        ${movimiento.estado || ""}
      </td>

      <td>
        ${numberApp(movimiento.totales?.piezas)}
      </td>

      <td>
        ${moneyApp(movimiento.totales?.costoEstimado)}
      </td>

      <td>
        ${moneyApp(movimiento.totales?.ventaEstimado)}
      </td>
    `;

    tr.addEventListener(
      "click",
      () => abrirDetalle(movimiento)
    );

    tbody.appendChild(tr);
  });
}

// ===============================
// MODAL DETALLE
// ===============================

function abrirDetalle(movimiento) {
  const productos = obtenerProductosApp(movimiento);

  let html = `
    <div style="
      margin-bottom:20px;
      padding:15px;
      background:#f7f7f7;
      border-radius:10px;
    ">

      <h3>
        ${movimiento.folio || "Sin folio"}
      </h3>

      <p><b>Sucursal:</b> ${movimiento.sucursal || ""}</p>
      <p><b>Tipo:</b> ${movimiento.tipo || ""}</p>
      <p><b>Estado:</b> ${movimiento.estado || ""}</p>
      <p><b>Colección:</b> ${movimiento.coleccion || ""}</p>

      <p>
        <b>Fecha:</b>
        ${fechaCortaApp(
          obtenerFechaMovimiento(movimiento)
        )}
      </p>

      <p>
        <b>Piezas:</b>
        ${numberApp(movimiento.totales?.piezas)}
      </p>

      <p>
        <b>Costo:</b>
        ${moneyApp(movimiento.totales?.costoEstimado)}
      </p>

      <p>
        <b>Venta:</b>
        ${moneyApp(movimiento.totales?.ventaEstimado)}
      </p>

    </div>
  `;

  html += `
    <table style="
      width:100%;
      border-collapse:collapse;
    ">
      <thead>
        <tr>
          <th>Código</th>
          <th>Descripción</th>
          <th>Cantidad</th>
          <th>Motivo</th>
          <th>Comentario</th>
          <th>Costo</th>
          <th>Venta</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (!productos.length) {
    html += `
      <tr>
        <td colspan="7" style="text-align:center;color:#777;">
          Sin productos en este movimiento
        </td>
      </tr>
    `;
  }

  productos.forEach(producto => {
    html += `
      <tr>
        <td>
          ${producto.codigo || producto.codigoBarra || ""}
        </td>

        <td>
          ${producto.descripcion || producto.concepto || producto.nombre || ""}
        </td>

        <td>
          ${numberApp(
            producto.cantidad ||
            producto.piezas ||
            producto.qty ||
            0
          )}
        </td>

        <td>
          ${producto.motivo || ""}
        </td>

        <td>
          ${producto.comentario || producto.observacion || ""}
        </td>

        <td>
          ${moneyApp(
            producto.subtotalCosto ||
            producto.costoTotal ||
            producto.totalCosto ||
            producto.costo ||
            0
          )}
        </td>

        <td>
          ${moneyApp(
            producto.subtotalVenta ||
            producto.ventaTotal ||
            producto.totalVenta ||
            producto.venta ||
            0
          )}
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  $("detalleMovimiento").innerHTML = html;
  $("modalDetalle").style.display = "flex";
}

// ===============================
// FILTROS
// ===============================

function obtenerDatosFiltrados() {
  const sucursal = $("filtroSucursal").value;
  const tipo = $("filtroTipo").value;
  const fechaInicial = $("fechaInicial").value;
  const fechaFinal = $("fechaFinal").value;

  let datos = [...movimientos];

  if (sucursal) {
    datos = datos.filter(
      x => x.sucursal === sucursal
    );
  }

  if (tipo) {
    datos = datos.filter(
      x => x.tipo === tipo
    );
  }

  if (fechaInicial) {
    datos = datos.filter(x => {
      const fecha = fechaISOApp(
        obtenerFechaMovimiento(x)
      );

      return fecha && fecha >= fechaInicial;
    });
  }

  if (fechaFinal) {
    datos = datos.filter(x => {
      const fecha = fechaISOApp(
        obtenerFechaMovimiento(x)
      );

      return fecha && fecha <= fechaFinal;
    });
  }

  return datos;
}

function aplicarFiltros() {
  const datos = obtenerDatosFiltrados();

  pintarDashboard(datos);
}

// ===============================
// GRAFICAS
// ===============================

function renderGraficas(datos = movimientos) {
  const resumenMermas =
    agruparPorSucursal(datos, "MERMA");

  const resumenDevoluciones =
    agruparPorSucursal(datos, "DEVOLUCION");

  if (chartMermas) {
    chartMermas.destroy();
  }

  if (chartDevoluciones) {
    chartDevoluciones.destroy();
  }

  chartMermas = crearGrafica(
    "chartMermas",
    "Piezas Mermadas",
    resumenMermas
  );

  chartDevoluciones = crearGrafica(
    "chartDevoluciones",
    "Piezas Devueltas",
    resumenDevoluciones
  );
}

function agruparPorSucursal(datos, tipo) {
  const resumen = {};

  datos
    .filter(m => m.tipo === tipo)
    .forEach(m => {
      resumen[m.sucursal] =
        (resumen[m.sucursal] || 0) +
        Number(m.totales?.piezas || 0);
    });

  return resumen;
}

function crearGrafica(canvasId, label, resumen) {
  const canvas = $(canvasId);

  if (!canvas) return null;

  return new Chart(canvas, {
    type: "bar",

    data: {
      labels: Object.keys(resumen),

      datasets: [
        {
          label,
          data: Object.values(resumen)
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: true
        }
      },

      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// ===============================
// EXPORTAR EXCEL
// ===============================

function exportarExcel() {
  const datosFiltrados = obtenerDatosFiltrados();

  const datos = [];

  datosFiltrados.forEach(m => {
    const productos = obtenerProductosApp(m);

    if (!productos.length) {
      datos.push({
        Fecha: fechaCortaApp(
          obtenerFechaMovimiento(m)
        ),
        Sucursal: m.sucursal || "",
        Tipo: m.tipo || "",
        Folio: m.folio || "",
        Estado: m.estado || "",
        Codigo: "",
        Descripcion: "",
        Cantidad: m.totales?.piezas || 0,
        Motivo: "",
        Comentario: "",
        Costo: m.totales?.costoEstimado || 0,
        Venta: m.totales?.ventaEstimado || 0
      });

      return;
    }

    productos.forEach(p => {
      datos.push({
        Fecha: fechaCortaApp(
          obtenerFechaMovimiento(m)
        ),
        Sucursal: m.sucursal || "",
        Tipo: m.tipo || "",
        Folio: m.folio || "",
        Estado: m.estado || "",
        Codigo: p.codigo || p.codigoBarra || "",
        Descripcion: p.descripcion || p.concepto || p.nombre || "",
        Cantidad: Number(
          p.cantidad ||
          p.piezas ||
          p.qty ||
          0
        ),
        Motivo: p.motivo || "",
        Comentario: p.comentario || p.observacion || "",
        Costo: Number(
          p.subtotalCosto ||
          p.costoTotal ||
          p.totalCosto ||
          p.costo ||
          0
        ),
        Venta: Number(
          p.subtotalVenta ||
          p.ventaTotal ||
          p.totalVenta ||
          p.venta ||
          0
        )
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(datos);

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    "Historial"
  );

  XLSX.writeFile(
    wb,
    "Dashboard_Mermas_Devoluciones.xlsx"
  );
}
