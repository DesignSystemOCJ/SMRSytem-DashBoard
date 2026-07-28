const supabaseUrl = 
"https://mrxtqmvufmlozplszfxc.supabase.co";


const supabaseKey = 
"sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";


const supabaseClient = supabase.createClient(
    supabaseUrl,
    supabaseKey
);



const params = new URLSearchParams(window.location.search);

const projectId =
    params.get("id") ||
    params.get("ProjectID");

console.log("Proyecto recibido:", projectId);



// CARGAR PROYECTO


async function cargarProyecto() {

    console.log("ID recibido:", projectId);

    const { data, error } = await supabaseClient
        .from("Projects")
        .select("*")
        .eq("id", projectId)
        .single();

    // ===== VALIDACIÓN =====
    if (error) {

        console.error("Error:", error);

        alert("Error cargando proyecto:\n" + error.message);

        return;

    }

    if (!data) {

        alert("Proyecto no encontrado.");

        return;

    }

    console.log("Datos recibidos:", data);
document.getElementById("ProjectID").value =
    data.id ?? "";

    // ======================
    // LLENAR EL FORMULARIO
    // ======================

    document.getElementById("Folio").value =
        data.Folio ?? "";

    document.getElementById("ProjectName").value =
        data.ProjectName ?? "";

    document.getElementById("Type").value =
        data.Type ?? "";

    document.getElementById("Priority").value =
        data.Priority ?? "";

    document.getElementById("Status").value =
        data.Status ?? "";

    document.getElementById("Progress").value =
        data.Progress ?? "";

    document.getElementById("Lead").value =
        data.Lead ?? "";

    document.getElementById("Manager").value =
        data.Manager ?? "";

    document.getElementById("Department").value =
        data.Department ?? "";

    document.getElementById("DateStart").value =
        data.DateStart ?? "";

    document.getElementById("DateEnd").value =
        data.DateEnd ?? "";

    document.getElementById("ProblemDescription").value =
        data.ProblemDescription ?? "";

    document.getElementById("RemarksComments").value =
        data.RemarksComments ?? "";

    document.getElementById("Evidencebefore").src =
    data.EvidenceBefore
        ? data.EvidenceBefore
        : "https://via.placeholder.com/400x250?text=No+Image";

    document.getElementById("EvidenceAfter").src =
        data.EvidenceAfter
            ? data.EvidenceAfter
            : "https://via.placeholder.com/400x250?text=No+Image";

}

async function subirImagen(file, nombre){


    const {data,error}=await supabaseClient

    .storage

    .from("evidenceproject")

    .upload(
        nombre,
        file,
        {
            upsert:true
        }
    );


    if(error){

        throw error;

    }



    const url =
    supabaseUrl +
    "/storage/v1/object/public/evidenceproject/" +
    nombre;



    return url;


}

// ==========================
// VISTA PREVIA DE IMAGEN
// ==========================

function previewImage(input, idImagen){


    if(input.files && input.files[0]){


        const reader = new FileReader();



        reader.onload = function(e){


            document.getElementById(idImagen).src = e.target.result;


        };



        reader.readAsDataURL(input.files[0]);


    }


}







// GUARDAR CAMBIOS


async function guardarProyecto() {


    const btnSave = document.getElementById("btnSave");

    btnSave.innerHTML = "⏳ Saving...";
    btnSave.disabled = true;



    try {


        if(!projectId){

            alert("❌ No existe Project ID");
            return;

        }



        // ==========================
        // SUBIR NUEVAS IMAGENES
        // ==========================


        let evidenceBeforeURL = null;
        let evidenceAfterURL = null;



        const beforeFile =
        document.getElementById("EvidenceBeforeFile").files[0];


        const afterFile =
        document.getElementById("EvidenceAfterFile").files[0];



        if(beforeFile){


            evidenceBeforeURL =
            await subirImagen(
                beforeFile,
                "before_" + projectId + ".jpg"
            );


        }



        if(afterFile){


            evidenceAfterURL =
            await subirImagen(
                afterFile,
                "after_" + projectId + ".jpg"
            );


        }





        // ==========================
        // DATOS A ACTUALIZAR
        // ==========================


        const cambios = {



            ProjectName:
            document.getElementById("ProjectName").value,



            Type:
            document.getElementById("Type").value,



            Priority:
            document.getElementById("Priority").value,



            Status:
            document.getElementById("Status").value,



            Progress:
            document.getElementById("Progress").value,



            Lead:
            document.getElementById("Lead").value,



            Manager:
            document.getElementById("Manager").value,



            Department:
            document.getElementById("Department").value,



            DateStart:
            document.getElementById("DateStart").value,



            DateEnd:
            document.getElementById("DateEnd").value,



            ProblemDescription:
            document.getElementById("ProblemDescription").value,



            RemarksComments:
            document.getElementById("RemarksComments").value

        };





        // ==========================
        // AGREGAR IMAGENES SOLO SI CAMBIARON
        // ==========================


        if(evidenceBeforeURL){

            cambios.EvidenceBefore =
evidenceBeforeURL;

        }



        if(evidenceAfterURL){

            cambios.EvidenceAfter =
            evidenceAfterURL;

        }





        console.log("ID a actualizar:", projectId);

        console.log("Datos:", cambios);





        const { data, error } = await supabaseClient

            .from("Projects")

            .update(cambios)

            .eq("id", projectId)

            .select();





        if(error){

            throw error;

        }





        console.log("Respuesta Supabase:",data);





        if(!data || data.length === 0){


            alert(
            "❌ No se encontró el proyecto para actualizar"
            );


            return;

        }





        alert(
        "✅ Proyecto actualizado correctamente"
        );




        // limpiar selección de imágenes

        document.getElementById("EvidenceBeforeFile").value="";

        document.getElementById("EvidenceAfterFile").value="";



        modoLectura();


        cargarProyecto();



    }



    catch(err){


        alert(
        "❌ Error: " + err.message
        );


        console.error(err);


    }



    finally{


        btnSave.innerHTML="💾 Save";


        btnSave.disabled=true;


    }



}





// ELIMINAR


async function eliminarProyecto(){


if(!confirm(
"¿Eliminar proyecto?"
))

return;



const {error}=await supabaseClient

.from("Projects")

.delete()
.eq("id", projectId);



if(error){

alert(error.message);

}

else{

alert(
"Proyecto eliminado"
);


window.close();


}


}

window.onload = function(){

    cargarProyecto();

};

function activarEdicion(){


document.querySelectorAll("input").forEach(input=>{

    if(
        input.id !== "Folio" &&
        input.id !== "ProjectID"
    ){

        input.removeAttribute("readonly");

    }

});


document.querySelectorAll("textarea").forEach(textarea=>{

    textarea.removeAttribute("readonly");

});


document.getElementById("EvidenceBeforeFile").disabled = false;

document.getElementById("EvidenceAfterFile").disabled = false;


document.getElementById("btnSave").disabled=false;

document.getElementById("btnEdit").disabled=true;


}


function modoLectura(){


document.querySelectorAll("input").forEach(input=>{


    input.setAttribute(
    "readonly",
    true
    );


});



document.querySelectorAll("textarea").forEach(textarea=>{


    textarea.setAttribute(
    "readonly",
    true
    );


});



document.getElementById("btnSave").disabled=true;


document.getElementById("btnEdit").disabled=false;


}

