const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const dropZone = document.getElementById('dropZone');
const csvFileInput = document.getElementById('csvFileInput');
const fileLabel = document.getElementById('fileLabel');
const pasteTextarea = document.getElementById('pasteTextarea');
const enviarBtn = document.getElementById('enviarBtn');
const mensajeEstado = document.getElementById('mensajeEstado');

// Tabla por defecto para mantener la funcionalidad exacta de guardado
const tablaDestino = 'Scrap';

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
        if (!lines[i].trim()) continue;
        
        const currentline = lines[i].split(delimiter);
        const obj = {};
        let hasValues = false;

        for (let j = 0; j < headers.length; j++) {
            let val = currentline[j] !== undefined ? currentline[j].trim().replace(/^"|"$/g, '') : '';
            
            if (val === '') {
                val = null;
            } else {
                hasValues = true;
                if (!isNaN(val)) {
                    val = Number(val);
                }
            }
            
            obj[headers[j]] = val;
        }
        
        if (hasValues) {
            result.push(obj);
        }
    }
    return result;
}

enviarBtn.addEventListener('click', async () => {
    const columnaSecuencia = 'No.';
    mensajeEstado.style.color = 'var(--text-secondary)';
    mensajeEstado.textContent = 'Calculating the sequence and sending data...';

    try {
        const datosTexto = pasteTextarea.value.trim();
        if (!datosTexto) {
            throw new Error('Please upload a CSV file or paste the data.');
        }
        
        let records = parseCSV(datosTexto);
        if (records.length === 0) {
            throw new Error('The data format is invalid or requires headers and at least one row.');
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

        // Asignar el autoincremental al campo correspondiente (No.)
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
        
        // Limpiar formulario después de guardar
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

// Bloquear clic derecho
document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

// Bloquear selección de texto
document.addEventListener("selectstart", (e) => {
    e.preventDefault();
});

// Bloquear copiar
document.addEventListener("copy", (e) => {
    e.preventDefault();
});

// Bloquear cortar
document.addEventListener("cut", (e) => {
    e.preventDefault();
});

// Bloquear arrastrar contenido
document.addEventListener("dragstart", (e) => {
    e.preventDefault();
});

// Bloquear teclas comunes para inspeccionar/copiar
document.addEventListener("keydown", (e) => {

    const key = e.key.toLowerCase();

    // F12
    if (e.key === "F12") {
        e.preventDefault();
        return;
    }

    // Ctrl + Shift + I/J/C
    if (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) {
        e.preventDefault();
        return;
    }

    // Ctrl + U
    if (e.ctrlKey && key === "u") {
        e.preventDefault();
        return;
    }

    // Ctrl + C
    if (e.ctrlKey && key === "c") {
        e.preventDefault();
        return;
    }

    // Ctrl + X
    if (e.ctrlKey && key === "x") {
        e.preventDefault();
        return;
    }

    // Ctrl + S
    if (e.ctrlKey && key === "s") {
        e.preventDefault();
        return;
    }

    // Ctrl + A
    if (e.ctrlKey && key === "a") {
        e.preventDefault();
        return;
    }
});