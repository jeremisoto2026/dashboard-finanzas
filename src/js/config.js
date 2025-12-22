// Configuración del proyecto
export const NOTION_CONFIG = {
    token: '', // Se llenará desde .env o localStorage
    incomeDatabaseId: '',
    expensesDatabaseId: '',
    apiUrl: 'https://api.notion.com/v1',
    version: '2022-06-28'
};

// Cargar configuración desde localStorage (para desarrollo móvil)
export function loadConfig() {
    try {
        const savedConfig = localStorage.getItem('notion_config');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            NOTION_CONFIG.token = config.token || '';
            NOTION_CONFIG.incomeDatabaseId = config.incomeDatabaseId || '';
            NOTION_CONFIG.expensesDatabaseId = config.expensesDatabaseId || '';
        }
    } catch (e) {
        console.log('No hay configuración guardada');
    }
}

// Guardar configuración (útil para interfaz de configuración)
export function saveConfig(token, incomeDbId, expensesDbId) {
    const config = { token, incomeDatabaseId: incomeDbId, expensesDatabaseId: expensesDbId };
    localStorage.setItem('notion_config', JSON.stringify(config));
    NOTION_CONFIG.token = token;
    NOTION_CONFIG.incomeDatabaseId = incomeDbId;
    NOTION_CONFIG.expensesDatabaseId = expensesDbId;
}