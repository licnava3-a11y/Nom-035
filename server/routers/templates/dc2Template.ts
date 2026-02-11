/**
 * Plantilla HTML profesional para Formato DC-2 STPS
 * Constancia de Competencias o de Habilidades Laborales
 * 
 * Variables Handlebars disponibles:
 * - folio, uuid, employeeName, employeeCurp, employeeRfc
 * - courseTitle, courseDuration, startDate, endDate, grade
 * - instructorName, instructorSignature, representativeName, representativeSignature
 * - companyName, companyRfc, companyAddress, issueDate
 */

export function getDC2Template(): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Constancia de Competencias DC-2 - {{folio}}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }
    
    .container {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      padding: 15mm;
    }
    
    .header {
      background: #621132;
      color: #fff;
      padding: 15px 20px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    
    .header h1 {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .header h2 {
      font-size: 14pt;
      font-weight: normal;
      margin-bottom: 3px;
    }
    
    .header p {
      font-size: 10pt;
      opacity: 0.95;
    }
    
    .folio-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 10px;
      background: #f5f5f5;
      border-left: 4px solid #621132;
    }
    
    .folio-section .folio {
      font-size: 14pt;
      font-weight: bold;
      color: #621132;
    }
    
    .folio-section .date {
      font-size: 10pt;
      color: #666;
    }
    
    .section {
      margin-bottom: 20px;
    }
    
    .section-title {
      background: #e8e8e8;
      padding: 8px 12px;
      font-size: 12pt;
      font-weight: bold;
      color: #333;
      border-left: 4px solid #621132;
      margin-bottom: 10px;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    
    .data-table td {
      padding: 8px 10px;
      border: 1px solid #ddd;
      vertical-align: top;
    }
    
    .data-table td.label {
      background: #f9f9f9;
      font-weight: bold;
      width: 35%;
      color: #333;
    }
    
    .data-table td.value {
      background: #fff;
      color: #000;
    }
    
    .course-info {
      background: #f0f8ff;
      padding: 15px;
      border-radius: 4px;
      border: 2px solid #621132;
      margin-bottom: 20px;
    }
    
    .course-info h3 {
      color: #621132;
      font-size: 13pt;
      margin-bottom: 10px;
      text-align: center;
    }
    
    .course-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    
    .course-detail-item {
      padding: 8px;
      background: #fff;
      border-radius: 3px;
    }
    
    .course-detail-item strong {
      display: block;
      color: #621132;
      font-size: 9pt;
      margin-bottom: 3px;
    }
    
    .course-detail-item span {
      display: block;
      font-size: 11pt;
      color: #000;
    }
    
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 40px;
      margin-bottom: 20px;
    }
    
    .signature-box {
      text-align: center;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #fafafa;
    }
    
    .signature-box .signature-line {
      border-top: 2px solid #000;
      margin: 60px 20px 10px 20px;
      padding-top: 8px;
    }
    
    .signature-box .signature-name {
      font-weight: bold;
      font-size: 11pt;
      color: #000;
      margin-bottom: 3px;
    }
    
    .signature-box .signature-role {
      font-size: 9pt;
      color: #666;
      font-style: italic;
    }
    
    .qr-section {
      text-align: center;
      margin-top: 30px;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    
    .qr-section p {
      font-size: 9pt;
      color: #666;
      margin-bottom: 8px;
    }
    
    .qr-section .uuid {
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      color: #000;
      font-weight: bold;
      background: #fff;
      padding: 8px;
      border-radius: 3px;
      display: inline-block;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #621132;
      font-size: 8pt;
      color: #666;
      text-align: center;
    }
    
    .grade-badge {
      display: inline-block;
      background: #28a745;
      color: #fff;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12pt;
      font-weight: bold;
    }
    
    @media print {
      .container {
        padding: 0;
      }
      
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Encabezado -->
    <div class="header">
      <h1>Secretaría del Trabajo y Previsión Social</h1>
      <h2>Formato DC-2</h2>
      <p>Constancia de Competencias o de Habilidades Laborales</p>
    </div>
    
    <!-- Folio y Fecha -->
    <div class="folio-section">
      <div class="folio">Folio: {{folio}}</div>
      <div class="date">Fecha de emisión: {{issueDate}}</div>
    </div>
    
    <!-- Datos del Trabajador -->
    <div class="section">
      <div class="section-title">Datos del Trabajador</div>
      <table class="data-table">
        <tr>
          <td class="label">Nombre completo:</td>
          <td class="value">{{employeeName}}</td>
        </tr>
        <tr>
          <td class="label">CURP:</td>
          <td class="value">{{employeeCurp}}</td>
        </tr>
        <tr>
          <td class="label">RFC:</td>
          <td class="value">{{employeeRfc}}</td>
        </tr>
      </table>
    </div>
    
    <!-- Datos de la Empresa -->
    <div class="section">
      <div class="section-title">Datos de la Empresa</div>
      <table class="data-table">
        <tr>
          <td class="label">Razón Social:</td>
          <td class="value">{{companyName}}</td>
        </tr>
        <tr>
          <td class="label">RFC:</td>
          <td class="value">{{companyRfc}}</td>
        </tr>
        <tr>
          <td class="label">Dirección:</td>
          <td class="value">{{companyAddress}}</td>
        </tr>
      </table>
    </div>
    
    <!-- Información del Curso -->
    <div class="course-info">
      <h3>{{courseTitle}}</h3>
      <div class="course-details">
        <div class="course-detail-item">
          <strong>Duración del curso:</strong>
          <span>{{courseDuration}} horas</span>
        </div>
        <div class="course-detail-item">
          <strong>Calificación obtenida:</strong>
          <span><span class="grade-badge">{{grade}} / 100</span></span>
        </div>
        <div class="course-detail-item">
          <strong>Fecha de inicio:</strong>
          <span>{{startDate}}</span>
        </div>
        <div class="course-detail-item">
          <strong>Fecha de término:</strong>
          <span>{{endDate}}</span>
        </div>
      </div>
    </div>
    
    <!-- Firmas -->
    <div class="signatures">
      <div class="signature-box">
        <div class="signature-line">
          <div class="signature-name">{{instructorName}}</div>
          <div class="signature-role">Instructor o Tutor</div>
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-line">
          <div class="signature-name">{{representativeName}}</div>
          <div class="signature-role">Patrón o Representante Legal</div>
        </div>
      </div>
    </div>
    
    <!-- Código QR y UUID -->
    <div class="qr-section">
      <p>Código de verificación único:</p>
      <div class="uuid">{{uuid}}</div>
      <p style="margin-top: 10px;">Este documento puede ser verificado en el sistema oficial de la STPS</p>
    </div>
    
    <!-- Pie de página -->
    <div class="footer">
      <p>Este documento es una constancia oficial emitida conforme a la Ley Federal del Trabajo</p>
      <p>Secretaría del Trabajo y Previsión Social - Sistema de Capacitación NOM-035 STPS 2018</p>
    </div>
  </div>
</body>
</html>
  `;
}
