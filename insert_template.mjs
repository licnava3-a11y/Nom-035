import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Verificación de Numerales NOM-035</title>
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
            <h2>Reporte de Verificación de Cumplimiento</h2>
            <h3>NOM-035-STPS-2018</h3>
            <p class="subtitle">Factores de Riesgo Psicosocial en el Trabajo</p>
        </div>

        <!-- Información del Reporte -->
        <div class="report-info">
            <div class="info-row">
                <span class="label">Folio:</span>
                <span class="value">{{folio}}</span>
            </div>
            <div class="info-row">
                <span class="label">Fecha de Generación:</span>
                <span class="value">{{fecha}}</span>
            </div>
            <div class="info-row">
                <span class="label">Generado por:</span>
                <span class="value">{{generadoPor}}</span>
            </div>
        </div>

        <!-- Resumen de Cumplimiento -->
        <section class="section">
            <h4>Resumen de Cumplimiento</h4>
            <table class="compliance-table">
                <thead>
                    <tr>
                        <th>Numeral</th>
                        <th>Descripción</th>
                        <th>Estado</th>
                        <th>Última Verificación</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each numerales}}
                    <tr>
                        <td class="numeral-col">{{this.numeral}}</td>
                        <td>{{this.descripcion}}</td>
                        <td>
                            <span class="badge badge-{{this.estadoClass}}">
                                {{this.estado}}
                            </span>
                        </td>
                        <td>{{this.ultimaVerificacion}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
        </section>

        <!-- Hallazgos y Observaciones -->
        {{#if hallazgos}}
        <section class="section">
            <h4>Hallazgos y Observaciones</h4>
            {{#each hallazgos}}
            <div class="finding-card">
                <div class="finding-header">
                    <span class="finding-numeral">{{this.numeral}}</span>
                    <span class="finding-date">{{this.fecha}}</span>
                </div>
                <p class="finding-text">{{this.observaciones}}</p>
            </div>
            {{/each}}
        </section>
        {{/if}}

        <!-- Firmas de Autorización -->
        {{#if firmas}}
        <section class="signatures">
            <h4>Firmas de Autorización</h4>
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
    border-bottom: 3px solid #0066cc;
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
    color: #0066cc;
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
    background: linear-gradient(135deg, #0066cc 0%, #004999 100%);
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

/* Report Info */
.report-info {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 30px;
    border-left: 4px solid #0066cc;
}

.info-row {
    display: flex;
    padding: 8px 0;
    border-bottom: 1px solid #e0e0e0;
}

.info-row:last-child {
    border-bottom: none;
}

.info-row .label {
    font-weight: 600;
    color: #555;
    min-width: 180px;
}

.info-row .value {
    color: #333;
}

/* Sections */
.section {
    margin-bottom: 30px;
}

.section h4 {
    font-size: 18px;
    color: #0066cc;
    margin-bottom: 15px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e0e0e0;
}

/* Compliance Table */
.compliance-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.compliance-table thead {
    background: #0066cc;
    color: white;
}

.compliance-table th {
    padding: 12px;
    text-align: left;
    font-weight: 600;
    font-size: 14px;
}

.compliance-table td {
    padding: 12px;
    border-bottom: 1px solid #e0e0e0;
    font-size: 13px;
}

.compliance-table tbody tr:hover {
    background: #f8f9fa;
}

.numeral-col {
    font-weight: 600;
    color: #0066cc;
}

/* Badges */
.badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
}

.badge-cumple {
    background: #d4edda;
    color: #155724;
}

.badge-nocumple {
    background: #f8d7da;
    color: #721c24;
}

.badge-parcial {
    background: #fff3cd;
    color: #856404;
}

.badge-pendiente {
    background: #e2e3e5;
    color: #383d41;
}

/* Finding Cards */
.finding-card {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-left: 4px solid #ffc107;
    border-radius: 4px;
    padding: 15px;
    margin-bottom: 15px;
}

.finding-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 13px;
}

.finding-numeral {
    font-weight: 600;
    color: #0066cc;
}

.finding-date {
    color: #666;
}

.finding-text {
    color: #333;
    line-height: 1.5;
}

/* Signatures */
.signatures {
    margin-top: 40px;
    page-break-inside: avoid;
}

.signatures h4 {
    font-size: 18px;
    color: #0066cc;
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
    color: #0066cc;
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
  folio: { type: 'string', description: 'Folio del reporte (ej: VN-001/2026)' },
  fecha: { type: 'string', description: 'Fecha de generación del reporte' },
  generadoPor: { type: 'string', description: 'Nombre del usuario que generó el reporte' },
  numerales: { type: 'array', description: 'Array de objetos con información de numerales' },
  hallazgos: { type: 'array', description: 'Array de objetos con hallazgos y observaciones' },
  firmas: { type: 'array', description: 'Array de objetos con información de firmas' },
  qrCode: { type: 'string', description: 'URL del código QR para verificación' }
};

async function insertTemplate() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Desmarcar cualquier plantilla default existente del tipo 'verificacion_numerales'
    await connection.execute(
      'UPDATE report_templates SET is_default = false WHERE tipo = ?',
      ['verificacion_numerales']
    );

    // Insertar la nueva plantilla
    const [result] = await connection.execute(
      `INSERT INTO report_templates 
       (nombre, descripcion, tipo, html_template, css_styles, variables, is_default, activo, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        'Plantilla Profesional - Verificación de Numerales',
        'Plantilla profesional para reportes de verificación de cumplimiento de Numerales 7 y 8 de la NOM-035-STPS-2018. Incluye header con logo, información de empresa, tabla de cumplimiento, hallazgos, firmas y código QR.',
        'verificacion_numerales',
        htmlTemplate,
        cssStyles,
        JSON.stringify(variables),
        true, // is_default
        true  // activo
      ]
    );

    console.log('✅ Plantilla insertada exitosamente con ID:', result.insertId);
  } catch (error) {
    console.error('❌ Error al insertar plantilla:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

insertTemplate();
