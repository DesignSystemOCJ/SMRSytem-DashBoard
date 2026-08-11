/* =========================================================
   SMRC PROJECT MANAGEMENT
   PROJECTS.JS
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabaseClient = supabase.createClient(
    supabaseUrl,
    supabaseKey
);


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let proyectos = [];

let proyectosFiltrados = [];

let currentPage = 1;

const projectsPerPage = 10;

let sortColumn = null;

let sortDirection = "asc";

let selectedProjectId = null;


/* =========================================================
   LOAD PROJECTS
   ========================================================= */

async function cargarProjects() {

    console.log("Cargando Projects...");

    const { data, error } = await supabaseClient
        .from("Projects")
        .select(`
            id,
            Folio,
            ProjectName,
            Type,
            Lead,
            DateStart,
            DateEnd,
            Progress,
            Approved,
            Status
        `)
        .order("Folio");


    if (error) {

        console.error("Error Supabase:", error);

        document.getElementById("tablaProjects").innerHTML = `
            <tr>
                <td colspan="11">
                    ❌ Error cargando datos: ${error.message}
                </td>
            </tr>
        `;

        return;
    }


    console.log("Datos recibidos:", data);

    proyectos = data || [];

    proyectosFiltrados = [...proyectos];

    mostrarProjects(proyectosFiltrados);

    actualizarKPIs(proyectos);

    crearControles();

    actualizarResumen();

    actualizarPaginacion();
}


/* =========================================================
   CREATE DYNAMIC CONTROLS
   ========================================================= */

function crearControles() {

    const toolbar = document.querySelector(".toolbar");

    if (!toolbar) return;


    /* =========================
       STATUS FILTER
       ========================= */

    if (!document.getElementById("statusFilter")) {

        const filter = document.createElement("select");

        filter.id = "statusFilter";

        filter.innerHTML = `
            <option value="all">All Status</option>
            <option value="En Proceso">In Process</option>
            <option value="Completado">Completed</option>
            <option value="En Espera">Waiting</option>
        `;


        filter.addEventListener("change", aplicarFiltros);


        toolbar.insertBefore(
            filter,
            toolbar.querySelector("button")
        );
    }


    /* =========================
       PAGINATION
       ========================= */

    if (!document.getElementById("pagination")) {

        const pagination = document.createElement("div");

        pagination.id = "pagination";

        document.querySelector(".table-card").appendChild(
            pagination
        );
    }


    /* =========================
       SUMMARY
       ========================= */

    if (!document.getElementById("projectSummary")) {

        const summary = document.createElement("div");

        summary.id = "projectSummary";

        const tableHeader = document.querySelector(".table-header");

        if (tableHeader) {

            tableHeader.appendChild(summary);

        }
    }


    /* =========================
       SORTABLE HEADERS
       ========================= */

    const headers = document.querySelectorAll("thead th");

    headers.forEach((header, index) => {

        if (index === 10) return;

        header.style.cursor = "pointer";

        header.onclick = function () {

            ordenarPorColumna(index);

        };

    });
}


/* =========================================================
   DISPLAY PROJECTS
   ========================================================= */

function mostrarProjects(data) {

    const tabla = document.getElementById("tablaProjects");

    tabla.innerHTML = "";


    const start = (currentPage - 1) * projectsPerPage;

    const end = start + projectsPerPage;

    const pagina = data.slice(start, end);


    if (pagina.length === 0) {

        tabla.innerHTML = `
            <tr>
                <td colspan="11" style="text-align:center; padding:35px;">
                    No projects found
                </td>
            </tr>
        `;

        return;
    }


    pagina.forEach(project => {

        const progress = Number(project.Progress || 0);

        let progressClass = "progress-low";

        if (progress >= 70) {

            progressClass = "progress-high";

        } else if (progress >= 40) {

            progressClass = "progress-medium";

        }


        /* =========================
           STATUS
           ========================= */

        const status = project.Status || "";

        let statusClass = "process";

        if (
            status === "Completado" ||
            status === "Completed"
        ) {

            statusClass = "finish";

        } else if (
            status === "En Espera" ||
            status === "Waiting"
        ) {

            statusClass = "waiting";

        }


        /* =========================
           SELECTED ROW
           ========================= */

        const selectedClass =
            selectedProjectId == project.id
                ? "selected-project"
                : "";


        tabla.innerHTML += `

            <tr class="${selectedClass}">

                <td>${project.id}</td>

                <td>
                    <strong>${project.Folio ?? ""}</strong>
                </td>

                <td>
                    ${project.ProjectName ?? ""}
                </td>

                <td>
                    ${project.Type ?? ""}
                </td>

                <td>
                    ${project.Lead ?? ""}
                </td>

                <td>
                    ${project.DateStart ?? ""}
                </td>

                <td>
                    ${project.DateEnd ?? ""}
                </td>


                <td>

                    <div class="progress">

                        <div
                            class="bar ${progressClass}"
                            style="width:${progress}%">
                        </div>

                    </div>

                    <span class="progress-number">
                        ${progress}%
                    </span>

                </td>


                <td>

                    ${project.Approved ?? ""}

                </td>


                <td>

                    <span class="status ${statusClass}">

                        <span class="status-dot"></span>

                        ${status}

                    </span>

                </td>


                <td>

                    <button
                        class="icon view"
                        onclick="verProyecto(${project.id})">

                        <i class="fa-solid fa-eye"></i>

                    </button>

                </td>

            </tr>

        `;
    });
}


/* =========================================================
   KPI
   ========================================================= */

function actualizarKPIs(data) {

    document.getElementById("totalProjects").innerHTML =
        data.length;


    document.getElementById("processProjects").innerHTML =
        data.filter(
            p =>
                p.Status === "En Proceso" ||
                p.Status === "In Process"
        ).length;


    document.getElementById("completeProjects").innerHTML =
        data.filter(
            p =>
                p.Status === "Completado" ||
                p.Status === "Completed"
        ).length;


    document.getElementById("waitingProjects").innerHTML =
        data.filter(
            p =>
                p.Status === "En Espera" ||
                p.Status === "Waiting"
        ).length;


    let totalProgress = data.reduce(

        (sum, project) =>

            sum + Number(project.Progress || 0),

        0
    );


    let averageProgress = 0;


    if (data.length > 0) {

        averageProgress =
            totalProgress / data.length;

    }


    document.getElementById("averageProgress").innerHTML =
        averageProgress.toFixed(1) + "%";
}


/* =========================================================
   SEARCH + FILTER
   ========================================================= */

function aplicarFiltros() {

    const searchInput =
        document.getElementById("buscar");

    const statusFilter =
        document.getElementById("statusFilter");


    const texto =
        searchInput.value
            .trim()
            .toLowerCase();


    const status =
        statusFilter
            ? statusFilter.value
            : "all";


    proyectosFiltrados = proyectos.filter(project => {


        /* =========================
           SEARCH
           ========================= */

        const searchableText = `

            ${project.id ?? ""}

            ${project.Folio ?? ""}

            ${project.ProjectName ?? ""}

            ${project.Type ?? ""}

            ${project.Lead ?? ""}

            ${project.DateStart ?? ""}

            ${project.DateEnd ?? ""}

            ${project.Approved ?? ""}

            ${project.Status ?? ""}

        `.toLowerCase();


        const matchesSearch =
            searchableText.includes(texto);


        /* =========================
           STATUS
           ========================= */

        const matchesStatus =
            status === "all" ||
            project.Status === status;


        return matchesSearch && matchesStatus;

    });


    currentPage = 1;

    mostrarProjects(proyectosFiltrados);

    actualizarResumen();

    actualizarPaginacion();
}


/* =========================================================
   SEARCH EVENT
   ========================================================= */

document
    .getElementById("buscar")
    .addEventListener(
        "input",
        aplicarFiltros
    );


/* =========================================================
   SORTING
   ========================================================= */

function ordenarPorColumna(index) {

    const columnas = [

        "id",
        "Folio",
        "ProjectName",
        "Type",
        "Lead",
        "DateStart",
        "DateEnd",
        "Progress",
        "Approved",
        "Status"

    ];


    const column = columnas[index];


    if (!column) return;


    if (sortColumn === column) {

        sortDirection =
            sortDirection === "asc"
                ? "desc"
                : "asc";

    } else {

        sortColumn = column;

        sortDirection = "asc";

    }


    proyectosFiltrados.sort((a, b) => {

        let valueA = a[column];

        let valueB = b[column];


        if (column === "Progress") {

            valueA = Number(valueA || 0);

            valueB = Number(valueB || 0);

        } else {

            valueA =
                String(valueA ?? "").toLowerCase();

            valueB =
                String(valueB ?? "").toLowerCase();

        }


        if (valueA < valueB) {

            return sortDirection === "asc"
                ? -1
                : 1;

        }


        if (valueA > valueB) {

            return sortDirection === "asc"
                ? 1
                : -1;

        }


        return 0;

    });


    currentPage = 1;

    mostrarProjects(proyectosFiltrados);

    actualizarPaginacion();

    actualizarIndicadoresOrden(index);
}


/* =========================================================
   SORT ARROWS
   ========================================================= */

function actualizarIndicadoresOrden(index) {

    const headers =
        document.querySelectorAll("thead th");


    headers.forEach(
        header => {

            header.innerHTML =
                header.innerHTML
                    .replace(
                        / ↑| ↓/g,
                        ""
                    );

        }
    );


    if (headers[index]) {

        headers[index].innerHTML +=
            sortDirection === "asc"
                ? " ↑"
                : " ↓";

    }
}


/* =========================================================
   PAGINATION
   ========================================================= */

function actualizarPaginacion() {

    const container =
        document.getElementById("pagination");

    if (!container) return;


    const totalPages =
        Math.ceil(
            proyectosFiltrados.length /
            projectsPerPage
        );


    container.innerHTML = "";


    if (totalPages <= 1) {

        return;

    }


    const previous =
        document.createElement("button");

    previous.className =
        "page-btn";

    previous.innerHTML =
        '<i class="fa-solid fa-chevron-left"></i>';


    previous.disabled =
        currentPage === 1;


    previous.onclick = () => {

        if (currentPage > 1) {

            currentPage--;

            mostrarProjects(proyectosFiltrados);

            actualizarPaginacion();

        }

    };


    container.appendChild(previous);


    for (
        let i = 1;
        i <= totalPages;
        i++
    ) {

        const page =
            document.createElement("button");


        page.className =
            "page-btn";


        if (i === currentPage) {

            page.classList.add(
                "active"
            );

        }


        page.textContent = i;


        page.onclick = () => {

            currentPage = i;

            mostrarProjects(
                proyectosFiltrados
            );

            actualizarPaginacion();

        };


        container.appendChild(page);

    }


    const next =
        document.createElement("button");


    next.className =
        "page-btn";


    next.innerHTML =
        '<i class="fa-solid fa-chevron-right"></i>';


    next.disabled =
        currentPage === totalPages;


    next.onclick = () => {

        if (currentPage < totalPages) {

            currentPage++;

            mostrarProjects(
                proyectosFiltrados
            );

            actualizarPaginacion();

        }

    };


    container.appendChild(next);
}


/* =========================================================
   SUMMARY
   ========================================================= */

function actualizarResumen() {

    const summary =
        document.getElementById(
            "projectSummary"
        );


    if (!summary) return;


    const total =
        proyectosFiltrados.length;


    const completed =
        proyectosFiltrados.filter(
            p =>
                p.Status === "Completado" ||
                p.Status === "Completed"
        ).length;


    const process =
        proyectosFiltrados.filter(
            p =>
                p.Status === "En Proceso" ||
                p.Status === "In Process"
        ).length;


    const waiting =
        proyectosFiltrados.filter(
            p =>
                p.Status === "En Espera" ||
                p.Status === "Waiting"
        ).length;


    summary.innerHTML = `

        <span class="summary-item">
            <strong>${total}</strong>
            Projects
        </span>

        <span class="summary-item summary-process">
            <strong>${process}</strong>
            In Process
        </span>

        <span class="summary-item summary-completed">
            <strong>${completed}</strong>
            Completed
        </span>

        <span class="summary-item summary-waiting">
            <strong>${waiting}</strong>
            Waiting
        </span>

    `;
}


/* =========================================================
   VIEW PROJECT
   ========================================================= */

/* =========================================================
   VIEW PROJECT (MODIFICADO PARA ABRIR EN EL IFRAME)
   ========================================================= */

function verProyecto(id) {
    selectedProjectId = id;
    mostrarProjects(proyectosFiltrados);

    // Intentamos cambiar la ruta del iframe de forma directa
    try {
        window.location.href = "Project_Detail.html?id=" + id;
    } catch (e) {
        console.error("Error al redirigir:", e);
    }
}


/* =========================================================
   EXPORT EXCEL
   ========================================================= */

function exportarExcel() {

    if (proyectos.length === 0) {

        alert("No hay proyectos para exportar");

        return;

    }


    let datos = proyectos.map(p => ({

        Folio: p.Folio,

        ProjectName: p.ProjectName,

        Type: p.Type,

        Lead: p.Lead,

        DateStart: p.DateStart,

        DateEnd: p.DateEnd,

        Progress: p.Progress,

        Approved: p.Approved,

        Status: p.Status

    }));


    let hoja =
        XLSX.utils.json_to_sheet(datos);


    let libro =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        libro,
        hoja,
        "Projects"
    );


    XLSX.writeFile(
        libro,
        "Projects_List.xlsx"
    );
}


/* =========================================================
   INITIALIZE
   ========================================================= */

cargarProjects();