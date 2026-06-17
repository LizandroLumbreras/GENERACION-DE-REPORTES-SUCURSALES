const $ = id => document.getElementById(id);

let movimientos = [];
let chartMermas = null;
let chartDevoluciones = null;

window.addEventListener("load", async () => {

try {

```
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
```

} catch (error) {

```
console.error(error);

alert(
  "Error cargando información.\nRevisa consola."
);
```

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

```
await cargarSucursal(
  sucursal
);
```

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

select.innerHTML = `     <option value="">
      Todas las sucursales     </option>
  `;

sucursales.forEach(sucursal => {

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

});

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

```
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
```

}

const devolucionesData =
await leerColeccionFlexible(
tiendaRef,
COLECCIONES_DEVOLUCION
);

if(devolucionesData){

```
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
```

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

```
  const fa =
    a.creadoEnLocal || "";

  const fb =
    b.creadoEnLocal || "";

  return fb.localeCompare(fa);

});
```

ordenados.forEach(
movimiento => {

```
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
```

}
function abrirDetalle(movimiento){

let html = `

```
<div style="
  margin-bottom:20px;
  padding:15px;
  background:#f7f7f7;
  border-radius:10px;
">

  <h3>
    ${movimiento.folio || ""}
  </h3>

  <p>
    <b>Sucursal:</b>
    ${movimiento.sucursal}
  </p>

  <p>
    <b>Tipo:</b>
    ${movimiento.tipo}
  </p>

  <p>
    <b>Estado:</b>
    ${movimiento.estado || ""}
  </p>

  <p>
    <b>Fecha:</b>
    ${fechaCorta(
      movimiento.creadoEnLocal
    )}
  </p>

  <p>
    <b>Piezas:</b>
    ${number(
      movimiento.totales?.piezas
    )}
  </p>

  <p>
    <b>Costo:</b>
    ${money(
      movimiento.totales?.costoEstimado
    )}
  </p>

  <p>
    <b>Venta:</b>
    ${money(
      movimiento.totales?.ventaEstimado
    )}
  </p>

</div>
```

`;

html += `

```
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
```

`;

(movimiento.productos || [])
.forEach(producto=>{

```
html += `

  <tr>

    <td>
      ${producto.codigo || ""}
    </td>

    <td>
      ${producto.descripcion || ""}
    </td>

    <td>
      ${number(
        producto.cantidad
      )}
    </td>

    <td>
      ${producto.motivo || ""}
    </td>

    <td>
      ${producto.comentario || ""}
    </td>

    <td>
      ${money(
        producto.subtotalCosto
      )}
    </td>

    <td>
      ${money(
        producto.subtotalVenta
      )}
    </td>

  </tr>

`;
```

});

html += `

```
  </tbody>

</table>
```

`;

$("detalleMovimiento")
.innerHTML = html;

$("modalDetalle")
.style.display = "flex";

}

function aplicarFiltros(){

const sucursal =
$("filtroSucursal").value;

const tipo =
$("filtroTipo").value;

const fechaInicial =
$("fechaInicial").value;

const fechaFinal =
$("fechaFinal").value;

let datos =
[...movimientos];

if(sucursal){

```
datos =
  datos.filter(
    x =>
      x.sucursal === sucursal
  );
```

}

if(tipo){

```
datos =
  datos.filter(
    x =>
      x.tipo === tipo
  );
```

}

if(fechaInicial){

```
datos =
  datos.filter(x=>{

    const fecha =
      (x.creadoEnLocal || "")
      .substring(0,10);

    return fecha >= fechaInicial;

  });
```

}

if(fechaFinal){

```
datos =
  datos.filter(x=>{

    const fecha =
      (x.creadoEnLocal || "")
      .substring(0,10);

    return fecha <= fechaFinal;

  });
```

}

const tbody =
$("tablaHistorial");

tbody.innerHTML = "";

datos
.sort((a,b)=>

```
  (b.creadoEnLocal || "")
  .localeCompare(
    a.creadoEnLocal || ""
  )

)
.forEach(m=>{

  const tr =
    document.createElement("tr");

  tr.innerHTML = `

    <td>
      ${fechaCorta(
        m.creadoEnLocal
      )}
    </td>

    <td>
      ${m.sucursal}
    </td>

    <td>
      ${m.tipo}
    </td>

    <td>
      ${m.folio || ""}
    </td>

    <td>
      ${m.estado || ""}
    </td>

    <td>
      ${number(
        m.totales?.piezas
      )}
    </td>

    <td>
      ${money(
        m.totales?.costoEstimado
      )}
    </td>

    <td>
      ${money(
        m.totales?.ventaEstimado
      )}
    </td>

  `;

  tr.onclick =
    ()=>abrirDetalle(m);

  tbody.appendChild(tr);

});
```

}
function renderGraficas(){

const resumenMermas = {};
const resumenDevoluciones = {};

movimientos.forEach(m=>{

```
if(m.tipo === "MERMA"){

  resumenMermas[m.sucursal] =
    (resumenMermas[m.sucursal] || 0) +
    (m.totales?.piezas || 0);

}

if(m.tipo === "DEVOLUCION"){

  resumenDevoluciones[m.sucursal] =
    (resumenDevoluciones[m.sucursal] || 0) +
    (m.totales?.piezas || 0);

}
```

});

if(chartMermas){

```
chartMermas.destroy();
```

}

if(chartDevoluciones){

```
chartDevoluciones.destroy();
```

}

chartMermas = new Chart(

```
$("chartMermas"),

{

  type:"bar",

  data:{

    labels:
      Object.keys(
        resumenMermas
      ),

    datasets:[{

      label:"Piezas Mermadas",

      data:
        Object.values(
          resumenMermas
        )

    }]

  },

  options:{

    responsive:true,

    maintainAspectRatio:false

  }

}
```

);

chartDevoluciones = new Chart(

```
$("chartDevoluciones"),

{

  type:"bar",

  data:{

    labels:
      Object.keys(
        resumenDevoluciones
      ),

    datasets:[{

      label:"Piezas Devueltas",

      data:
        Object.values(
          resumenDevoluciones
        )

    }]

  },

  options:{

    responsive:true,

    maintainAspectRatio:false

  }

}
```

);

}

function exportarExcel(){

const datos = [];

movimientos.forEach(m=>{

```
(m.productos || []).forEach(p=>{

  datos.push({

    Fecha:
      m.creadoEnLocal || "",

    Sucursal:
      m.sucursal || "",

    Tipo:
      m.tipo || "",

    Folio:
      m.folio || "",

    Estado:
      m.estado || "",

    Codigo:
      p.codigo || "",

    Descripcion:
      p.descripcion || "",

    Cantidad:
      p.cantidad || 0,

    Motivo:
      p.motivo || "",

    Comentario:
      p.comentario || "",

    Costo:
      p.subtotalCosto || 0,

    Venta:
      p.subtotalVenta || 0

  });

});
```

});

const ws =
XLSX.utils.json_to_sheet(
datos
);

const wb =
XLSX.utils.book_new();

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

window.addEventListener(
"click",
e => {

```
if(
  e.target ===
  $("modalDetalle")
){

  $("modalDetalle")
    .style.display =
      "none";

}
```

}
);
