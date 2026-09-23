const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const { createClient } = supabase;
const _supabase = createClient(supabaseUrl, supabaseKey);

// =====================================================
// INYECCIÓN DINÁMICA DEL FORMULARIO EN HTML DESDE JS
// =====================================================
function renderizarFormulario() {
    const container = document.getElementById('form-container');
    if (!container) return;

    container.innerHTML = `
        <form id="ehsForm" class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            <div class="relative input-group">
                <span class="absolute left-4 top-3 text-slate-400">#</span>
                <input type="number" id="folio" placeholder="Audit Folio" required class="w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 transition">
            </div>

            <div class="input-group">
                <input type="text" id="plant" value="Plant1" readonly class="system-field">
            </div>

            <div class="relative input-group">
                <span class="absolute left-4 top-3 text-slate-400">🏢</span>
                <select id="shift" required class="w-full pl-12 pr-4 py-3 border rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 transition text-slate-700">
                    <option value="" disabled selected>Shift</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="L-V">M-F</option>
                </select>
            </div>
            
            <div class="input-group">
                <input type="text" id="area" value="Rough Cut" readonly class="system-field">
            </div>

            <div class="relative input-group">
                <span class="absolute left-4 top-3 text-slate-400">👤</span>
                <select id="EHSName" required class="w-full pl-12 pr-4 py-3 border rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 transition text-slate-700">
                    <option value="" disabled selected>EHS Responsible</option>
                    <option value="Saul Ahumada">Saul Ahumada</option>
                    <option value="Perla Murillo">Perla Murillo</option>
                    <option value="Yarely Carrillo">Yarely Carrillo</option>
                </select>
            </div>

            <div class="input-group">
                <input type="text" id="gerente" value="Ernesto Guerrero" readonly class="system-field">
            </div>

            <div class="relative input-group">
                <input type="date" id="Fecha" required class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 transition text-slate-700">
            </div>

            <div class="input-group">
                <input type="text" id="status" value="In Process" readonly class="system-field">
            </div>

            <div class="md:col-span-2 input-group">
                <input type="text" id="co" value="Open" readonly class="system-field">
            </div>

            <div class="md:col-span-2 border-2 border-dashed border-teal-300 rounded-2xl p-6 bg-slate-50 mt-2">
                <label class="block text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                    📁 Upload Audit PDF
                </label>
                <div class="relative">
                    <input type="file" id="pdfFile" accept="application/pdf" required 
                           class="block w-full text-sm text-slate-600 bg-white border border-slate-200 rounded-lg file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition cursor-pointer">
                </div>
            </div>

            <div class="md:col-span-2 mt-8 flex flex-col items-center">
                <button type="submit" id="submitBtn" 
                        class="w-full max-w-3xl btn-teal font-bold py-4 px-8 rounded-xl shadow-md transition duration-150 flex items-center justify-center gap-2 text-lg active:scale-[0.98] text-white">
                    💾 Save Audit Record
                </button>
                
                <p id="legend" class="text-sm font-medium text-slate-600 mt-5 transition-opacity duration-300">
                    Ready...
                </p>
            </div>
        </form>
    `;
}

// Ejecutar la renderización antes de capturar elementos y asignar eventos
renderizarFormulario();

const form = document.getElementById('ehsForm');
const submitBtn = document.getElementById('submitBtn');
const legend = document.getElementById('legend');

// Helper function to find the first available ID (reuses gaps from deleted records)
async function obtenerSiguienteIdDisponible() {
    const { data, error } = await _supabase
        .from('Auditorias_Gestion_EHS')
        .select('id');
    
    if (error || !data || data.length === 0) return 1;

    // Extract and sort numerical IDs in ascending order
    const ids = data
        .map(row => row.id)
        .filter(id => typeof id === 'number')
        .sort((a, b) => a - b);

    let idBuscado = 1;
    for (let i = 0; i < ids.length; i++) {
        if (ids[i] > idBuscado) {
            break; // Found a gap (e.g., missing intermediate ID)
        }
        if (ids[i] === idBuscado) {
            idBuscado++;
        }
    }
    return idBuscado;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const folio = document.getElementById('folio').value;
    const plant = document.getElementById('plant').value;
    const shift = document.getElementById('shift').value;
    const area = document.getElementById('area').value;
    const ehsName = document.getElementById('EHSName').value;
    const gerente = document.getElementById('gerente').value;
    const fecha = document.getElementById('Fecha').value;
    const status = document.getElementById('status').value;
    const co = document.getElementById('co').value;
    const pdfFile = document.getElementById('pdfFile').files[0];

    if (!folio || !shift || !ehsName || !fecha || !pdfFile) {
        legend.textContent = "Please fill in all empty fields";
        legend.style.color = "#d97706";
        legend.classList.add('animate-pulse');
        return;
    }

    try {
        submitBtn.disabled = true;
        legend.textContent = "Saving data...";
        legend.style.color = "#0d9488";
        legend.classList.add('animate-pulse');

        const timestamp = Date.now();
        const fileExt = pdfFile.name.split('.').pop();
        const fileName = `${timestamp}_${Math.random().toString(36).substring(2, 11)}.${fileExt}`;

        const { error: uploadError } = await _supabase.storage
            .from('pdfs')
            .upload(fileName, pdfFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = _supabase.storage
            .from('pdfs')
            .getPublicUrl(fileName);

        const pdfPublicUrl = publicUrlData.publicUrl;

        // Get ID reusing the first available gap
        const idAsignado = await obtenerSiguienteIdDisponible();

        const datosAInsertar = {
            id: idAsignado, // Force ID to occupy free gap
            Folio: parseInt(folio),
            Plant: plant,
            Shift: shift,
            Area: area,
            EHSName: ehsName,
            Gerente: gerente,
            Fecha: fecha,
            Status: status,
            "C/O": co,
            PDF: pdfPublicUrl
        };

        const { data: insertedData, error: insertError } = await _supabase
            .from('Auditorias_Gestion_EHS')
            .insert([datosAInsertar])
            .select();

        if (insertError) throw insertError;

        legend.textContent = "Data saved successfully";
        legend.style.color = "#059669";
        legend.classList.remove('animate-pulse');

        const registroConId = insertedData && insertedData.length > 0 ? insertedData[0] : datosAInsertar;

        // Notify main page passing complete record with its filled ID
        setTimeout(() => {
            if (window.parent) {
                window.parent.postMessage({ type: 'AUDIT_AGREGADA', registro: registroConId }, '*');
                if (typeof window.parent.cerrarModalYActualizar === 'function') {
                    window.parent.cerrarModalYActualizar();
                }
            }
        }, 500);

    } catch (error) {
        console.error("Detailed error:", error);
        legend.textContent = "Error saving data";
        legend.style.color = "#dc2626";
        legend.classList.remove('animate-pulse');
        submitBtn.disabled = false;
    }
});

// =====================================================
// CUSTOM NAVIGATION WITH ENTER AND TAB
// =====================================================

const navigationFields = [
    document.getElementById('folio'),
    document.getElementById('shift'),
    document.getElementById('EHSName'),
    document.getElementById('Fecha'),
    document.getElementById('pdfFile'),
    document.getElementById('submitBtn')
];

navigationFields.forEach((field, index) => {
    if (!field) return;
    field.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            const nextField = navigationFields[index + 1];
            if (nextField) {
                nextField.focus();
            }
        }
    });
});

// ================================
// PAGE PROTECTION
// ================================

document.addEventListener("contextmenu", (e) => { e.preventDefault(); });
document.addEventListener("selectstart", (e) => { e.preventDefault(); });
document.addEventListener("copy", (e) => { e.preventDefault(); });
document.addEventListener("cut", (e) => { e.preventDefault(); });
document.addEventListener("dragstart", (e) => { e.preventDefault(); });

document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (e.key === "F12") { e.preventDefault(); return; }
    if (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) { e.preventDefault(); return; }
    if (e.ctrlKey && key === "u") { e.preventDefault(); return; }
    if (e.ctrlKey && key === "c") { e.preventDefault(); return; }
    if (e.ctrlKey && key === "x") { e.preventDefault(); return; }
    if (e.ctrlKey && key === "s") { e.preventDefault(); return; }
    if (e.ctrlKey && key === "a") { e.preventDefault(); return; }
});