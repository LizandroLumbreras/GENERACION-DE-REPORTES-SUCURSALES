const $ = id => document.getElementById(id);

let movimientos = [];
let chartMermas = null;
let chartDevoluciones = null;

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

function prepararEventos() {
  $("btnFiltrar")?.addEventListener(
    "click",
    aplicarFiltros
  );

  $("btnExportar")?.addEventListener(
    "click",
    exportarExcel
  );

  $("cerrarModal")?.addEventListener(
    "click",
    () => {
      $("modalDetalle").style.display = "none";
    }
  );

  window.addEventListener("click", e => {
    if (e.target === $("modalDetalle")) {
      $("modalDetalle").style.display = "none";
    }
  });
}

async function cargarDashboard() {
  movimientos = [];

  const sucursales = await obtenerSucursales();

  llenarComboSucursales(sucursales);

  for (const sucursal of sucursales) {
    await cargarSucursal(sucursal);
  }

  pintarDashboard(movimientos);

  $("ultimaActualizacion").textContent =
    "Actualizado: " +
    new Date().toLocaleString("es-MX");
}

function llenarComboSucursales(sucursales) {
  const select = $("filtroSucursal");

  if (!select) return;

  const sucursalesFijas = [
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

  const listaFinal = [
    ...new Set([
      ...sucursalesFijas,
      ...(sucursales || [])
    ].map(s => String(s).trim().toUpperCase()))
  ].filter(s => s && s !== "CONFIG")
   .sort((a, b) => a.localeCompare(b, "es"));

  select.innerHTML = `
    <option value="">
      Todas las sucursales
    </option>
  `;

  listaFinal.forEach(sucursal => {
    const option = document.createElement("option");

    option.value = sucursal;
    option.textContent = sucursal;

    select.appendChild(option);
  });

  console.log("Sucursales cargadas en combo:", listaFinal);
}

async function cargarSucursal(sucursal) {
  const tiendaRef = db
    .collection("TIENDAS")
    .doc(sucursal);

  const mermasData =
    await leerColeccionFlexible(
      tiendaRef,
      COLECCIONES_MERMA
    );

  agregarMovimientosDesdeData(
    mermasData,
    sucursal,
    "MERMA"
  );

  const devolucionesData =
    await leerColeccionFlexible(
      tiendaRef,
      COLECCIONES_DEVOLUCION
    );

  agregarMovimientosDesdeData(
    devolucionesData,
    sucursal,
    "DEVOLUCION"
  );
}

function agregarMovimientosDesdeData(resultado, sucursal, tipo) {
  if (!resultado) return;

  resultado.documentos.forEach(item => {
    const data = item.data || {};

    movimientos.push({
      id: item.id,
      coleccion: item.coleccion,
      sucursal,
      tipo,
      ...data,
      productos: obtenerProductos(data),
      totales: calcularTotales(data)
    });
  });
}

function pintarDashboard(datos) {
  actualizarIndicadores(datos);
  renderHistorial(datos);
  renderGraficas(datos);
}

function actualizarIndicadores(datos = movimientos) {
  const mermas =
    datos.filter(x => x.tipo === "MERMA");

  const devoluciones =
    datos.filter(x => x.tipo === "DEVOLUCION");

  $("totalMermas").textContent =
    number(mermas.length);

  $("totalDevoluciones").textContent =
    number(devoluciones.length);

  $("piezasMermadas").textContent =
    number(sumar(mermas, "piezas"));

  $("piezasDevueltas").textContent =
    number(sumar(devoluciones, "piezas"));

  $("costoMermas").textContent =
    money(sumar(mermas, "costoEstimado"));

  $("costoDevoluciones").textContent =
    money(sumar(devoluciones, "costoEstimado"));

  $("ventaMermas").textContent =
    money(sumar(mermas, "ventaEstimado"));

  $("ventaDevoluciones").textContent =
    money(sumar(devoluciones, "ventaEstimado"));
}

function sumar(datos, campo) {
  return datos.reduce(
    (acc, item) =>
      acc + Number(item.totales?.[campo] || 0),
    0
  );
}

function renderHistorial(datos = movimientos) {
  const tbody = $("tablaHistorial");

  if (!tbody) return;

  tbody.innerHTML = "";

  const ordenados = [...datos].sort((a, b) => {
    const fa = fechaISO(
      a.creadoEnLocal ||
      a.creadoEn ||
      a.fecha
    );

    const fb = fechaISO(
      b.creadoEnLocal ||
      b.creadoEn ||
      b.fecha
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
        ${fechaCorta(
          movimiento.creadoEnLocal ||
          movimiento.creadoEn ||
          movimiento.fecha
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
        ${number(movimiento.totales?.piezas)}
      </td>

      <td>
        ${money(movimiento.totales?.costoEstimado)}
      </td>

      <td>
        ${money(movimiento.totales?.ventaEstimado)}
      </td>
    `;

    tr.addEventListener(
      "click",
      () => abrirDetalle(movimiento)
    );

    tbody.appendChild(tr);
  });
}

function abrirDetalle(movimiento) {
  const productos = obtenerProductos(movimiento);

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

      <p>
        <b>Sucursal:</b>
        ${movimiento.sucursal || ""}
      </p>

      <p>
        <b>Tipo:</b>
        ${movimiento.tipo || ""}
      </p>

      <p>
        <b>Estado:</b>
        ${movimiento.estado || ""}
      </p>

      <p>
        <b>Colección:</b>
        ${movimiento.coleccion || ""}
      </p>

      <p>
        <b>Fecha:</b>
        ${fechaCorta(
          movimiento.creadoEnLocal ||
          movimiento.creadoEn ||
          movimiento.fecha
        )}
      </p>

      <p>
        <b>Piezas:</b>
        ${number(movimiento.totales?.piezas)}
      </p>

      <p>
        <b>Costo:</b>
        ${money(movimiento.totales?.costoEstimado)}
      </p>

      <p>
        <b>Venta:</b>
        ${money(movimiento.totales?.ventaEstimado)}
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
          Sin productos en el movimiento
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
          ${producto.descripcion || producto.concepto || ""}
        </td>

        <td>
          ${number(producto.cantidad || producto.piezas || 0)}
        </td>

        <td>
          ${producto.motivo || ""}
        </td>

        <td>
          ${producto.comentario || producto.observacion || ""}
        </td>

        <td>
          ${money(
            producto.subtotalCosto ||
            producto.costoTotal ||
            producto.totalCosto ||
            0
          )}
        </td>

        <td>
          ${money(
            producto.subtotalVenta ||
            producto.ventaTotal ||
            producto.totalVenta ||
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
      const fecha = fechaISO(
        x.creadoEnLocal ||
        x.creadoEn ||
        x.fecha
      );

      return fecha && fecha >= fechaInicial;
    });
  }

  if (fechaFinal) {
    datos = datos.filter(x => {
      const fecha = fechaISO(
        x.creadoEnLocal ||
        x.creadoEn ||
        x.fecha
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

function exportarExcel() {
  const datosFiltrados = obtenerDatosFiltrados();

  const datos = [];

  datosFiltrados.forEach(m => {
    const productos = obtenerProductos(m);

    if (!productos.length) {
      datos.push({
        Fecha: fechaCorta(
          m.creadoEnLocal ||
          m.creadoEn ||
          m.fecha
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
        Fecha: fechaCorta(
          m.creadoEnLocal ||
          m.creadoEn ||
          m.fecha
        ),
        Sucursal: m.sucursal || "",
        Tipo: m.tipo || "",
        Folio: m.folio || "",
        Estado: m.estado || "",
        Codigo: p.codigo || p.codigoBarra || "",
        Descripcion: p.descripcion || p.concepto || "",
        Cantidad: Number(p.cantidad || p.piezas || 0),
        Motivo: p.motivo || "",
        Comentario: p.comentario || p.observacion || "",
        Costo: Number(
          p.subtotalCosto ||
          p.costoTotal ||
          p.totalCosto ||
          0
        ),
        Venta: Number(
          p.subtotalVenta ||
          p.ventaTotal ||
          p.totalVenta ||
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
