import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Análisis de Riesgos Psicosociales NOM-035</title>
</head>
<body>
    <div class="container">
        <!-- Header con Logo -->
        <header class="header">
            <div class="logo-section">
                {{#if logo}}
                <img src="{{logo}}" alt="Logo Empresa" class="logo">
                {{/if}}
            </div>
            <div class="company-info">
                <h1>{{razonSocial}}</h1>
                <p class="rfc">RFC: {{rfc}}</p>
            </div>
        </header>

        <!-- Título del Reporte -->
        <div class="report-title">
            <h2>Análisis de Riesgos Psicosociales</h2>
            <h3>NOM-035-STPS-2018</h3>
            <p class="subtitle">Evaluación de Factores de Riesgo en el Trabajo</p>
        </div>

        <!-- Información del Trabajador -->
        <div class="worker-info">
            <div class="info-grid">
                <div class="info-item">
                    <span class="label">Trabajador:</span>
                    <span class="value">{{nombreTrabajador}}</span>
                </div>
                <div class="info-item">
                    <span class="label">Departamento:</span>
                    <span class="value">{{departamento}}</span>
                </div>
                <div class="info-item">
                    <span class="label">Puesto:</span>
                    <span class="value">{{puesto}}</span>
                </div>
                <div class="info-item">
                    <span class="label">Fecha de Evaluación:</span>
                    <span class="value">{{fechaEvaluacion}}</span>
                </div>
            </div>
        </div>

        <!-- Resumen Ejecutivo -->
        <section class="section">
            <h4>Resumen Ejecutivo</h4>
            <div class="executive-summary">
                <div class="risk-level-card level-{{nivelRiesgoGeneral}}">
                    <div class="risk-level-label">Nivel de Riesgo General</div>
                    <div class="risk-level-value">{{nivelRiesgoGeneralTexto}}</div>
                    <div class="risk-level-score">Calificación: {{calificacionGeneral}}</div>
                </div>
                <div class="summary-text">
                    <p>{{resumenEjecutivo}}</p>
                </div>
            </div>
        </section>

        <!-- Análisis por Categorías -->
        <section class="section">
            <h4>Análisis por Categorías</h4>
            <div class="categories-grid">
                {{#each categorias}}
                <div class="category-card">
                    <div class="category-header">
                        <h5>{{this.nombre}}</h5>
                        <span class="badge badge-{{this.nivelClass}}">{{this.nivel}}</span>
                    </div>
                    <div class="category-score">
                        <div class="score-bar">
                            <div class="score-fill level-{{this.nivelClass}}" style="width: {{this.porcentaje}}%"></div>
                        </div>
                        <span class="score-text">{{this.calificacion}} / {{this.maximo}}</span>
                    </div>
                </div>
                {{/each}}
            </div>
        </section>

        <!-- Análisis por Dominios -->
        <section class="section">
            <h4>Análisis por Dominios</h4>
            <table class="analysis-table">
                <thead>
                    <tr>
                        <th>Dominio</th>
                        <th>Categoría</th>
                        <th>Calificación</th>
                        <th>Nivel de Riesgo</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each dominios}}
                    <tr>
                        <td class="domain-name">{{this.nombre}}</td>
                        <td>{{this.categoria}}</td>
                        <td class="score-cell">{{this.calificacion}}</td>
                        <td>
                            <span class="badge badge-{{this.nivelClass}}">{{this.nivel}}</span>
                        </td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
        </section>

        <!-- Dimensiones Críticas -->
        {{#if dimensionesCriticas}}
        <section class="section">
            <h4>Dimensiones que Requieren Atención</h4>
            <div class="critical-dimensions">
                {{#each dimensionesCriticas}}
                <div class="dimension-card">
                    <div class="dimension-header">
                        <span class="dimension-name">{{this.nombre}}</span>
                        <span class="badge badge-{{this.nivelClass}}">{{this.nivel}}</span>
                    </div>
                    <p class="dimension-description">{{this.descripcion}}</p>
                </div>
                {{/each}}
            </div>
        </section>
        {{/if}}

        <!-- Recomendaciones -->
        <section class="section">
            <h4>Recomendaciones</h4>
            <div class="recommendations">
                {{#each recomendaciones}}
                <div class="recommendation-item">
                    <div class="recommendation-icon">{{this.icono}}</div>
                    <div class="recommendation-content">
                        <h5>{{this.titulo}}</h5>
                        <p>{{this.descripcion}}</p>
                    </div>
                </div>
                {{/each}}
            </div>
        </section>

        <!-- Firmas de Autorización -->
        {{#if firmas}}
        <section class="signatures">
            <h4>Validación</h4>
            <div class="signature-grid">
                {{#each firmas}}
                <div class="signature-box">
                    {{#if this.firmaUrl}}
                    <img src="{{this.firmaUrl}}" alt="Firma" class="signature-image">
                    {{/if}}
                    <div class="signature-line"></div>
                    <p class="signature-name">{{this.nombre}}</p>
                    <p class="signature-title">{{this.cargo}}</p>
                </div>
                {{/each}}
            </div>
        </section>
        {{/if}}

        <!-- Footer -->
        <footer class="footer">
            <p>Documento generado electrónicamente por el Sistema de Gestión NOM-035</p>
            <p class="folio-footer">{{folio}}</p>
            <div class="qr-section">
                <img src="{{qrCode}}" alt="Código QR" class="qr-code">
                <p class="qr-text">Verificar autenticidad</p>
            </div>
        </footer>
    </div>
</body>
</html>`;

const cssStyles = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    background: #fff;
}

.container {
    max-width: 210mm;
    margin: 0 auto;
    padding: 20mm;
}

/* Header */
.header {
    display: flex;
    align-items: center;
    gap: 20px;
    padding-bottom: 20px;
    border-bottom: 3px solid #2c3e50;
    margin-bottom: 30px;
}

.logo-section {
    flex-shrink: 0;
}

.logo {
    max-width: 120px;
    max-height: 80px;
    object-fit: contain;
}

.company-info h1 {
    font-size: 24px;
    color: #2c3e50;
    margin-bottom: 5px;
}

.company-info .rfc {
    font-size: 14px;
    color: #666;
}

/* Report Title */
.report-title {
    text-align: center;
    margin-bottom: 30px;
    padding: 20px;
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    color: white;
    border-radius: 8px;
}

.report-title h2 {
    font-size: 22px;
    margin-bottom: 8px;
}

.report-title h3 {
    font-size: 18px;
    margin-bottom: 5px;
}

.report-title .subtitle {
    font-size: 14px;
    opacity: 0.9;
}

/* Worker Info */
.worker-info {
    background: #ecf0f1;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 30px;
    border-left: 4px solid #3498db;
}

.info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.info-item {
    display: flex;
    flex-direction: column;
}

.info-item .label {
    font-weight: 600;
    color: #555;
    font-size: 12px;
    margin-bottom: 4px;
}

.info-item .value {
    color: #333;
    font-size: 14px;
}

/* Sections */
.section {
    margin-bottom: 30px;
}

.section h4 {
    font-size: 18px;
    color: #2c3e50;
    margin-bottom: 15px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e0e0e0;
}

/* Executive Summary */
.executive-summary {
    display: flex;
    gap: 20px;
    align-items: flex-start;
}

.risk-level-card {
    min-width: 200px;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    color: white;
}

.risk-level-card.level-nulo {
    background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
}

.risk-level-card.level-bajo {
    background: linear-gradient(135deg, #16a085 0%, #1abc9c 100%);
}

.risk-level-card.level-medio {
    background: linear-gradient(135deg, #f39c12 0%, #f1c40f 100%);
}

.risk-level-card.level-alto {
    background: linear-gradient(135deg, #e67e22 0%, #e74c3c 100%);
}

.risk-level-card.level-muy-alto {
    background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);
}

.risk-level-label {
    font-size: 12px;
    opacity: 0.9;
    margin-bottom: 8px;
}

.risk-level-value {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 8px;
}

.risk-level-score {
    font-size: 14px;
    opacity: 0.9;
}

.summary-text {
    flex: 1;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #3498db;
}

.summary-text p {
    color: #555;
    line-height: 1.8;
}

/* Categories Grid */
.categories-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
}

.category-card {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 15px;
}

.category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.category-header h5 {
    font-size: 14px;
    color: #2c3e50;
    margin: 0;
}

.category-score {
    display: flex;
    align-items: center;
    gap: 10px;
}

.score-bar {
    flex: 1;
    height: 12px;
    background: #ecf0f1;
    border-radius: 6px;
    overflow: hidden;
}

.score-fill {
    height: 100%;
    transition: width 0.3s ease;
}

.score-fill.level-nulo {
    background: #27ae60;
}

.score-fill.level-bajo {
    background: #16a085;
}

.score-fill.level-medio {
    background: #f39c12;
}

.score-fill.level-alto {
    background: #e67e22;
}

.score-fill.level-muy-alto {
    background: #c0392b;
}

.score-text {
    font-size: 12px;
    color: #666;
    white-space: nowrap;
}

/* Badges */
.badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
}

.badge-nulo {
    background: #d4edda;
    color: #155724;
}

.badge-bajo {
    background: #d1ecf1;
    color: #0c5460;
}

.badge-medio {
    background: #fff3cd;
    color: #856404;
}

.badge-alto {
    background: #f8d7da;
    color: #721c24;
}

.badge-muy-alto {
    background: #f5c6cb;
    color: #721c24;
}

/* Analysis Table */
.analysis-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.analysis-table thead {
    background: #2c3e50;
    color: white;
}

.analysis-table th {
    padding: 12px;
    text-align: left;
    font-weight: 600;
    font-size: 13px;
}

.analysis-table td {
    padding: 12px;
    border-bottom: 1px solid #e0e0e0;
    font-size: 13px;
}

.analysis-table tbody tr:hover {
    background: #f8f9fa;
}

.domain-name {
    font-weight: 600;
    color: #2c3e50;
}

.score-cell {
    text-align: center;
    font-weight: 600;
}

/* Critical Dimensions */
.critical-dimensions {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.dimension-card {
    background: #fff3cd;
    border-left: 4px solid #f39c12;
    padding: 15px;
    border-radius: 4px;
}

.dimension-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.dimension-name {
    font-weight: 600;
    color: #2c3e50;
    font-size: 14px;
}

.dimension-description {
    color: #666;
    font-size: 13px;
    line-height: 1.6;
}

/* Recommendations */
.recommendations {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.recommendation-item {
    display: flex;
    gap: 15px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #3498db;
}

.recommendation-icon {
    font-size: 24px;
    flex-shrink: 0;
}

.recommendation-content h5 {
    color: #2c3e50;
    font-size: 14px;
    margin-bottom: 5px;
}

.recommendation-content p {
    color: #666;
    font-size: 13px;
    line-height: 1.6;
}

/* Signatures */
.signatures {
    margin-top: 40px;
    page-break-inside: avoid;
}

.signatures h4 {
    font-size: 18px;
    color: #2c3e50;
    margin-bottom: 20px;
    text-align: center;
}

.signature-grid {
    display: flex;
    justify-content: space-around;
    gap: 30px;
    margin-top: 30px;
}

.signature-box {
    text-align: center;
    flex: 1;
}

.signature-image {
    max-width: 120px;
    max-height: 60px;
    object-fit: contain;
    margin-bottom: 10px;
}

.signature-line {
    width: 100%;
    height: 1px;
    background: #333;
    margin: 20px 0 10px 0;
}

.signature-name {
    font-weight: 600;
    color: #333;
    margin-bottom: 5px;
}

.signature-title {
    font-size: 13px;
    color: #666;
}

/* Footer */
.footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 2px solid #e0e0e0;
    text-align: center;
    font-size: 12px;
    color: #666;
}

.folio-footer {
    margin-top: 10px;
    font-weight: 600;
    color: #2c3e50;
}

.qr-section {
    margin-top: 15px;
}

.qr-code {
    width: 80px;
    height: 80px;
}

.qr-text {
    margin-top: 5px;
    font-size: 11px;
    color: #666;
}

/* Print Styles */
@media print {
    body {
        margin: 0;
        padding: 0;
    }
    
    .container {
        max-width: 100%;
        padding: 15mm;
    }
    
    .section {
        page-break-inside: avoid;
    }
}`;

const variables = {
  logo: { type: 'string', description: 'URL del logo de la empresa' },
  razonSocial: { type: 'string', description: 'Razón social de la empresa' },
  rfc: { type: 'string', description: 'RFC de la empresa' },
  folio: { type: 'string', description: 'Folio del reporte' },
  nombreTrabajador: { type: 'string', description: 'Nombre completo del trabajador evaluado' },
  departamento: { type: 'string', description: 'Departamento del trabajador' },
  puesto: { type: 'string', description: 'Puesto del trabajador' },
  fechaEvaluacion: { type: 'string', description: 'Fecha de la evaluación' },
  nivelRiesgoGeneral: { type: 'string', description: 'Nivel de riesgo general (nulo, bajo, medio, alto, muy-alto)' },
  nivelRiesgoGeneralTexto: { type: 'string', description: 'Texto del nivel de riesgo (Nulo, Bajo, Medio, Alto, Muy Alto)' },
  calificacionGeneral: { type: 'number', description: 'Calificación general del análisis' },
  resumenEjecutivo: { type: 'string', description: 'Resumen ejecutivo del análisis' },
  categorias: { type: 'array', description: 'Array de categorías con nombre, nivel, calificación, máximo, porcentaje' },
  dominios: { type: 'array', description: 'Array de dominios con nombre, categoría, calificación, nivel' },
  dimensionesCriticas: { type: 'array', description: 'Array de dimensiones que requieren atención' },
  recomendaciones: { type: 'array', description: 'Array de recomendaciones con icono, título, descripción' },
  firmas: { type: 'array', description: 'Array de firmas de validación' },
  qrCode: { type: 'string', description: 'URL del código QR para verificación' }
};

async function insertTemplate() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Desmarcar cualquier plantilla default existente del tipo 'analisis_riesgos'
    await connection.execute(
      'UPDATE report_templates SET is_default = false WHERE tipo = ?',
      ['analisis_riesgos']
    );

    // Insertar la nueva plantilla
    const [result] = await connection.execute(
      `INSERT INTO report_templates 
       (nombre, descripcion, tipo, html_template, css_styles, variables, is_default, activo, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        'Plantilla Profesional - Análisis de Riesgos Psicosociales',
        'Plantilla profesional para reportes de análisis de riesgos psicosociales según NOM-035-STPS-2018. Incluye resumen ejecutivo, análisis por categorías/dominios/dimensiones, dimensiones críticas, recomendaciones personalizadas y firmas de validación.',
        'analisis_riesgos',
        htmlTemplate,
        cssStyles,
        JSON.stringify(variables),
        true, // is_default
        true  // activo
      ]
    );

    console.log('✅ Plantilla de Análisis de Riesgos insertada exitosamente con ID:', result.insertId);
  } catch (error) {
    console.error('❌ Error al insertar plantilla:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

insertTemplate();
