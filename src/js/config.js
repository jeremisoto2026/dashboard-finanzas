// ==================== CONFIGURACIÓN SEGURA ====================
// Las credenciales se cargan desde localStorage
// NO incluyas datos reales aquí
// ==============================================================

// Configuración global de Notion
export const NOTION_CONFIG = {
    token: '', // Se llenará desde localStorage
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
            
            NOTION_CONFIG.token = config.token || '';
            NOTION_CONFIG.incomeDatabaseId = config.incomeDatabaseId || '';
            NOTION_CONFIG.expensesDatabaseId = config.expensesDatabaseId || '';
            
            console.log('✅ Configuración cargada desde localStorage');
            return true;
        }
    } catch (error) {
        console.log('ℹ️ No hay configuración guardada en localStorage');
    }
    return false;
}

// Guardar configuración en localStorage
export function saveConfig(token, incomeDatabaseId, expensesDatabaseId) {
    const config = {
        token: token,
        incomeDatabaseId: incomeDatabaseId,
        expensesDatabaseId: expensesDatabaseId
    };
    
    localStorage.setItem('notion_dashboard_config', JSON.stringify(config));
    
    // Actualizar configuración en memoria
    NOTION_CONFIG.token = token;
    NOTION_CONFIG.incomeDatabaseId = incomeDatabaseId;
    NOTION_CONFIG.expensesDatabaseId = expensesDatabaseId;
    
    return config;
}

// Verificar si la configuración está completa
export function isConfigComplete() {
    return NOTION_CONFIG.token && 
           NOTION_CONFIG.incomeDatabaseId && 
           NOTION_CONFIG.expensesDatabaseId;
}

// Mostrar alerta si falta configuración
export function checkConfig() {
    if (!isConfigComplete()) {
        console.warn('⚠️ Configuración incompleta. Abre el panel de configuración (botón ⚙️)');
        return false;
    }
    return true;
}