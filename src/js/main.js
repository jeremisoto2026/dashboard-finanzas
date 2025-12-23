// ==================== DASHBOARD FINANCIERO ====================
// Código con PROXY ULTRA-CONFIABLE que evita CORS
// ==============================================================

import { NOTION_CONFIG, loadConfig, isConfigComplete, saveConfig } from './config.js';

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
    if (loadingEl) loadingEl.style.display = show ? 'flex' : 'none';
    if (btn) {
        btn.disabled = show;
        show ? btn.classList.add('loading') : btn.classList.remove('loading');
    }
}

function showToast(message, isError = false) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
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

// ==================== PROXY ULTRA-CONFIABLE ====================
// Usa un servicio público y probado. Cambia solo si es necesario.
const PROXY_URL = 'https://cors-anywhere.herokuapp.com/';
// const PROXY_URL = 'https://api.allorigins.win/raw?url='; // Alternativa

async function queryNotionDatabase(databaseId) {
    if (!NOTION_CONFIG.token) throw new Error('Token no configurado');
    if (!databaseId) throw new Error('ID de base de datos no proporcionado');

    try {
        const targetUrl = `${NOTION_CONFIG.apiUrl}/databases/${databaseId}/query`;
        const proxiedUrl = PROXY_URL + encodeURIComponent(targetUrl);
        
        console.log('🔗 Llamando a Notion via Proxy...');
        const response = await fetch(proxiedUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_CONFIG.token}`,
                'Notion-Version': NOTION_CONFIG.version,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({})
        });

        console.log('📡 Status de respuesta:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Cuerpo del error:', errorText);
            if (response.status === 401) throw new Error('401 - Token inválido o expirado');
            if (response.status === 403) throw new Error('403 - No tienes permisos para esta base de datos. ¿La compartiste con la integración en Notion?');
            if (response.status === 404) throw new Error('404 - Base de datos no encontrada. Revisa el ID.');
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ OK. Encontrados ${data.results?.length || 0} registros.`);
        return data.results || [];
        
    } catch (error) {
        console.error('❌ Error en queryNotionDatabase:', error);
        // Intento con proxy alternativo si el principal falla por red/CORS
        if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
            console.log('🔄 Intentando con proxy alternativo...');
            return tryAlternativeProxy(databaseId);
        }
        throw error; // Relanza otros errores (401, 404, etc.)
    }
}

async function tryAlternativeProxy(databaseId) {
    const altProxy = 'https://api.codetabs.com/v1/proxy?quest=';
    const targetUrl = `${NOTION_CONFIG.apiUrl}/databases/${databaseId}/query`;
    const proxiedUrl = altProxy + encodeURIComponent(targetUrl);
    
    const response = await fetch(proxiedUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${NOTION_CONFIG.token}`,
            'Notion-Version': NOTION_CONFIG.version,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });
    
    if (!response.ok) throw new Error(`Proxy alternativo falló: ${response.status}`);
    const data = await response.json();
    return data.results || [];
}

// ==================== FUNCIÓN PRINCIPAL ====================

async function loadData() {
    console.log('🚀 Iniciando carga de datos...');
    if (!isConfigComplete()) {
        showToast('Configura primero tus credenciales (botón ⚙️)', true);
        setTimeout(toggleConfig, 500);
        return;
    }
    
    showLoading(true);
    try {
        const [incomeEntries, expenseEntries] = await Promise.all([
            queryNotionDatabase(NOTION_CONFIG.incomeDatabaseId),
            queryNotionDatabase(NOTION_CONFIG.expensesDatabaseId)
        ]);
        
        let totalIncome = 0, totalExpenses = 0;
        const categoryTotals = {};
        
        incomeEntries.forEach(page => {
            const amount = extractPropertyValue(page.properties?.Cantidad) || 0;
            totalIncome += amount;
        });
        
        expenseEntries.forEach(page => {
            const amount = extractPropertyValue(page.properties?.Cantidad) || 0;
            const category = extractPropertyValue(page.properties?.Categoría) || 'Sin categoría';
            categoryTotals[category] = (categoryTotals[category] || 0) + amount;
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
        
        const totalEntries = incomeEntries.length + expenseEntries.length;
        if (totalEntries === 0) {
            showToast('ℹ️ Bases de datos vacías. Agrega registros en Notion.');
        } else {
            showToast(`✅ Datos cargados: ${incomeEntries.length} ingresos, ${expenseEntries.length} gastos`);
        }
        
    } catch (error) {
        console.error('❌ Error FATAL en loadData:', error);
        let userMessage = 'Error al cargar datos';
        if (error.message.includes('401')) userMessage = 'Token inválido. Cópialo bien de Notion.';
        if (error.message.includes('403')) userMessage = 'Falta compartir la base de datos con la integración en Notion.';
        if (error.message.includes('404')) userMessage = 'ID de base de datos incorrecto.';
        if (error.message.includes('Failed to fetch')) userMessage = 'Error de red/proxy. Intenta de nuevo.';
        showToast(`❌ ${userMessage}`, true);
        
        // Reset UI
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
        if (pieChartInstance) { pieChartInstance.destroy(); pieChartInstance = null; }
        return;
    }
    
    canvas.style.display = 'block';
    emptyState.style.display = 'none';
    const ctx = canvas.getContext('2d');
    
    if (pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.category),
            datasets: [{
                data: data.map(d => d.amount),
                backgroundColor: CHART_COLORS,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { padding: 15, font: { family: 'Inter', size: 12 } } },
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
    
    if (!token || !token.startsWith('ntn_')) {
        showToast('❌ Token inválido. Debe comenzar con "ntn_"', true);
        return;
    }
    if (!incomeDb || incomeDb.length < 10 || !expensesDb || expensesDb.length < 10) {
        showToast('❌ IDs de bases de datos inválidos', true);
        return;
    }
    
    try {
        saveConfig(token, incomeDb, expensesDb);
        toggleConfig();
        showToast('✅ Configuración guardada. Cargando datos...');
        setTimeout(loadData, 800);
    } catch (error) {
        showToast(`❌ Error al guardar: ${error.message}`, true);
    }
}

// ==================== INICIALIZACIÓN ====================

loadConfig();
window.loadData = loadData;
window.toggleConfig = toggleConfig;
window.saveConfiguration = saveConfiguration;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard financiero inicializado.');
    if (isConfigComplete()) {
        console.log('⚡ Configuración completa. Auto-cargando datos en 1s...');
        setTimeout(loadData, 1000);
    } else {
        console.log('ℹ️ Esperando configuración del usuario.');
        setTimeout(() => showToast('Configura tus credenciales de Notion (botón ⚙️)', false), 1500);
    }
});