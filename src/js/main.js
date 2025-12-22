// ==================== DASHBOARD FINANCIERO ====================
// Código principal del dashboard
// ==============================================================

// Importar configuración
import { NOTION_CONFIG, loadConfig, isConfigComplete, checkConfig } from './config.js';

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

// ==================== FUNCIONES DE NOTION API ====================

// Función para consultar base de datos de Notion
async function queryNotionDatabase(databaseId) {
    if (!NOTION_CONFIG.token) {
        throw new Error('Token de Notion no configurado');
    }
    
    try {
        const response = await fetch(`${NOTION_CONFIG.apiUrl}/databases/${databaseId}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_CONFIG.token}`,
                'Notion-Version': NOTION_CONFIG.version,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Token de Notion inválido o expirado');
            }
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error consultando Notion:', error);
        throw error;
    }
}

// ==================== FUNCIÓN PRINCIPAL ====================

// Función para cargar datos
async function loadData() {
    // Verificar configuración primero
    if (!checkConfig()) {
        showToast('Configura primero tus credenciales de Notion (botón ⚙️)', true);
        toggleConfig(); // Mostrar panel de configuración
        return;
    }
    
    showLoading(true);
    
    try {
        // Consultar ambas bases de datos
        const [incomeEntries, expenseEntries] = await Promise.all([
            queryNotionDatabase(NOTION_CONFIG.incomeDatabaseId),
            queryNotionDatabase(NOTION_CONFIG.expensesDatabaseId)
        ]);
        
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
        
        showToast('✅ Datos actualizados correctamente');
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        showToast(`❌ Error: ${error.message}`, true);
        
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
function saveConfiguration() {
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
    
    // Importar función saveConfig del módulo config
    import('./config.js').then(module => {
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
    });
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
    
    // Cargar datos automáticamente si la configuración está completa
    if (isConfigComplete()) {
        console.log('⚡ Configuración completa, cargando datos...');
        setTimeout(() => {
            loadData();
        }, 500);
    } else {
        console.log('ℹ️ Esperando configuración...');
        showToast('Configura tus credenciales de Notion para comenzar', false);
    }
});