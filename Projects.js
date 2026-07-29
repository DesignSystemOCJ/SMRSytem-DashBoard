// ==========================================
// CONEXION SUPABASE
// ==========================================


const supabaseUrl =
"https://mrxtqmvufmlozplszfxc.supabase.co";

const supabaseKey =
"sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabaseClient = supabase.createClient(
    supabaseUrl,
    supabaseKey
);




// ==========================================
// GENERAR FOLIO AUTOMATICO
// ==========================================


async function generarFolio(){


    const year = new Date().getFullYear();



    const {data,error}=await supabaseClient

    .from("Projects")

    .select("Folio")

    .order("id",
    {
        ascending:false
    })

    .limit(1);



    let consecutivo=1;



    if(data && data.length>0){


        let ultimo=data[0].Folio;


        if(ultimo){


            let numero=

            parseInt(
                ultimo.split("-")[2]
            );


            consecutivo=numero+1;


        }


    }



    let folio=

    "PRJ-"+

    year+

    "-"+

    String(consecutivo)

    .padStart(4,"0");



    document.getElementById("folio").innerHTML=folio;



}

// ==========================================
// VALORES AUTOMATICOS DEL FORMULARIO
// ==========================================

function cargarValoresAutomaticos(){

    // Fecha actual
    const hoy = new Date();

    const fecha =
        hoy.getFullYear() + "-" +
        String(hoy.getMonth() + 1).padStart(2,"0") + "-" +
        String(hoy.getDate()).padStart(2,"0");

    document.getElementById("DateStart").value = fecha;

    // Department fijo
    document.getElementById("Department").value = "Rough Cut";

}

// ejecutar al abrir formulario

window.onload = function(){

    generarFolio();
    cargarValoresAutomaticos();

};





// ==========================================
// SUBIR IMAGEN STORAGE
// ==========================================


async function subirImagen(file,nombre){


    if(!file)
        return "";


    const extension =
    file.name.split(".").pop();


    const archivo =
    nombre +
    "-" +
    Date.now() +
    "." +
    extension;



    const {data,error}=await supabaseClient

    .storage

    .from("evidenceproject")

    .upload(
        archivo,
        file
    );



    if(error){

        console.log("ERROR STORAGE:",error);

        return "";

    }



    const {data:urlData}=

    supabaseClient

    .storage

    .from("evidenceproject")

    .getPublicUrl(
        archivo
    );



    console.log("URL IMAGEN:",
    urlData.publicUrl);



    return urlData.publicUrl;


}






// ==========================================
// GUARDAR PROYECTO
// ==========================================


async function guardarProyecto(){



const resultado=

document.getElementById("resultado");



resultado.innerHTML=

"⏳ Guardando proyecto...";





const folio=

document.getElementById("folio")

.innerText;




// archivos


const beforeFile=

document.getElementById(
"EvidenceBefore"
)

.files[0];



const afterFile=

document.getElementById(
"EvidenceAfter"
)

.files[0];




// subir imagenes


const urlBefore=

await subirImagen(
beforeFile,
"Before"
);



const urlAfter=

await subirImagen(
afterFile,
"After"
);







const proyecto={



DateStart:

document.getElementById("DateStart").value,



Department:

document.getElementById("Department").value,



Folio:

folio,



ProjectName:

document.getElementById("ProjectName").value,



Type:

document.getElementById("Type").value,



ProblemDescription:

document.getElementById("ProblemDescription").value,



EvidenceBefore:

urlBefore,



EvidenceAfter:

urlAfter,



DateEnd:

document.getElementById("DateEnd").value,



Priority:

document.getElementById("Priority").value,



Status:

document.getElementById("Status").value,



Lead:

document.getElementById("Lead").value,



Manager:

document.getElementById("Manager").value,



Approved:

document.getElementById("Approved").value,



Progress:

document.getElementById("Progress").value,



RemarksComments:

document.getElementById("RemarksComments").value



};






// INSERTAR SUPABASE


const {error}=

await supabaseClient

.from("Projects")

.insert([proyecto]);







if(error){


resultado.innerHTML=

"❌ Error: "+error.message;


console.log(error);


return;


}




resultado.innerHTML =
"✅ Proyecto guardado correctamente. Listo para nuevo registro";


setTimeout(()=>{

    limpiarFormulario();

    generarFolio();

},1500);


} // 👈 ESTA LLAVE CIERRA guardarProyecto()


// ==========================================
// LIMPIAR FORMULARIO
// ==========================================

function limpiarFormulario(){


    let campos=document.querySelectorAll(
        "input, textarea, select"
    );


    campos.forEach(c=>{

        if(c.type === "file"){

            c.value = "";

        }
        else if(c.tagName === "SELECT"){

            c.selectedIndex = 0;

        }
        else{

            c.value = "";

        }

    });


    document.getElementById("Progress").value = 0;

// Restaurar campos automáticos
cargarValoresAutomaticos();

}