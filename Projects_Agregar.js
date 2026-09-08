// ==========================================
// CONEXION SUPABASE
// ==========================================
const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// GENERAR FOLIO AUTOMATICO
// ==========================================
async function generarFolio() {
    const year = new Date().getFullYear();

    const { data, error } = await supabaseClient
        .from("Projects")
        .select("Folio")
        .order("id", { ascending: false })
        .limit(1);

    let consecutivo = 1;

    if (data && data.length > 0) {
        let ultimo = data[0].Folio;
        if (ultimo) {
            let partes = ultimo.split("-");
            if (partes.length === 3) {
                let numero = parseInt(partes[2]);
                if (!isNaN(numero)) consecutivo = numero + 1;
            }
        }
    }

    let folio = "PRJ-" + year + "-" + String(consecutivo).padStart(4, "0");
    document.getElementById("folio").innerHTML = folio;
}

// ==========================================
// VALORES AUTOMATICOS DEL FORMULARIO
// ==========================================
function cargarValoresAutomaticos() {
    const hoy = new Date();
    const fecha = hoy.getFullYear() + "-" +
        String(hoy.getMonth() + 1).padStart(2, "0") + "-" +
        String(hoy.getDate()).padStart(2, "0");

    document.getElementById("DateStart").value = fecha;
    document.getElementById("Department").value = "Rough Cut";
}

// Ejecutar al abrir formulario
window.onload = function () {
    generarFolio();
    cargarValoresAutomaticos();
};

// ==========================================
// GUARDAR PROYECTO
// ==========================================
async function guardarProyecto() {
    const resultado = document.getElementById("resultado");
    resultado.className = "msg-loading";
    resultado.innerHTML = "⏳ Guardando proyecto...";

    const folio = document.getElementById("folio").innerText;

    const proyecto = {
        DateStart: document.getElementById("DateStart").value,
        Department: document.getElementById("Department").value,
        Folio: folio,
        ProjectName: document.getElementById("ProjectName").value,
        Type: document.getElementById("Type").value,
        ProblemDescription: document.getElementById("ProblemDescription").value,
        Status: document.getElementById("Status").value,
        Lead: document.getElementById("Lead").value,
        Approved: document.getElementById("Approved").value,
        RemarksComments: document.getElementById("RemarksComments").value
    };

    const { error } = await supabaseClient
        .from("Projects")
        .insert([proyecto]);

    if (error) {
        resultado.className = "msg-error";
        resultado.innerHTML = "❌ Error: " + error.message;
        console.log(error);
        return;
    }

    resultado.className = "msg-success";
    resultado.innerHTML = "✅ ¡Proyecto guardado correctamente! Actualizando folio...";

    setTimeout(() => {
        limpiarFormulario();
        generarFolio();
        resultado.className = "";
        resultado.innerHTML = "Ready to enter information...";
    }, 2000);
}

// ==========================================
// LIMPIAR FORMULARIO
// ==========================================
function limpiarFormulario() {
    let campos = document.querySelectorAll("input:not([readonly]), textarea, select");

    campos.forEach(c => {
        if (c.tagName === "SELECT") {
            c.selectedIndex = 0;
        } else {
            c.value = "";
        }
    });

    cargarValoresAutomaticos();
}

// Bloqueo de atajos de desarrollo e inspección
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("keydown", (e) => {
  if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) || (e.ctrlKey && e.key === "U")) {
    e.preventDefault();
  }
});