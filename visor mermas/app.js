const $ = id => document.getElementById(id);

let devoluciones = [];
let mermas = [];

window.addEventListener("load", async ()=>{

  await cargarDatos();

});

async function cargarDatos(){

  devoluciones = [];
  mermas = [];

  const resumenMermas = {};
  const resumenDevoluciones = {};

  for(const sucursal of SUCURSALES){

    try{

      const devSnap = await db
      .collection("TIENDAS")
      .doc(sucursal)
      .collection("DEVOLUCIONES")
      .get();

      devSnap.forEach(doc=>{

        const data = doc.data();

        devoluciones.push({
          sucursal,
          id:doc.id,
          ...data
        });

        resumenDevoluciones[sucursal] =
          (resumenDevoluciones[sucursal] || 0) + 1;

      });

    }catch(e){
      console.log(e);
    }

    try{

      const mermaSnap = await db
      .collection("TIENDAS")
      .doc(sucursal)
      .collection("MERMAS")
      .get();

      mermaSnap.forEach(doc=>{

        const data = doc.data();

        mermas.push({
          sucursal,
          id:doc.id,
          ...data
        });

        resumenMermas[sucursal] =
          (resumenMermas[sucursal] || 0) + 1;

      });

    }catch(e){
      console.log(e);
    }

  }

  $("#totalMermas").textContent = mermas.length;

  $("#totalDevoluciones").textContent =
    devoluciones.length;

  let topM = "-";
  let topMC = 0;

  Object.entries(resumenMermas).forEach(([s,c])=>{

    if(c > topMC){
      topMC = c;
      topM = s;
    }

  });

  let topD = "-";
  let topDC = 0;

  Object.entries(resumenDevoluciones).forEach(([s,c])=>{

    if(c > topDC){
      topDC = c;
      topD = s;
    }

  });

  $("#topMerma").textContent = topM;
  $("#topDevolucion").textContent = topD;

  renderTablas();

}

function renderTablas(){

  const ultimasDev =
    devoluciones.slice(-20).reverse();

  $("#tablaDevoluciones").innerHTML =
    ultimasDev.map(x=>`

      <tr>
        <td>${x.fecha || ""}</td>
        <td>${x.sucursal}</td>
        <td>${x.id}</td>
      </tr>

    `).join("");

  const ultimasMermas =
    mermas.slice(-20).reverse();

  $("#tablaMermas").innerHTML =
    ultimasMermas.map(x=>`

      <tr>
        <td>${x.fecha || ""}</td>
        <td>${x.sucursal}</td>
        <td>${x.id}</td>
      </tr>

    `).join("");

}