// ==========================================
// CONEXION SUPABASE
// ==========================================
const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// RENDERIZAR ESTRUCTURA HTML DESDE JS
// ==========================================
function renderizarFormularioHTML() {
    const contenedor = document.getElementById("form-container");
    
    contenedor.innerHTML = `
        <div class="folio-box">
            <i class="fa-solid fa-barcode"></i>
            Folio: <span id="folio">Generando...</span>
        </div>

        <div class="form-grid">
            <div class="form-group">
                <label>Start Date</label>
                <input type="date" id="DateStart" readonly>
            </div>

            <div class="form-group">
                <label>Department</label>
                <input id="Department" readonly>
            </div>

            <div class="form-group">
                <label>Status</label>
                <select id="Status" disabled>
                    <option value="New" selected>New</option>
                </select>
            </div>

            <div class="form-group">
                <label>Approved</label>
                <select id="Approved" disabled>
                    <option value="" selected></option>
                </select>
            </div>

            <div class="form-group">
                <label>Project Name</label>
                <input id="ProjectName" placeholder="Ej. Optimización de Línea">
            </div>

            <div class="form-group">
                <label>Type</label>
                <select id="Type">
                    <option value="">Select Type</option>
                    <option>New Project</option>
                    <option>Improvement</option>
                    <option>Corrective</option>
                </select>
            </div>

            <div class="form-group">
                <label>Lead</label>
                <select id="Lead">
                    <option value="">Select Lead</option>
                    <option>Armando Osornio</option>
                    <option>Demetrio Moreno</option>
                    <option>Armando Osornio - Demetrio Moreno</option>
                    <option>Demetrio Moreno - Armando Osornio</option>
                </select>
            </div>

            <div class="form-group" style="visibility: hidden; pointer-events: none;"></div>

            <div class="form-group full-width">
                <label>Problem Description</label>
                <textarea id="ProblemDescription" placeholder="Describe el problema o necesidad del proyecto..."></textarea>
            </div>
        </div>

        <button class="btn-submit" onclick="guardarProyecto()">
            <i class="fa-solid fa-floppy-disk"></i>
            Submit Project
        </button>

        <div id="resultado">
            Ready to enter information...
        </div>
    `;
}

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
    const spanFolio = document.getElementById("folio");
    if (spanFolio) spanFolio.innerHTML = folio;
}

// ==========================================
// VALORES AUTOMATICOS DEL FORMULARIO
// ==========================================
function cargarValoresAutomaticos() {
    const hoy = new Date();
    const fecha = hoy.getFullYear() + "-" +
        String(hoy.getMonth() + 1).padStart(2, "0") + "-" +
        String(hoy.getDate()).padStart(2, "0");

    const dateStartInput = document.getElementById("DateStart");
    const departmentInput = document.getElementById("Department");

    if (dateStartInput) dateStartInput.value = fecha;
    if (departmentInput) departmentInput.value = "Rough Cut";
}

// Ejecutar al abrir formulario
window.onload = function () {
    renderizarFormularioHTML(); // Primero generamos el HTML
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

// ================================
// PROTECCIÓN DE LA PÁGINA
// ================================

// Bloquear clic derecho
document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

// Bloquear selección de texto
document.addEventListener("selectstart", (e) => {
    e.preventDefault();
});

// Bloquear copiar
document.addEventListener("copy", (e) => {
    e.preventDefault();
});

// Bloquear cortar
document.addEventListener("cut", (e) => {
    e.preventDefault();
});

// Bloquear arrastrar contenido
document.addEventListener("dragstart", (e) => {
    e.preventDefault();
});

// Bloquear teclas comunes para inspeccionar/copiar
document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();

    if (e.key === "F12") {
        e.preventDefault();
        return;
    }

    if (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) {
        e.preventDefault();
        return;
    }

    if (e.ctrlKey && ["u", "c", "x", "s", "a"].includes(key)) {
        e.preventDefault();
        return;
    }
});