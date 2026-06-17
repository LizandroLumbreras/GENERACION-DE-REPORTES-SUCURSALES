const $ = id => document.getElementById(id);

let movimientos = [];
let chartMermas = null;
let chartDevoluciones = null;

window.addEventListener("load", async () => {

  try {

    await cargarDashboard();

    $("btnFiltrar").addEventListener(
      "click",
      aplicarFiltros
    );

    $("btnExportar").addEventListener(
      "click",
      exportarExcel
    );

    $("cerrarModal").addEventListener(
      "click",
      () => {
        $("modalDetalle").style.display = "none";
      }
    );

  } catch (error) {

    console.error(error);

    alert(
      "Error cargando información.\nRevisa consola."
    );

  }

});

async function cargarDashboard(){

  movimientos = [];

  const sucursales =
    await obtenerSucursales();

  llenarComboSucursales(
    sucursales
  );

  for(const sucursal of sucursales){

    await cargarSucursal(
      sucursal
    );

  }

  actualizarIndicadores();

  renderHistorial();

  renderGraficas();

  $("ultimaActualizacion")
    .textContent =
      "Actualizado: " +
      new Date()
      .toLocaleString("es-MX");

}

function llenarComboSucursales(
  sucursales
){

  const select =
    $("filtroSucursal");

  select.innerHTML = `
    <option value="">
      Todas las sucursales
    </option>
  `;

  sucursales.forEach(
    sucursal => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        sucursal;

      option.textContent =
        sucursal;

      select.appendChild(
        option
      );

    }
  );

}

async function cargarSucursal(
  sucursal
){

  const tiendaRef =
    db.collection("TIENDAS")
      .doc(sucursal);

  const mermasData =
    await leerColeccionFlexible(
      tiendaRef,
      COLECCIONES_MERMA
    );

  if(mermasData){

    mermasData.snap.forEach(
      doc => {

        movimientos.push({

          id: doc.id,

          sucursal,

          tipo: "MERMA",

          ...doc.data()

        });

      }
    );

  }

  const devolucionesData =
    await leerColeccionFlexible(
      tiendaRef,
      COLECCIONES_DEVOLUCION
    );

  if(devolucionesData){

    devolucionesData.snap.forEach(
      doc => {

        movimientos.push({

          id: doc.id,

          sucursal,

          tipo: "DEVOLUCION",

          ...doc.data()

        });

      }
    );

  }

}

function actualizarIndicadores(){

  const mermas =
    movimientos.filter(
      x => x.tipo === "MERMA"
    );

  const devoluciones =
    movimientos.filter(
      x => x.tipo === "DEVOLUCION"
    );

  $("totalMermas")
    .textContent =
      number(
        mermas.length
      );

  $("totalDevoluciones")
    .textContent =
      number(
        devoluciones.length
      );

  $("piezasMermadas")
    .textContent =
      number(
        mermas.reduce(
          (a,b)=>
            a +
            (b.totales?.piezas || 0),
          0
        )
      );

  $("piezasDevueltas")
    .textContent =
      number(
        devoluciones.reduce(
          (a,b)=>
            a +
            (b.totales?.piezas || 0),
          0
        )
      );

  $("costoMermas")
    .textContent =
      money(
        mermas.reduce(
          (a,b)=>
            a +
            (b.totales?.costoEstimado || 0),
          0
        )
      );

  $("costoDevoluciones")
    .textContent =
      money(
        devoluciones.reduce(
          (a,b)=>
            a +
            (b.totales?.costoEstimado || 0),
          0
        )
      );

  $("ventaMermas")
    .textContent =
      money(
        mermas.reduce(
          (a,b)=>
            a +
            (b.totales?.ventaEstimado || 0),
          0
        )
      );

  $("ventaDevoluciones")
    .textContent =
      money(
        devoluciones.reduce(
          (a,b)=>
            a +
            (b.totales?.ventaEstimado || 0),
          0
        )
      );

}

function renderHistorial(){

  const tbody =
    $("tablaHistorial");

  tbody.innerHTML = "";

  const ordenados =
    [...movimientos]
    .sort((a,b)=>{

      const fa =
        a.creadoEnLocal || "";

      const fb =
        b.creadoEnLocal || "";

      return fb.localeCompare(fa);

    });

  ordenados.forEach(
    movimiento => {

      const tr =
        document.createElement(
          "tr"
        );

      tr.innerHTML = `

        <td>
          ${fechaCorta(
            movimiento.creadoEnLocal
          )}
        </td>

        <td>
          ${movimiento.sucursal}
        </td>

        <td>
          ${movimiento.tipo}
        </td>

        <td>
          ${movimiento.folio || ""}
        </td>

        <td>
          ${movimiento.estado || ""}
        </td>

        <td>
          ${number(
            movimiento.totales?.piezas
          )}
        </td>

        <td>
          ${money(
            movimiento.totales?.costoEstimado
          )}
        </td>

        <td>
          ${money(
            movimiento.totales?.ventaEstimado
          )}
        </td>

      `;

      tr.addEventListener(
        "click",
        () => abrirDetalle(
          movimiento
        )
      );

      tbody.appendChild(
        tr
      );

    });

}
