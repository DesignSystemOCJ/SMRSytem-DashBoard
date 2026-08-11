/* =========================================================
   PROJECT DETAIL - PREMIUM (CORREGIDO)
========================================================= */

const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

/* =========================================================
   GET PROJECT ID FROM URL
========================================================= */

const params = new URLSearchParams(window.location.search);
const projectId = params.get("id") || params.get("ProjectID");

console.log("=================================");
console.log("PROJECT DETAIL");
console.log("URL:", window.location.href);
console.log("Project ID:", projectId);
console.log("=================================");

/* =========================================================
   HELPERS
========================================================= */

function setValue(id, value) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn("Elemento no encontrado:", id);
        return;
    }
    element.value = value ?? "";
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn("Elemento visual no encontrado:", id);
        return;
    }
    element.textContent = value ?? "—";
}

/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit"
    });
}

/* =========================================================
   UPDATE PROGRESS
========================================================= */

function updateProgress(value) {
    let progress = parseFloat(value);
    if (isNaN(progress)) progress = 0;
    progress = Math.max(0, Math.min(100, progress));

    const display = document.getElementById("progressDisplay");
    if (display) {
        display.textContent = Math.round(progress) + "%";
    }

    const ring = document.getElementById("progressRing");
    if (ring) {
        const degrees = progress * 3.6;
        ring.style.background = `conic-gradient(
            #28b8ff 0deg,
            #1777ff ${degrees}deg,
            rgba(255,255,255,.07) ${degrees}deg
        )`;
    }

    const input = document.getElementById("Progress");
    if (input) {
        input.value = progress;
    }
}

/* =========================================================
   UPDATE STATUS
========================================================= */

function updateStatus(status) {
    const header = document.getElementById("headerStatus");
    if (!header) return;

    const value = status || "Unknown";
    let className = "neutral";
    const normalized = String(value).toLowerCase();

    if (normalized.includes("complete") || normalized.includes("completed") || normalized.includes("closed") || normalized.includes("done")) {
        className = "success";
    } else if (normalized.includes("progress") || normalized.includes("active") || normalized.includes("open")) {
        className = "info";
    } else if (normalized.includes("pending") || normalized.includes("hold") || normalized.includes("delay")) {
        className = "warning";
    }

    header.className = "status-badge " + className;
    header.innerHTML = `
        <span class="status-dot"></span>
        <span>${value}</span>
    `;
}

/* =========================================================
   UPDATE PRIORITY
========================================================= */

function updatePriority(priority) {
    const badge = document.getElementById("priorityBadge");
    if (!badge) return;

    const value = priority || "—";
    badge.className = "priority-badge";
    const normalized = String(value).toLowerCase();

    if (normalized.includes("high") || normalized.includes("critical")) {
        badge.classList.add("high");
    } else if (normalized.includes("medium") || normalized.includes("normal")) {
        badge.classList.add("medium");
    } else if (normalized.includes("low")) {
        badge.classList.add("low");
    } else {
        badge.classList.add("neutral");
    }

    badge.textContent = value;
}

/* =========================================================
   LOAD PROJECT
========================================================= */

async function cargarProyecto() {
    console.log("Iniciando cargarProyecto...");

    if (!projectId) {
        console.error("NO SE RECIBIÓ PROJECT ID");
        alert("❌ No se encontró el Project ID en la URL.\n\nLa URL debe tener este formato:\nProject_Detail.html?id=XXXXXXXX");
        return;
    }

    const { data, error } = await supabaseClient
        .from("Projects")
        .select("*")
        .eq("id", projectId)
        .single();

    if (error) {
        console.error("ERROR SUPABASE:", error);
        alert("❌ Error cargando proyecto:\n\n" + error.message);
        return;
    }

    if (!data) {
        alert("❌ Proyecto no encontrado.");
        return;
    }

    console.log("Proyecto cargado correctamente:", data);

    // 1. Asignar valores a inputs editables
    setValue("ProjectID", data.id);
    setValue("Folio", data.Folio);
    setValue("ProjectName", data.ProjectName);
    setValue("Type", data.Type);
    setValue("Priority", data.Priority);
    setValue("Status", data.Status);
    setValue("Progress", data.Progress);
    setValue("Lead", data.Lead);
    setValue("Manager", data.Manager);
    setValue("Department", data.Department);
    setValue("DateStart", data.DateStart);
    setValue("DateEnd", data.DateEnd);
    setValue("ProblemDescription", data.ProblemDescription);
    setValue("RemarksComments", data.RemarksComments);

    // 2. Asignar valores a las vistas Premium del HTML nuevo
    setText("ProjectNameDisplay", data.ProjectName);
    setText("FolioDisplay", data.Folio);
    setText("ProjectIDDisplay", data.id);
    setText("TypeDisplay", data.Type);
    setText("DateStartDisplay", formatDate(data.DateStart));
    setText("DateEndDisplay", formatDate(data.DateEnd));
    setText("StatusDisplay", data.Status);

    // 3. Actualizar componentes visuales avanzados
    updateStatus(data.Status);
    updatePriority(data.Priority);
    updateProgress(data.Progress);

    // 4. Imágenes de Evidencia
    const before = document.getElementById("Evidencebefore");
    if (before) {
        if (data.EvidenceBefore) {
            before.src = data.EvidenceBefore;
        } else {
            before.removeAttribute("src");
        }
    }

    const after = document.getElementById("EvidenceAfter");
    if (after) {
        if (data.EvidenceAfter) {
            after.src = data.EvidenceAfter;
        } else {
            after.removeAttribute("src");
        }
    }

    console.log("=================================");
    console.log("PROCESO DE CARGA FINALIZADO");
    console.log("=================================");
}

/* =========================================================
   UPLOAD IMAGE
========================================================= */

async function subirImagen(file, nombre) {
    const { data, error } = await supabaseClient
        .storage
        .from("evidenceproject")
        .upload(nombre, file, { upsert: true });

    if (error) {
        throw error;
    }

    return supabaseUrl + "/storage/v1/object/public/evidenceproject/" + nombre;
}

/* =========================================================
   IMAGE PREVIEW
========================================================= */

function previewImage(input, idImagen) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const image = document.getElementById(idImagen);
            if (image) {
                image.src = event.target.result;
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

/* =========================================================
   SAVE
========================================================= */

async function guardarProyecto() {
    const btnSave = document.getElementById("btnSave");
    if (btnSave) {
        btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        btnSave.disabled = true;
    }

    try {
        if (!projectId) {
            alert("❌ No existe Project ID");
            return;
        }

        let evidenceBeforeURL = null;
        let evidenceAfterURL = null;

        const beforeInput = document.getElementById("EvidenceBeforeFile");
        const afterInput = document.getElementById("EvidenceAfterFile");

        const beforeFile = beforeInput?.files?.[0];
        const afterFile = afterInput?.files?.[0];

        if (beforeFile) {
            evidenceBeforeURL = await subirImagen(beforeFile, "before_" + projectId + ".jpg");
        }

        if (afterFile) {
            evidenceAfterURL = await subirImagen(afterFile, "after_" + projectId + ".jpg");
        }

        const cambios = {
            ProjectName: document.getElementById("ProjectName")?.value || "",
            Type: document.getElementById("Type")?.value || "",
            Priority: document.getElementById("Priority")?.value || "",
            Status: document.getElementById("Status")?.value || "",
            Progress: document.getElementById("Progress")?.value || "",
            Lead: document.getElementById("Lead")?.value || "",
            Manager: document.getElementById("Manager")?.value || "",
            Department: document.getElementById("Department")?.value || "",
            DateStart: document.getElementById("DateStart")?.value || "",
            DateEnd: document.getElementById("DateEnd")?.value || "",
            ProblemDescription: document.getElementById("ProblemDescription")?.value || "",
            RemarksComments: document.getElementById("RemarksComments")?.value || ""
        };

        if (evidenceBeforeURL) cambios.EvidenceBefore = evidenceBeforeURL;
        if (evidenceAfterURL) cambios.EvidenceAfter = evidenceAfterURL;

        const { data, error } = await supabaseClient
            .from("Projects")
            .update(cambios)
            .eq("id", projectId)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            alert("❌ No se encontró el proyecto.");
            return;
        }

        alert("✅ Proyecto actualizado correctamente");

        if (beforeInput) beforeInput.value = "";
        if (afterInput) afterInput.value = "";

        modoLectura();
        await cargarProyecto();

    } catch (error) {
        console.error(error);
        alert("❌ Error:\n" + error.message);
    } finally {
        if (btnSave) {
            btnSave.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save';
            btnSave.disabled = true;
        }
    }
}

/* =========================================================
   DELETE
========================================================= */

async function eliminarProyecto() {
    if (!confirm("¿Eliminar proyecto?")) return;

    const { error } = await supabaseClient
        .from("Projects")
        .delete()
        .eq("id", projectId);

    if (error) {
        alert(error.message);
    } else {
        alert("Proyecto eliminado");
        window.close();
    }
}

/* =========================================================
   EDIT MODE
========================================================= */

function activarEdicion() {
    document.querySelectorAll("input").forEach(input => {
        if (input.id !== "Folio" && input.id !== "ProjectID") {
            input.removeAttribute("readonly");
            input.classList.add("editing");
        }
    });

    document.querySelectorAll("textarea").forEach(textarea => {
        textarea.removeAttribute("readonly");
        textarea.classList.add("editing");
    });

    const before = document.getElementById("EvidenceBeforeFile");
    const after = document.getElementById("EvidenceAfterFile");

    if (before) before.disabled = false;
    if (after) after.disabled = false;

    const btnSave = document.getElementById("btnSave");
    const btnEdit = document.getElementById("btnEdit");

    if (btnSave) btnSave.disabled = false;
    if (btnEdit) btnEdit.disabled = true;
}

/* =========================================================
   READ MODE
========================================================= */

function modoLectura() {
    document.querySelectorAll("input").forEach(input => {
        input.setAttribute("readonly", true);
        input.classList.remove("editing");
    });

    document.querySelectorAll("textarea").forEach(textarea => {
        textarea.setAttribute("readonly", true);
        textarea.classList.remove("editing");
    });

    const before = document.getElementById("EvidenceBeforeFile");
    const after = document.getElementById("EvidenceAfterFile");

    if (before) before.disabled = true;
    if (after) after.disabled = true;

    const btnSave = document.getElementById("btnSave");
    const btnEdit = document.getElementById("btnEdit");

    if (btnSave) btnSave.disabled = true;
    if (btnEdit) btnEdit.disabled = false;
}

/* =========================================================
   START
========================================================= */

document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM listo.");
    cargarProyecto();
});