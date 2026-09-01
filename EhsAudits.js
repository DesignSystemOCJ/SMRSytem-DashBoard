const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabaseClient = window.supabase.createClient(
    supabaseUrl,
    supabaseKey
);

let globalData = [];
let chartShiftInstance = null;
let chartMonthInstance = null;
let chartIssuesInstance = null;

const MESES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

window.toggleDropdown = function(event) {
    event.stopPropagation();
    const wrapper = document.getElementById("customSelectAnio");
    if (wrapper) wrapper.classList.toggle("open");
};

window.seleccionarAnio = function(valor, texto) {
    document.getElementById("filtroAnio").value = valor;
    document.getElementById("customSelectValue").innerHTML = texto + ' <i class="fa-solid fa-chevron-down"></i>';
    
    const opciones = document.querySelectorAll(".custom-option");
    opciones.forEach(opt => {
        opt.classList.remove("selected");
        if(opt.getAttribute("onclick") && opt.getAttribute("onclick").includes(valor)) {
            opt.classList.add("selected");
        }
    });

    const wrapper = document.getElementById("customSelectAnio");
    if (wrapper) wrapper.classList.remove("open");
    
    if(globalData.length > 0) {
        procesarYRenderizar();
    } else {
        window.cargarDatos();
    }
};

window.addEventListener("click", function() {
    const wrapper = document.getElementById("customSelectAnio");
    if(wrapper) {
        wrapper.classList.remove("open");
    }
});

// Forzar reescalado dinámico inmediato con ResizeObserver para multitarea fluida
window.addEventListener('DOMContentLoaded', () => {
    const observer = new ResizeObserver(() => {
        if (chartShiftInstance) chartShiftInstance.resize();
        if (chartMonthInstance) chartMonthInstance.resize();
        if (chartIssuesInstance) chartIssuesInstance.resize();
    });
    
    const chartsGrid = document.querySelector('.charts-grid');
    if (chartsGrid) observer.observe(chartsGrid);
});

function establecerAnioActual() {
    const anioActual = new Date().getFullYear().toString();
    const select = document.getElementById("filtroAnio");
    if (!select) return;
    
    const opcionesValidas = ["ALL", "2024", "2025", "2026", "2027"];
    if(opcionesValidas.includes(anioActual)) {
        select.value = anioActual;
        const valElem = document.getElementById("customSelectValue");
        if(valElem) valElem.innerHTML = anioActual + ' <i class="fa-solid fa-chevron-down"></i>';
        
        document.querySelectorAll(".custom-option").forEach(opt => {
            opt.classList.remove("selected");
            if(opt.getAttribute("onclick") && opt.getAttribute("onclick").includes(anioActual)) {
                opt.classList.add("selected");
            }
        });
    }
}

window.cargarDatos = async function() {
    const mensajeElem = document.getElementById("mensaje");
    if(mensajeElem) {
        mensajeElem.innerHTML = "🔄 Conectando con SAP EHS Database...";
        mensajeElem.classList.add("loading");
    }

    const { data, error } = await supabaseClient
    .from("Auditorias_Gestion_EHS")
    .select("*")
    .order("Folio", { ascending: false });

    if(error){
        if(mensajeElem) mensajeElem.innerHTML = "❌ Error conexión: " + error.message;
        return;
    }

    globalData = data || [];
    procesarYRenderizar();
};

function procesarYRenderizar() {
    const filtroAnioElem = document.getElementById("filtroAnio");
    const anioSeleccionado = filtroAnioElem ? filtroAnioElem.value : "ALL";

    let datosFiltrados = globalData;
    if(anioSeleccionado !== "ALL") {
        datosFiltrados = globalData.filter(r => {
            if(!r.Fecha) return false;
            const partes = r.Fecha.split(/[-/]/);
            if(partes.length >= 1) {
                let anio = partes[0];
                return anio === anioSeleccionado;
            }
            return false;
        });
    }

    const cuerpo = document.querySelector("#tabla tbody");
    if(cuerpo) {
        cuerpo.innerHTML = "";
        datosFiltrados.forEach(row => {
            let pdf = "Sin documento";
            if(row.PDF){
                pdf = `<a href="${row.PDF}" target="_blank"><button><span class="pdf-icon">📎</span></button></a>`;
            }
            cuerpo.innerHTML += `
            <tr>
                <td>${row.Folio ?? ""}</td>
                <td>${row.Plant ?? ""}</td>
                <td>${row.Shift ?? ""}</td>
                <td>${row.Area ?? ""}</td>
                <td>${row.EHSName ?? ""}</td>
                <td>${row.Gerente ?? ""}</td>
                <td>${row.Fecha ?? ""}</td>
                <td>${row.Status ?? ""}</td>
                <td>${row["C/O"] ?? ""}</td>
                <td>${pdf}</td>
            </tr>`;
        });
    }

    const total = datosFiltrados.length;
    const open = datosFiltrados.filter(r => (r["C/O"] ?? "").trim().toUpperCase() === "OPEN").length;
    const closed = datosFiltrados.filter(r => (r["C/O"] ?? "").trim().toUpperCase() === "CLOSED").length;
    const inProcess = datosFiltrados.filter(r => (r.Status ?? "").trim().toUpperCase() === "IN PROCESS").length;
    const progress = total > 0 ? ((closed / total) * 100).toFixed(2) : "0.00";

    if(document.getElementById("cardTotal")) document.getElementById("cardTotal").innerText = total;
    if(document.getElementById("cardOpen")) document.getElementById("cardOpen").innerText = open;
    if(document.getElementById("cardClosed")) document.getElementById("cardClosed").innerText = closed;
    if(document.getElementById("cardInProcess")) document.getElementById("cardInProcess").innerText = inProcess;
    if(document.getElementById("cardProgress")) document.getElementById("cardProgress").innerText = progress + "%";

    const mensajeElem = document.getElementById("mensaje");
    if(mensajeElem) {
        mensajeElem.innerHTML = `✅ Data loaded successfully (${datosFiltrados.length} records displayed).`;
        mensajeElem.classList.remove("loading");
    }

    actualizarGraficas(datosFiltrados);
}

function actualizarGraficas(data) {
    const shiftCounts = {};
    data.forEach(r => {
        const shift = r.Shift || "N/A";
        shiftCounts[shift] = (shiftCounts[shift] || 0) + 1;
    });

    if(chartShiftInstance) chartShiftInstance.destroy();
    const ctxShiftElem = document.getElementById("chartShift");
    if(ctxShiftElem) {
        chartShiftInstance = new Chart(ctxShiftElem.getContext("2d"), {
            type: 'doughnut',
            data: {
                labels: Object.keys(shiftCounts),
                datasets: [{
                    data: Object.values(shiftCounts),
                    backgroundColor: ['#0a6ed1', '#00a6a6', '#f39c12', '#e74c3c']
                }]
            },
            plugins: [ChartDataLabels],
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    datalabels: {
                        color: '#ffffff',
                        font: {
                            weight: 'bold',
                            size: 12
                        },
                        formatter: (value) => {
                            return value > 0 ? value : '';
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return ` ${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    const monthCounts = new Array(12).fill(0);
    data.forEach(r => {
        if(r.Fecha) {
            const partes = r.Fecha.split(/[-/]/);
            if(partes.length >= 2) {
                let mIndex = parseInt(partes[1]) - 1;
                if(!isNaN(mIndex) && mIndex >= 0 && mIndex < 12) {
                    monthCounts[mIndex]++;
                }
            }
        }
    });

    if(chartMonthInstance) chartMonthInstance.destroy();
    const ctxMonthElem = document.getElementById("chartMonth");
    if(ctxMonthElem) {
        chartMonthInstance = new Chart(ctxMonthElem.getContext("2d"), {
            type: 'bar',
            data: {
                labels: MESES,
                datasets: [{
                    label: 'Auditorías',
                    data: monthCounts,
                    backgroundColor: '#38a169',
                    borderRadius: 4
                }]
            },
            plugins: [ChartDataLabels],
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        color: '#1e293b',
                        anchor: 'end',
                        align: 'top',
                        font: {
                            weight: 'bold',
                            size: 11
                        },
                        formatter: (value) => {
                            return value > 0 ? value : '';
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grace: '15%'
                    }
                }
            }
        });
    }

    const dayCounts = {};

    data.forEach(r => {
        if(r.Fecha) {
            const fechaStr = r.Fecha.trim();
            const partes = fechaStr.split(/[-/]/);
            if(partes.length === 3) {
                const anio = partes[0];
                const mesIndex = parseInt(partes[1], 10) - 1;
                const dia = partes[2];

                if(!isNaN(mesIndex) && mesIndex >= 0 && mesIndex < 12) {
                    const claveOrden = `${anio}-${partes[1]}-${dia}`;
                    const etiquetaFormateada = `${dia}-${MESES[mesIndex]}`;
                    
                    if (!dayCounts[claveOrden]) {
                        dayCounts[claveOrden] = { etiqueta: etiquetaFormateada, count: 0 };
                    }
                    dayCounts[claveOrden].count++;
                }
            }
        }
    });

    const sortedKeys = Object.keys(dayCounts).sort();
    const sortedDates = sortedKeys.map(k => dayCounts[k].etiqueta);
    const sortedValues = sortedKeys.map(k => dayCounts[k].count);

    if(chartIssuesInstance) chartIssuesInstance.destroy();
    const ctxIssuesElem = document.getElementById("chartIssuesDay");
    if(ctxIssuesElem) {
        chartIssuesInstance = new Chart(ctxIssuesElem.getContext("2d"), {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Issues / Auditorías',
                    data: sortedValues,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#e74c3c',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            plugins: [ChartDataLabels],
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        color: '#1e293b',
                        anchor: 'end',
                        align: 'top',
                        font: {
                            weight: 'bold',
                            size: 11
                        },
                        formatter: (value) => {
                            return value > 0 ? value : '';
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grace: '15%'
                    }
                }
            }
        });
    }
}

window.abrirModalTabla = function() {
    const modal = document.getElementById("tableModal");
    if(modal) modal.style.display = "flex";
};

window.cerrarModalTabla = function() {
    const modal = document.getElementById("tableModal");
    if(modal) modal.style.display = "none";
};

window.exportarExcel = function(){
    let tabla = document.getElementById("tabla");
    if(!tabla) return;
    let libro = XLSX.utils.table_to_book(tabla, { sheet: "Auditorias" });
    XLSX.writeFile(libro, "Auditorias_EHS.xlsx");
};

window.exportarPDF = function(){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(18);
    doc.text("EHS Audit Report", 14, 15);
    doc.autoTable({
        html: "#tabla",
        startY: 25,
        styles: { fontSize: 8 }
    });
    doc.save("Auditorias_EHS.pdf");
};

document.addEventListener("DOMContentLoaded", () => {
    establecerAnioActual();
    window.cargarDatos();
});
