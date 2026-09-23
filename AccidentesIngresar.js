const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabaseClient = supabase.createClient(
    supabaseUrl,
    supabaseKey
);

// ================================
// INYECCIÓN DINÁMICA DEL MODAL HTML
// ================================
const modalHTML = `
<div id="modalEmpleado" class="modal-overlay">
    <div class="modal-content">
        <h3><i class="fa-solid fa-user-plus"></i>Add New Employee</h3>
        <div class="field">
            <label># Empl</label>
            <input id="nuevoEmplNum" type="number" readonly class="readonly">
        </div>
        <div class="field">
            <label>Nombre</label>
            <input id="nuevoEmplNombre" type="text" placeholder="Full Name">
        </div>
        <div class="field">
            <label>Puesto</label>
            <input id="nuevoEmplPuesto" type="text" placeholder="Position">
        </div>
        <div class="field">
            <label>Departamento</label>
            <input id="nuevoEmplDept" type="text" placeholder="Departament">
        </div>
        <div class="modal-buttons">
            <button class="btn-cancelar" onclick="cerrarModalEmpleado()">Cancel</button>
            <button onclick="guardarNuevoEmpleado()">Save</button>
        </div>
    </div>
</div>
`;

// Insertar el modal al final del body de forma automática
document.addEventListener("DOMContentLoaded", () => {
    document.body.insertAdjacentHTML('beforeend', modalHTML);
});

const empleadoInput = document.getElementById("empleado");
const nombreInput = document.getElementById("nombre");
const puestoInput = document.getElementById("puesto");
const departamentoInput = document.getElementById("departamento");
const mensaje = document.getElementById("mensaje");
const mensajeEmpleado = document.getElementById("mensajeEmpleado");

empleadoInput.addEventListener(
"change",
async()=>{
    let empleado = empleadoInput.value;
    if(!empleado){
        limpiarEmpleado();
        return;
    }

    mensajeEmpleado.innerHTML = "🔍 Searching for employee...";
    const { data, error } = await supabaseClient
    .from("Empleados")
    .select("Nombre,Puesto,Departamento")
    .eq("Empleado", empleado)
    .single();

    if(error || !data){
        limpiarEmpleado();
        mensajeEmpleado.innerHTML = `❌ Employee not found <i class="fa-solid fa-user-plus btn-add-icon" title="Add Employee" onclick="abrirModalEmpleado('${empleado}')"></i>`;
        return;
    }

    nombreInput.value = data.Nombre;
    puestoInput.value = data.Puesto;
    departamentoInput.value = data.Departamento;
    mensajeEmpleado.innerHTML = "✅ Employee found";
});

function limpiarEmpleado(){
    nombreInput.value="";
    puestoInput.value="";
    departamentoInput.value="";
    mensajeEmpleado.innerHTML="";
}

function abrirModalEmpleado(numEmpl) {
    document.getElementById("nuevoEmplNum").value = numEmpl;
    document.getElementById("nuevoEmplNombre").value = "";
    document.getElementById("nuevoEmplPuesto").value = "";
    document.getElementById("nuevoEmplDept").value = "";
    document.getElementById("modalEmpleado").style.display = "flex";
}

function cerrarModalEmpleado() {
    document.getElementById("modalEmpleado").style.display = "none";
}

async function guardarNuevoEmpleado() {
    const num = document.getElementById("nuevoEmplNum").value;
    const nombre = document.getElementById("nuevoEmplNombre").value;
    const puesto = document.getElementById("nuevoEmplPuesto").value;
    const dept = document.getElementById("nuevoEmplDept").value;

    if (!nombre || !puesto || !dept) {
        alert("Please fill in all fields");
        return;
    }

    const { error } = await supabaseClient
        .from("Empleados")
        .insert([{
            Empleado: Number(num),
            Nombre: nombre,
            Puesto: puesto,
            Departamento: dept
        }]);

    if (error) {
        alert("Error saving employee.: " + error.message);
        return;
    }

    cerrarModalEmpleado();
    empleadoInput.value = "";
    limpiarEmpleado();
    mensaje.innerHTML = "✅ Employee added successfully. Please enter the employee ID again.";
}

async function guardarAccidente(){
    mensaje.innerHTML = "⏳ Saving information...";

    const registro = {
        "#Empl": Number(document.getElementById("empleado").value),
        Name: nombreInput.value,
        Description: document.getElementById("descripcion").value,
        Position: puestoInput.value,
        PartBody: document.getElementById("partbody").value,
        Depart: departamentoInput.value,
        Shift: document.getElementById("shift").value,
        EPP: document.getElementById("epp").value,
        Date: document.getElementById("fecha").value,
        Hour: document.getElementById("hora").value,
        Type: document.getElementById("tipo").value,
        Status: document.getElementById("status").value
    };

    if(!registro["#Empl"]){
        mensaje.innerHTML = "⚠ Enter Employee ID";
        return;
    }

    const { error } = await supabaseClient
    .from("Accidentes")
    .insert([registro]);

    if(error){
        console.error(error);
        mensaje.innerHTML = "❌ Error: " + error.message;
        return;
    }

    mensaje.innerHTML = "✅ Accident recorded successfully";

    setTimeout(()=>{
        limpiarFormulario();
    },2000);
}

function limpiarFormulario(){
    document.querySelectorAll("input, textarea").forEach(campo=>{
        campo.value="";
    });

    document.getElementById("partbody").value="";
    document.getElementById("shift").value="";
    document.getElementById("epp").value="";
    document.getElementById("tipo").value="";
    document.getElementById("status").value="";

    nombreInput.value="";
    puestoInput.value="";
    departamentoInput.value="";

    mensaje.innerHTML = "🟢 Ready to record another accident";
}

window.onload = function(){
    const fecha = document.getElementById("fecha");
    const hora = document.getElementById("hora");
    let ahora = new Date();

    fecha.value = ahora.toISOString().substring(0,10);
    hora.value = ahora.toLocaleTimeString([], {
        hour:"2-digit",
        minute:"2-digit"
    });
};

empleadoInput.addEventListener("input", ()=>{
    if(empleadoInput.value.length > 0){
        empleadoInput.style.boxShadow = "0 0 15px #00A6A6";
    }else{
        empleadoInput.style.boxShadow = "none";
    }
});

const boton = document.querySelector("button");
boton.addEventListener("click", ()=>{
    boton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
    setTimeout(()=>{
        boton.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Registrar Accidente';
    },3000);
});

// ================================
// PROTECCIÓN DE LA PÁGINA
// ================================

document.addEventListener("contextmenu", (e) => { e.preventDefault(); });
document.addEventListener("selectstart", (e) => { e.preventDefault(); });
document.addEventListener("copy", (e) => { e.preventDefault(); });
document.addEventListener("cut", (e) => { e.preventDefault(); });
document.addEventListener("dragstart", (e) => { e.preventDefault(); });

document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (e.key === "F12") { e.preventDefault(); return; }
    if (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) { e.preventDefault(); return; }
    if (e.ctrlKey && ["u", "c", "x", "s", "a"].includes(key)) { e.preventDefault(); return; }
});