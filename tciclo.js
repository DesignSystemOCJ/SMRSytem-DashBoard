let globalModelos = []; 
let modelosMap = {}; 
let gaugeChartInstance = null; 
let globalRegcicloData = []; 
let globalTblprodData = []; 
let currentModelFilter = ''; 
let historyOffsetDays = 0; // Control de paginación de 10 días hacia atrás

window.addEventListener('DOMContentLoaded', () => {
    initGaugeChart();
    fetchSupabaseData();

    // Escuchar cambios en el filtro de modelos y búsqueda inteligente por teclado
    const modelFilterEl = document.getElementById('matrix-model-filter');
    if (modelFilterEl) {
        let searchBuffer = '';
        let searchTimeout = null;

        modelFilterEl.addEventListener('change', (e) => {
            currentModelFilter = e.target.value;
            if (globalRegcicloData.length > 0) {
                renderMatrixFromRegciclo(globalRegcicloData);
            }
        });

        // Permitir digitar progresivamente en el filtro sin alterar su apariencia ni que se escriba texto plano
        modelFilterEl.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                searchBuffer = searchBuffer.slice(0, -1);
            } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                searchBuffer += e.key.toLowerCase();
            } else {
                return;
            }

            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchBuffer = '';
            }, 1500);

            if (searchBuffer.trim() !== '') {
                const options = Array.from(modelFilterEl.options);
                
                // 1. Buscar coincidencia exacta al inicio del texto
                let matchedOption = options.find(opt => opt.value.toLowerCase().startsWith(searchBuffer));
                
                // 2. Si no encuentra, buscar cualquier opción que contenga el texto digitado
                if (!matchedOption) {
                    matchedOption = options.find(opt => opt.value.toLowerCase().includes(searchBuffer));
                }

                if (matchedOption) {
                    modelFilterEl.value = matchedOption.value;
                    currentModelFilter = matchedOption.value;
                    if (globalRegcicloData.length > 0) {
                        renderMatrixFromRegciclo(globalRegcicloData);
                    }
                }
            }
        });
    }

    // Escuchar clic en el botón de limpiar filtro
    const clearFilterBtn = document.getElementById('matrix-clear-filter-btn');
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', () => {
            currentModelFilter = '';
            if (modelFilterEl) {
                modelFilterEl.value = '';
            }
            if (globalRegcicloData.length > 0) {
                renderMatrixFromRegciclo(globalRegcicloData);
            }
        });
    }

    // Lógica para el selector de vistas (Model&Cells / Historial de Modelos)
    const matrixViewSelect = document.getElementById('matrix-view-select');
    const containerMatriz = document.getElementById('container-matriz-modelos');
    const containerHistorial = document.getElementById('container-historial-modelos');

    if (matrixViewSelect && containerMatriz && containerHistorial) {
        matrixViewSelect.addEventListener('change', (e) => {
            const selectedVal = e.target.value;
            if (selectedVal === 'historial-modelos') {
                containerMatriz.classList.add('hidden');
                containerHistorial.classList.remove('hidden');
                renderHistoryTable();
            } else {
                containerHistorial.classList.add('hidden');
                containerMatriz.classList.remove('hidden');
            }
        });
    }

    // Botón Volver desde Historial de Modelos
    const backToMatrixBtn = document.getElementById('back-to-matrix-btn');
    if (backToMatrixBtn && containerMatriz && containerHistorial && matrixViewSelect) {
        backToMatrixBtn.addEventListener('click', () => {
            containerHistorial.classList.add('hidden');
            containerMatriz.classList.remove('hidden');
            matrixViewSelect.value = 'model-cells';
        });
    }

    // Navegación de días en Historial
    const prevDaysBtn = document.getElementById('history-prev-days-btn');
    const nextDaysBtn = document.getElementById('history-next-days-btn');

    if (prevDaysBtn) {
        prevDaysBtn.addEventListener('click', () => {
            historyOffsetDays += 10;
            renderHistoryTable();
        });
    }

    if (nextDaysBtn) {
        nextDaysBtn.addEventListener('click', () => {
            if (historyOffsetDays >= 10) {
                historyOffsetDays -= 10;
                renderHistoryTable();
            }
        });
    }
});

// Función para renderizar el Historial de Modelos por Fecha (10 Días) con modelo dinámico y condicional
function renderHistoryTable() {
    const historyThead = document.getElementById('history-thead-tr');
    const historyTbody = document.getElementById('history-tbody');
    const rangeLabel = document.getElementById('history-date-range-label');
    const nextDaysBtn = document.getElementById('history-next-days-btn');

    if (!historyThead || !historyTbody) return;

    if (nextDaysBtn) {
        nextDaysBtn.disabled = (historyOffsetDays === 0);
    }

    // Generar los 10 días para la vista actual (ordenados de más reciente a más antiguo) con formato DD-MMM-YY
    const dates = [];
    const monthsEs = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const today = new Date();

    for (let i = 0; i < 10; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - (historyOffsetDays + i));
        
        const dayStr = String(d.getDate()).padStart(2, '0');
        const monthStr = monthsEs[d.getMonth()];
        const yearStr = String(d.getFullYear()).slice(-2);
        
        const formattedDate = `${dayStr}-${monthStr}-${yearStr}`;
        const isoDate = d.toISOString().split('T')[0];

        dates.push({
            formatted: formattedDate,
            iso: isoDate,
            dateObj: d
        });
    }

    if (rangeLabel && dates.length > 0) {
        rangeLabel.textContent = `${dates[dates.length - 1].formatted} - ${dates[0].formatted}`;
    }

    // Cabecera con Fechas
    let theadHTML = `
        <th class="py-1.5 px-2 font-semibold sticky left-0 bg-white z-20 w-[70px]">CELL</th>
    `;
    dates.forEach(d => {
        theadHTML += `<th class="py-1.5 px-1 font-semibold text-center w-[90px] text-[10px]">${d.formatted}</th>`;
    });
    historyThead.innerHTML = theadHTML;

    // Generar C01 a C36 omitiendo C31 y C32
    const cellList = [];
    for (let i = 1; i <= 36; i++) {
        if (i === 31 || i === 32) continue;
        const cellName = 'C' + String(i).padStart(2, '0');
        cellList.push(cellName);
    }

    const dataByCellAndDate = {};

    globalRegcicloData.forEach(row => {
        const cell = String(row.Cell ?? row.cell ?? row.CELL ?? '').trim().toUpperCase();
        const rawDate = row.Date ?? row.date ?? row.DATE ?? row.created_at ?? '';
        const model = String(row.Model ?? row.model ?? row.MODEL ?? '').trim();
        const qty = row.Qty ?? row.qty ?? row.QTY ?? row.Actual ?? row.actual ?? row.Target_Actual ?? '';

        if (cell && rawDate) {
            const parsedIso = String(rawDate).split('T')[0];
            if (!dataByCellAndDate[cell]) dataByCellAndDate[cell] = {};
            if (!dataByCellAndDate[cell][parsedIso]) dataByCellAndDate[cell][parsedIso] = [];
            dataByCellAndDate[cell][parsedIso].push({ model, qty });
        }
    });

    let tbodyHTML = '';

    cellList.forEach(cell => {
        tbodyHTML += `<tr class="hover:bg-slate-50 transition-colors cursor-pointer">`;
        tbodyHTML += `<td class="py-1.5 px-2 font-bold text-slate-800 sticky left-0 bg-white z-10 w-[70px]">${cell}</td>`;

        let lastSeenModel = null;

        // Recorremos desde el día más antiguo hacia el más reciente para rastrear el cambio de modelo correctamente
        const evaluatedRowCells = [];
        for (let idx = dates.length - 1; idx >= 0; idx--) {
            const d = dates[idx];
            const records = (dataByCellAndDate[cell] && dataByCellAndDate[cell][d.iso]) ? dataByCellAndDate[cell][d.iso] : [];
            
            if (records.length === 0) {
                evaluatedRowCells.push({ html: `<td class="text-center py-1.5 px-1 text-slate-300">-</td>` });
            } else {
                const currentRecord = records[0];
                const currentModel = currentRecord.model || '';
                const qtyVal = currentRecord.qty !== '' && currentRecord.qty !== null ? currentRecord.qty : '-';

                let cellMarkup = '';
                if (currentModel !== '' && currentModel !== lastSeenModel) {
                    cellMarkup = `<td class="text-center py-1.5 px-1 font-semibold text-slate-800"><span class="text-slate-500 font-normal">(${currentModel})</span> ${qtyVal}</td>`;
                    lastSeenModel = currentModel;
                } else {
                    cellMarkup = `<td class="text-center py-1.5 px-1 font-semibold text-slate-800">${qtyVal}</td>`;
                }
                evaluatedRowCells[idx] = { html: cellMarkup };
            }
        }

        // Invertimos de vuelta para pintar en el orden visual de las columnas
        for (let idx = 0; idx < dates.length; idx++) {
            if (evaluatedRowCells[idx]) {
                tbodyHTML += evaluatedRowCells[idx].html;
            } else {
                tbodyHTML += `<td class="text-center py-1.5 px-1 text-slate-300">-</td>`;
            }
        }

        tbodyHTML += `</tr>`;
    });

    historyTbody.innerHTML = tbodyHTML;
    attachHistoryRowEvents();
}

function attachHistoryRowEvents() {
    const historyTbody = document.getElementById('history-tbody');
    if (!historyTbody) return;

    const rows = historyTbody.querySelectorAll('tr');
    rows.forEach(row => {
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            historyTbody.querySelectorAll('tr.history-row-selected').forEach(r => {
                r.classList.remove('history-row-selected');
            });
            row.classList.add('history-row-selected');
        });
    });
}

function parseAndAverageValue(value) {
    if (value === null || value === undefined || value === '') return '-';

    if (typeof value === 'number' && !isNaN(value)) {
        return Math.round(value);
    }

    const strVal = String(value).trim();
    if (strVal === '' || strVal === '-' || strVal.toLowerCase() === 'null' || strVal.toLowerCase() === 'undefined') {
        return '-';
    }

    if (!isNaN(strVal)) {
        return Math.round(parseFloat(strVal));
    }

    if (strVal.includes(' ')) {
        const parts = strVal.split(/\s+/).filter(p => p.trim() !== '');
        const allNumbers = parts.every(p => !isNaN(p));
        if (allNumbers && parts.length > 0) {
            const nums = parts.map(Number);
            const avg = nums.reduce((sum, n) => sum + n, 0) / nums.length;
            return Math.round(avg);
        }
    }

    return strVal;
}

function updateGaugeValue(avgActualValue, wphMax) {
    const elGaugeText = document.getElementById('gauge-time-val');
    
    if (!wphMax || isNaN(wphMax) || wphMax <= 0) {
        if (elGaugeText) elGaugeText.textContent = '-';
        if (gaugeChartInstance) {
            gaugeChartInstance.data.datasets[0].data = [0, 100];
            gaugeChartInstance.update();
        }
        return;
    }

    if (elGaugeText) elGaugeText.textContent = wphMax;

    if (gaugeChartInstance) {
        const currentVal = Math.min(avgActualValue, wphMax);
        const remainingVal = Math.max(0, wphMax - currentVal);

        gaugeChartInstance.data.datasets[0].data = [currentVal, remainingVal];
        gaugeChartInstance.update();
    }
}

function updateTargetVsActualPercentage(avgTarget, avgActual) {
    const container = document.getElementById('target-vs-actual-container');
    const icon = document.getElementById('target-vs-actual-icon');
    const valSpan = document.getElementById('target-vs-actual-val');

    if (!container || !icon || !valSpan) return;

    if (avgTarget > 0) {
        const diffPct = ((avgActual - avgTarget) / avgTarget) * 100;
        const formattedPct = (diffPct >= 0 ? '+' : '') + diffPct.toFixed(1) + '%';
        valSpan.textContent = formattedPct;

        if (diffPct >= 0) {
            container.className = "text-[11px] font-semibold text-emerald-600 mt-1.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60";
            icon.className = "fa-solid fa-arrow-up text-[9px]";
        } else {
            container.className = "text-[11px] font-semibold text-rose-600 mt-1.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200/60";
            icon.className = "fa-solid fa-arrow-down text-[9px]";
        }
    } else {
        valSpan.textContent = "0.0%";
    }
}

function recalculateMetricsFromDOM() {
    let totalTime = 0, countTime = 0;
    let totalActual = 0, countActual = 0;

    document.querySelectorAll('#tblprod-tbody tr').forEach(row => {
        const timeCell = row.querySelector('.time-cell');
        const actualCell = row.querySelector('.actual-cell');

        if (timeCell) {
            const timeVal = parseFloat(timeCell.textContent);
            if (!isNaN(timeVal)) {
                totalTime += timeVal;
                countTime++;
            }
        }

        if (actualCell) {
            const actualVal = parseFloat(actualCell.textContent);
            if (!isNaN(actualVal)) {
                totalActual += actualVal;
                countActual++;
            }
        }
    });

    const avgTarget = countTime > 0 ? totalTime / countTime : 0;
    const avgActual = countActual > 0 ? totalActual / countActual : 0;

    const elPromedioActual = document.getElementById('promedio-time-val');
    if (elPromedioActual) {
        elPromedioActual.textContent = Math.round(avgActual);
    }

    updateTargetVsActualPercentage(avgTarget, avgActual);

    if (countTime > 0) {
        const promedioTargetExacto = totalTime / countTime;
        const promedioTime = Math.round(promedioTargetExacto);
        const produccionCalculada = (promedioTargetExacto * 30 * 24 * 0.85) / 2;
        
        const elProduction = document.getElementById('production-val');
        if (elProduction) {
            elProduction.textContent = Math.round(produccionCalculada).toLocaleString('en-US');
        }

        updateGaugeValue(avgActual, promedioTime);
    } else {
        updateGaugeValue(0, 0);
        const elProduction = document.getElementById('production-val');
        if (elProduction) {
            elProduction.textContent = '-';
        }
    }
}

function renderMatrixFromRegciclo(regcicloData) {
    globalRegcicloData = regcicloData;
    const theadTr = document.getElementById('matrix-thead-tr');
    const tbody = document.getElementById('matrix-tbody');
    if (!theadTr || !tbody) return;

    const modelsSet = new Set();
    const cellsSet = new Set();
    const matrixMap = {};

    if (!globalTblprodData || globalTblprodData.length === 0) {
        theadTr.innerHTML = `
            <th class="py-1 px-1 font-semibold sticky left-0 bg-white z-20 w-[95px]">Modelo</th>
            <th class="py-1 px-1 font-semibold sticky left-[95px] bg-white z-20 w-[55px]">SIZE</th>
            <th class="py-1 px-1 font-semibold sticky left-[150px] bg-white z-20 w-[45px]">WPH</th>
        `;
        tbody.innerHTML = `<tr><td colspan="3" class="py-4 text-center text-slate-400">No hay modelos activos en Producción Actual para mostrar</td></tr>`;
        return;
    }

    globalTblprodData.forEach(row => {
        const modelVal = String(row.Model ?? row.model ?? row.MODEL ?? '').trim();
        const cellVal = String(row.Cell ?? row.cell ?? row.CELL ?? '').trim();
        const actualVal = row.Actual ?? row.actual ?? row.ACTUAL ?? '';

        if (modelVal !== '' && modelVal !== '-' && modelVal !== 'null' && modelVal !== 'undefined') {
            modelsSet.add(modelVal);

            if (cellVal && cellVal !== '-' && cellVal !== 'null' && cellVal !== 'undefined') {
                cellsSet.add(cellVal);
                if (!matrixMap[modelVal]) matrixMap[modelVal] = {};
                if (!matrixMap[modelVal][cellVal]) matrixMap[modelVal][cellVal] = [];
                matrixMap[modelVal][cellVal].push(actualVal);
            }
        }
    });

    if (modelsSet.size === 0) {
        theadTr.innerHTML = `
            <th class="py-1 px-1 font-semibold sticky left-0 bg-white z-20 w-[95px]">Modelo</th>
            <th class="py-1 px-1 font-semibold sticky left-[95px] bg-white z-20 w-[55px]">SIZE</th>
            <th class="py-1 px-1 font-semibold sticky left-[150px] bg-white z-20 w-[45px]">WPH</th>
        `;
        tbody.innerHTML = `<tr><td colspan="3" class="py-4 text-center text-slate-400">No hay modelos activos en Producción Actual para mostrar</td></tr>`;
        return;
    }

    let models = Array.from(modelsSet).sort((a, b) => {
        const numA = parseFloat(a.replace(/[^\d.]/g, ''));
        const numB = parseFloat(b.replace(/[^\d.]/g, ''));
        if (!isNaN(numA) && !isNaN(numB)) {
            if (numA !== numB) return numA - numB;
        }
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    if (currentModelFilter) {
        models = models.filter(m => m === currentModelFilter);
    }

    const cells = Array.from(cellsSet).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
    });

    let theadHTML = `
        <th class="py-1 px-1 font-semibold sticky left-0 bg-white z-20 w-[95px]">Modelo</th>
        <th class="py-1 px-1 font-semibold sticky left-[95px] bg-white z-20 w-[55px]">SIZE</th>
        <th class="py-1 px-1 font-semibold sticky left-[150px] bg-white z-20 w-[45px]">WPH</th>
    `;
    cells.forEach((cell, idx) => {
        theadHTML += `<th class="py-1 px-0.5 text-center font-semibold" data-col-index="${idx}">${cell}</th>`;
    });
    theadTr.innerHTML = theadHTML;

    let tbodyHTML = '';
    if (models.length === 0 || cells.length === 0) {
        tbodyHTML = `<tr><td colspan="${Math.max(cells.length + 3, 4)}" class="py-4 text-center text-slate-400">No hay modelos con datos disponibles para mostrar</td></tr>`;
    } else {
        models.forEach(model => {
            const sizeVal = (modelosMap[model] && (modelosMap[model].Size !== undefined || modelosMap[model].size !== undefined)) 
                ? (modelosMap[model].Size ?? modelosMap[model].size) 
                : '-';

            let wphVal = (modelosMap[model] && (modelosMap[model].wph !== undefined)) ? modelosMap[model].wph : '-';
            if (wphVal === '-' && globalTblprodData) {
                const foundProdRow = globalTblprodData.find(r => String(r.Model ?? r.model ?? r.MODEL ?? '').trim().toLowerCase() === model.toLowerCase());
                if (foundProdRow) {
                    const matchedModelo = globalModelos.find(m => String(m.Models ?? m.models ?? m.MODEL ?? '').trim().toLowerCase() === model.toLowerCase());
                    if (matchedModelo) {
                        wphVal = matchedModelo.WPH ?? matchedModelo.wph ?? matchedModelo.Wph ?? '-';
                    }
                }
            }

            tbodyHTML += `<tr>`;
            tbodyHTML += `<td class="py-1 px-1 font-bold text-slate-800 font-sans flex items-center gap-1 sticky left-0 bg-white z-10 w-[95px]">
                <i class="fa-solid fa-circle-dot text-blue-600 text-[8px]"></i>
                <div class="truncate w-full" title="${model}">${model}</div>
            </td>`;
            tbodyHTML += `<td class="py-1 px-1 text-slate-600 font-medium sticky left-[95px] bg-white z-10 truncate w-[55px]" title="${sizeVal}">${sizeVal}</td>`;
            tbodyHTML += `<td class="py-1 px-1 text-blue-600 font-bold sticky left-[150px] bg-white z-10 truncate w-[45px] text-center" title="${wphVal}">${wphVal}</td>`;

            cells.forEach((cell, colIdx) => {
                const rawCellData = (matrixMap[model] && matrixMap[model][cell]) ? matrixMap[model][cell] : '';
                
                let displayVal = '-';
                if (Array.isArray(rawCellData)) {
                    const joinedData = rawCellData.join(' ');
                    displayVal = parseAndAverageValue(joinedData);
                } else if (rawCellData !== '' && rawCellData !== null) {
                    displayVal = parseAndAverageValue(rawCellData);
                }

                let cellBgClass = 'bg-slate-100';
                const numDisplay = parseFloat(displayVal);
                const numWph = parseFloat(wphVal);
                if (!isNaN(numDisplay) && !isNaN(numWph) && numDisplay < numWph) {
                    cellBgClass = 'bg-rose-100';
                }

                tbodyHTML += `<td data-col-index="${colIdx}" class="text-center p-1 rounded-md ${cellBgClass} text-slate-800 font-bold matrix-cell text-[10px] cursor-pointer">${displayVal}</td>`;
            });

            tbodyHTML += `</tr>`;
        });
    }
    tbody.innerHTML = tbodyHTML;

    attachMatrixHighlightEvents();
}

function attachMatrixHighlightEvents() {
    const matrixTbody = document.getElementById('matrix-tbody');
    if (!matrixTbody) return;

    const cells = matrixTbody.querySelectorAll('td[data-col-index]');

    cells.forEach(cell => {
        cell.addEventListener('click', function(e) {
            e.stopPropagation();

            document.querySelectorAll('.matrix-cross-highlight').forEach(el => el.classList.remove('matrix-cross-highlight'));
            document.querySelectorAll('.matrix-cell-selected').forEach(el => el.classList.remove('matrix-cell-selected'));

            const selectedRow = this.closest('tr');
            const colIndex = this.getAttribute('data-col-index');

            selectedRow.querySelectorAll('td').forEach((td, index) => {
                if (index > 2) {
                    td.classList.add('matrix-cross-highlight');
                }
            });

            if (colIndex !== null) {
                const allColCells = matrixTbody.querySelectorAll(`td[data-col-index="${colIndex}"]`);
                allColCells.forEach(td => td.classList.add('matrix-cross-highlight'));
            }

            this.classList.remove('matrix-cross-highlight');
            this.classList.add('matrix-cell-selected');
        });
    });
}

async function fetchSupabaseData() {
    try {
        const { data: modelos, error: errModelos } = await supabaseClient
            .from('Modelos')
            .select('*');

        if (errModelos) {
            console.warn('Información de Supabase (Modelos):', errModelos.message);
        } else {
            globalModelos = modelos || [];
        }

        modelosMap = {};
        if (modelos) {
            modelos.forEach(m => {
                const modKey = String(m.Models ?? m.models ?? m.MODEL ?? '').trim();
                const wphVal = m.WPH ?? m.wph ?? m.Wph;
                const sizeVal = m.Size ?? m.size ?? m.SIZE;
                const updateVal = m.Update ?? m.update ?? m.UPDATE;
                if (modKey) {
                    modelosMap[modKey] = {
                        wph: wphVal,
                        size: sizeVal,
                        update: updateVal
                    };
                }
            });
        }

        const { data: regciclo, error: errRegciclo } = await supabaseClient
            .from('regciclo')
            .select('*');

        if (errRegciclo) {
            console.warn('Información de Supabase (regciclo):', errRegciclo.message);
        }

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const totalMinutes = currentHour * 60 + currentMinute;

        const isDayShift = (totalMinutes >= 361 && totalMinutes <= 1080);

        let startDate = new Date();
        if (!isDayShift && currentHour < 6) {
            startDate.setDate(startDate.getDate() - 1);
        }
        const startDateIso = startDate.toISOString().split('T')[0];

        let endDate = new Date(startDate);
        if (!isDayShift) {
            endDate.setDate(endDate.getDate() + 1);
        }
        const endDateIso = endDate.toISOString().split('T')[0];

        const filteredRegciclo = (regciclo || []).filter(row => {
            const createdAt = row.created_at ?? row.CreatedAt ?? '';
            if (!createdAt) return false;

            const [datePart, timePartFull] = createdAt.includes('T') ? createdAt.split('T') : [createdAt.split(' ')[0], createdAt.split(' ')[1]];
            if (!datePart || !timePartFull) return false;

            const timePart = timePartFull.split('.')[0];
            const [hStr, mStr] = timePart.split(':');
            const rowMinutes = parseInt(hStr || 0) * 60 + parseInt(mStr || 0);

            if (isDayShift) {
                return datePart === startDateIso && rowMinutes >= 361 && rowMinutes <= 1080;
            } else {
                if (datePart === startDateIso && rowMinutes >= 1081) {
                    return true;
                }
                if (datePart === endDateIso && rowMinutes <= 360) {
                    return true;
                }
                return false;
            }
        });

        let shiftValue = '';
        if (filteredRegciclo.length > 0) {
            const shifts = filteredRegciclo.map(r => r.Shift ?? r.shift ?? r.SHIFT).filter(Boolean);
            if (shifts.length > 0) {
                shiftValue = shifts[0];
            }
        }

        const fechaActualEl = document.getElementById('fecha-actual-prod');
        if (fechaActualEl) {
            const dia = String(startDate.getDate()).padStart(2, '0');
            const mes = String(startDate.getMonth() + 1).padStart(2, '0');
            const anio = startDate.getFullYear();
            fechaActualEl.textContent = `${dia}/${mes}/${anio}${shiftValue ? ' - Shift: ' + shiftValue : ''}`;
        }

        filteredRegciclo.sort((a, b) => {
            const cellA = String(a.Cell ?? a.cell ?? a.CELL ?? '');
            const cellB = String(b.Cell ?? b.cell ?? b.CELL ?? '');
            const numA = parseInt(cellA.replace(/\D/g, '')) || 0;
            const numB = parseInt(cellB.replace(/\D/g, '')) || 0;
            if (numA !== numB) return numA - numB;
            return cellA.localeCompare(cellB);
        });

        globalTblprodData = filteredRegciclo.map(row => ({
            id: row.id ?? row.ID ?? null,
            Cell: row.Cell ?? row.cell ?? row.CELL,
            Model: row.Model ?? row.model ?? row.MODEL,
            Actual: row.Target_Actual ?? row.target_actual ?? row.TargetActual ?? row.targetActual,
            Date: row.Date ?? row.date ?? row.DATE,
            Week: row.Week ?? row.week ?? row.WEEK,
            Month: row.Month ?? row.month ?? row.MONTH,
            Shift: row.Shift ?? row.shift ?? row.SHIFT
        }));

        const tbody = document.getElementById('tblprod-tbody');
        
        if (errRegciclo) {
            console.error('Error al obtener regciclo:', errRegciclo);
            tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-rose-500 text-[11px]">Error al cargar datos</td></tr>`;
        } else if (globalTblprodData.length > 0) {
            const uniqueModels = new Set();
            globalTblprodData.forEach(r => {
                const mVal = String(r.Model ?? r.model ?? r.MODEL ?? '').trim();
                if (mVal !== '' && mVal !== '-') {
                    uniqueModels.add(mVal);
                }
            });
            
            const elActiveModels = document.getElementById('active-models-count');
            if (elActiveModels) {
                elActiveModels.textContent = uniqueModels.size;
            }

            tbody.innerHTML = '';

            let totalTime = 0;
            let countTime = 0;
            let totalActual = 0;
            let countActual = 0;

            globalTblprodData.forEach(row => {
                const cellVal = row.Cell ?? row.cell ?? '-';
                const modelVal = row.Model ?? row.model ?? row.MODEL ?? '';
                const recordId = row.id ?? '';
                
                let timeVal = '';
                let updateBoxHTML = `<span class="inline-block w-1.5 h-3 rounded-[1px] flex-shrink-0"></span>`;
                const trimmedModel = String(modelVal).trim();
                
                if (trimmedModel !== '' && globalModelos && globalModelos.length > 0) {
                    const matchedModelo = globalModelos.find(m => {
                        const mName = String(m.Models ?? m.models ?? m.MODEL ?? '').trim();
                        return mName.toLowerCase() === trimmedModel.toLowerCase();
                    });
                    if (matchedModelo) {
                        timeVal = matchedModelo.WPH ?? matchedModelo.wph ?? matchedModelo.Wph ?? '';
                        const updateVal = matchedModelo.Update ?? matchedModelo.update ?? matchedModelo.UPDATE;
                        const isTrue = updateVal === true || String(updateVal).toLowerCase() === 'true';
                        if (isTrue) {
                            updateBoxHTML = `<span class="inline-block w-1.5 h-3 bg-blue-500 rounded-[1px] flex-shrink-0" title="Update: TRUE"></span>`;
                        }
                    }
                }

                if (timeVal !== '' && timeVal !== null && timeVal !== '-' && !isNaN(timeVal)) {
                    totalTime += Number(timeVal);
                    countTime++;
                }

                const actualVal = row.Actual ?? row.actual ?? '-';
                let diffVal = '-';

                if (actualVal !== '' && actualVal !== null && actualVal !== '-' && !isNaN(actualVal)) {
                    totalActual += Number(actualVal);
                    countActual++;
                }

                if (!isNaN(actualVal) && !isNaN(timeVal) && actualVal !== '-' && timeVal !== '' && timeVal !== '-') {
                    diffVal = Number(actualVal) - Number(timeVal);
                }

                let indicatorHTML = '';
                const actualStr = String(actualVal).trim().toUpperCase();
                
                if (actualStr === 'MANTTO') {
                    indicatorHTML = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" title="Mantto"></span>`;
                } else if (actualStr === 'TPM2' || actualStr === 'TPM') {
                    indicatorHTML = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-sm" title="P.M."></span>`;
                } else if (actualStr === 'SET-UP' || actualStr === 'SET UP') {
                    indicatorHTML = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm" title="SET-UP"></span>`;
                } else if (actualVal !== '' && actualVal !== null && actualVal !== '-' && !isNaN(actualVal) && Number(actualVal) > 0) {
                    indicatorHTML = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm animate-blink-dot" title="Running"></span>`;
                } else {
                    indicatorHTML = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-slate-300 shadow-sm" title="Inactivo"></span>`;
                }

                const tr = document.createElement('tr');
                if (!isNaN(diffVal) && diffVal !== '-' && Number(diffVal) < 0) {
                    tr.className = 'bg-orange-100';
                }

                tr.innerHTML = `
                    <td class="py-1.5 px-0.5 font-bold text-slate-800 text-center flex items-center justify-center gap-1.5">
                        ${indicatorHTML}
                        ${cellVal}
                    </td>
                    <td class="py-1.5 px-0.5 text-slate-600 font-medium text-center cursor-pointer hover:bg-slate-50 transition-colors editable-model-cell model-cell truncate max-w-[80px]" data-cell="${cellVal}" data-id="${recordId}" title="Haz clic para editar">
                        <div class="flex items-center justify-center gap-1.5">
                            ${updateBoxHTML}
                            <span class="model-text truncate">${modelVal !== '' && modelVal !== null ? modelVal : '-'}</span>
                        </div>
                    </td>
                    <td class="py-1.5 px-0.5 text-center font-bold text-blue-600 time-cell" data-cell="${cellVal}">${timeVal !== '' && timeVal !== null ? timeVal : '-'}</td>
                    <td class="py-1.5 px-0.5 text-center text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors editable-actual-cell actual-cell font-semibold" data-field="Target_Actual" data-cell="${cellVal}" data-id="${recordId}" title="Haz clic para editar">${actualVal !== '' && actualVal !== null ? actualVal : '-'}</td>
                    <td class="py-1.5 px-0.5 text-center font-semibold diff-cell ${Number(diffVal) < 0 ? 'text-rose-600' : Number(diffVal) > 0 ? 'text-emerald-600' : 'text-slate-600'}">${diffVal}</td>
                `;
                tbody.appendChild(tr);
            });

            let promedioActualExacto = 0;
            if (countActual > 0) {
                promedioActualExacto = totalActual / countActual;
                const promedioActualNum = Math.round(promedioActualExacto);
                const elPromedio = document.getElementById('promedio-time-val');
                if (elPromedio) elPromedio.textContent = promedioActualNum;
            }

            if (countTime > 0) {
                const promedioTargetExacto = totalTime / countTime;
                const promedioTime = Math.round(promedioTargetExacto);

                updateTargetVsActualPercentage(promedioTargetExacto, promedioActualExacto);
                
                const produccionCalculada = (promedioTargetExacto * 30 * 24 * 0.85) / 2;
                
                const elProduction = document.getElementById('production-val');
                if (elProduction) {
                    elProduction.textContent = Math.round(produccionCalculada).toLocaleString('en-US');
                }

                updateGaugeValue(promedioActualExacto, promedioTime);
            } else {
                updateGaugeValue(0, 0);
                const elProduction = document.getElementById('production-val');
                if (elProduction) {
                    elProduction.textContent = '-';
                }
            }

            attachModelEditableEvents();
            attachActualEditableEvents();
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-400">No hay registros</td></tr>`;
            updateGaugeValue(0, 0);
            const elProduction = document.getElementById('production-val');
            if (elProduction) elProduction.textContent = '-';
        }

        if (regciclo) {
            renderMatrixFromRegciclo(regciclo);

            const modelFilter = document.getElementById('matrix-model-filter');
            if (modelFilter) {
                const uniqueRegcicloModels = new Set();
                if (globalTblprodData && globalTblprodData.length > 0) {
                    globalTblprodData.forEach(r => {
                        const modVal = String(r.Model ?? r.model ?? r.MODEL ?? '').trim();
                        if (modVal !== '' && modVal !== '-' && modVal !== 'null' && modVal !== 'undefined') {
                            uniqueRegcicloModels.add(modVal);
                        }
                    });
                }

                const sortedModels = Array.from(uniqueRegcicloModels).sort((a, b) => {
                    const numA = parseFloat(a.replace(/[^\d.]/g, ''));
                    const numB = parseFloat(b.replace(/[^\d.]/g, ''));
                    if (!isNaN(numA) && !isNaN(numB)) {
                        if (numA !== numB) return numA - numB;
                    }
                    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
                });

                let optionsHTML = `<option value="">Todos los modelos</option>`;
                sortedModels.forEach(mod => {
                    optionsHTML += `<option value="${mod}">${mod}</option>`;
                });
                modelFilter.innerHTML = optionsHTML;
            }
        }

    } catch (error) {
        console.error('Error de red o excepción al conectar con Supabase:', error);
        const tbody = document.getElementById('tblprod-tbody');
        if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-rose-500">Error de conexión / Red</td></tr>`;
    }
}

function attachModelEditableEvents() {
    const modelCells = document.querySelectorAll('.editable-model-cell');
    modelCells.forEach(cell => {
        cell.addEventListener('click', function handler(e) {
            if (cell.querySelector('input')) return;

            const modelTextSpan = cell.querySelector('.model-text') || cell;
            const currentValue = modelTextSpan.textContent.trim() === '-' ? '' : modelTextSpan.textContent.trim();
            const cellName = cell.getAttribute('data-cell');
            const recordId = cell.getAttribute('data-id');

            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentValue;
            input.className = 'w-full bg-slate-50 border border-blue-500 rounded px-1 py-0.5 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-blue-500';

            cell.textContent = '';
            cell.appendChild(input);
            input.focus();
            input.select();

            let isSaved = false;

            async function saveChange(nextElementToFocus = null) {
                if (isSaved) return;
                isSaved = true;

                const newValue = input.value.trim();

                try {
                    const updateObj = {
                        Model: newValue === '' ? null : newValue
                    };

                    let query = supabaseClient.from('regciclo').update(updateObj);
                    if (recordId) {
                        query = query.eq('id', recordId);
                    } else {
                        query = query.eq('Cell', cellName);
                    }

                    const { data, error } = await query;

                    if (error) {
                        console.error('Error al actualizar Model en Supabase:', error);
                        alert('Error al actualizar: ' + error.message);
                        const fallbackBox = `<span class="inline-block w-1.5 h-3 rounded-[1px] flex-shrink-0"></span>`;
                        cell.innerHTML = `
                            <div class="flex items-center justify-center gap-1.5">
                                ${fallbackBox}
                                <span class="model-text truncate">${currentValue || '-'}</span>
                            </div>
                        `;
                    } else {
                        console.log('Actualización de Model exitosa en regciclo:', data);
                        const rowTr = cell.closest('tr');
                        const timeCell = rowTr.querySelector('.time-cell');
                        const actualCell = rowTr.querySelector('.actual-cell');
                        const diffCell = rowTr.querySelector('.diff-cell');

                        let newTime = '';
                        let newUpdateBoxHTML = `<span class="inline-block w-1.5 h-3 rounded-[1px] flex-shrink-0"></span>`;
                        if (newValue !== '' && globalModelos && globalModelos.length > 0) {
                            const matchedModelo = globalModelos.find(m => {
                                const mName = String(m.Models ?? m.models ?? m.MODEL ?? '').trim();
                                return mName.toLowerCase() === newValue.toLowerCase();
                            });
                            if (matchedModelo) {
                                newTime = matchedModelo.WPH ?? matchedModelo.wph ?? matchedModelo.Wph ?? '';
                                const updateVal = matchedModelo.Update ?? matchedModelo.update ?? matchedModelo.UPDATE;
                                const isTrue = updateVal === true || String(updateVal).toLowerCase() === 'true';
                                if (isTrue) {
                                    newUpdateBoxHTML = `<span class="inline-block w-1.5 h-3 bg-blue-500 rounded-[1px] flex-shrink-0" title="Update: TRUE"></span>`;
                                }
                            }
                        }

                        cell.innerHTML = `
                            <div class="flex items-center justify-center gap-1.5">
                                ${newUpdateBoxHTML}
                                <span class="model-text truncate">${newValue !== '' ? newValue : '-'}</span>
                            </div>
                        `;

                        if (timeCell) {
                            timeCell.textContent = newTime !== '' ? newTime : '-';
                        }

                        const curTime = parseFloat(newTime);
                        const curActual = actualCell ? parseFloat(actualCell.textContent) : NaN;

                        if (!isNaN(curActual) && !isNaN(curTime)) {
                            const diff = curActual - curTime;
                            diffCell.textContent = diff;
                            diffCell.className = `py-1.5 px-0.5 text-center font-semibold diff-cell ${diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-600'}`;
                            if (diff < 0) {
                                rowTr.classList.add('bg-orange-100');
                            } else {
                                rowTr.classList.remove('bg-orange-100');
                            }
                        } else {
                            diffCell.textContent = '-';
                            diffCell.className = 'py-1.5 px-0.5 text-center font-semibold diff-cell text-slate-600';
                            rowTr.classList.remove('bg-orange-100');
                        }

                        recalculateMetricsFromDOM();
                    }
                    attachModelEditableEvents();
                    if (nextElementToFocus) {
                        nextElementToFocus.click();
                    }
                } catch (err) {
                    console.error('Excepción al actualizar Model:', err);
                    const fallbackBox = `<span class="inline-block w-1.5 h-3 rounded-[1px] flex-shrink-0"></span>`;
                    cell.innerHTML = `
                        <div class="flex items-center justify-center gap-1.5">
                            ${fallbackBox}
                            <span class="model-text truncate">${currentValue || '-'}</span>
                        </div>
                    `;
                    attachModelEditableEvents();
                }
            }

            input.addEventListener('blur', function() {
                saveChange();
            });

            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                    const rowTr = cell.closest('tr');
                    const nextCell = rowTr.querySelector('.editable-actual-cell');
                    input.blur();
                    if (nextCell) {
                        nextCell.click();
                    }
                }
            });
        });
    });
}

function attachActualEditableEvents() {
    const actualCells = document.querySelectorAll('.editable-actual-cell');
    actualCells.forEach(cell => {
        cell.addEventListener('click', function handler(e) {
            if (cell.querySelector('input')) return;

            const currentValue = cell.textContent.trim() === '-' ? '' : cell.textContent.trim();
            const cellName = cell.getAttribute('data-cell');
            const recordId = cell.getAttribute('data-id');

            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentValue;
            input.className = 'w-full bg-slate-50 border border-blue-500 rounded px-1.5 py-0.5 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-blue-500';

            cell.textContent = '';
            cell.appendChild(input);
            input.focus();
            input.select();

            let isSaved = false;

            async function saveChange() {
                if (isSaved) return;
                isSaved = true;

                const newValue = input.value.trim();
                if (newValue === currentValue) {
                    cell.textContent = currentValue || '-';
                    attachActualEditableEvents();
                    return;
                }

                cell.textContent = newValue || '-';

                try {
                    const updateObj = {
                        Target_Actual: newValue === '' ? null : (!isNaN(newValue) ? Number(newValue) : newValue)
                    };

                    let query = supabaseClient.from('regciclo').update(updateObj);
                    if (recordId) {
                        query = query.eq('id', recordId);
                    } else {
                        query = query.eq('Cell', cellName);
                    }

                    const { data, error } = await query;

                    if (error) {
                        console.error('Error al actualizar Actual en Supabase:', error);
                        alert('Error al actualizar: ' + error.message);
                        cell.textContent = currentValue || '-';
                    } else {
                        console.log('Actualización de Actual exitosa en regciclo:', data);
                        const rowTr = cell.closest('tr');
                        const timeCell = rowTr.querySelector('.time-cell');
                        const diffCell = rowTr.querySelector('.diff-cell');
                        const cellTd = rowTr.querySelector('td:first-child');

                        const curTime = timeCell ? parseFloat(timeCell.textContent) : NaN;
                        const curActual = !isNaN(newValue) && newValue !== '' ? parseFloat(newValue) : NaN;

                        const actualStr = String(newValue).trim().toUpperCase();
                        let indicatorHTML = '';
                        if (actualStr === 'MANTTO') {
                            indicatorHTML = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" title="Mantto"></span>`;
                        } else if (actualStr === 'PM' || actualStr === 'P.M.') {
                            indicatorHTML = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-sm" title="P.M."></span>`;
                        } else if (actualStr === 'SET-UP' || actualStr === 'SETUP') {
                            indicatorHTML = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm" title="SET-UP"></span>`;
                        } else if (newValue !== '' && newValue !== null && newValue !== '-' && !isNaN(newValue) && Number(newValue) > 0) {
                            indicatorHTML = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm animate-blink-dot" title="Running"></span>`;
                        } else {
                            indicatorHTML = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-slate-300 shadow-sm" title="Inactivo"></span>`;
                        }
                        if (cellTd) {
                            cellTd.innerHTML = `${indicatorHTML} ${cellName}`;
                        }

                        if (!isNaN(curActual) && !isNaN(curTime)) {
                            const diff = curActual - curTime;
                            diffCell.textContent = diff;
                            diffCell.className = `py-1.5 px-0.5 text-center font-semibold diff-cell ${diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-600'}`;
                            
                            if (diff < 0) {
                                rowTr.classList.add('bg-orange-100');
                            } else {
                                rowTr.classList.remove('bg-orange-100');
                            }
                        } else {
                            diffCell.textContent = '-';
                            diffCell.className = 'py-1.5 px-0.5 text-center font-semibold diff-cell text-slate-600';
                            rowTr.classList.remove('bg-orange-100');
                        }

                        recalculateMetricsFromDOM();
                    }
                    attachActualEditableEvents();
                } catch (err) {
                    console.error('Excepción al actualizar Actual:', err);
                    cell.textContent = currentValue || '-';
                    attachActualEditableEvents();
                }
            }

            input.addEventListener('blur', function() {
                saveChange();
            });

            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                    input.blur();
                    const nextRow = cell.closest('tr').nextElementSibling;
                    if (nextRow) {
                        const nextModelCell = nextRow.querySelector('.editable-model-cell');
                        if (nextModelCell) nextModelCell.click();
                    }
                }
            });
        });
    });
}

function initGaugeChart() {
    const ctx = document.getElementById('gaugeChart').getContext('2d');
    
    gaugeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#15803d', '#e2e8f0'],
                borderWidth: 0,
                borderCornerRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%',
            rotation: -90,
            circumference: 360,
            plugins: {
                tooltip: { enabled: false },
                legend: { display: false }
            }
        }
    });
}