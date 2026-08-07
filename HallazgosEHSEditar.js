const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabaseDB = supabase.createClient(
    supabaseUrl,
    supabaseKey
);
console.log("Supabase cargado correctamente");

const tbody = document.querySelector("tbody");

async function cargarDatos() {
    tbody.innerHTML = "";

    const { data, error } = await supabaseDB
    .from("Auditorias_Gestion_EHS")
    .select("*")
        .order("Folio", { ascending: false });
        
    if (error) {
        alert(error.message);
        return;
    }

console.log("Datos recibidos:", data);

    data.forEach(reg => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${reg.id}</td>
            <td><input disabled value="${reg.Folio ?? ''}" id="Folio${reg.id}"></td>
            <td><input disabled value="${reg.Plant ?? ''}" id="Plant${reg.id}"></td>
            <td><input disabled value="${reg.Shift ?? ''}" id="Shift${reg.id}"></td>
            <td><input disabled value="${reg.Area ?? ''}" id="Area${reg.id}"></td>
            <td><input disabled value="${reg.EHSName ?? ''}" id="EHSName${reg.id}"></td>
            <td><input disabled value="${reg.Gerente ?? ''}" id="Gerente${reg.id}"></td>
            <td><input disabled value="${reg.Fecha ?? ''}" id="Fecha${reg.id}"></td>
            <td><input disabled value="${reg.Status ?? ''}" id="Status${reg.id}"></td>
            <td><input disabled value="${reg["C/O"] ?? ''}" id="CO${reg.id}"></td>
            <td><input disabled value="${reg.Description ?? ''}" id="Description${reg.id}"></td>
            <td><a href="${reg.PDF}" target="_blank">📄 Ver PDF</a>
                <br><br>
                <input type="file" id="PDF${reg.id}" accept="application/pdf" style="display:none;">
            </td>
            <td>
                <button class="edit" onclick="editar(${reg.id})">✏️</button>
                <button class="save" id="save${reg.id}" onclick="guardar(${reg.id})">💾</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.editar = function(id) {
    const campos = [
        "Folio", "Plant", "Shift", "Area", "EHSName", 
        "Gerente", "Fecha", "Status", "CO", "Description", "PDF"
    ];

    campos.forEach(c => {
        const input = document.getElementById(c + id);
        if (input) {
            input.disabled = false;
        }
    });

    const pdf = document.getElementById("PDF" + id);
    if (pdf) {
        pdf.style.display = "block";
    }
    
    document.getElementById("save" + id).style.display = "inline";
};

window.guardar = async function(id) {
    const archivoInput = document.getElementById("PDF" + id);
    const archivo = archivoInput ? archivoInput.files[0] : null;
    let urlPDF = null;

    if (archivo) {
        const nombreArchivo = Date.now() + "_" + archivo.name;
        const { error: uploadError } = await supabaseDB.storage
            .from("pdfs")
            .upload(nombreArchivo, archivo, { upsert: true });

        if (uploadError) {
            alert(uploadError.message);
            return;
        }

        const { data } = supabaseDB.storage
            .from("pdfs")
            .getPublicUrl(nombreArchivo);

        urlPDF = data.publicUrl;
    }

    const datos = {
        Folio: document.getElementById("Folio" + id).value,
        Plant: document.getElementById("Plant" + id).value,
        Shift: document.getElementById("Shift" + id).value,
        Area: document.getElementById("Area" + id).value,
        EHSName: document.getElementById("EHSName" + id).value,
        Gerente: document.getElementById("Gerente" + id).value,
        Fecha: document.getElementById("Fecha" + id).value,
        Status: document.getElementById("Status" + id).value,
        "C/O": document.getElementById("CO" + id).value,
        Description: document.getElementById("Description" + id).value,
    };

    if (urlPDF) {
        datos.PDF = urlPDF;
    }

    const { error } = await supabaseDB
    .from("Auditorias_Gestion_EHS")
        .update(datos)
        .eq("id", id)
        .select();

    if (error) {
        alert(error.message);
        return;
    }

    alert("Registro actualizado");
    cargarDatos();
};

cargarDatos();