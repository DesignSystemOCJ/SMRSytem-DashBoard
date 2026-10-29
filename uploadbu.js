const supabaseClient = supabase.createClient(
    "https://mrxtqmvufmlozplszfxc.supabase.co", 
    "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-"
);

// Alternancia de vistas de tarjetas de forma unificada
const cardBuData = document.getElementById('cardBuData');
const cardBuDaily = document.getElementById('cardBuDaily');
const uploadFormContainer = document.getElementById('uploadFormContainer');
const uploadDailyFormContainer = document.getElementById('uploadDailyFormContainer');

function cambiarFormulario(activoCard, inactivoCard, activoForm, inactivoForm) {
    activoCard.classList.toggle('active');
    inactivoCard.classList.remove('active');
    inactivoForm.classList.replace('visible-form', 'hidden-form');
    activoForm.classList.toggle('hidden-form');
    activoForm.classList.toggle('visible-form');
}

cardBuData.addEventListener('click', () => cambiarFormulario(cardBuData, cardBuDaily, uploadFormContainer, uploadDailyFormContainer));
cardBuDaily.addEventListener('click', () => cambiarFormulario(cardBuDaily, cardBuData, uploadDailyFormContainer, uploadFormContainer));

// ================================
// FUNCIONES AUXILIARES GENERALES
// ================================
const leerArchivo = (file, callback) => {
    const reader = new FileReader();
    reader.onload = (e) => callback(e.target.result);
    reader.readAsText(file);
};

const configurarDragAndDrop = (zona, inputRef, labelRef, callback) => {
    ['dragenter', 'dragover'].forEach(eventName => {
        zona.addEventListener(eventName, (e) => { e.preventDefault(); zona.classList.add('dragover'); });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        zona.addEventListener(eventName, (e) => { e.preventDefault(); zona.classList.remove('dragover'); });
    });

    zona.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file) {
            inputRef.files = e.dataTransfer.files;
            labelRef.innerHTML = `<i class="fa-solid fa-file-csv" style="font-size: 20px; color: var(--primary-red);"></i> <b>${file.name}</b>`;
            leerArchivo(file, callback);
        }
    });
};

function parseCSV(text) {
    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    
    const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
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
                if (!isNaN(val)) val = Number(val);
            }
            obj[headers[j]] = val;
        }
        if (hasValues) result.push(obj);
    }
    return result;
}

async function procesarYEnviar(textoDatos, nombreTabla, elementoMensaje, limpiarCallback) {
    const columnaSecuencia = 'No.';
    elementoMensaje.style.color = 'var(--text-secondary)';
    elementoMensaje.textContent = 'Calculating the sequence and sending data...';

    try {
        if (!textoDatos.trim()) throw new Error('Please upload a CSV file or paste the data.');
        
        let records = parseCSV(textoDatos);
        if (records.length === 0) throw new Error('The data format is invalid or requires headers and at least one row.');

        const { data: ultimoRegistro, error: errorConsulta } = await supabaseClient
            .from(nombreTabla)
            .select(`"${columnaSecuencia}"`)
            .order(`"${columnaSecuencia}"`, { ascending: false })
            .limit(1);

        if (errorConsulta) throw errorConsulta;

        let siguienteNumero = 1;
        if (ultimoRegistro?.[0]?.[columnaSecuencia] !== null && !isNaN(Number(ultimoRegistro?.[0]?.[columnaSecuencia]))) {
            siguienteNumero = Number(ultimoRegistro[0][columnaSecuencia]) + 1;
        }

        records = records.map((record, index) => ({
            ...record,
            [columnaSecuencia]: siguienteNumero + index
        }));

        const { error } = await supabaseClient.from(nombreTabla).insert(records);
        if (error) throw error;

        elementoMensaje.style.color = '#16a34a';
        const nombreMostrar = nombreTabla === 'bupercen' ? ' Balance & Uniformity Daily' : ' Balance & Uniformity Data';
        elementoMensaje.textContent = `!Data Successfully saved to "${nombreMostrar}" (No.${siguienteNumero})!`;
        
        if (limpiarCallback) limpiarCallback();

    } catch (err) {
        elementoMensaje.style.color = 'var(--primary-red)';
        elementoMensaje.textContent = `Error: ${err.message || err}`;
    }
}

// ================================
// INICIALIZADOR DE FORMULARIOS DINÁMICO
// ================================
function inicializarGestorFormulario({ dropZoneId, fileInputId, fileLabelId, textareaId, enviarBtnId, mensajeId, tablaDestino, defaultLabelText }) {
    const dropZone = document.getElementById(dropZoneId);
    const fileInput = document.getElementById(fileInputId);
    const fileLabel = document.getElementById(fileLabelId);
    const textarea = document.getElementById(textareaId);
    const enviarBtn = document.getElementById(enviarBtnId);
    const mensajeEstado = document.getElementById(mensajeId);

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileLabel.innerHTML = `<i class="fa-solid fa-file-csv" style="font-size: 20px; color: var(--primary-red);"></i> <b>${file.name}</b>`;
            leerArchivo(file, (res) => { textarea.value = res; });
        }
    });

    configurarDragAndDrop(dropZone, fileInput, fileLabel, (res) => {
        textarea.value = res;
    });

    enviarBtn.addEventListener('click', async () => {
        await procesarYEnviar(textarea.value, tablaDestino, mensajeEstado, () => {
            textarea.value = '';
            fileInput.value = '';
            fileLabel.innerHTML = defaultLabelText;
        });
    });
}

// Inicializar Formulario Data ('bu')
inicializarGestorFormulario({
    dropZoneId: 'dropZone',
    fileInputId: 'csvFileInput',
    fileLabelId: 'fileLabel',
    textareaId: 'pasteTextarea',
    enviarBtnId: 'enviarBtn',
    mensajeId: 'mensajeEstado',
    tablaDestino: 'bu',
    defaultLabelText: 'Drag your CSV file here or click to select it'
});

// Inicializar Formulario Daily ('bupercen')
inicializarGestorFormulario({
    dropZoneId: 'dropZoneDaily',
    fileInputId: 'csvFileDailyInput',
    fileLabelId: 'fileLabelDaily',
    textareaId: 'pasteDailyTextarea',
    enviarBtnId: 'enviarDailyBtn',
    mensajeId: 'mensajeEstadoDaily',
    tablaDestino: 'bupercen',
    defaultLabelText: 'Drag your CSV file here or click to select it'
});

// ================================
// PROTECCIÓN DE LA PÁGINA
// ================================
['contextmenu', 'selectstart', 'copy', 'cut', 'dragstart'].forEach(evt => {
    document.addEventListener(evt, (e) => e.preventDefault());
});

document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) || (e.ctrlKey && ["u", "c", "x", "s", "a"].includes(key))) {
        e.preventDefault();
    }
});