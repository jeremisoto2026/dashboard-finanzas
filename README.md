# Dashboard Financiero Personal

Dashboard para visualizar ingresos y gastos desde bases de datos de Notion.

## 🚀 Características

- 📊 Gráfico circular de gastos por categoría
- 💰 Resumen de ingresos, gastos y balance
- 🔄 Actualización en tiempo real
- 📱 Diseño responsive
- 🔐 Configuración segura local

## ⚙️ Configuración

### 1. Configurar Notion API
1. Crea una integración en [Notion Developers](https://www.notion.so/my-integrations)
2. Comparte tus bases de datos con la integración
3. Obtén el Token y los IDs de las bases de datos

### 2. Configurar el Dashboard
1. Abre el dashboard en tu navegador
2. Haz clic en el botón ⚙️ en la esquina inferior derecha
3. Ingresa tus credenciales:
   - Token de Notion
   - ID de base de datos de Ingresos
   - ID de base de datos de Gastos

### 3. Estructura de bases de datos

**Base de datos de Ingresos:**
- Propiedad "Cantidad" (Number)
- Propiedad "Fecha" (Date)
- Propiedad "Descripción" (Title o Rich Text)

**Base de datos de Gastos:**
- Propiedad "Cantidad" (Number)
- Propiedad "Categoría" (Select)
- Propiedad "Fecha" (Date)

## 🛠 Desarrollo

Este proyecto funciona con HTML, CSS y JavaScript puro. No requiere Node.js ni build process.

### Estructura del proyecto: