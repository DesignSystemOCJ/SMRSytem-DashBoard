/* =========================================================
   PROJECT DETAIL
   VERSION CORREGIDA
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const supabaseUrl =
    "https://mrxtqmvufmlozplszfxc.supabase.co";

const supabaseKey =
    "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabaseClient =
    supabase.createClient(
        supabaseUrl,
        supabaseKey
    );


/* =========================================================
   GET PROJECT ID
========================================================= */

const params =
    new URLSearchParams(window.location.search);

const projectId =
    params.get("id") ||
    params.get("ProjectID");


console.log("=================================");
console.log("PROJECT DETAIL");
console.log("URL:", window.location.href);
console.log("Project ID:", projectId);
console.log("=================================");


/* =========================================================
   HELPERS
========================================================= */

function setValue(id, value) {

    const element =
        document.getElementById(id);

    if (!element) {

        console.warn(
            "Elemento no encontrado:",
            id
        );

        return;
    }

    element.value =
        value ?? "";

}


function setText(id, value) {

    const element =
        document.getElementById(id);

    if (!element) {

        console.warn(
            "Elemento visual no encontrado:",
            id
        );

        return;
    }

    element.textContent =
        value ?? "—";

}


/* =========================================================
   DATE
========================================================= */

function normalizeDateForInput(value) {

    if (!value) {
        return "";
    }


    /*
       Supabase puede devolver:

       2026-08-13

       o:

       2026-08-13T00:00:00
    */

    const stringValue =
        String(value);


    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            stringValue
        )
    ) {

        return stringValue;

    }


    if (
        stringValue.includes("T")
    ) {

        return stringValue
            .split("T")[0];

    }


    return "";

}


/* =========================================================
   DATE DISPLAY
========================================================= */

function formatDate(value) {

    if (!value) {
        return "—";
    }


    const normalized =
        normalizeDateForInput(value);


    if (!normalized) {
        return "—";
    }


    const date =
        new Date(
            normalized + "T00:00:00"
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return "—";

    }


    return date.toLocaleDateString(
        "en-US",
        {
            year: "numeric",
            month: "short",
            day: "2-digit"
        }
    );

}


/* =========================================================
   UPDATE PROGRESS
========================================================= */

function updateProgress(value) {

    let progress =
        parseFloat(value);


    if (isNaN(progress)) {
        progress = 0;
    }


    progress =
        Math.max(
            0,
            Math.min(
                100,
                progress
            )
        );


    const display =
        document.getElementById(
            "progressDisplay"
        );


    if (display) {

        display.textContent =
            Math.round(progress) + "%";

    }


    const ring =
        document.getElementById(
            "progressRing"
        );


    if (ring) {

        const degrees =
            progress * 3.6;


        ring.style.background =
            `conic-gradient(
                #28b8ff 0deg,
                #1777ff ${degrees}deg,
                rgba(255,255,255,.07) ${degrees}deg
            )`;

    }


    const input =
        document.getElementById(
            "Progress"
        );


    if (input) {

        input.value =
            progress;

    }

}


/* =========================================================
   UPDATE STATUS
========================================================= */

function updateStatus(status) {

    const header =
        document.getElementById(
            "headerStatus"
        );


    if (!header) {
        return;
    }


    const value =
        status || "Unknown";


    let className =
        "neutral";


    const normalized =
        String(value).toLowerCase();


    if (
        normalized.includes("complete") ||
        normalized.includes("completed") ||
        normalized.includes("closed") ||
        normalized.includes("done")
    ) {

        className =
            "success";

    }

    else if (
        normalized.includes("progress") ||
        normalized.includes("active") ||
        normalized.includes("open")
    ) {

        className =
            "info";

    }

    else if (
        normalized.includes("pending") ||
        normalized.includes("hold") ||
        normalized.includes("delay")
    ) {

        className =
            "warning";

    }


    header.className =
        "status-badge " +
        className;


    header.innerHTML = `
        <span class="status-dot"></span>
        <span>${value}</span>
    `;

}


/* =========================================================
   UPDATE PRIORITY
========================================================= */

function updatePriority(priority) {

    const badge =
        document.getElementById(
            "priorityBadge"
        );


    if (!badge) {
        return;
    }


    const value =
        priority || "—";


    badge.className =
        "priority-badge";


    const normalized =
        String(value).toLowerCase();


    if (
        normalized.includes("high") ||
        normalized.includes("critical")
    ) {

        badge.classList.add(
            "high"
        );

    }

    else if (
        normalized.includes("medium") ||
        normalized.includes("normal")
    ) {

        badge.classList.add(
            "medium"
        );

    }

    else if (
        normalized.includes("low")
    ) {

        badge.classList.add(
            "low"
        );

    }

    else {

        badge.classList.add(
            "neutral"
        );

    }


    badge.textContent =
        value;

}


/* =========================================================
   LOAD PROJECT
========================================================= */

async function cargarProyecto() {

    console.log(
        "Iniciando cargarProyecto..."
    );


    if (!projectId) {

        console.error(
            "NO SE RECIBIÓ PROJECT ID"
        );


        alert(
            "❌ No se encontró el Project ID en la URL."
        );


        return;
    }


    const {
        data,
        error
    } = await supabaseClient

        .from("Projects")

        .select("*")

        .eq(
            "id",
            projectId
        )

        .single();


    if (error) {

        console.error(
            "ERROR SUPABASE:",
            error
        );


        alert(
            "❌ Error cargando proyecto:\n\n" +
            error.message
        );


        return;
    }


    if (!data) {

        alert(
            "❌ Proyecto no encontrado."
        );


        return;
    }


    console.log(
        "Proyecto cargado correctamente:",
        data
    );


    /* =====================================================
       INPUTS
    ====================================================== */

    setValue(
        "Type",
        data.Type
    );


    setValue(
        "Status",
        data.Status
    );


    setValue(
        "Lead",
        data.Lead
    );


    setValue(
        "Manager",
        data.Manager
    );


    setValue(
        "Department",
        data.Department
    );


    setValue(
        "ProblemDescription",
        data.ProblemDescription
    );


    setValue(
        "RemarksComments",
        data.RemarksComments
    );


    /* =====================================================
       DATES
    ====================================================== */

    setValue(
        "DateStart",
        normalizeDateForInput(
            data.DateStart
        )
    );


    setValue(
        "DateEnd",
        normalizeDateForInput(
            data.DateEnd
        )
    );


    /* =====================================================
       PROGRESS
    ====================================================== */

    setValue(
        "Progress",
        data.Progress
    );


    /* =====================================================
       DISPLAY
    ====================================================== */

    setText(
        "ProjectNameDisplay",
        data.ProjectName
    );


    setText(
        "FolioDisplay",
        data.Folio
    );


    setText(
        "ProjectIDDisplay",
        data.id
    );


    setText(
        "TypeDisplay",
        data.Type
    );


    setText(
        "DateStartDisplay",
        formatDate(
            data.DateStart
        )
    );


    setText(
        "DateEndDisplay",
        formatDate(
            data.DateEnd
        )
    );


    setText(
        "StatusDisplay",
        data.Status
    );


    /* =====================================================
       COMPONENTS
    ====================================================== */

    updateStatus(
        data.Status
    );


    updatePriority(
        data.Priority
    );


    updateProgress(
        data.Progress
    );


    /* =====================================================
       EVIDENCE BEFORE
    ====================================================== */

    const before =
        document.getElementById(
            "Evidencebefore"
        );


    if (before) {

        if (data.EvidenceBefore) {

            before.src =
                data.EvidenceBefore;

        }

        else {

            before.removeAttribute(
                "src"
            );

        }

    }


    /* =====================================================
       EVIDENCE AFTER
    ====================================================== */

    const after =
        document.getElementById(
            "EvidenceAfter"
        );


    if (after) {

        if (data.EvidenceAfter) {

            after.src =
                data.EvidenceAfter;

        }

        else {

            after.removeAttribute(
                "src"
            );

        }

    }


    console.log(
        "================================="
    );

    console.log(
        "PROCESO DE CARGA FINALIZADO"
    );

    console.log(
        "================================="
    );

}


/* =========================================================
   UPLOAD IMAGE
========================================================= */

async function subirImagen(
    file,
    nombre
) {

    const {
        data,
        error
    } = await supabaseClient

        .storage

        .from(
            "evidenceproject"
        )

        .upload(
            nombre,
            file,
            {
                upsert: true
            }
        );


    if (error) {
        throw error;
    }


    return (
        supabaseUrl +
        "/storage/v1/object/public/evidenceproject/" +
        nombre
    );

}


/* =========================================================
   IMAGE PREVIEW
========================================================= */

function previewImage(
    input,
    idImagen
) {

    if (
        input.files &&
        input.files[0]
    ) {

        const reader =
            new FileReader();


        reader.onload =
            function(event) {

                const image =
                    document.getElementById(
                        idImagen
                    );


                if (image) {

                    image.src =
                        event.target.result;

                }

            };


        reader.readAsDataURL(
            input.files[0]
        );

    }

}


/* =========================================================
   SAVE PROJECT
========================================================= */

async function guardarProyecto() {

    const btnSave =
        document.getElementById(
            "btnSave"
        );


    if (btnSave) {

        btnSave.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

        btnSave.disabled =
            true;

    }


    try {


        /* =================================================
           PROJECT ID
        ================================================== */

        if (!projectId) {

            alert(
                "❌ No existe Project ID"
            );

            return;

        }


        /* =================================================
           IMAGE FILES
        ================================================== */

        let evidenceBeforeURL =
            null;

        let evidenceAfterURL =
            null;


        const beforeInput =
            document.getElementById(
                "EvidenceBeforeFile"
            );


        const afterInput =
            document.getElementById(
                "EvidenceAfterFile"
            );


        const beforeFile =
            beforeInput?.files?.[0];


        const afterFile =
            afterInput?.files?.[0];


        /* =================================================
           UPLOAD BEFORE
        ================================================== */

        if (beforeFile) {

            evidenceBeforeURL =
                await subirImagen(
                    beforeFile,
                    "before_" +
                    projectId +
                    ".jpg"
                );

        }


        /* =================================================
           UPLOAD AFTER
        ================================================== */

        if (afterFile) {

            evidenceAfterURL =
                await subirImagen(
                    afterFile,
                    "after_" +
                    projectId +
                    ".jpg"
                );

        }


        /* =================================================
           GET DATE VALUES
        ================================================== */

        const dateStartElement =
            document.getElementById(
                "DateStart"
            );


        const dateEndElement =
            document.getElementById(
                "DateEnd"
            );


        const dateStart =
            dateStartElement?.value?.trim()
                ? dateStartElement.value
                : null;


        const dateEnd =
            dateEndElement?.value?.trim()
                ? dateEndElement.value
                : null;


        console.log(
            "DateStart que se enviará:",
            dateStart
        );


        console.log(
            "DateEnd que se enviará:",
            dateEnd
        );


        /* =================================================
           BUILD UPDATE
        ================================================== */

        const cambios = {

            Type:
                document.getElementById(
                    "Type"
                )?.value || null,


            Status:
                document.getElementById(
                    "Status"
                )?.value || null,


            Progress:
                document.getElementById(
                    "Progress"
                )?.value !== ""
                    ? Number(
                        document.getElementById(
                            "Progress"
                        ).value
                    )
                    : null,


            Lead:
                document.getElementById(
                    "Lead"
                )?.value || null,


            Manager:
                document.getElementById(
                    "Manager"
                )?.value || null,


            Department:
                document.getElementById(
                    "Department"
                )?.value || null,


            DateStart:
                dateStart,


            DateEnd:
                dateEnd,


            ProblemDescription:
                document.getElementById(
                    "ProblemDescription"
                )?.value || null,


            RemarksComments:
                document.getElementById(
                    "RemarksComments"
                )?.value || null

        };


        /* =================================================
           IMAGE URLS
        ================================================== */

        if (evidenceBeforeURL) {

            cambios.EvidenceBefore =
                evidenceBeforeURL;

        }


        if (evidenceAfterURL) {

            cambios.EvidenceAfter =
                evidenceAfterURL;

        }


        console.log(
            "DATOS QUE SE ENVIARÁN A SUPABASE:"
        );

        console.log(
            cambios
        );


        /* =================================================
           UPDATE SUPABASE
        ================================================== */

        const {
            data,
            error
        } = await supabaseClient

            .from("Projects")

            .update(
                cambios
            )

            .eq(
                "id",
                projectId
            )

            .select();


        if (error) {

            console.error(
                "ERROR AL ACTUALIZAR:",
                error
            );

            throw error;

        }


        if (
            !data ||
            data.length === 0
        ) {

            alert(
                "❌ The project was not found."
            );

            return;

        }


        /* =================================================
           SUCCESS
        ================================================== */

        alert(
            "✅ Project successfully updated"
        );


        if (beforeInput) {
            beforeInput.value = "";
        }


        if (afterInput) {
            afterInput.value = "";
        }


        modoLectura();


        await cargarProyecto();


    }

    catch (error) {

        console.error(
            error
        );


        alert(
            "❌ Error:\n\n" +
            error.message
        );

    }


    finally {

        if (btnSave) {

            btnSave.innerHTML =
                '<i class="fa-solid fa-floppy-disk"></i> Save';

            btnSave.disabled =
                true;

        }

    }

}


/* =========================================================
   DELETE
========================================================= */

async function eliminarProyecto() {

    if (
        !confirm(
            "¿Eliminar proyecto?"
        )
    ) {

        return;

    }


    const {
        error
    } = await supabaseClient

        .from("Projects")

        .delete()

        .eq(
            "id",
            projectId
        );


    if (error) {

        alert(
            error.message
        );

    }

    else {

        alert(
            "Proyecto eliminado"
        );


        window.location.href =
            "Projects.html";

    }

}


/* =========================================================
   EDIT MODE
========================================================= */

function activarEdicion() {


    /* =====================================================
       INPUTS
    ====================================================== */

    document
        .querySelectorAll(
            "input"
        )
        .forEach(
            input => {

                /*
                   No permitir editar
                   archivos de forma automática.
                */

                if (
                    input.type === "file"
                ) {

                    input.disabled =
                        false;

                    return;

                }


                input.removeAttribute(
                    "readonly"
                );


                input.classList.add(
                    "editing"
                );

            }
        );


    /* =====================================================
       TEXTAREAS
    ====================================================== */

    document
        .querySelectorAll(
            "textarea"
        )
        .forEach(
            textarea => {

                textarea.removeAttribute(
                    "readonly"
                );


                textarea.classList.add(
                    "editing"
                );

            }
        );


    /* =====================================================
       BUTTONS
    ====================================================== */

    const btnSave =
        document.getElementById(
            "btnSave"
        );


    const btnEdit =
        document.getElementById(
            "btnEdit"
        );


    if (btnSave) {

        btnSave.disabled =
            false;

    }


    if (btnEdit) {

        btnEdit.disabled =
            true;

    }


    console.log(
        "Modo edición activado"
    );

}


/* =========================================================
   READ MODE
========================================================= */

function modoLectura() {


    /* =====================================================
       INPUTS
    ====================================================== */

    document
        .querySelectorAll(
            "input"
        )
        .forEach(
            input => {

                if (
                    input.type === "file"
                ) {

                    input.disabled =
                        true;

                    return;

                }


                input.setAttribute(
                    "readonly",
                    true
                );


                input.classList.remove(
                    "editing"
                );

            }
        );


    /* =====================================================
       TEXTAREAS
    ====================================================== */

    document
        .querySelectorAll(
            "textarea"
        )
        .forEach(
            textarea => {

                textarea.setAttribute(
                    "readonly",
                    true
                );


                textarea.classList.remove(
                    "editing"
                );

            }
        );


    /* =====================================================
       BUTTONS
    ====================================================== */

    const btnSave =
        document.getElementById(
            "btnSave"
        );


    const btnEdit =
        document.getElementById(
            "btnEdit"
        );


    if (btnSave) {

        btnSave.disabled =
            true;

    }


    if (btnEdit) {

        btnEdit.disabled =
            false;

    }


    console.log(
        "Modo lectura activado"
    );

}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "DOM listo."
        );


        cargarProyecto();

    }
);
