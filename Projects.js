const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let proyectos = [];

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
    proyectos = data;
    mostrarProjects(data);
    actualizarKPIs(data);
}

function mostrarProjects(data) {
    const tabla = document.getElementById("tablaProjects");
    tabla.innerHTML = "";
    
    data.forEach(project => {
        tabla.innerHTML += `
            <tr>
                <td>${project.id}</td>
                <td>${project.Folio ?? ""}</td>
                <td>${project.ProjectName ?? ""}</td>
                <td>${project.Type ?? ""}</td>
                <td>${project.Lead ?? ""}</td>
                <td>${project.DateStart ?? ""}</td>
                <td>${project.DateEnd ?? ""}</td>
                <td>
                    <div class="progress">
                        <div class="bar" style="width:${project.Progress ?? 0}%"></div>
                    </div>
                    ${project.Progress ?? 0}%
                </td>
                <td>${project.Approved ?? ""}</td>
                <td>
                    <span class="status process">
                        ${project.Status ?? ""}
                    </span>
                </td>
                <td>
                    <button class="icon view" onclick="verProyecto(${project.id})">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function actualizarKPIs(data) {
    document.getElementById("totalProjects").innerHTML = data.length;

    document.getElementById("processProjects").innerHTML = data.filter(
        p => p.Status == "En Proceso"
    ).length;

    document.getElementById("completeProjects").innerHTML = data.filter(
        p => p.Status == "Completado"
    ).length;

    document.getElementById("waitingProjects").innerHTML = data.filter(
        p => p.Status == "En Espera"
    ).length;

    let totalProgress = data.reduce(
        (sum, project) => sum + Number(project.Progress || 0),
        0
    );

    let averageProgress = 0;
    if (data.length > 0) {
        averageProgress = totalProgress / data.length;
    }

    document.getElementById("averageProgress").innerHTML = averageProgress.toFixed(1) + "%";
}

document.getElementById("buscar").addEventListener("keyup", function () {
    let texto = this.value.toLowerCase();
    let filtrados = proyectos.filter(p =>
        JSON.stringify(p).toLowerCase().includes(texto)
    );
    mostrarProjects(filtrados);
});

function verProyecto(id) {
    window.open("Project_Detail.html?id=" + id, "_blank");
}

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

    let hoja = XLSX.utils.json_to_sheet(datos);
    let libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Projects");
    XLSX.writeFile(libro, "Projects_List.xlsx");
}

// Inicializar la carga al abrir
cargarProjects();