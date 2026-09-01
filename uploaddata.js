const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const dropZone = document.getElementById('dropZone');
const csvFileInput = document.getElementById('csvFileInput');
const fileLabel = document.getElementById('fileLabel');
const pasteTextarea = document.getElementById('pasteTextarea');
const enviarBtn = document.getElementById('enviarBtn');
const tablaSelect = document.getElementById('tablaSelect');
const mensajeEstado = document.getElementById('mensajeEstado');

const formProductionContainer = document.getElementById('formProductionContainer');
const formBUStatusContainer = document.getElementById('formBUStatusContainer');
const csvContainer = document.getElementById('csvContainer');

// Campos Production
const prodDate = document.getElementById('prodDate');
const prodMonth = document.getElementById('prodMonth');
const prodRunning = document.getElementById('prodRunning');
const prodScrap = document.getElementById('prodScrap');
const prodAveg = document.getElementById('prodAveg');

// Campos B&U Status
const buWeek = document.getElementById('buWeek');
const buDate = document.getElementById('buDate');
const buMonth = document.getElementById('buMonth');
const buQty = document.getElementById('buQty');
const buProd = document.getElementById('buProd');
const buPercent = document.getElementById('buPercent');
const buGoal = document.getElementById('buGoal');

// Autocompletar el mes en inglés para Production
prodDate.addEventListener('change', () => {
    if (prodDate.value) {
        const [year, month, day] = prodDate.value.split('-');
        const fecha = new Date(year, month - 1, day);
        const nombreMes = fecha.toLocaleString('en-US', { month: 'long' });
        prodMonth.value = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
    } else {
        prodMonth.value = '';
    }
});

// Autocompletar el mes en inglés para B&U Status
buDate.addEventListener('change', () => {
    if (buDate.value) {
        const [year, month, day] = buDate.value.split('-');
        const fecha = new Date(year, month - 1, day);
        const nombreMes = fecha.toLocaleString('en-US', { month: 'long' });
        buMonth.value = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
    } else {
        buMonth.value = '';
    }
});

// Alternar vistas según la tabla seleccionada
tablaSelect.addEventListener('change', () => {
    mensajeEstado.textContent = '';
    
    // Ocultar todos los contenedores primero
    formProductionContainer.style.display = 'none';
    formBUStatusContainer.style.display = 'none';
    csvContainer.style.display = 'none';

    if (tablaSelect.value === 'Production') {
        formProductionContainer.style.display = 'flex';
    } else if (tablaSelect.value === 'BUStatus') {
        formBUStatusContainer.style.display = 'flex';
    } else {
        csvContainer.style.display = 'block';
        contenidoCSVGlobal = '';
        pasteTextarea.value = '';
        csvFileInput.value = '';
        fileLabel.innerHTML = `Drag your CSV file here or click to select it from your files`;
        
        if (tablaSelect.value === 'ManttoIssues') {
            pasteTextarea.placeholder = "Week,Month,Date,Area,Description\n1,January,2026-01-01,Linea 1,Falla mecanica";
        } else {
            pasteTextarea.placeholder = "Week,Month,Date,Qty,Prod,Percent,Goal\n1,January,2026-01-01,100,95,95,0.0150";
        }
    }
});

let contenidoCSVGlobal = '';

csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileLabel.innerHTML = `<i class="fa-solid fa-file-csv" style="font-size: 20px; color: var(--primary-red);"></i> <b>${file.name}</b>`;
        leerArchivo(file);
    }
});

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    }, false);
});

dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    if (file) {
        csvFileInput.files = dt.files;
        fileLabel.innerHTML = `<i class="fa-solid fa-file-csv" style="font-size: 20px; color: var(--primary-red);"></i> <b>${file.name}</b>`;
        leerArchivo(file);
    }
});

function leerArchivo(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        contenidoCSVGlobal = e.target.result;
        pasteTextarea.value = contenidoCSVGlobal;
    };
    reader.readAsText(file);
}

function parseCSV(text) {
    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    
    let delimiter = ',';
    if (lines[0].includes('\t')) {
        delimiter = '\t';
    } else if (lines[0].includes(';')) {
        delimiter = ';';
    }
    
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, '')).filter(h => h !== '');
    
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        // Ignorar líneas vacías
        if (!lines[i].trim()) continue;
        
        const currentline = lines[i].split(delimiter);
        const obj = {};
        let hasValues = false; // Bandera para validar si la fila tiene contenido real

        for (let j = 0; j < headers.length; j++) {
            let val = currentline[j] !== undefined ? currentline[j].trim().replace(/^"|"$/g, '') : '';
            
            if (val === '') {
                val = null;
            } else {
                hasValues = true; // Se encontró al menos un dato válido en esta fila
                if (!isNaN(val)) {
                    val = Number(val);
                }
            }
            
            obj[headers[j]] = val;
        }
        
        // Agregar la fila únicamente si contiene datos reales y no está vacía
        if (hasValues) {
            result.push(obj);
        }
    }
    return result;
}

enviarBtn.addEventListener('click', async () => {
    const opcionSeleccionada = tablaSelect.value;
    mensajeEstado.style.color = 'var(--text-secondary)';
    mensajeEstado.textContent = 'Calculating the sequence and sending data...';

    try {
        let records = [];
        let tablaDestino = opcionSeleccionada;
        let columnaSecuencia = 'No.';

        if (opcionSeleccionada === 'ManttoIssues') {
            columnaSecuencia = 'Trans';
        }

        if (opcionSeleccionada === 'Production') {
            if (!prodDate.value || !prodMonth.value) {
                throw new Error('Please fill out the Date and Month fields.');
            }

            records = [{
                Date: prodDate.value,
                Month: prodMonth.value.trim(),
                Running: prodRunning.value !== '' ? Number(prodRunning.value) : null,
                Scrap: prodScrap.value !== '' ? Number(prodScrap.value) : null,
                '%Aveg': prodAveg.value !== '' ? Number(prodAveg.value) : null
            }];
        } else if (opcionSeleccionada === 'BUStatus') {
            tablaDestino = 'bupercen';

            if (!buWeek.value || !buDate.value || !buMonth.value) {
                throw new Error('Please fill out Week, Date, and Month fields.');
            }

            records = [{
                Week: Number(buWeek.value),
                Date: buDate.value,
                Month: buMonth.value.trim(),
                Qty: buQty.value !== '' ? Number(buQty.value) : null,
                Prod: buProd.value !== '' ? Number(buProd.value) : null,
                Percent: buPercent.value !== '' ? Number(buPercent.value) : null,
                Goal: Number(buGoal.value)
            }];
        } else if (opcionSeleccionada === 'bupercen') {
            tablaDestino = 'bu';

            const datosTexto = pasteTextarea.value.trim();
            if (!datosTexto) {
                throw new Error('Please upload a CSV file or paste the data.');
            }
            records = parseCSV(datosTexto);
            if (records.length === 0) {
                throw new Error('The data format is invalid or requires headers and at least one row.');
            }
        } else {
            const datosTexto = pasteTextarea.value.trim();
            if (!datosTexto) {
                throw new Error('Please upload a CSV file or paste the data.');
            }
            records = parseCSV(datosTexto);
            if (records.length === 0) {
                throw new Error('The data format is invalid or requires headers and at least one row.');
            }
        }

        // Consultar el último número consecutivo en la tabla destino de Supabase
        const { data: ultimoRegistro, error: errorConsulta } = await supabaseClient
            .from(tablaDestino)
            .select(`"${columnaSecuencia}"`)
            .order(`"${columnaSecuencia}"`, { ascending: false })
            .limit(1);

        if (errorConsulta) throw errorConsulta;

        let siguienteNumero = 1;
        if (ultimoRegistro && ultimoRegistro.length > 0 && ultimoRegistro[0][columnaSecuencia] !== null) {
            const ultimoVal = Number(ultimoRegistro[0][columnaSecuencia]);
            if (!isNaN(ultimoVal)) {
                siguienteNumero = ultimoVal + 1;
            }
        }

        // Asignar el autoincremental al campo correspondiente (No. o Trans)
        records = records.map((record, index) => {
            return {
                ...record,
                [columnaSecuencia]: siguienteNumero + index
            };
        });

        const { data, error } = await supabaseClient
            .from(tablaDestino)
            .insert(records);

        if (error) throw error;

        mensajeEstado.style.color = '#16a34a';
        mensajeEstado.textContent = `¡Data successfully saved to "${tablaDestino}" (${columnaSecuencia}: ${siguienteNumero})!`;
        
        // Limpiar formularios después de guardar
        if (opcionSeleccionada === 'Production') {
            prodDate.value = '';
            prodMonth.value = '';
            prodRunning.value = '';
            prodScrap.value = '';
            prodAveg.value = '';
        } else if (opcionSeleccionada === 'BUStatus') {
            buWeek.value = '';
            buDate.value = '';
            buMonth.value = '';
            buQty.value = '';
            buProd.value = '';
            buPercent.value = '';
        } else {
            pasteTextarea.value = '';
            csvFileInput.value = '';
            fileLabel.innerHTML = `Drag your CSV file here or click to select it`;
        }

    } catch (err) {
        mensajeEstado.style.color = 'var(--primary-red)';
        mensajeEstado.textContent = `Error: ${err.message || err}`;
    }
});
