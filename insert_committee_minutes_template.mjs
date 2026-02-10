import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Minuta de Reunión - Comité NOM-035</title>
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
            <div class="qr-header">
                <img src="{{qrCode}}" alt="Código QR" class="qr-code-header">
                <p class="qr-label">Verificar</p>
            </div>
        </header>

        <!-- Título del Documento -->
        <div class="document-title">
            <h2>MINUTA DE REUNIÓN</h2>
            <h3>{{tipoReunion}}</h3>
            <p class="subtitle">Comité de Atención de Factores de Riesgo Psicosocial</p>
        </div>

        <!-- Información de la Reunión -->
        <div class="meeting-info">
            <div class="info-row">
                <div class="info-box">
                    <span class="info-label">Número de Sesión:</span>
                    <span class="info-value">{{numeroSesion}}</span>
                </div>
                <div class="info-box">
                    <span class="info-label">Folio:</span>
                    <span class="info-value">{{folio}}</span>
                </div>
            </div>
            <div class="info-row">
                <div class="info-box">
                    <span class="info-label">Fecha:</span>
                    <span class="info-value">{{fecha}}</span>
                </div>
                <div class="info-box">
                    <span class="info-label">Hora:</span>
                    <span class="info-value">{{hora}}</span>
                </div>
            </div>
            <div class="info-row full-width">
                <div class="info-box">
                    <span class="info-label">Lugar:</span>
                    <span class="info-value">{{lugar}}</span>
                </div>
            </div>
        </div>

        <!-- Asistentes -->
        <section class="section">
            <h4>Asistentes</h4>
            <table class="attendees-table">
                <thead>
                    <tr>
                        <th>Nombre Completo</th>
                        <th>Cargo</th>
                        <th>Rol en Comité</th>
                        <th>Asistencia</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each asistentes}}
                    <tr>
                        <td class="attendee-name">{{this.nombre}}</td>
                        <td>{{this.cargo}}</td>
                        <td>{{this.rolComite}}</td>
                        <td class="attendance-status">
                            <span class="status-badge status-{{this.asistenciaClass}}">{{this.asistencia}}</span>
                        </td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
        </section>

        <!-- Orden del Día -->
        <section class="section">
            <h4>Orden del Día</h4>
            <ol class="agenda-list">
                {{#each ordenDia}}
                <li class="agenda-item">
                    <strong>{{this.tema}}</strong>
                    {{#if this.descripcion}}
                    <p class="agenda-description">{{this.descripcion}}</p>
                    {{/if}}
                </li>
                {{/each}}
            </ol>
        </section>

        <!-- Desarrollo de la Reunión -->
        {{#if desarrollo}}
        <section class="section">
            <h4>Desarrollo de la Reunión</h4>
            <div class="development-content">
                <p>{{desarrollo}}</p>
            </div>
        </section>
        {{/if}}

        <!-- Acuerdos y Compromisos -->
        <section class="section">
            <h4>Acuerdos y Compromisos</h4>
            <table class="agreements-table">
                <thead>
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th style="width: 45%;">Acuerdo</th>
                        <th style="width: 25%;">Responsable</th>
                        <th style="width: 15%;">Fecha Compromiso</th>
                        <th style="width: 10%;">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each acuerdos}}
                    <tr>
                        <td class="agreement-number">{{this.numero}}</td>
                        <td class="agreement-text">{{this.descripcion}}</td>
                        <td>{{this.responsable}}</td>
                        <td class="date-cell">{{this.fechaCompromiso}}</td>
                        <td>
                            <span class="status-badge status-{{this.estadoClass}}">{{this.estado}}</span>
                        </td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
        </section>

        <!-- Seguimiento de Acuerdos Anteriores -->
        {{#if seguimientoAcuerdos}}
        <section class="section">
            <h4>Seguimiento de Acuerdos de Sesión Anterior</h4>
            <table class="follow-up-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">Acuerdo Anterior</th>
                        <th style="width: 25%;">Responsable</th>
                        <th style="width: 25%;">Estatus de Cumplimiento</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each seguimientoAcuerdos}}
                    <tr>
                        <td class="agreement-text">{{this.acuerdo}}</td>
                        <td>{{this.responsable}}</td>
                        <td>
                            <span class="status-badge status-{{this.estatusClass}}">{{this.estatus}}</span>
                        </td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
        </section>
        {{/if}}

        <!-- Observaciones -->
        {{#if observaciones}}
        <section class="section">
            <h4>Observaciones</h4>
            <div class="observations-content">
                <p>{{observaciones}}</p>
            </div>
        </section>
        {{/if}}

        <!-- Documentación de Respaldo -->
        {{#if documentacionRespaldo}}
        <section class="section">
            <h4>Documentación de Respaldo</h4>
            <div class="backup-docs">
                {{#if documentacionRespaldo.objetivo}}
                <div class="backup-item">
                    <strong>Objetivo de la Actividad:</strong>
                    <p>{{documentacionRespaldo.objetivo}}</p>
                </div>
                {{/if}}
                {{#if documentacionRespaldo.resultados}}
                <div class="backup-item">
                    <strong>Resultados:</strong>
                    <p>{{documentacionRespaldo.resultados}}</p>
                </div>
                {{/if}}
                {{#if documentacionRespaldo.fotoGrupal}}
                <div class="backup-item">
                    <strong>Evidencia Fotográfica:</strong>
                    <img src="{{documentacionRespaldo.fotoGrupal}}" alt="Foto Grupal" class="group-photo">
                </div>
                {{/if}}
            </div>
        </section>
        {{/if}}

        <!-- Foto de Representantes (Validación) -->
        {{#if fotoRepresentantes}}
        <section class="section representatives-section">
            <h4>Validación de Representantes</h4>
            <div class="representatives-photo">
                <img src="{{fotoRepresentantes}}" alt="Representantes" class="representatives-image">
                <p class="photo-caption">Representantes autorizados para validar este documento</p>
            </div>
        </section>
        {{/if}}

        <!-- Firmas de Autorización -->
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
                    {{#if this.rolComite}}
                    <p class="signature-role">{{this.rolComite}}</p>
                    {{/if}}
                </div>
                {{/each}}
            </div>
        </section>

        <!-- Footer -->
        <footer class="footer">
            <div class="footer-content">
                <div class="footer-left">
                    <p class="footer-text">Documento generado electrónicamente</p>
                    <p class="footer-text">Sistema de Gestión NOM-035-STPS-2018</p>
                </div>
                <div class="footer-center">
                    <p class="folio-footer">{{folio}}</p>
                    <p class="version-footer">{{versionFormato}}</p>
                </div>
                <div class="footer-right">
                    <p class="footer-text">Fecha de Generación:</p>
                    <p class="footer-text">{{fechaGeneracion}}</p>
                </div>
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
    padding: 15mm;
}

/* Header */
.header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 15px;
    border-bottom: 3px solid #1a237e;
    margin-bottom: 25px;
}

.logo-section {
    flex-shrink: 0;
}

.logo {
    max-width: 100px;
    max-height: 70px;
    object-fit: contain;
}

.company-info {
    flex: 1;
    padding: 0 20px;
}

.company-info h1 {
    font-size: 20px;
    color: #1a237e;
    margin-bottom: 5px;
}

.company-info .rfc {
    font-size: 13px;
    color: #666;
}

.qr-header {
    text-align: center;
    flex-shrink: 0;
}

.qr-code-header {
    width: 60px;
    height: 60px;
}

.qr-label {
    font-size: 9px;
    color: #666;
    margin-top: 3px;
}

/* Document Title */
.document-title {
    text-align: center;
    margin-bottom: 25px;
    padding: 15px;
    background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
    color: white;
    border-radius: 6px;
}

.document-title h2 {
    font-size: 20px;
    margin-bottom: 6px;
    letter-spacing: 1px;
}

.document-title h3 {
    font-size: 16px;
    margin-bottom: 4px;
    font-weight: 500;
}

.document-title .subtitle {
    font-size: 13px;
    opacity: 0.9;
}

/* Meeting Info */
.meeting-info {
    background: #f5f5f5;
    padding: 15px;
    border-radius: 6px;
    margin-bottom: 25px;
    border-left: 4px solid #1a237e;
}

.info-row {
    display: flex;
    gap: 15px;
    margin-bottom: 10px;
}

.info-row:last-child {
    margin-bottom: 0;
}

.info-row.full-width .info-box {
    flex: 1;
}

.info-box {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.info-label {
    font-weight: 600;
    color: #555;
    font-size: 11px;
    margin-bottom: 3px;
}

.info-value {
    color: #1a237e;
    font-size: 14px;
    font-weight: 600;
}

/* Sections */
.section {
    margin-bottom: 25px;
    page-break-inside: avoid;
}

.section h4 {
    font-size: 16px;
    color: #1a237e;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 2px solid #e0e0e0;
}

/* Attendees Table */
.attendees-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.attendees-table thead {
    background: #1a237e;
    color: white;
}

.attendees-table th {
    padding: 10px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
}

.attendees-table td {
    padding: 10px;
    border-bottom: 1px solid #e0e0e0;
    font-size: 12px;
}

.attendees-table tbody tr:hover {
    background: #f8f9fa;
}

.attendee-name {
    font-weight: 600;
    color: #1a237e;
}

.attendance-status {
    text-align: center;
}

/* Status Badges */
.status-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
}

.status-presente {
    background: #d4edda;
    color: #155724;
}

.status-ausente {
    background: #f8d7da;
    color: #721c24;
}

.status-justificado {
    background: #fff3cd;
    color: #856404;
}

.status-pendiente {
    background: #fff3cd;
    color: #856404;
}

.status-proceso {
    background: #d1ecf1;
    color: #0c5460;
}

.status-completado {
    background: #d4edda;
    color: #155724;
}

.status-cancelado {
    background: #f8d7da;
    color: #721c24;
}

/* Agenda List */
.agenda-list {
    padding-left: 25px;
    margin-top: 10px;
}

.agenda-item {
    margin-bottom: 12px;
    line-height: 1.6;
}

.agenda-item strong {
    color: #1a237e;
    font-size: 13px;
}

.agenda-description {
    margin-top: 5px;
    color: #666;
    font-size: 12px;
    line-height: 1.5;
}

/* Development Content */
.development-content {
    padding: 15px;
    background: #f8f9fa;
    border-radius: 6px;
    border-left: 4px solid #1a237e;
}

.development-content p {
    color: #555;
    font-size: 13px;
    line-height: 1.7;
}

/* Agreements Table */
.agreements-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.agreements-table thead {
    background: #1a237e;
    color: white;
}

.agreements-table th {
    padding: 10px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
}

.agreements-table td {
    padding: 10px;
    border-bottom: 1px solid #e0e0e0;
    font-size: 12px;
    vertical-align: top;
}

.agreements-table tbody tr:hover {
    background: #f8f9fa;
}

.agreement-number {
    text-align: center;
    font-weight: 600;
    color: #1a237e;
}

.agreement-text {
    line-height: 1.6;
}

.date-cell {
    text-align: center;
    white-space: nowrap;
}

/* Follow-up Table */
.follow-up-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.follow-up-table thead {
    background: #283593;
    color: white;
}

.follow-up-table th {
    padding: 10px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
}

.follow-up-table td {
    padding: 10px;
    border-bottom: 1px solid #e0e0e0;
    font-size: 12px;
    vertical-align: top;
}

.follow-up-table tbody tr:hover {
    background: #f8f9fa;
}

/* Observations */
.observations-content {
    padding: 15px;
    background: #fff3cd;
    border-radius: 6px;
    border-left: 4px solid #ffc107;
}

.observations-content p {
    color: #555;
    font-size: 13px;
    line-height: 1.7;
}

/* Backup Documentation */
.backup-docs {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.backup-item {
    padding: 12px;
    background: #f8f9fa;
    border-radius: 6px;
    border-left: 4px solid #1a237e;
}

.backup-item strong {
    display: block;
    color: #1a237e;
    margin-bottom: 6px;
    font-size: 13px;
}

.backup-item p {
    color: #555;
    font-size: 12px;
    line-height: 1.6;
}

.group-photo {
    max-width: 100%;
    height: auto;
    margin-top: 10px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

/* Representatives Section */
.representatives-section {
    page-break-inside: avoid;
}

.representatives-photo {
    text-align: center;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 6px;
}

.representatives-image {
    max-width: 80%;
    height: auto;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    margin-bottom: 15px;
}

.photo-caption {
    color: #666;
    font-size: 13px;
    font-style: italic;
}

/* Signatures */
.signatures {
    margin-top: 35px;
    page-break-inside: avoid;
}

.signatures h4 {
    font-size: 16px;
    color: #1a237e;
    margin-bottom: 20px;
    text-align: center;
}

.signature-grid {
    display: flex;
    justify-content: space-around;
    gap: 25px;
    margin-top: 25px;
}

.signature-box {
    text-align: center;
    flex: 1;
}

.signature-image {
    max-width: 110px;
    max-height: 55px;
    object-fit: contain;
    margin-bottom: 8px;
}

.signature-line {
    width: 100%;
    height: 1px;
    background: #333;
    margin: 15px 0 8px 0;
}

.signature-name {
    font-weight: 600;
    color: #333;
    margin-bottom: 4px;
    font-size: 13px;
}

.signature-title {
    font-size: 12px;
    color: #666;
    margin-bottom: 3px;
}

.signature-role {
    font-size: 11px;
    color: #1a237e;
    font-weight: 600;
}

/* Footer */
.footer {
    margin-top: 35px;
    padding-top: 15px;
    border-top: 2px solid #e0e0e0;
}

.footer-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    font-size: 11px;
}

.footer-left,
.footer-center,
.footer-right {
    flex: 1;
}

.footer-center {
    text-align: center;
}

.footer-right {
    text-align: right;
}

.footer-text {
    color: #666;
    margin-bottom: 3px;
}

.folio-footer {
    font-weight: 600;
    color: #1a237e;
    font-size: 13px;
    margin-bottom: 3px;
}

.version-footer {
    font-size: 10px;
    color: #999;
}

/* Print Styles */
@media print {
    body {
        margin: 0;
        padding: 0;
    }
    
    .container {
        max-width: 100%;
        padding: 12mm;
    }
    
    .section {
        page-break-inside: avoid;
    }
    
    .signatures {
        page-break-before: auto;
    }
}`;

const variables = {
  logo: { type: 'string', description: 'URL del logo de la empresa' },
  razonSocial: { type: 'string', description: 'Razón social de la empresa' },
  rfc: { type: 'string', description: 'RFC de la empresa' },
  qrCode: { type: 'string', description: 'URL del código QR para verificación' },
  tipoReunion: { type: 'string', description: 'Tipo de reunión (Reunión, Junta de trabajo, Taller, Capacitación, Seminario, Foro)' },
  numeroSesion: { type: 'string', description: 'Número de sesión del comité' },
  folio: { type: 'string', description: 'Folio del documento' },
  fecha: { type: 'string', description: 'Fecha de la reunión' },
  hora: { type: 'string', description: 'Hora de inicio de la reunión' },
  lugar: { type: 'string', description: 'Lugar donde se realizó la reunión' },
  asistentes: { type: 'array', description: 'Array de asistentes con nombre, cargo, rolComite, asistencia, asistenciaClass' },
  ordenDia: { type: 'array', description: 'Array de temas del orden del día con tema y descripción opcional' },
  desarrollo: { type: 'string', description: 'Desarrollo detallado de la reunión (opcional)' },
  acuerdos: { type: 'array', description: 'Array de acuerdos con numero, descripcion, responsable, fechaCompromiso, estado, estadoClass' },
  seguimientoAcuerdos: { type: 'array', description: 'Array de seguimiento de acuerdos anteriores con acuerdo, responsable, estatus, estatusClass (opcional)' },
  observaciones: { type: 'string', description: 'Observaciones adicionales (opcional)' },
  documentacionRespaldo: { type: 'object', description: 'Objeto con objetivo, resultados, fotoGrupal (opcional)' },
  fotoRepresentantes: { type: 'string', description: 'URL de foto con los dos representantes que autorizan (opcional)' },
  firmas: { type: 'array', description: 'Array de firmas con nombre, cargo, rolComite, firmaUrl' },
  versionFormato: { type: 'string', description: 'Versión del formato del documento' },
  fechaGeneracion: { type: 'string', description: 'Fecha de generación del documento' }
};

async function insertTemplate() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Desmarcar cualquier plantilla default existente del tipo 'minuta_comite'
    await connection.execute(
      'UPDATE report_templates SET is_default = false WHERE tipo = ?',
      ['minuta_comite']
    );

    // Insertar la nueva plantilla
    const [result] = await connection.execute(
      `INSERT INTO report_templates 
       (nombre, descripcion, tipo, html_template, css_styles, variables, is_default, activo, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        'Plantilla Profesional - Minuta de Reunión Comité NOM-035',
        'Plantilla profesional para minutas de reunión del Comité de Atención de Factores de Riesgo Psicosocial. Incluye asistentes, orden del día, acuerdos con responsables y fechas, seguimiento de acuerdos anteriores, documentación de respaldo, foto de representantes y firmas digitales. Cumple con NOM-151 mediante código QR único y foliado con nomenclatura personalizable.',
        'minuta_comite',
        htmlTemplate,
        cssStyles,
        JSON.stringify(variables),
        true, // is_default
        true  // activo
      ]
    );

    console.log('✅ Plantilla de Minuta de Comité insertada exitosamente con ID:', result.insertId);
  } catch (error) {
    console.error('❌ Error al insertar plantilla:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

insertTemplate();
