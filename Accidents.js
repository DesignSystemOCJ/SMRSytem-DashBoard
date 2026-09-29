const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let maintenanceData = [];
let activeCharts = {};
let currentSelectedYear = "2026";
let currentSelectedMonth = "All";
let modalRawData = [];
let isUserLoggedIn = false; 
let sessionActiveUser = null;
let activeEmplInputReference = null; // Referencia para el input #Empl al agregar un empleado nuevo

const availableYears = ["2025", "2026", "2027", "2028", "2029", "2030"];
const desiredModalColumns = ["id", "#Empl", "Name", "Description", "Position", "PartBody", "Depart", "Shift", "EPP", "Date", "Hour", "Type", "Status"];

const bodyPartsList = [
    "Cabeza", "Cara", "Ojos", "Cuello",
    "Hombros", "Pecho", "Espalda", "Cintura",
    "Brazos", "Manos", "Dedos", "Cadera",
    "Pierna", "Rodilla", "Tobillo", "Pie"
];

const eppOptions = ["Yes", "No"];
const typeOptions = ["Minor Incident", "Major Incident", "Near Miss", "First Aid"];
const statusOptions = ["Open", "Closed"];

const machines = [
"C01","C02","C03","C04","C05","C06","C07","C08","C09","C10",
"C11","C12","C13","C14","C15","C16","C17","C18","C19","C20",
"C21","C22","C23","C24","C25","C26","C27","C28","C29","C30",
"C33","C34","C35","C36"
];

const months = [
"January", "February", "March", "April", "May", "June",
"July", "August", "September", "October", "November", "December"
];

Chart.defaults.font.family = '"Segoe UI", Inter, Arial, sans-serif';
Chart.defaults.color = "#64748B";
Chart.defaults.animation.duration = 800;

function formatDisplayDate(dateStr) {
    if (!dateStr) return "";
    const cleanDateStr = String(dateStr).trim();
    const dateObj = new Date(cleanDateStr);
    if (isNaN(dateObj)) return cleanDateStr;

    const day = String(dateObj.getDate()).padStart(2, '0');
    const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthsShort[dateObj.getMonth()];
    const year = String(dateObj.getFullYear()).slice(-2);

    return `${day}-${month}-${year}`;
}

function formatDisplayHour(hourStr) {
    if (!hourStr) return "00:00:00";
    const cleanHourStr = String(hourStr).trim();
    
    const parts = cleanHourStr.split(":");
    if (parts.length >= 2) {
        const hours = parts[0].padStart(2, '0');
        const minutes = parts[1].padStart(2, '0');
        const seconds = parts[2] ? parts[2].padStart(2, '0') : "00";
        return `${hours}:${minutes}:${seconds}`;
    }
    
    return cleanHourStr.length >= 5 ? cleanHourStr : "00:00:00";
}

function populateYearDropdowns() {
    const yearDropdown = document.getElementById("yearDropdown");
    if (yearDropdown) {
        let htmlContent = '<div class="dropdown-title">Select Year Period</div>';
        availableYears.forEach(year => {
            htmlContent += `<div class="custom-option" onclick="selectYear('${year}', event)">${year}</div>`;
        });
        yearDropdown.innerHTML = htmlContent;
    }

    const modalYearFilter = document.getElementById("modalYearFilter");
    if (modalYearFilter) {
        modalYearFilter.innerHTML = "";
        availableYears.forEach(year => {
            const option = document.createElement("option");
            option.value = year;
            option.textContent = year;
            if (year === currentSelectedYear) {
                option.selected = true;
            }
            modalYearFilter.appendChild(option);
        });
    }
}

async function fetchAllSupabaseData(queryBuilderFn) {
    let allData = [];
    const pageSize = 1000;
    let from = 0;
    let moreData = true;

    try {
        while (moreData) {
            let query = queryBuilderFn(supabaseClient.from("Accidentes")).range(from, from + pageSize - 1);
            const { data, error } = await query;
            if (error) throw error;

            if (data && data.length > 0) {
                allData = allData.concat(data);
                from += pageSize;
            } else {
                moreData = false;
            }
        }
        return { data: allData, error: null };
    } catch (error) {
        console.error("Supabase fetch error:", error);
        return { data: null, error };
    }
}

function setCurrentYear() {
    const currentYearNum = new Date().getFullYear();
    currentSelectedYear = currentYearNum.toString();

    const yearTextElement = document.getElementById("selectedYearText");
    if (yearTextElement) yearTextElement.innerText = currentSelectedYear;

    const modalSelect = document.getElementById("modalYearFilter");
    if (modalSelect) modalSelect.value = currentSelectedYear;

    document.querySelectorAll(".custom-option").forEach(option => {
        if (option.innerText.trim() === currentSelectedYear) {
            option.classList.add("selected");
        }
    });

    populateModalCellFilter();
    loadMaintenance();
}

function populateModalCellFilter() {
    const cellSelect = document.getElementById("modalCellFilter");
    if (!cellSelect) return;

    cellSelect.innerHTML = '<option value="">All Cells</option>';
    machines.forEach(machine => {
        const option = document.createElement("option");
        option.value = machine;
        option.textContent = machine;
        cellSelect.appendChild(option);
    });
}

function openRecordsModal() {
    const modal = document.getElementById("recordsModal");
    if (modal) modal.style.display = "flex";

    const modalYearFilter = document.getElementById("modalYearFilter");
    if (modalYearFilter) modalYearFilter.value = currentSelectedYear;

    const addRowBtn = document.querySelector(".add-row-modal-btn");
    if (addRowBtn) {
        if (isUserLoggedIn) {
            addRowBtn.disabled = false;
            addRowBtn.style.opacity = "1";
            addRowBtn.style.cursor = "pointer";
            addRowBtn.title = "Agregar nuevo registro";
        } else {
            addRowBtn.disabled = true;
            addRowBtn.style.opacity = "0.4";
            addRowBtn.style.cursor = "not-allowed";
            addRowBtn.title = "Inicie sesión para agregar registros";
        }
    }

    loadModalRecords();
}

function closeRecordsModal() {
    const modal = document.getElementById("recordsModal");
    if (modal) modal.style.display = "none";
}

function clearCellFilter() {
    const cellFilter = document.getElementById("modalCellFilter");
    if (cellFilter) cellFilter.value = "";
    filterModalTable();
}

async function loadModalRecords() {
    const yearFilterElem = document.getElementById("modalYearFilter");
    const selectedYear = yearFilterElem ? yearFilterElem.value : currentSelectedYear;

    const tbody = document.getElementById("modalTableBody");
    const thead = document.getElementById("modalTableHeaders");
    const counter = document.getElementById("recordsCount");

    if (!tbody || !thead) return;

    tbody.innerHTML = `<tr><td colspan="100" class="loading-table"><div class="table-loader"></div>Loading records...</td></tr>`;
    if (counter) counter.textContent = "Loading records...";

    const { data: allData, error } = await fetchAllSupabaseData(query => query.select("*"));

    if (error) {
        tbody.innerHTML = `<tr><td colspan="100" style="text-align:center; padding:40px; color:#EF4444;"><i class="fa-solid fa-circle-exclamation"></i> Error loading data.</td></tr>`;
        if (counter) counter.textContent = "Unable to load records";
        return;
    }

    modalRawData = (allData || []).filter(row => {
        if (!row.Date) return false;
        let yearPart = "";
        const dateStr = String(row.Date).trim();
        if (dateStr.includes("-")) {
            yearPart = dateStr.split("-")[0];
        } else if (dateStr.includes("/")) {
            const parts = dateStr.split("/");
            yearPart = parts[parts.length - 1];
        } else {
            yearPart = dateStr.substring(0, 4);
        }
        return yearPart === selectedYear;
    });

    modalRawData.sort((a, b) => {
        const dateA = new Date(a.Date || 0);
        const dateB = new Date(b.Date || 0);
        return dateB - dateA;
    });

    thead.innerHTML = desiredModalColumns.map(key => `<th>${key}</th>`).join("") + `<th>Acción</th>`;

    if (modalRawData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${desiredModalColumns.length + 1}" style="text-align:center; padding:40px;">No records found for <strong>${selectedYear}</strong></td></tr>`;
        if (counter) counter.textContent = "0 records";
        return;
    }

    filterModalTable();
}

function filterModalTable() {
    const cellFilterElem = document.getElementById("modalCellFilter");
    const selectedCell = cellFilterElem ? cellFilterElem.value : "";
    const tbody = document.getElementById("modalTableBody");
    const counter = document.getElementById("recordsCount");

    if (!tbody) return;

    const filtered = selectedCell 
        ? modalRawData.filter(row => (row.Depart && row.Depart.trim() === selectedCell) || (row.Maq && row.Maq.trim() === selectedCell)) 
        : modalRawData;

    if (counter) counter.textContent = `${filtered.length.toLocaleString()} records`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${desiredModalColumns.length + 1}" style="text-align:center; padding:40px;">No records match the selected filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(row => {
        const rowId = row.id !== undefined && row.id !== null ? row.id : (row.Id !== undefined ? row.Id : "");
        
        let actionButtonsHtml = "";
        if (isUserLoggedIn) {
            actionButtonsHtml = `
                <div class="row-actions">
                    <button class="save-row-btn" style="display: none;" onclick="saveModalRowEdit(this, '${rowId}')" title="Guardar Cambios">
                        <i class="fa-solid fa-floppy-disk"></i>
                    </button>
                    <button class="cancel-row-btn" style="display: none;" onclick="cancelModalRowEdit(this)" title="Cancelar">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <button class="delete-row-btn" onclick="deleteModalRow(this, '${rowId}')" title="Eliminar registro">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
        } else {
            actionButtonsHtml = `
                <div class="row-actions">
                    <button class="delete-row-btn" disabled style="background: #E2E8F0; color: #94A3B8; cursor: not-allowed; box-shadow: none;" title="Acción deshabilitada (Inicie sesión)">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
        }

        return `
            <tr data-id="${rowId}" ${isUserLoggedIn ? 'ondblclick="enableModalRowEdit(this)"' : ''}>
                ${desiredModalColumns.map(key => {
                    let cellValue = row[key] !== null && row[key] !== undefined ? row[key] : "";
                    
                    if (key === "Date") {
                        cellValue = formatDisplayDate(cellValue);
                    }
                    if (key === "Hour") {
                        cellValue = formatDisplayHour(cellValue);
                    }
                    
                    return `<td data-field="${key}">${cellValue}</td>`;
                }).join("")}
                <td style="text-align: center; white-space: nowrap;">
                    ${actionButtonsHtml}
                </td>
            </tr>
        `;
    }).join("");
}

async function fetchAndFillEmployeeData(input) {
    const tr = input.closest("tr");
    if (!tr) return;
    const rawVal = input.value.trim();
    
    const tdEmpl = input.closest('td');
    
    const existingAlert = tdEmpl.querySelector('.employee-not-found-container');
    if (existingAlert) {
        existingAlert.remove();
    }

    if (!rawVal) return;

    const emplVal = !isNaN(rawVal) ? Number(rawVal) : rawVal;

    try {
        const { data, error } = await supabaseClient
            .from("Empleados")
            .select("*")
            .eq("Empleado", emplVal)
            .limit(1);

        if (error) {
            console.error("Error al buscar el empleado:", error);
            return;
        }

        if (data && data.length > 0) {
            const emp = data[0];
            
            const nameInput = tr.querySelector('[data-field="Name"] input');
            const positionInput = tr.querySelector('[data-field="Position"] input');
            const departInput = tr.querySelector('[data-field="Depart"] input');
            const shiftInput = tr.querySelector('[data-field="Shift"] input');

            if (nameInput && emp.Nombre) {
                nameInput.value = emp.Nombre;
                nameInput.readOnly = true;
                nameInput.style.backgroundColor = "#F1F5F9";
                nameInput.style.color = "#475569";
            }
            if (positionInput && emp.Puesto) {
                positionInput.value = emp.Puesto;
                positionInput.readOnly = true;
                positionInput.style.backgroundColor = "#F1F5F9";
                positionInput.style.color = "#475569";
            }
            if (departInput && emp.Departamento) {
                departInput.value = emp.Departamento;
                departInput.readOnly = true;
                departInput.style.backgroundColor = "#F1F5F9";
                departInput.style.color = "#475569";
            }
            if (shiftInput && emp.Turno) {
                shiftInput.value = emp.Turno;
                shiftInput.readOnly = true;
                shiftInput.style.backgroundColor = "#F1F5F9";
                shiftInput.style.color = "#475569";
            }
        } else {
            showEmployeeNotFoundUI(tdEmpl, rawVal);
        }
    } catch (err) {
        console.error("Error inesperado al consultar empleados:", err);
    }
}

function showEmployeeNotFoundUI(tdElement, searchedValue) {
    tdElement.style.position = "relative";

    const alertContainer = document.createElement("div");
    alertContainer.className = "employee-not-found-container";
    alertContainer.style.cssText = `
        position: absolute;
        top: calc(100% + 2px);
        left: 0;
        z-index: 100;
        background: #FEF2F2;
        border: 1px solid #FCA5A5;
        padding: 6px 10px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
        white-space: nowrap;
    `;

    const textSpan = document.createElement("span");
    textSpan.textContent = "Empleado no encontrado";
    textSpan.style.cssText = "font-size: 10px; font-weight: 700; color: #DC2626;";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
    addBtn.title = "Agregar nuevo empleado";
    addBtn.style.cssText = `
        background: #2563EB;
        color: white;
        border: none;
        width: 22px;
        height: 22px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
    `;

    addBtn.onclick = (e) => {
        e.stopPropagation();
        openAddNewEmployeeModal(searchedValue);
    };

    alertContainer.appendChild(textSpan);
    alertContainer.appendChild(addBtn);
    tdElement.appendChild(alertContainer);
}

async function openAddNewEmployeeModal(empId) {
    const activeTr = document.querySelector('tr.editing, tr.new-row');
    if (activeTr) {
        activeEmplInputReference = activeTr.querySelector('[data-field="#Empl"] input');
    }

    const modal = document.getElementById("addEmployeeModal");
    if (modal) {
        modal.style.display = "flex";
        const numberInput = document.getElementById("newEmpNumber");
        if (numberInput) {
            numberInput.value = empId || "";
        }

        const departInput = document.getElementById("newEmpDepart");
        if (departInput) {
            departInput.value = "Rough Cut";
            departInput.readOnly = true;
            departInput.style.backgroundColor = "#F1F5F9";
            departInput.style.color = "#475569";
        }

        await loadPositionsDropdown();
    }
}

function closeAddEmployeeModal() {
    const modal = document.getElementById("addEmployeeModal");
    if (modal) {
        modal.style.display = "none";
        document.getElementById("addEmployeeForm").reset();
    }
}

async function handleSaveNewEmployee(event) {
    event.preventDefault();

    const empleadoVal = document.getElementById("newEmpNumber").value.trim();
    const nombreVal = document.getElementById("newEmpName").value.trim();
    const puestoVal = document.getElementById("newEmpPosition").value.trim();
    const departVal = document.getElementById("newEmpDepart").value.trim();
    const turnoVal = document.getElementById("newEmpShift").value.trim();

    const newEmployeePayload = {
        Empleado: !isNaN(empleadoVal) ? Number(empleadoVal) : empleadoVal,
        Nombre: nombreVal,
        Puesto: puestoVal,
        Departamento: departVal,
        Turno: turnoVal
    };

    try {
        const { error } = await supabaseClient
            .from("Empleados")
            .insert([newEmployeePayload]);

        if (error) {
            alert("Error al registrar el empleado en Supabase: " + error.message);
            return;
        }

        alert("¡Empleado registrado exitosamente!");
        closeAddEmployeeModal();

        if (activeEmplInputReference) {
            activeEmplInputReference.value = empleadoVal;
            fetchAndFillEmployeeData(activeEmplInputReference);
        }

    } catch (err) {
        console.error("Error inesperado al guardar empleado:", err);
        alert("Ocurrió un error inesperado al intentar guardar el empleado.");
    }
}

function attachEmplListener(tr) {
    const tdEmpl = tr.querySelector('[data-field="#Empl"]');
    if (!tdEmpl) return;
    const emplInput = tdEmpl.querySelector('input');
    if (emplInput) {
        emplInput.addEventListener("blur", () => fetchAndFillEmployeeData(emplInput));
        emplInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === "Tab") {
                fetchAndFillEmployeeData(emplInput);
            }
        });
    }
}

function addNewEmptyModalRow() {
    const tbody = document.getElementById("modalTableBody");
    if (!tbody) return;

    if (tbody.querySelector("tr td[colspan]")) {
        tbody.innerHTML = "";
    }

    const tr = document.createElement("tr");
    tr.classList.add("editing", "new-row");
    tr.style.backgroundColor = "#FEFCE8";

    let rowHtml = "";
    desiredModalColumns.forEach(key => {
        if (key === "id") {
            rowHtml += `<td data-field="id" style="color: #94A3B8;">Auto</td>`;
        } else if (key === "PartBody") {
            let selectHtml = `<td data-field="PartBody"><select class="modal-inline-input">`;
            selectHtml += `<option value="">Seleccione...</option>`;
            bodyPartsList.forEach(part => {
                selectHtml += `<option value="${part}">${part}</option>`;
            });
            selectHtml += `</select></td>`;
            rowHtml += selectHtml;
        } else if (key === "EPP") {
            let selectHtml = `<td data-field="EPP"><select class="modal-inline-input">`;
            selectHtml += `<option value="">Seleccione...</option>`;
            eppOptions.forEach(opt => {
                selectHtml += `<option value="${opt}">${opt}</option>`;
            });
            selectHtml += `</select></td>`;
            rowHtml += selectHtml;
        } else if (key === "Type") {
            let selectHtml = `<td data-field="Type"><select class="modal-inline-input">`;
            selectHtml += `<option value="">Seleccione...</option>`;
            typeOptions.forEach(opt => {
                selectHtml += `<option value="${opt}">${opt}</option>`;
            });
            selectHtml += `</select></td>`;
            rowHtml += selectHtml;
        } else if (key === "Status") {
            let selectHtml = `<td data-field="Status"><select class="modal-inline-input">`;
            selectHtml += `<option value="">Seleccione...</option>`;
            statusOptions.forEach(opt => {
                selectHtml += `<option value="${opt}">${opt}</option>`;
            });
            selectHtml += `</select></td>`;
            rowHtml += selectHtml;
        } else {
            let defaultVal = "";
            if (key === "Date") {
                const today = new Date().toISOString().split('T')[0];
                defaultVal = today;
            } else if (key === "Hour") {
                defaultVal = "00:00:00";
            }
            rowHtml += `<td data-field="${key}"><input type="text" class="modal-inline-input" value="${defaultVal}" /></td>`;
        }
    });

    rowHtml += `
        <td style="text-align: center; white-space: nowrap; display: flex; gap: 6px; justify-content: center; align-items: center;">
            <button class="save-row-btn" onclick="saveNewModalRow(this)" title="Guardar Nuevo Dato">
                <i class="fa-solid fa-floppy-disk"></i>
            </button>
            <button class="cancel-row-btn" onclick="cancelNewModalRow(this)" title="Cancelar">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </td>
    `;

    tr.innerHTML = rowHtml;
    tbody.insertBefore(tr, tbody.firstChild);

    attachEmplListener(tr);
}

function cancelNewModalRow(buttonElement) {
    const tr = buttonElement.closest("tr");
    if (tr) {
        tr.remove();
        const tbody = document.getElementById("modalTableBody");
        if (tbody && tbody.children.length === 0) {
            loadModalRecords();
        }
    }
}

async function saveNewModalRow(buttonElement) {
    const tr = buttonElement.closest("tr");
    if (!tr) return;

    const newRowData = {};
    const tdElements = tr.querySelectorAll("td[data-field]");
    
    tdElements.forEach(td => {
        const fieldName = td.getAttribute("data-field");
        if (fieldName === "id") return;
        
        const input = td.querySelector("input, select");
        if (input) {
            newRowData[fieldName] = input.value.trim();
        }
    });

    const { error } = await supabaseClient
        .from("Accidentes")
        .insert([newRowData]);

    if (error) {
        alert("Error al guardar en Supabase: " + error.message);
        return;
    }

    alert("¡Nuevo dato guardado exitosamente!");

    await loadModalRecords();
    await loadMaintenance();
}

function enableModalRowEdit(tr) {
    if (!isUserLoggedIn) return; 
    if (tr.classList.contains("editing")) return;
    tr.classList.add("editing");
    tr.style.backgroundColor = "#FEFCE8";

    const tdElements = tr.querySelectorAll("td[data-field]");
    tdElements.forEach(td => {
        const fieldName = td.getAttribute("data-field");
        if (fieldName === "id") return; 

        const currentValue = td.innerText.trim();

        if (fieldName === "PartBody") {
            let selectHtml = `<select class="modal-inline-input">`;
            selectHtml += `<option value="">Seleccione...</option>`;
            bodyPartsList.forEach(part => {
                const selected = part.toLowerCase() === currentValue.toLowerCase() ? "selected" : "";
                selectHtml += `<option value="${part}" ${selected}>${part}</option>`;
            });
            selectHtml += `</select>`;
            td.innerHTML = selectHtml;
        } else if (fieldName === "EPP") {
            let selectHtml = `<select class="modal-inline-input">`;
            selectHtml += `<option value="">Seleccione...</option>`;
            eppOptions.forEach(opt => {
                const selected = opt.toLowerCase() === currentValue.toLowerCase() ? "selected" : "";
                selectHtml += `<option value="${opt}" ${selected}>${opt}</option>`;
            });
            selectHtml += `</select>`;
            td.innerHTML = selectHtml;
        } else if (fieldName === "Type") {
            let selectHtml = `<select class="modal-inline-input">`;
            selectHtml += `<option value="">Seleccione...</option>`;
            typeOptions.forEach(opt => {
                const selected = opt.toLowerCase() === currentValue.toLowerCase() ? "selected" : "";
                selectHtml += `<option value="${opt}" ${selected}>${opt}</option>`;
            });
            selectHtml += `</select>`;
            td.innerHTML = selectHtml;
        } else if (fieldName === "Status") {
            let selectHtml = `<select class="modal-inline-input">`;
            selectHtml += `<option value="">Seleccione...</option>`;
            statusOptions.forEach(opt => {
                const selected = opt.toLowerCase() === currentValue.toLowerCase() ? "selected" : "";
                selectHtml += `<option value="${opt}" ${selected}>${opt}</option>`;
            });
            selectHtml += `</select>`;
            td.innerHTML = selectHtml;
        } else {
            td.innerHTML = `<input type="text" class="modal-inline-input" value="${currentValue}" data-original="${currentValue}" />`;
        }
    });

    const saveBtn = tr.querySelector(".save-row-btn");
    const cancelBtn = tr.querySelector(".cancel-row-btn");
    
    if (saveBtn) saveBtn.style.display = "inline-flex";
    if (cancelBtn) cancelBtn.style.display = "inline-flex";

    attachEmplListener(tr);
}

function cancelModalRowEdit(buttonElement) {
    const tr = buttonElement.closest("tr");
    if (tr) {
        filterModalTable();
    }
}

async function saveModalRowEdit(buttonElement, rowId) {
    const tr = buttonElement.closest("tr");
    if (!tr) return;

    const updatedData = {};
    const tdElements = tr.querySelectorAll("td[data-field]");
    
    tdElements.forEach(td => {
        const fieldName = td.getAttribute("data-field");
        if (fieldName === "id") return;
        
        const input = td.querySelector("input, select");
        if (input) {
            updatedData[fieldName] = input.value.trim();
        }
    });

    if (!rowId) {
        alert("Error: No se encontró el identificador (id) de este registro.");
        return;
    }

    const { error } = await supabaseClient
        .from("Accidentes")
        .update(updatedData)
        .eq("id", rowId);

    if (error) {
        alert("Error al actualizar en Supabase: " + error.message);
        return;
    }

    alert("¡Cambios guardados correctamente en la base de datos!");
    
    await loadModalRecords();
    await loadMaintenance();
}

async function deleteModalRow(buttonElement, rowId) {
    if (!isUserLoggedIn) {
        alert("Debe iniciar sesión para eliminar registros.");
        return;
    }

    if (!rowId || rowId === "undefined" || rowId === "null") {
        alert("Error: No se puede eliminar un registro sin ID válido.");
        return;
    }

    const confirmDelete = confirm("¿Estás seguro de que deseas eliminar este registro de forma permanente?");
    if (!confirmDelete) return;

    try {
        const { error } = await supabaseClient
            .from("Accidentes")
            .delete()
            .eq("id", rowId);

        if (error) {
            alert("Error al eliminar el registro en Supabase: " + error.message);
            return;
        }

        alert("¡Registro eliminado exitosamente!");

        await loadModalRecords();
        await loadMaintenance();

    } catch (err) {
        console.error("Error inesperado al eliminar:", err);
        alert("Ocurrió un error inesperado al intentar eliminar el registro.");
    }
}

function toggleYearDropdown(event) {
    if (event) event.stopPropagation();
}

window.addEventListener("click", function(event) {
    const modal = document.getElementById("recordsModal");
    const loginModal = document.getElementById("loginModal");
    const accidentModal = document.getElementById("accidentModal");
    const addEmployeeModal = document.getElementById("addEmployeeModal");
    const userDropdown = document.getElementById("userDropdown");
    const avatarContainer = document.querySelector(".user-menu-container");

    if (event.target === modal) closeRecordsModal();
    if (event.target === loginModal) closeLoginModal();
    if (event.target === accidentModal) closeAccidentModal();
    if (event.target === addEmployeeModal) closeAddEmployeeModal();

    if (userDropdown && avatarContainer && !avatarContainer.contains(event.target)) {
        userDropdown.style.display = "none";
    }
});

function selectYear(yearStr, event) {
    if (event) event.stopPropagation();
    currentSelectedYear = yearStr;

    const yearTextElement = document.getElementById("selectedYearText");
    if (yearTextElement) yearTextElement.innerText = yearStr;

    document.querySelectorAll(".custom-option").forEach(option => {
        option.classList.toggle("selected", option.innerText === yearStr);
    });

    loadMaintenance();
}

function selectMonth(monthStr) {
    currentSelectedMonth = monthStr;
    updateDashboard();
}

async function loadMaintenance() {
    if (!currentSelectedYear) return;

    const { data: allData, error } = await fetchAllSupabaseData(query => query.select("*"));

    if (error) {
        alert("Error loading Supabase data.");
        return;
    }

    maintenanceData = (allData || []).filter(row => {
        if (!row.Date) return false;
        let yearPart = "";
        const dateStr = String(row.Date).trim();
        if (dateStr.includes("-")) {
            yearPart = dateStr.split("-")[0];
        } else if (dateStr.includes("/")) {
            const parts = dateStr.split("/");
            yearPart = parts[parts.length - 1];
        } else {
            yearPart = dateStr.substring(0, 4);
        }
        return yearPart === currentSelectedYear;
    });

    updateDashboard();
}

function updateDashboard() {
    calculateKPIs();
    createOperationChart();
    loadIndependentMonthlyChart();
    createShiftPieChart();
    createTypeOfAccidentChart();
    createBodyPartAnalysisChart();
    renderOpenAuditsTable(); 
    updateBodyHeatmap(); 
}

function calculateKPIs() {
    const filteredByYear = maintenanceData;

    const daysWithoutAccidentsElem = document.getElementById("totalAudits");
    if (daysWithoutAccidentsElem) {
        if (filteredByYear.length > 0) {
            const sortedDates = filteredByYear
                .map(row => new Date(row.Date))
                .filter(date => !isNaN(date))
                .sort((a, b) => b - a);

            if (sortedDates.length > 0) {
                const lastDate = sortedDates[0];
                const currentDate = new Date();
                const diffTime = Math.abs(currentDate - lastDate);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                daysWithoutAccidentsElem.innerText = diffDays.toLocaleString();
            } else {
                daysWithoutAccidentsElem.innerText = "0";
            }
        } else {
            daysWithoutAccidentsElem.innerText = "0";
        }
    }

    const totalIncidentsCount = filteredByYear.length;
    const openElem = document.getElementById("openCount");
    if (openElem) openElem.innerText = totalIncidentsCount.toLocaleString();

    const affectedEmployesCount = filteredByYear.filter(row => {
        return row.Status && row.Status.trim().toLowerCase() === "open";
    }).length;
    const closedElem = document.getElementById("closedCount");
    if (closedElem) closedElem.innerText = affectedEmployesCount.toLocaleString();

    const openAccidentsCount = filteredByYear.filter(row => {
        return row.Status && row.Status.trim().toLowerCase() === "closed";
    }).length;
    const inProcessElem = document.getElementById("inProcessCount");
    if (inProcessElem) inProcessElem.innerText = openAccidentsCount.toLocaleString();

    const progressElem = document.getElementById("progressPercent");
    if (progressElem) {
        if (affectedEmployesCount > 0) {
            const ratio = openAccidentsCount / affectedEmployesCount;
            const percentage = (ratio * 100).toFixed(2) + "%";
            progressElem.innerText = percentage;
        } else {
            progressElem.innerText = "0.00%";
        }
    }
}

function renderOpenAuditsTable() {
    const yearLabel = document.getElementById("tableYearLabel");
    if (yearLabel) yearLabel.textContent = currentSelectedYear;

    const tbody = document.getElementById("openAuditsTableBody");
    if (!tbody) return;

    const openAudits = maintenanceData.filter(row => {
        const coValue = row["C/O"] ? row["C/O"].trim() : "";
        return coValue === "Open";
    });

    openAudits.sort((a, b) => {
        const folioA = parseInt(a.Folio, 10) || 0;
        const folioB = parseInt(b.Folio, 10) || 0;
        return folioB - folioA;
    });

    if (openAudits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:30px; color:#64748B;">No open accidents found for ${currentSelectedYear}</td></tr>`;
        return;
    }

    tbody.innerHTML = openAudits.map(row => {
        const primaryKeyVal = row.id !== undefined && row.id !== null ? row.id : (row.Id !== undefined ? row.Id : null);
        const folioVal = row.Folio !== undefined && row.Folio !== null ? row.Folio : "";
        const shiftVal = row.Shift !== undefined ? row.Shift : (row.shift !== undefined ? row.shift : (row.Turno || ""));
        const areaVal = row.Depart !== undefined && row.Depart !== null ? row.Depart : (row.Area || "");
        const ehsNameVal = row.Name !== undefined && row.Name !== null ? row.Name : (row.EHSName || "");
        const gerenteVal = row.Gerente !== undefined && row.Gerente !== null ? row.Gerente : "";
        const fechaVal = row.Date !== undefined && row.Date !== null ? row.Date : "";
        const statusVal = row.Status !== undefined && row.Status !== null ? row.Status : "";
        const coVal = row["C/O"] !== undefined && row["C/O"] !== null ? row["C/O"] : "";
        
        let pdfVal = row.PDF !== undefined && row.PDF !== null ? row.PDF : "";
        let pdfCellHtml = pdfVal;
        if (pdfVal && (pdfVal.startsWith("http://") || pdfVal.startsWith("https://"))) {
            pdfCellHtml = `<a href="${pdfVal}" target="_blank" title="View PDF" style="color:var(--primary); font-size: 16px; text-decoration:none;"><i class="fa-solid fa-eye"></i></a>`;
        }

        let editButtonHtml = "";
        if (isUserLoggedIn) {
            editButtonHtml = `<button type="button" onclick="enableEditRow(this, '${primaryKeyVal}')" title="Editar" style="background: transparent; border: none; color: #2563EB; cursor: pointer; font-size: 14px;"><i class="fa-solid fa-pen-to-square"></i></button>`;
        } else {
            editButtonHtml = `<button title="Editar (Deshabilitado)" disabled style="background: transparent; border: none; color: #94A3B8; cursor: not-allowed; font-size: 14px; opacity: 0.4;"><i class="fa-solid fa-pen-to-square"></i></button>`;
        }

        return `
            <tr data-id="${primaryKeyVal}">
                <td>${primaryKeyVal}</td>
                <td data-field="Folio">${folioVal}</td>
                <td data-field="Shift">${shiftVal}</td>
                <td data-field="Area">${areaVal}</td>
                <td data-field="EHSName">${ehsNameVal}</td>
                <td data-field="Gerente">${gerenteVal}</td>
                <td data-field="Date">${fechaVal}</td>
                <td data-field="Status"><span style="padding: 3px 8px; border-radius: 6px; background: #FEF2F2; color: #DC2626; font-weight: 800; font-size: 10px;">${statusVal}</span></td>
                <td data-field="C/O"><span style="padding: 3px 8px; border-radius: 6px; background: #EFF6FF; color: #2563EB; font-weight: 800; font-size: 10px;">${coVal}</span></td>
                <td>${pdfCellHtml}</td>
                <td style="text-align: center;">${editButtonHtml}</td>
            </tr>
        `;
    }).join("");
}

function updateBodyHeatmap() {
    const zoneCounts = {
        "Cabeza": 0, "Cara": 0, "Ojos": 0, "Cuello": 0,
        "Hombros": 0, "Pecho": 0, "Espalda": 0, "Cintura": 0,
        "Brazos": 0, "Manos": 0, "Dedos": 0, "Cadera": 0,
        "Pierna": 0, "Rodilla": 0, "Tobillo": 0, "Pie": 0
    };

    maintenanceData.forEach(row => {
        const partBody = (row.PartBody || row.partbody || "").trim().toLowerCase();
        
        if (partBody.includes("cabeza") || partBody.includes("head")) zoneCounts["Cabeza"]++;
        if (partBody.includes("cara") || partBody.includes("face")) zoneCounts["Cara"]++;
        if (partBody.includes("ojo") || partBody.includes("eye")) zoneCounts["Ojos"]++;
        if (partBody.includes("cuello") || partBody.includes("neck")) zoneCounts["Cuello"]++;
        if (partBody.includes("hombro") || partBody.includes("shoulder")) zoneCounts["Hombros"]++;
        if (partBody.includes("pecho") || partBody.includes("chest")) zoneCounts["Pecho"]++;
        if (partBody.includes("espalda") || partBody.includes("back")) zoneCounts["Espalda"]++;
        if (partBody.includes("cintura") || partBody.includes("waist")) zoneCounts["Cintura"]++;
        if (partBody.includes("brazo") || partBody.includes("arm")) zoneCounts["Brazos"]++;
        if (partBody.includes("mano") || partBody.includes("hand")) zoneCounts["Manos"]++;
        if (partBody.includes("dedo") || partBody.includes("finger")) zoneCounts["Dedos"]++;
        if (partBody.includes("cadera") || partBody.includes("hip")) zoneCounts["Cadera"]++;
        if (partBody.includes("pierna") || partBody.includes("leg") || partBody.includes("pantorrilla")) zoneCounts["Pierna"]++;
        if (partBody.includes("rodilla") || partBody.includes("knee")) zoneCounts["Rodilla"]++;
        if (partBody.includes("tobillo") || partBody.includes("ankle")) zoneCounts["Tobillo"]++;
        if (partBody.includes("pie") || partBody.includes("foot")) zoneCounts["Pie"]++;
    });

    const partMapping = {
        "Cabeza": ["part-cabeza"], 
        "Cara": ["part-cara"], 
        "Ojos": ["part-ojos"], 
        "Cuello": ["part-cuello"],
        "Hombros": ["part-hombros"], 
        "Pecho": ["part-pecho"], 
        "Espalda": ["part-espalda"], 
        "Cintura": ["part-cintura"],
        "Brazos": ["part-brazos", "part-brazos-der"], 
        "Manos": ["part-manos", "part-manos-der"],
        "Dedos": ["part-dedos", "part-dedos-der"], 
        "Cadera": ["part-cadera"],
        "Pierna": ["part-pierna", "part-pierna-der", "part-pantorrilla", "part-pantorrilla-der"],
        "Rodilla": ["part-rodilla", "part-rodilla-der"],
        "Tobillo": ["part-tobillo", "part-tobillo-der"],
        "Pie": ["part-pie", "part-pie-der"]
    };

    Object.keys(partMapping).forEach(zone => {
        const count = zoneCounts[zone] || 0;
        const selectorList = partMapping[zone];
        selectorList.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (count > 0) {
                    el.style.fill = count > 3 ? "#DC2626" : (count > 1 ? "#F59E0B" : "#60A5FA");
                } else {
                    el.style.fill = "#CBD5E1";
                }
            }
        });
    });

    const bodyStatsList = document.getElementById("bodyStatsList");
    if (bodyStatsList) {
        let html = "";
        Object.keys(zoneCounts).forEach(zone => {
            const count = zoneCounts[zone];
            if (count > 0) {
                html += `
                    <div class="body-stat-item">
                        <span>${zone}</span>
                        <span class="body-stat-badge" style="background: #FEF2F2; color: #DC2626;">${count}</span>
                    </div>
                `;
            }
        });
        if (html === "") {
            html = `
                <div class="body-stat-item">
                    <span>Sin registros en zonas</span>
                    <span class="body-stat-badge" style="background: #E2E8F0; color: #64748B;">0</span>
                </div>
            `;
        }
        bodyStatsList.innerHTML = html;
    }
}

function filterByBodyPart(partName) {
    alert(`Filtrando incidencias para la zona: ${partName}`);
}

function renderChart(canvasId, config) {
    if (activeCharts[canvasId]) activeCharts[canvasId].destroy();
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    activeCharts[canvasId] = new Chart(canvas, config);
}

function baseChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "#07111F",
                titleColor: "#FFFFFF",
                bodyColor: "#CBD5E1",
                borderColor: "rgba(255,255,255,.1)",
                borderWidth: 1,
                padding: 12,
                cornerRadius: 10,
                displayColors: true
            },
            datalabels: {
                color: "#334155",
                anchor: "end",
                align: "top",
                offset: 4,
                font: { weight: "800", size: 10 }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grace: "15%",
                ticks: { precision: 0, color: "#64748B", font: { size: 10 } },
                grid: { color: "rgba(148,163,184,.13)" },
                border: { display: false }
            },
            x: {
                ticks: { color: "#64748B", font: { size: 9, weight: "600" } },
                grid: { display: false },
                border: { display: false }
            }
        }
    };
}

function createOperationChart() {
    const shiftCounts = {};
    
    maintenanceData.forEach(row => {
        const shiftVal = row.Shift !== undefined ? row.Shift : (row.shift !== undefined ? row.shift : (row.Turno || "Unassigned"));
        const cleanShift = shiftVal !== null && shiftVal !== "" ? String(shiftVal).trim() : "Unassigned";
        shiftCounts[cleanShift] = (shiftCounts[cleanShift] || 0) + 1;
    });

    const labels = Object.keys(shiftCounts);
    const dataValues = Object.values(shiftCounts);

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: { boxWidth: 12, font: { size: 11, weight: '600' }, color: '#64748B' }
            },
            tooltip: {
                backgroundColor: "#07111F",
                titleColor: "#FFFFFF",
                bodyColor: "#CBD5E1",
                borderColor: "rgba(255,255,255,.1)",
                borderWidth: 1,
                padding: 12,
                cornerRadius: 10
            },
            datalabels: {
                display: true,
                color: "#FFFFFF",
                font: { weight: "800", size: 11 },
                formatter: (value) => value > 0 ? value : ''
            }
        }
    };

    const backgroundColors = ["#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#16A34A", "#0284C7", "#9333EA", "#CA8A04"];

    renderChart("operationChart", {
        type: "doughnut",
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: "#FFFFFF"
            }]
        },
        options: pieOptions,
        plugins: [ChartDataLabels]
    });
}

function createShiftPieChart() {
    const shiftCounts = {};

    maintenanceData.forEach(row => {
        const shiftVal = row.Shift !== undefined ? row.Shift : (row.shift !== undefined ? row.shift : (row.Turno || "Unassigned"));
        const cleanShift = shiftVal !== null && shiftVal !== "" ? String(shiftVal).trim() : "Unassigned";
        shiftCounts[cleanShift] = (shiftCounts[cleanShift] || 0) + 1;
    });

    const labels = Object.keys(shiftCounts);
    const dataValues = Object.values(shiftCounts);

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: { boxWidth: 12, font: { size: 11, weight: '600' }, color: '#64748B' }
            },
            tooltip: {
                backgroundColor: "#07111F",
                titleColor: "#FFFFFF",
                bodyColor: "#CBD5E1",
                borderColor: "rgba(255,255,255,.1)",
                borderWidth: 1,
                padding: 12,
                cornerRadius: 10
            },
            datalabels: {
                display: true,
                color: "#FFFFFF",
                font: { weight: "800", size: 11 },
                formatter: (value) => value > 0 ? value : ''
            }
        }
    };

    const backgroundColors = ["#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#16A34A", "#0284C7", "#9333EA", "#CA8A04"];

    renderChart("shiftPieChart", {
        type: "doughnut",
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: "#FFFFFF"
            }]
        },
        options: pieOptions,
        plugins: [ChartDataLabels]
    });
}

function createTypeOfAccidentChart() {
    const typeCounts = {};
    
    maintenanceData.forEach(row => {
        const accidentType = row.Type || row.Tipo || row.AccidentType || "Unassigned";
        typeCounts[accidentType] = (typeCounts[accidentType] || 0) + 1;
    });

    const labels = Object.keys(typeCounts);
    const dataValues = Object.values(typeCounts);
    const options = baseChartOptions();
    
    options.plugins.datalabels = {
        display: true,
        color: "#334155",
        anchor: "end",
        align: "top",
        offset: 4,
        font: { weight: "800", size: 10 }
    };

    renderChart("typeOfAccidentChart", {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Type of Accident",
                data: dataValues,
                backgroundColor: "rgba(245, 158, 11, 0.75)",
                hoverBackgroundColor: "#F59E0B",
                borderRadius: 7,
                borderSkipped: false,
                barPercentage: 0.65
            }]
        },
        options: options,
        plugins: [ChartDataLabels]
    });
}

function createBodyPartAnalysisChart() {
    const partBodyCounts = {};
    
    maintenanceData.forEach(row => {
        const bodyPartVal = row.PartBody || row.partbody || row.Area || "Unassigned";
        partBodyCounts[bodyPartVal] = (partBodyCounts[bodyPartVal] || 0) + 1;
    });

    const labels = Object.keys(partBodyCounts);
    const dataValues = Object.values(partBodyCounts);
    const options = baseChartOptions();
    
    options.plugins.datalabels = {
        display: true,
        color: "#334155",
        anchor: "end",
        align: "top",
        offset: 4,
        font: { weight: "800", size: 10 }
    };

    renderChart("bodyPartAnalysisChart", {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "BodyPart Analysis",
                data: dataValues,
                backgroundColor: "rgba(124, 58, 237, 0.75)",
                hoverBackgroundColor: "#7C3AED",
                borderRadius: 7,
                borderSkipped: false,
                barPercentage: 0.65
            }]
        },
        options: options,
        plugins: [ChartDataLabels]
    });
}

async function loadIndependentMonthlyChart() {
    const monthlyCount = {};
    months.forEach(m => monthlyCount[m] = 0);

    maintenanceData.forEach(row => {
        let monthName = null;
        
        if (row.Date && typeof row.Date === "string" && row.Date.length >= 7) {
            const parts = row.Date.split("-");
            if (parts.length >= 2) {
                const monthIndex = parseInt(parts[1], 10) - 1;
                if (monthIndex >= 0 && monthIndex < 12) {
                    monthName = months[monthIndex];
                }
            }
        }
        
        if (!monthName && row.Month) {
            const matched = months.find(m => m.toLowerCase() === row.Month.trim().toLowerCase());
            if (matched) monthName = matched;
        }

        if (monthName && monthlyCount.hasOwnProperty(monthName)) {
            monthlyCount[monthName]++;
        }
    });

    const values = months.map(m => monthlyCount[m]);
    const changes = values.map((val, idx) => {
        if (idx === 0) return null;
        const prev = values[idx - 1];
        if (prev === 0) return val > 0 ? 100 : 0;
        return Math.round(((val - prev) / prev) * 100);
    });

    const options = baseChartOptions();
    options.scales.x.ticks.maxRotation = 40;
    options.scales.x.ticks.minRotation = 40;
    options.scales.y.grace = "35%";
    options.plugins.datalabels = { display: false };

    const monthlyTrendPlugin = {
        id: 'monthlyTrendPlugin',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            const datasetMeta = chart.getDatasetMeta(0);
            
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            datasetMeta.data.forEach((bar, index) => {
                const value = values[index];
                const barX = bar.x;
                const barY = bar.y;
                const barBase = bar.base;
                
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '700 11px "Segoe UI", Inter, sans-serif';
                const textY = barY + (barBase - barY) / 2;
                ctx.fillText(value, barX, textY);

                if (index > 0 && changes[index] !== null) {
                    const change = changes[index];
                    const isPositive = change >= 0;
                    const changeText = `${isPositive ? '+' : ''}${change}%`;
                    
                    const badgeWidth = 42;
                    const badgeHeight = 18;
                    const badgeX = barX - badgeWidth / 2;
                    const badgeY = barY - 26;

                    ctx.fillStyle = isPositive ? '#FCA5A5' : '#6EE7B7';
                    ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

                    ctx.fillStyle = '#000000';
                    ctx.font = '800 9px "Segoe UI", Inter, sans-serif';
                    ctx.fillText(changeText, barX, badgeY + badgeHeight / 2);
                }
            });
            ctx.restore();
        }
    };

    renderChart("monthlyIssuesChart", {
        type: "bar",
        data: {
            labels: months,
            datasets: [{ label: "Issues", data: values, backgroundColor: "rgba(124, 58, 237, 0.55)", hoverBackgroundColor: "#7C3AED", borderRadius: 7, borderSkipped: false, barPercentage: 0.68 }]
        },
        options,
        plugins: [monthlyTrendPlugin]
    });
}

function toggleUserDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById("userDropdown");
    if (dropdown) dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

function setProtectedElementsState(isLoggedIn, userName = "") {
    isUserLoggedIn = isLoggedIn; 
    const loginBtn = document.getElementById("loginMenuBtn");
    const logoutBtn = document.getElementById("logoutMenuBtn");
    const statusText = document.getElementById("userStatusText");
    const avatarText = document.getElementById("userAvatarText");

    if (isLoggedIn) {
        sessionActiveUser = userName;
        localStorage.setItem("smrc_logged_user", userName);
        if (loginBtn) loginBtn.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "flex";
        if (statusText) {
            statusText.textContent = userName || "Sesión Activa";
            statusText.style.color = "#10B981";
        }
        if (avatarText && userName) avatarText.textContent = userName.substring(0, 2).toUpperCase();
    } else {
        sessionActiveUser = null;
        localStorage.removeItem("smrc_logged_user");
        if (loginBtn) loginBtn.style.display = "flex";
        if (logoutBtn) logoutBtn.style.display = "none";
        if (statusText) {
            statusText.textContent = "No Iniciada";
            statusText.style.color = "#EF4444";
        }
        if (avatarText) avatarText.textContent = "RC";
    }

    renderOpenAuditsTable();
    filterModalTable();
}

function checkAccidentsSession() {
    const loggedUser = localStorage.getItem("smrc_logged_user");
    if (loggedUser) {
        setProtectedElementsState(true, loggedUser);
    } else {
        setProtectedElementsState(false);
    }
}

function openLoginPrompt() {
    const dropdown = document.getElementById("userDropdown");
    if (dropdown) dropdown.style.display = "none";
    const loginModal = document.getElementById("loginModal");
    if (loginModal) loginModal.style.display = "flex";
}

function closeLoginModal() {
    const loginModal = document.getElementById("loginModal");
    if (loginModal) loginModal.style.display = "none";
}

async function handleFormLogin(event) {
    event.preventDefault();
    const userInput = document.getElementById("loginUser").value.trim();
    const passwordInput = document.getElementById("loginPassword").value.trim();

    try {
        const { data, error } = await supabaseClient
            .from("Cuentas")
            .select("*")
            .eq("Usurio", userInput)
            .eq("Password", passwordInput);

        if (error) {
            alert("Error al verificar credenciales: " + error.message);
            return;
        }

        if (data && data.length > 0) {
            closeLoginModal();
            setProtectedElementsState(true, userInput);
            document.getElementById("loginUser").value = "";
            document.getElementById("loginPassword").value = "";
        } else {
            alert("Usuario o contraseña incorrectos.");
        }
    } catch (err) {
        console.error("Error inesperado:", err);
        alert("Ocurrió un error al intentar iniciar sesión.");
    }
}

function handleSignOut() {
    setProtectedElementsState(false);
    const dropdown = document.getElementById("userDropdown");
    if (dropdown) dropdown.style.display = "none";
}

window.addEventListener("load", function() {
    populateYearDropdowns();
    setCurrentYear();
    checkAccidentsSession();
});

document.addEventListener("contextmenu", (e) => { e.preventDefault(); });
document.addEventListener("selectstart", (e) => { e.preventDefault(); });
document.addEventListener("copy", (e) => { e.preventDefault(); });
document.addEventListener("cut", (e) => { e.preventDefault(); });
document.addEventListener("dragstart", (e) => { e.preventDefault(); });

document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (e.key === "F12") { e.preventDefault(); return; }
    if (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) { e.preventDefault(); return; }
    if (e.ctrlKey && (key === "u" || key === "c" || key === "x" || key === "s" || key === "a")) { e.preventDefault(); return; }
});

async function loadPositionsDropdown() {
    const positionSelect = document.getElementById("newEmpPosition");
    if (!positionSelect) return;

    positionSelect.innerHTML = '<option value="">Seleccione un puesto...</option>';

    try {
        const { data, error } = await supabaseClient
            .from("Empleados")
            .select("Puesto");

        if (error) {
            console.error("Error al cargar los puestos:", error);
            return;
        }

        if (data && data.length > 0) {
            const uniquePositions = [...new Set(data.map(item => item.Puesto).filter(p => p && p.trim() !== ""))];
            uniquePositions.sort();

            uniquePositions.forEach(puesto => {
                const option = document.createElement("option");
                option.value = puesto;
                option.textContent = puesto;
                positionSelect.appendChild(option);
            });
        }
    } catch (err) {
        console.error("Error inesperado al cargar puestos:", err);
    }
}