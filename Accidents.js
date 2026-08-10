const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const db = supabase.createClient(supabaseUrl, supabaseKey);

let accidentsData = [];

document.addEventListener("DOMContentLoaded", () => {
    createMonthSelector();
    loadData();
});

function createMonthSelector(){
    const selector = document.getElementById("monthSelector");

    let today = new Date();
    let year = document.createElement("option");
    year.value = "YEAR";
    year.textContent = `All ${today.getFullYear()}`;
    selector.appendChild(year);

    for(let i = 0; i < 12; i++){
        let date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        let value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        let option = document.createElement("option");
        option.value = value;
        option.textContent = date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
        selector.appendChild(option);
    }

    selector.value = "YEAR";
    selector.addEventListener("change", loadData);
}

async function loadData(){
    let period = document.getElementById("monthSelector").value;
    let year = new Date().getFullYear();

    let query = db.from("Accidentes").select("*");

    if(period === "YEAR"){
        query = query.gte("Date", `${year}-01-01`).lte("Date", `${year}-12-31`);
    } else {
        let parts = period.split("-");
        let start = `${parts[0]}-${parts[1]}-01`;
        let endDay = new Date(parts[0], parts[1], 0).getDate();
        let end = `${parts[0]}-${parts[1]}-${endDay}`;

        query = query.gte("Date", start).lte("Date", end);
    }

    let { data, error } = await query;
    if(error){
        console.error(error);
        return;
    }

    accidentsData = data || [];
    updateCards();
    updateCharts();
    updateBodyMap();
}

function updateCards(){
    let total = accidentsData.length;
    let open = accidentsData.filter(x => String(x.Status).toLowerCase() === "open").length;
    let closed = accidentsData.filter(x => String(x.Status).toLowerCase() === "closed").length;
    let employees = new Set(accidentsData.map(x => x["#Empl"])).size;

    let days = 0;
    if(accidentsData.length){
        let last = accidentsData.map(x => new Date(x.Date)).sort((a, b) => b - a)[0];
        let today = new Date();

        today.setHours(0, 0, 0, 0);
        last.setHours(0, 0, 0, 0);
        days = Math.floor((today - last) / (1000 * 60 * 60 * 24));
    }

    document.getElementById("daysWithoutAccident").innerHTML = days;
    document.getElementById("total").innerHTML = total;
    document.getElementById("employees").innerHTML = employees;
    document.getElementById("open").innerHTML = open;
    document.getElementById("closed").innerHTML = closed;

    updateSafetyMessage(open);
}

function updateBodyMap(){
    document.querySelectorAll(".body-part").forEach(part => {
        part.classList.remove("body-alert", "body-warning");
    });

    let injuries = {};
    accidentsData.forEach(item => {
        let part = String(item.PartBody || "").toLowerCase();
        if(part){
            injuries[part] = (injuries[part] || 0) + 1;
        }
    });

    let map = {
        "head": "Head", "cabeza": "Head",
        "eyes": "Eyes", "eye": "Eyes", "ojo": "Eyes", "ojos": "Eyes",
        "neck": "Neck", "cuello": "Neck",
        "shoulder": "Shoulder", "shoulders": "Shoulder", "hombro": "Shoulder", "hombros": "Shoulder",
        "chest": "Chest", "torso": "Chest", "pecho": "Chest",
        "back": "Back", "espalda": "Back",
        "waist": "Waist", "cintura": "Waist",
        "arm": "ArmLeft", "arms": "ArmLeft", "brazo": "ArmLeft", "brazos": "ArmLeft",
        "hand": "HandLeft", "hands": "HandLeft", "mano": "HandLeft", "manos": "HandLeft",
        "finger": "Finger", "fingers": "Finger", "dedo": "Finger", "dedos": "Finger",
        "leg": "LegLeft", "legs": "LegLeft", "pierna": "LegLeft", "piernas": "LegLeft",
        "knee": "KneeLeft", "knees": "KneeLeft", "rodilla": "KneeLeft", "rodillas": "KneeLeft",
        "foot": "FootLeft", "feet": "FootLeft", "pie": "FootLeft", "pies": "FootLeft"
    };

    Object.keys(injuries).forEach(key => {
        let id = map[key];
        if(id){
            let element = document.getElementById(id);
            if(element){
                if(injuries[key] >= 3){
                    element.classList.add("body-alert");
                } else {
                    element.classList.add("body-warning");
                }
                addBodyTooltip(element, key, injuries[key]);
            }
        }
    });
}

function addBodyTooltip(element, name, count){
    element.onmouseenter = (e) => {
        let tooltip = document.getElementById("bodyTooltip");
        tooltip.innerHTML = `<b>${name}</b><br>Incidents: ${count}`;
        tooltip.classList.add("show");
        tooltip.style.left = e.offsetX + "px";
        tooltip.style.top = e.offsetY + "px";
    };

    element.onmouseleave = () => {
        document.getElementById("bodyTooltip").classList.remove("show");
    };
}

function updateCharts(){
    createDaysChart();
    createTypeChart();
    createBodyChart();
    createShiftChart();
}

function groupData(column){
    let result = {};
    accidentsData.forEach(x => {
        let value = x[column] || "No data";
        result[value] = (result[value] || 0) + 1;
    });
    return result;
}

function createDaysChart(){
    let data = {};
    accidentsData.forEach(x => {
        let m = new Date(x.Date).toLocaleDateString("es-MX", { month: "short" });
        data[m] = (data[m] || 0) + 1;
    });
    drawChart("daysChart", "bar", Object.keys(data), Object.values(data), "Accidents");
}

function createTypeChart(){
    let data = groupData("Type");
    drawChart("typeChart", "bar", Object.keys(data), Object.values(data), "Type");
}

function createBodyChart(){
    let data = groupData("PartBody");
    drawChart("bodyChart", "bar", Object.keys(data), Object.values(data), "Body");
}

function createShiftChart(){
    let data = groupData("Shift");
    drawChart("shiftChart", "doughnut", Object.keys(data), Object.values(data), "Shift");
}

function drawChart(id, type, labels, values, title){
    let canvas = document.getElementById(id);
    if(canvas.chart){
        canvas.chart.destroy();
    }
    canvas.chart = new Chart(canvas, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: values,
                backgroundColor: ["#0A6ED1", "#00A6A6", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6"]
            }]
        },
        plugins: [ChartDataLabels],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: "white" } },
                datalabels: { color: "white", font: { weight: "bold" } }
            }
        }
    });
}

function updateSafetyMessage(open){
    let box = document.getElementById("safetyMessage");
    let icon = box.querySelector("i");
    let text = box.querySelector("span");

    box.classList.remove("safety-green", "safety-yellow", "safety-red");

    if(open === 0){
        box.classList.add("safety-green");
        icon.className = "fa-solid fa-circle-check";
        text.innerHTML = "Let's Continue Working With Safety!";
    } else if(open <= 3){
        box.classList.add("safety-yellow");
        icon.className = "fa-solid fa-triangle-exclamation";
        text.innerHTML = "Alert: Review accident prevention actions";
    } else {
        box.classList.add("safety-red");
        icon.className = "fa-solid fa-stop";
        text.innerHTML = "Stop: High accident risk detected";
    }
}

function openAccidentView(){
    document.getElementById("accidentModal").style.display = "block";
    document.getElementById("totalRecords").innerHTML = "Total Records: " + accidentsData.length;

    let table = document.getElementById("accidentTable");

    if(accidentsData.length === 0){
        table.innerHTML = `<tr><td>No records found</td></tr>`;
        return;
    }

    let headers = Object.keys(accidentsData[0]);
    let html = "<thead><tr>";

    headers.forEach(h => {
        html += `<th>${h}</th>`;
    });

    html += "</tr></thead><tbody>";

    accidentsData.forEach(row => {
        html += "<tr>";
        headers.forEach(h => {
            let value = row[h] ?? "";
            if(h === "Status"){
                if(String(value).toLowerCase() === "open"){
                    value = `<span style="background:rgba(251, 191, 36, 0.15); color:#F59E0B; padding:6px 14px; border-radius:20px; font-weight:600; display:inline-flex; align-items:center; gap:6px; border:1px solid rgba(245, 158, 11, 0.3);">● Open</span>`;
                }
                if(String(value).toLowerCase() === "closed"){
                    value = `<span style="background:rgba(34, 197, 94, 0.15); color:#22C55E; padding:6px 14px; border-radius:20px; font-weight:600; display:inline-flex; align-items:center; gap:6px; border:1px solid rgba(34, 197, 94, 0.3);">● Closed</span>`;
                }
            }
            html += `<td>${value}</td>`;
        });
        html += "</tr>";
    });

    html += "</tbody>";
    table.innerHTML = html;
}

function closeModal(){
    document.getElementById("accidentModal").style.display = "none";
}

function filterTable(){
    let search = document.getElementById("searchInput").value.toLowerCase();
    let status = document.getElementById("statusFilter").value.toLowerCase();

    document.querySelectorAll("#accidentTable tbody tr").forEach(row => {
        let text = row.innerText.toLowerCase();
        let visible = true;

        if(search){
            visible = text.includes(search);
        }
        if(status){
            visible = visible && text.includes(status);
        }

        row.style.display = visible ? "" : "none";
    });
}

function exportExcel(){
    let ws = XLSX.utils.json_to_sheet(accidentsData);
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Accidentes");
    XLSX.writeFile(wb, "EHS_Accidentes.xlsx");
}

function exportPDF(){
    if(accidentsData.length === 0){
        alert("No data available");
        return;
    }

    const { jsPDF } = window.jspdf;
    let doc = new jsPDF("landscape");

    let headers = Object.keys(accidentsData[0]);
    let rows = accidentsData.map(x => headers.map(h => x[h]));

    doc.text("EHS Accident Report", 14, 15);
    doc.autoTable({
        head: [headers],
        body: rows,
        startY: 25
    });

    doc.save("EHS_Accident_Report.pdf");
}