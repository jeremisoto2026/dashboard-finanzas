// ==================== CONFIGURACIÓN SEGURA ====================
// Las credenciales se cargan desde localStorage o variables de entorno
// ==============================================================

// Configuración global de Notion
export const NOTION_CONFIG = {
    token: '',
    incomeDatabaseId: '',
    expensesDatabaseId: '',
    apiUrl: 'https://api.notion.com/v1',
    version: '2022-06-28'
};

// Cargar configuración desde localStorage
export function loadConfig() {
    try {
        const savedConfig = localStorage.getItem('notion_dashboard_config');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            
            // Validar que el token tenga el formato correcto
            if (config.token && config.token.startsWith('ntn_')) {
                NOTION_CONFIG.token = config.token;
                NOTION_CONFIG.incomeDatabaseId = config.incomeDatabaseId || '';
                NOTION_CONFIG.expensesDatabaseId = config.expensesDatabaseId || '';
                
                console.log('✅ Configuración cargada desde localStorage');
                return true;
            } else {
                console.warn('⚠️ Token en localStorage no válido');
            }
        }
    } catch (error) {
        console.error('❌ Error al cargar configuración:', error);
    }
    
    return false;
}

// Guardar configuración en localStorage
export function saveConfig(token, incomeDatabaseId, expensesDatabaseId) {
    // Validar token básico
    if (!token || !token.startsWith('ntn_')) {
        throw new Error('Token inválido. Debe comenzar con "ntn_"');
    }
    
    if (!incomeDatabaseId || incomeDatabaseId.length < 10) {
        throw new Error('ID de base de ingresos inválido');
    }
    
    if (!expensesDatabaseId || expensesDatabaseId.length < 10) {
        throw new Error('ID de base de gastos inválido');
    }
    
    const config = {
        token: token.trim(),
        incomeDatabaseId: incomeDatabaseId.trim(),
        expensesDatabaseId: expensesDatabaseId.trim()
    };
    
    // Guardar en localStorage
    localStorage.setItem('notion_dashboard_config', JSON.stringify(config));
    
    // Actualizar configuración en memoria
    NOTION_CONFIG.token = config.token;
    NOTION_CONFIG.incomeDatabaseId = config.incomeDatabaseId;
    NOTION_CONFIG.expensesDatabaseId = config.expensesDatabaseId;
    
    console.log('💾 Configuración guardada en localStorage');
    return config;
}

// Verificar si la configuración está completa
export function isConfigComplete() {
    const hasToken = NOTION_CONFIG.token && NOTION_CONFIG.token.startsWith('ntn_');
    const hasIncomeDb = NOTION_CONFIG.incomeDatabaseId && NOTION_CONFIG.incomeDatabaseId.length >= 10;
    const hasExpensesDb = NOTION_CONFIG.expensesDatabaseId && NOTION_CONFIG.expensesDatabaseId.length >= 10;
    
    return hasToken && hasIncomeDb && hasExpensesDb;
}

// Limpiar configuración (logout)
export function clearConfig() {
    localStorage.removeItem('notion_dashboard_config');
    NOTION_CONFIG.token = '';
    NOTION_CONFIG.incomeDatabaseId = '';
    NOTION_CONFIG.expensesDatabaseId = '';
    console.log('🧹 Configuración eliminada');
}