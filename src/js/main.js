// ==================== DASHBOARD FINANCIERO ====================
// Código con PROXY para evitar problemas de CORS
// ==============================================================

import { NOTION_CONFIG, loadConfig, isConfigComplete } from './config.js';

const CHART_COLORS = [
    '#10b981', '#f43f5e', '#3b82f6', '#f59e0b',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
];

let pieChartInstance = null;
window.NOTION_CONFIG = NOTION_CONFIG;

// ==================== FUNCIONES UTILITARIAS ====================

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

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

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

// ==================== FUNCIÓN CON PROXY ====================

async function queryNotionDatabase(databaseId) {
    if (!NOTION_CONFIG.token) {
        throw new Error('Token de Notion no configurado');
    }
    
    try {
        // USAR PROXY PÚBLICO para evitar CORS
        const proxyUrl = 'https://corsproxy.io/?';
        const notionUrl = `${NOTION_CONFIG.apiUrl}/databases/${databaseId}/query`;
        
        const response = await fetch(proxyUrl + encodeURIComponent(notionUrl), {
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
        return data.results || [];
    } catch (error) {
        console.error('Error consultando Notion:', error);
        throw error;
    }
}

// ==================== FUNCIÓN PRINCIPAL ====================

async function loadData() {
    if (!isConfigComplete()) {
        showToast('Configura primero tus credenciales de Notion (botón ⚙️)', true);
        toggleConfig();
        return;
    }
    
    showLoading(true);
    
    try {
        const [incomeEntries, expenseEntries] = await Promise.all([
            queryNotionDatabase(NOTION_CONFIG.incomeDatabaseId),
            queryNotionDatabase(NOTION_CONFIG.expensesDatabaseId)
        ]);
        
        let totalIncome = 0;
        let totalExpenses = 0;
        const categoryTotals = {};
        
        incomeEntries.forEach(page => {
            const props = page.properties || {};
            const amount = extractPropertyValue(props.Cantidad) || 0;
            totalIncome += amount;
        });
        
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
        
        document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
        document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
        document.getElementById('availableBalance').textContent = formatCurrency(availableBalance);
        
        const expensesByCategory = Object.entries(categoryTotals).map(([category, amount]) => ({
            category,
            amount,
            percentage: totalExpenses > 0 ? (amount / totalExpenses * 100) : 0
        }));
        
        updatePieChart(expensesByCategory);
        updateExpenseList(expensesByCategory);
        
        showToast('✅ Datos actualizados correctamente');
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        showToast(`❌ Error: ${error.message}`, true);
        
        document.getElementById('totalIncome').textContent = '0,00 €';
        document.getElementById('totalExpenses').textContent = '0,00 €';
        document.getElementById('availableBalance').textContent = '0,00 €';
        updatePieChart([]);
        updateExpenseList([]);
        
    } finally {
        showLoading(false);
    }
}

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

// ==================== CONFIGURACIÓN ====================

function toggleConfig() {
    const panel = document.getElementById('configPanel');
    if (!panel) return;
    
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        document.getElementById('cfgToken').value = NOTION_CONFIG.token || '';
        document.getElementById('cfgIncome').value = NOTION_CONFIG.incomeDatabaseId || '';
        document.getElementById('cfgExpenses').value = NOTION_CONFIG.expensesDatabaseId || '';
    } else {
        panel.style.display = 'none';
    }
}

async function saveConfiguration() {
    const token = document.getElementById('cfgToken').value.trim();
    const incomeDb = document.getElementById('cfgIncome').value.trim();
    const expensesDb = document.getElementById('cfgExpenses').value.trim();
    
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
    
    // Importar y usar saveConfig
    const module = await import('./config.js');
    module.saveConfig(token, incomeDb, expensesDb);
    
    toggleConfig();
    showToast('✅ Configuración guardada correctamente');
    
    setTimeout(() => {
        loadData();
    }, 1000);
}

// ==================== INICIALIZACIÓN ====================

loadConfig();

window.loadData = loadData;
window.toggleConfig = toggleConfig;
window.saveConfiguration = saveConfiguration;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard financiero cargado');
    
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