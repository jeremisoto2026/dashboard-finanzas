// ==================== CONFIGURACIÓN NOTION ====================
// Este archivo maneja las credenciales de conexión con Notion
// Los datos se guardan en el navegador (localStorage)
// ==============================================================

// Configuración principal de Notion API
export const NOTION_CONFIG = {
    token: '', // Tu token (comienza con ntn_)
    incomeDatabaseId: '', // ID de la base de datos de INGRESOS
    expensesDatabaseId: '', // ID de la base de datos de GASTOS
    apiUrl: 'https://api.notion.com/v1',
    version: '2022-06-28'
};

// Función para cargar configuración desde localStorage
export function loadConfig() {
    try {
        const savedConfig = localStorage.getItem('notion_dashboard_config');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            
            // Validar que el token tenga formato correcto
            if (config.token && config.token.startsWith('ntn_')) {
                NOTION_CONFIG.token = config.token;
                NOTION_CONFIG.incomeDatabaseId = config.incomeDatabaseId || '';
                NOTION_CONFIG.expensesDatabaseId = config.expensesDatabaseId || '';
                
                console.log('✅ Configuración cargada desde el navegador');
                return true;
            } else {
                console.log('⚠️ Token guardado no tiene formato válido');
            }
        }
    } catch (error) {
        console.error('❌ Error al cargar configuración:', error);
    }
    
    return false;
}

// Función para guardar configuración en localStorage
export function saveConfig(token, incomeDatabaseId, expensesDatabaseId) {
    // Validaciones básicas
    if (!token || !token.startsWith('ntn_')) {
        throw new Error('Token inválido. Debe comenzar con "ntn_"');
    }
    
    if (!incomeDatabaseId || incomeDatabaseId.length < 10) {
        throw new Error('ID de base de ingresos inválido');
    }
    
    if (!expensesDatabaseId || expensesDatabaseId.length < 10) {
        throw new Error('ID de base de gastos inválido');
    }
    
    // Crear objeto de configuración
    const config = {
        token: token.trim(),
        incomeDatabaseId: incomeDatabaseId.trim(),
        expensesDatabaseId: expensesDatabaseId.trim()
    };
    
    // Guardar en localStorage (solo en tu navegador)
    localStorage.setItem('notion_dashboard_config', JSON.stringify(config));
    
    // Actualizar la configuración en memoria
    NOTION_CONFIG.token = config.token;
    NOTION_CONFIG.incomeDatabaseId = config.incomeDatabaseId;
    NOTION_CONFIG.expensesDatabaseId = config.expensesDatabaseId;
    
    console.log('💾 Configuración guardada correctamente');
    return config;
}

// Función para verificar si la configuración está completa
export function isConfigComplete() {
    const hasToken = NOTION_CONFIG.token && NOTION_CONFIG.token.startsWith('ntn_');
    const hasIncomeDb = NOTION_CONFIG.incomeDatabaseId && NOTION_CONFIG.incomeDatabaseId.length >= 10;
    const hasExpensesDb = NOTION_CONFIG.expensesDatabaseId && NOTION_CONFIG.expensesDatabaseId.length >= 10;
    
    return hasToken && hasIncomeDb && hasExpensesDb;
}

// Función para limpiar configuración (resetear)
export function clearConfig() {
    localStorage.removeItem('notion_dashboard_config');
    NOTION_CONFIG.token = '';
    NOTION_CONFIG.incomeDatabaseId = '';
    NOTION_CONFIG.expensesDatabaseId = '';
    console.log('🧹 Configuración eliminada');
}

// Hacer funciones disponibles globalmente si es necesario
window.clearNotionConfig = clearConfig;
window.getNotionConfig = () => NOTION_CONFIG;