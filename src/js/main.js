// src/js/main.js
// Código completo con la función proxy de Vercel

// Configuración
const NOTION_DATABASE_ID = 'd7571f97d90e42bb8e6e5c73f1c5ff5e';
const YOUR_VERCEL_URL = 'https://dashboard-finanzas-nb9i0mu01-jeremis-projects-53da5f18.vercel.app/'; // CAMBIA ESTO por tu URL real de Vercel

// Elementos del DOM
const datosDiv = document.getElementById('datos');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const actualizarBtn = document.getElementById('actualizar');

// Función para formatear números como moneda
function formatoMoneda(valor) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
    }).format(valor);
}

// Función para formatear fechas
function formatoFecha(fechaStr) {
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(fechaStr).toLocaleDateString('es-AR', opciones);
}

// FUNCIÓN ACTUALIZADA: Usa el proxy de Vercel
async function queryNotionDatabase(databaseId) {
    try {
        // URL de TU función en Vercel - IMPORTANTE: Cambia por tu URL real
        const proxyUrl = `${YOUR_VERCEL_URL}/api/notion-proxy`;
        
        console.log('📡 Llamando a tu proxy en Vercel...');
        console.log('URL:', proxyUrl);
        console.log('Database ID:', databaseId);
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                databaseId: databaseId
            })
        });
        
        console.log('✅ Respuesta recibida de Vercel, status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Error ${response.status}: ${errorData.error || 'Error desconocido'}`);
        }
        
        const data = await response.json();
        return data.results || [];
        
    } catch (error) {
        console.error('❌ Error al llamar al proxy de Vercel:', error);
        throw new Error(`No se pudieron cargar los datos: ${error.message}`);
    }
}

// Función para procesar y mostrar los datos
function procesarDatos(results) {
    if (!results || results.length === 0) {
        return '<p>No hay transacciones registradas.</p>';
    }
    
    let html = '';
    let totalIngresos = 0;
    let totalGastos = 0;
    
    results.forEach(page => {
        const propiedades = page.properties;
        
        // Extraer los valores de las propiedades
        const monto = propiedades.Monto?.number || 0;
        const categoria = propiedades.Categoría?.select?.name || 'Sin categoría';
        const descripcion = propiedades.Descripción?.title?.[0]?.plain_text || 'Sin descripción';
        const fecha = propiedades.Fecha?.date?.start || 'Sin fecha';
        const tipo = propiedades.Tipo?.select?.name || 'Sin tipo';
        
        // Acumular totales
        if (tipo.toLowerCase() === 'ingreso') {
            totalIngresos += monto;
        } else if (tipo.toLowerCase() === 'gasto') {
            totalGastos += monto;
        }
        
        // Determinar clase CSS según el tipo
        const claseTipo = tipo.toLowerCase() === 'ingreso' ? 'ingreso' : 'gasto';
        
        // Crear tarjeta para cada transacción
        html += `
        <div class="transaccion ${claseTipo}">
            <div class="transaccion-header">
                <span class="categoria">${categoria}</span>
                <span class="monto ${claseTipo}">${formatoMoneda(monto)}</span>
            </div>
            <div class="transaccion-body">
                <p class="descripcion">${descripcion}</p>
                <div class="transaccion-footer">
                    <span class="fecha">${formatoFecha(fecha)}</span>
                    <span class="tipo ${claseTipo}">${tipo}</span>
                </div>
            </div>
        </div>
        `;
    });
    
    // Calcular balance
    const balance = totalIngresos - totalGastos;
    
    // Agregar resumen al inicio
    const resumenHtml = `
    <div class="resumen">
        <div class="resumen-item">
            <h3>Ingresos</h3>
            <p class="ingreso">${formatoMoneda(totalIngresos)}</p>
        </div>
        <div class="resumen-item">
            <h3>Gastos</h3>
            <p class="gasto">${formatoMoneda(totalGastos)}</p>
        </div>
        <div class="resumen-item">
            <h3>Balance</h3>
            <p class="${balance >= 0 ? 'ingreso' : 'gasto'}">${formatoMoneda(balance)}</p>
        </div>
    </div>
    `;
    
    return resumenHtml + html;
}

// Función para cargar y mostrar los datos
async function cargarDatos() {
    try {
        // Mostrar estado de carga
        loadingDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        datosDiv.innerHTML = '';
        
        console.log('🔄 Iniciando carga de datos...');
        
        // Obtener datos de Notion a través del proxy de Vercel
        const results = await queryNotionDatabase(NOTION_DATABASE_ID);
        
        console.log(`✅ ${results.length} transacciones obtenidas`);
        
        // Procesar y mostrar los datos
        datosDiv.innerHTML = procesarDatos(results);
        
        // Ocultar estado de carga
        loadingDiv.style.display = 'none';
        
    } catch (error) {
        console.error('❌ Error en cargarDatos:', error);
        
        // Mostrar error
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = `
            <h3>Error al cargar los datos</h3>
            <p>${error.message}</p>
            <p>Por favor, intenta nuevamente.</p>
        `;
    }
}

// Event Listeners
actualizarBtn.addEventListener('click', cargarDatos);

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', cargarDatos);

// Opcional: Recargar automáticamente cada 5 minutos
setInterval(cargarDatos, 5 * 60 * 1000);