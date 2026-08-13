const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const { createClient } = supabase;
const _supabase = createClient(supabaseUrl, supabaseKey);

const form = document.getElementById('ehsForm');
const submitBtn = document.getElementById('submitBtn');
const legend = document.getElementById('legend');

 
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
    const description = document.getElementById('description').value;
    const pdfFile = document.getElementById('pdfFile').files[0];

    if (!folio || !shift || !ehsName || !fecha || !pdfFile) {
        legend.textContent = "Llenar los campos vacíos";
        legend.style.color = "#d97706";
        legend.classList.add('animate-pulse');
        return;
    }

    try {
        submitBtn.disabled = true;
        legend.textContent = "Guardando datos...";
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

        const { error: insertError } = await _supabase
            .from('Auditorias_Gestion_EHS')
            .insert([
                {
                    Folio: parseInt(folio),
                    Plant: plant,
                    Shift: shift,
                    Area: area,
                    EHSName: ehsName,
                    Gerente: gerente,
                    Fecha: fecha,
                    Status: status,
                    "C/O": co,
                    Description: description,
                    PDF: pdfPublicUrl
                }
            ]);

        if (insertError) throw insertError;

        legend.textContent = "Datos guardados";
        legend.style.color = "#059669";
        legend.classList.remove('animate-pulse');

        setTimeout(() => {
            form.reset();
            
            
            legend.textContent = "Ready...";
            legend.style.color = "#4b5563";
            submitBtn.disabled = false;
        }, 2500);

    } catch (error) {
        console.error("Error detallado:", error);
        legend.textContent = "Error al guardar";
        legend.style.color = "#dc2626";
        legend.classList.remove('animate-pulse');
        submitBtn.disabled = false;
    }
});

// =====================================================
// NAVEGACIÓN PERSONALIZADA CON ENTER Y TAB
// =====================================================

const navigationFields = [
    document.getElementById('folio'),
    document.getElementById('shift'),
    document.getElementById('EHSName'),
    document.getElementById('Fecha'),
    document.getElementById('description'),
    document.getElementById('pdfFile'),
    document.getElementById('submitBtn')
];

navigationFields.forEach((field, index) => {

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
