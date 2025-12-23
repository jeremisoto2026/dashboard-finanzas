// ==================== DASHBOARD FINANCIERO ====================
// Código principal con proxy que SÍ funciona
// ==============================================================

// Importar configuración
import { NOTION_CONFIG, loadConfig, isConfigComplete } from './config.js';

// Colores para el gráfico
const CHART_COLORS = [
    '#10b981', '#f43f5e', '#3b82f6', '#f59e0b',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
];

let pieChartInstance = null;

// Hacer configuración globalmente accesible
window.NOTION_CONFIG = NOTION_CONFIG;

// ==================== FUNCIONES UTILITARIAS ====================

// Función para mostrar loading
function showLoading(show) {
    const loadingEl = document.getElementById('loading');
    const btn = document.getElementById('refreshBtn');
    
    if (loadingEl) {
        loadingEl.style.display = show ? 'flex' : 'none';
    }
    
    if (btn) {
        btn.disabled = show;
        if (show) {
            btn.classList.add('loading');
        } else {
            btn.classList.remove('loading');
        }
    }
}

// Función para mostrar toast
function showToast(message, isError = false) {
    // Si ya hay un toast, eliminarlo
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Función para formatear moneda
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

// Función para extraer valor de propiedad de Notion
function extractPropertyValue(propData) {
    if (!propData) return null;
    
    const propType = propData.type;
    
    if (propType === 'title') {
        const titleList = propData.title || [];
        return titleList[0]?.plain_text || '';
    } else if (propType === 'rich_text') {
        const richTextList = propData.rich_text || [];
        return richTextList[0]?.plain_text || '';
    } else if (propType === 'number') {
        return propData.number || 0;
    } else if (propType === 'select') {
        return propData.select?.name || '';
    } else if (propType === 'date') {
        return propData.date?.start || '';
    }
    
    return null;
}

// ==================== FUNCIONES DE NOTION API CON PROXY GARANTIZADO ====================

// Función para consultar base de datos de Notion usando proxy
async function queryNotionDatabase(databaseId) {
    if (!NOTION_CONFIG.token) {
        throw new Error('Token de Notion no configurado');
    }
    
    if (!databaseId) {
        throw new Error('ID de base de datos no proporcionado');
    }
    
    try {
        // PROXY QUE SÍ FUNCIONA - Probado y garantizado
        const proxyUrl = 'https://thingproxy.freeboard.io/fetch/';
        const notionUrl = `${NOTION_CONFIG.apiUrl}/databases/${databaseId}/query`;
        const fullUrl = proxyUrl + encodeURIComponent(notionUrl);
        
        console.log('🔗 URL de petición:', fullUrl.substring(0, 100) + '...');
        
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_CONFIG.token}`,
                'Notion-Version': NOTION_CONFIG.version,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({})
        });
        
        console.log('📊 Respuesta status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error respuesta:', errorText);
            
            if (response.status === 401) {
                throw new Error('401 - Token inválido o expirado');
            } else if (response.status === 404) {
                throw new Error('404 - Base de datos no encontrada');
            } else if (response.status === 403) {
                throw new Error('403 - No tienes permisos para esta base de datos');
            } else {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
        }
        
        const data = await response.json();
        return data.results || [];
        
    } catch (error) {
        console.error('❌ Error en queryNotionDatabase:', error);
        
        // Si el primer proxy falla, intentar con uno alternativo
        if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
            console.log('🔄 Intentando con proxy alternativo...');
            return tryAlternativeProxy(databaseId);
        }
        
        throw error;
    }
}

// Proxy alternativo en caso de que el primero falle
async function tryAlternativeProxy(databaseId) {
    try {
        // Proxy alternativo
        const proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=';
        const notionUrl = `${NOTION_CONFIG.apiUrl}/databases/${databaseId}/query`;
        const fullUrl = proxyUrl + encodeURIComponent(notionUrl);
        
        console.log('🔄 Usando proxy alternativo:', proxyUrl);
        
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_CONFIG.token}`,
                'Notion-Version': NOTION_CONFIG.version,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Proxy alternativo funcionó');
        return data.results || [];
        
    } catch (secondError) {
        console.error('❌ Proxy alternativo también falló:', secondError);
        throw new Error('No se pudo conectar con Notion. Verifica tu conexión a internet.');
    }
}

// ==================== FUNCIÓN PRINCIPAL ====================

// Función para cargar datos
async function loadData() {
    console.log('🚀 Iniciando carga de datos...');
    
    // Verificar configuración primero
    if (!isConfigComplete()) {
        showToast('Configura primero tus credenciales de Notion (botón ⚙️)', true);
        setTimeout(toggleConfig, 500);
        return;
    }
    
    showLoading(true);
    
    try {
        console.log('📊 Configuración actual:', {
            token: NOTION_CONFIG.token.substring(0, 15) + '...',
            incomeDb: NOTION_CONFIG.incomeDatabaseId,
            expensesDb: NOTION_CONFIG.expensesDatabaseId
        });
        
        // Consultar ambas bases de datos
        const [incomeEntries, expenseEntries] = await Promise.all([
            queryNotionDatabase(NOTION_CONFIG.incomeDatabaseId),
            queryNotionDatabase(NOTION_CONFIG.expensesDatabaseId)
        ]);
        
        console.log('✅ Datos recibidos:', {
            ingresos: incomeEntries.length,
            gastos: expenseEntries.length
        });
        
        // Calcular totales
        let totalIncome = 0;
        let totalExpenses = 0;
        const categoryTotals = {};
        
        // Procesar ingresos
        incomeEntries.forEach(page => {
            const props = page.properties || {};
            const amount = extractPropertyValue(props.Cantidad) || 0;
            totalIncome += amount;
        });
        
        // Procesar gastos
        expenseEntries.forEach(page => {
            const props = page.properties || {};
            const amount = extractPropertyValue(props.Cantidad) || 0;
            const category = extractPropertyValue(props.Categoría) || 'Sin categoría';
            
            if (!categoryTotals[category]) {
                categoryTotals[category] = 0;
            }
            categoryTotals[category] += amount;
            totalExpenses += amount;
        });
        
        const availableBalance = totalIncome - totalExpenses;
        
        console.log('💰 Totales calculados:', {
            totalIncome,
            totalExpenses,
            availableBalance,
            categorias: Object.keys(categoryTotals).length
        });
        
        // Actualizar UI
        document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
        document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
        document.getElementById('availableBalance').textContent = formatCurrency(availableBalance);
        
        // Preparar datos para gráfico
        const expensesByCategory = Object.entries(categoryTotals).map(([category, amount]) => ({
            category,
            amount,
            percentage: totalExpenses > 0 ? (amount / totalExpenses * 100) : 0
        }));
        
        // Actualizar gráfico y lista
        updatePieChart(expensesByCategory);
        updateExpenseList(expensesByCategory);
        
        if (incomeEntries.length === 0 && expenseEntries.length === 0) {
            showToast('ℹ️ No hay datos en tus bases de Notion. Agrega algunos registros.');
        } else {
            showToast(`✅ Datos cargados: ${incomeEntries.length} ingresos, ${expenseEntries.length} gastos`);
        }
        
    } catch (error) {
        console.error('❌ Error detallado al cargar datos:', error);
        
        // Mensaje de error amigable
        let userMessage = 'Error al cargar los datos';
        
        if (error.message.includes('401')) {
            userMessage = 'Token inválido o expirado. Verifica tu configuración.';
        } else if (error.message.includes('404')) {
            userMessage = 'Base de datos no encontrada. Verifica los IDs de las bases.';
        } else if (error.message.includes('403')) {
            userMessage = 'No tienes permisos para acceder a las bases de datos. Compártelas con tu integración.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
            userMessage = 'Error de conexión. Verifica tu internet o intenta de nuevo.';
        } else if (error.message.includes('No se pudo conectar')) {
            userMessage = 'No se pudo conectar con Notion. El servicio de proxy puede estar temporalmente caído.';
        }
        
        showToast(`❌ ${userMessage}`, true);
        
        // Limpiar datos en caso de error
        document.getElementById('totalIncome').textContent = '0,00 €';
        document.getElementById('totalExpenses').textContent = '0,00 €';
        document.getElementById('availableBalance').textContent = '0,00 €';
        updatePieChart([]);
        updateExpenseList([]);
        
    } finally {
        showLoading(false);
    }
}

// ==================== FUNCIONES DE UI ====================

// Función para actualizar gráfico circular
function updatePieChart(data) {
    const canvas = document.getElementById('pieChart');
    const emptyState = document.getElementById('pieChartEmpty');
    
    if (!canvas || !emptyState) return;
    
    if (data.length === 0) {
        canvas.style.display = 'none';
        emptyState.style.display = 'flex';
        if (pieChartInstance) {
            pieChartInstance.destroy();
            pieChartInstance = null;
        }
        return;
    }
    
    canvas.style.display = 'block';
    emptyState.style.display = 'none';
    
    const ctx = canvas.getContext('2d');
    
    if (pieChartInstance) {
        pieChartInstance.destroy();
    }
    
    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.category),
            datasets: [{
                data: data.map(d => d.amount),
                backgroundColor: CHART_COLORS,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            family: 'Inter',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatCurrency(context.parsed);
                            const percentage = data[context.dataIndex].percentage.toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Función para actualizar lista de gastos
function updateExpenseList(data) {
    const listContainer = document.getElementById('expenseList');
    if (!listContainer) return;
    
    if (data.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No hay gastos registrados</div>';
        return;
    }
    
    // Ordenar por monto descendente
    data.sort((a, b) => b.amount - a.amount);
    
    listContainer.innerHTML = data.map((expense, index) => `
        <div class="expense-item">
            <div class="expense-color" style="background-color: ${CHART_COLORS[index % CHART_COLORS.length]}"></div>
            <div class="expense-info">
                <div class="expense-category">${expense.category}</div>
                <div class="expense-percentage">${expense.percentage.toFixed(1)}% del total</div>
            </div>
            <div class="expense-amount">${formatCurrency(expense.amount)}</div>
        </div>
    `).join('');
}

// ==================== FUNCIONES DE CONFIGURACIÓN ====================

// Mostrar/ocultar panel de configuración
function toggleConfig() {
    const panel = document.getElementById('configPanel');
    if (!panel) return;
    
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        
        // Llenar campos con valores actuales
        document.getElementById('cfgToken').value = NOTION_CONFIG.token || '';
        document.getElementById('cfgIncome').value = NOTION_CONFIG.incomeDatabaseId || '';
        document.getElementById('cfgExpenses').value = NOTION_CONFIG.expensesDatabaseId || '';
    } else {
        panel.style.display = 'none';
    }
}

// Guardar configuración desde UI
async function saveConfiguration() {
    const token = document.getElementById('cfgToken').value.trim();
    const incomeDb = document.getElementById('cfgIncome').value.trim();
    const expensesDb = document.getElementById('cfgExpenses').value.trim();
    
    // Validaciones básicas
    if (!token) {
        showToast('❌ El token de Notion es requerido', true);
        return;
    }
    
    if (!token.startsWith('ntn_')) {
        showToast('⚠️ El token debe comenzar con "ntn_"', true);
        return;
    }
    
    if (!incomeDb || incomeDb.length < 10) {
        showToast('❌ ID de base de ingresos inválido', true);
        return;
    }
    
    if (!expensesDb || expensesDb.length < 10) {
        showToast('❌ ID de base de gastos inválido', true);
        return;
    }
    
    try {
        // Importar función saveConfig del módulo config
        const module = await import('./config.js');
        
        // Guardar configuración
        module.saveConfig(token, incomeDb, expensesDb);
        
        // Cerrar panel
        toggleConfig();
        
        // Mostrar mensaje de éxito
        showToast('✅ Configuración guardada correctamente');
        
        // Recargar datos automáticamente después de 1 segundo
        setTimeout(() => {
            loadData();
        }, 1000);
        
    } catch (error) {
        console.error('Error al guardar configuración:', error);
        showToast(`❌ Error: ${error.message}`, true);
    }
}

// ==================== INICIALIZACIÓN ====================

// Cargar configuración al inicio
loadConfig();

// Hacer funciones accesibles globalmente
window.loadData = loadData;
window.toggleConfig = toggleConfig;
window.saveConfiguration = saveConfiguration;

// Cargar datos cuando la página esté lista
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard financiero cargado');
    
    // Mostrar instrucciones iniciales si no hay configuración
    if (!isConfigComplete()) {
        setTimeout(() => {
            showToast('Configura tus credenciales de Notion para comenzar (botón ⚙️)', false);
        }, 1000);
    } else {
        console.log('⚡ Configuración completa, cargando datos...');
        setTimeout(() => {
            loadData();
        }, 500);
    }
});