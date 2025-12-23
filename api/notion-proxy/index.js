// api/notion-proxy/index.js
// Esta función se ejecutará en Vercel y actuará como intermediario.

export default async function handler(request, response) {
  // 1. Permitir que tu dashboard en GitHub Pages llame a esta función (CORS)
  response.setHeader('Access-Control-Allow-Origin', 'https://jeremisoto2026.github.io');
  response.setHeader('Access-Control-Allow-Methods', 'POST');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 2. Solo responder a peticiones POST
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método no permitido' });
  }
  
  try {
    // 3. Obtener el ID de la base de datos que envía tu dashboard
    const { databaseId } = await request.json();
    
    if (!databaseId) {
      return response.status(400).json({ error: 'Falta databaseId' });
    }
    
    // 4. TU TOKEN DE NOTION (LO MÁS IMPORTANTE)
    // Puedes ponerlo directo aquí, pero es MEJOR usar variable de entorno
    const NOTION_TOKEN = process.env.NOTION_TOKEN || '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';
    
    // 5. Hacer la petición REAL a Notion (desde el servidor de Vercel, sin problemas de CORS)
    const notionResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}) // Cuerpo vacío para una consulta simple
    });
    
    // 6. Si Notion devuelve error, lo pasamos a tu dashboard
    if (!notionResponse.ok) {
      const errorText = await notionResponse.text();
      return response.status(notionResponse.status).json({ 
        error: `Error de Notion: ${notionResponse.status}`,
        details: errorText 
      });
    }
    
    // 7. Obtener los datos de Notion y enviarlos a tu dashboard
    const data = await notionResponse.json();
    return response.status(200).json(data);
    
  } catch (error) {
    // 8. Manejar cualquier error inesperado
    console.error('Error en el proxy:', error);
    return response.status(500).json({ error: 'Error interno del servidor proxy' });
  }
}