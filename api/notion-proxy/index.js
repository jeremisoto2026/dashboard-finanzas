// api/notion-proxy/index.js
// Tu función segura en Vercel

export default async function handler(req, res) {
  // Permitir llamadas desde tu dashboard en GitHub Pages
  res.setHeader('Access-Control-Allow-Origin', 'https://jeremisoto2026.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Manejar peticiones OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }
  
  try {
    const { databaseId } = await req.json();
    
    if (!databaseId) {
      return res.status(400).json({ error: 'Falta el databaseId' });
    }
    
    // TU TOKEN está seguro aquí (desde variables de entorno de Vercel)
    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    
    if (!NOTION_TOKEN) {
      return res.status(500).json({ error: 'Token no configurado en Vercel' });
    }
    
    // Llamar a Notion desde el servidor de Vercel (sin problemas de CORS)
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Error de Notion:', error);
      return res.status(response.status).json({ 
        error: `Error ${response.status} de Notion` 
      });
    }
    
    const data = await response.json();
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Error en el proxy:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}