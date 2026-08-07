import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabase = createClient(supabaseUrl, supabaseKey);

async function guardar() {
    document.getElementById("resultado").innerHTML = "⏳ Guardando información...";

    let pdfURL = "";
    const archivo = document.getElementById("pdf").files[0];

    if (archivo) {
        const folio = document.getElementById("folio").value;
        const extension = archivo.name.split(".").pop();
        const nombreArchivo = folio + "_" + Date.now() + "." + extension;
        
        const { error: uploadError } = await supabase.storage
            .from("pdfs")
            .upload(nombreArchivo, archivo);

        if (uploadError) {
            document.getElementById("resultado").innerHTML = "❌ Error PDF: " + uploadError.message;
            return;
        }

        const { data: urlData } = supabase.storage
            .from("pdfs")
            .getPublicUrl(nombreArchivo);
            
        pdfURL = urlData.publicUrl;
    }

    const { error } = await supabase
        .from("Auditorias_Gestion_EHS")
        .insert([{
            Folio: document.getElementById("folio").value,
            Plant: document.getElementById("plant").value,
            Shift: document.getElementById("shift").value,
            Area: document.getElementById("area").value,
            EHSName: document.getElementById("ehs").value,
            Gerente: document.getElementById("gerente").value,
            Fecha: document.getElementById("fecha").value,
            Status: document.getElementById("status").value,
            "C/O": document.getElementById("co").value,
            Description: document.getElementById("descripcion").value,
            PDF: pdfURL
        }]);

    if (error) {
        document.getElementById("resultado").innerHTML = "❌ Error: " + error.message;
    } else {
        document.getElementById("resultado").innerHTML = "✅ Auditoría guardada correctamente";
        limpiarFormulario();
    }
}

function limpiarFormulario() {
    setTimeout(() => {
        document.getElementById("folio").value = "";
        document.getElementById("plant").value = "Plant1";
        document.getElementById("shift").value = "";
        document.getElementById("area").value = "Rough Cut";
        document.getElementById("ehs").value = "";
        document.getElementById("gerente").value = "Ernesto Guerrero";
        document.getElementById("fecha").value = "";
        document.getElementById("status").value = "In Process";
        document.getElementById("co").value = "Open";
        document.getElementById("descripcion").value = "";
        document.getElementById("pdf").value = "";
        document.getElementById("resultado").innerHTML = "🟢 Ready for new audit...";
    }, 2000);
}

// Asignar el evento al botón de manera segura al cargar el módulo
document.addEventListener("DOMContentLoaded", () => {
    const btnGuardar = document.querySelector("button");
    if (btnGuardar) {
        btnGuardar.addEventListener("click", guardar);
    }
});