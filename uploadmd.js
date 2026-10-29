const SUPABASE_URL = "https://mrxtqmvufmlozplszfxc.supabase.co";
const SUPABASE_KEY = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const dropZone = document.getElementById('dropZone');
const csvFileInput = document.getElementById('csvFileInput');
const fileLabel = document.getElementById('fileLabel');
const pasteTextarea = document.getElementById('pasteTextarea');
const enviarBtn = document.getElementById('enviarBtn');
const mensajeEstado = document.getElementById('mensajeEstado');

const TABLA_DESTINO = 'MDMachine';
const ALLOWED_COLUMNS = ['Week', 'Date', 'Cell', 'Code', 'Time', 'Shift', 'Month'];

// Manejo de Archivos (Lectura compartida)
function procesarArchivoSeleccionado(file) {
    if (!file) return;
    fileLabel.innerHTML = `<i class="fa-solid fa-file-csv" style="font-size: 20px; color: var(--primary-red);"></i> <b>${file.name}</b>`;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        pasteTextarea.value = e.target.result;
    };
    reader.readAsText(file);
}

csvFileInput.addEventListener('change', (e) => {
    procesarArchivoSeleccionado(e.target.files[0]);
});

// Eventos Drag & Drop optimizados
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
});

dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) {
        csvFileInput.files = e.dataTransfer.files;
        procesarArchivoSeleccionado(file);
    }
});

// Parseo de CSV
function parseCSV(text) {
    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';')) delimiter = ';';
    
    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const currentline = lines[i].split(delimiter);
        const obj = {};
        let hasValues = false;

        for (let j = 0; j < headers.length; j++) {
            const headerName = headers[j];
            
            if (ALLOWED_COLUMNS.includes(headerName)) {
                let val = currentline[j] !== undefined ? currentline[j].trim().replace(/^"|"$/g, '') : '';
                
                if (val === '') {
                    val = null;
                } else {
                    hasValues = true;
                    if (!isNaN(val)) {
                        val = Number(val);
                    }
                }
                obj[headerName] = val;
            }
        }
        
        if (hasValues) result.push(obj);
    }
    return result;
}

// Obtener el último ID de Supabase
async function obtenerUltimoId() {
    const { data, error } = await supabaseClient
        .from(TABLA_DESTINO)
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

    if (error) throw new Error(`Error recuperando ID: ${error.message}`);
    return (data && data.length > 0 && data[0].id !== null) ? Number(data[0].id) : 0;
}

// Envío de datos
enviarBtn.addEventListener('click', async () => {
    mensajeEstado.style.color = 'var(--text-secondary)';
    mensajeEstado.textContent = 'Sending data to MDMachine...';

    try {
        const datosTexto = pasteTextarea.value.trim();
        if (!datosTexto) throw new Error('Please upload a CSV file or paste the data.');
        
        let records = parseCSV(datosTexto);
        if (records.length === 0) throw new Error('The data format is invalid or requires valid headers (Week, Date, Cell, Code, Time, Shift, Month).');

        let ultimoId = await obtenerUltimoId();

        records = records.map(record => {
            ultimoId += 1;
            return {
                id: ultimoId,
                Week: record.Week ?? null,
                Date: record.Date ?? null,
                Cell: record.Cell ?? null,
                Code: record.Code ?? null,
                Time: record.Time ?? null,
                Shift: record.Shift ?? null,
                Month: record.Month ?? null
            };
        });

        const { error } = await supabaseClient
            .from(TABLA_DESTINO)
            .insert(records);

        if (error) throw error;

        mensajeEstado.style.color = '#16a34a';
        mensajeEstado.textContent = `¡Data successfully saved to "${TABLA_DESTINO}"!`;
        
        pasteTextarea.value = '';
        csvFileInput.value = '';
        fileLabel.innerHTML = `Drag your CSV file here or click to select it`;

    } catch (err) {
        mensajeEstado.style.color = 'var(--primary-red)';
        mensajeEstado.textContent = `Error: ${err.message || err}`;
    }
});

// ================================
// PROTECCIÓN DE LA PÁGINA
// ================================
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("selectstart", (e) => e.preventDefault());
document.addEventListener("dragstart", (e) => e.preventDefault());

['copy', 'cut'].forEach(evt => {
    document.addEventListener(evt, (e) => e.preventDefault());
});

document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();

    if (e.key === "F12") {
        e.preventDefault();
        return;
    }

    if (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) {
        e.preventDefault();
        return;
    }

    if (e.ctrlKey && ["u", "c", "x", "s", "a"].includes(key)) {
        e.preventDefault();
    }
});