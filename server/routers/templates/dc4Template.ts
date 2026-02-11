/**
 * Plantilla HTML profesional para Formato DC-4 STPS
 * Lista de Constancias de Competencias o de Habilidades Laborales
 * 
 * Variables Handlebars disponibles:
 * - folio, uuid, reportTitle, reportPeriod, totalCertificates
 * - companyName, companyRfc, companyAddress, issueDate
 * - representativeName, representativeSignature
 * - certificates (array de certificados con: employeeName, employeeCurp, courseTitle, courseDuration, completionDate, grade, folio)
 */

export function getDC4Template(): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lista de Constancias DC-4 - {{folio}}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 10pt;
      line-height: 1.3;
      color: #000;
      background: #fff;
    }
    
    .container {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      padding: 12mm;
    }
    
    .header {
      background: #621132;
      color: #fff;
      padding: 12px 18px;
      margin-bottom: 18px;
      border-radius: 4px;
    }
    
    .header h1 {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .header h2 {
      font-size: 13pt;
      font-weight: normal;
      margin-bottom: 3px;
    }
    
    .header p {
      font-size: 9pt;
      opacity: 0.95;
    }
    
    .folio-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding: 8px;
      background: #f5f5f5;
      border-left: 4px solid #621132;
    }
    
    .folio-section .folio {
      font-size: 13pt;
      font-weight: bold;
      color: #621132;
    }
    
    .folio-section .date {
      font-size: 9pt;
      color: #666;
    }
    
    .section {
      margin-bottom: 15px;
    }
    
    .section-title {
      background: #e8e8e8;
      padding: 7px 10px;
      font-size: 11pt;
      font-weight: bold;
      color: #333;
      border-left: 4px solid #621132;
      margin-bottom: 8px;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    
    .data-table td {
      padding: 6px 8px;
      border: 1px solid #ddd;
      vertical-align: top;
    }
    
    .data-table td.label {
      background: #f9f9f9;
      font-weight: bold;
      width: 30%;
      color: #333;
      font-size: 9pt;
    }
    
    .data-table td.value {
      background: #fff;
      color: #000;
      font-size: 10pt;
    }
    
    .certificates-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      margin-bottom: 15px;
      font-size: 8pt;
    }
    
    .certificates-table th {
      background: #621132;
      color: #fff;
      padding: 8px 5px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #4a0d24;
    }
    
    .certificates-table td {
      padding: 6px 5px;
      border: 1px solid #ddd;
      vertical-align: middle;
    }
    
    .certificates-table tbody tr:nth-child(even) {
      background: #f9f9f9;
    }
    
    .certificates-table tbody tr:hover {
      background: #f0f8ff;
    }
    
    .certificates-table .row-number {
      text-align: center;
      font-weight: bold;
      color: #666;
      width: 30px;
    }
    
    .certificates-table .grade-cell {
      text-align: center;
      font-weight: bold;
    }
    
    .certificates-table .grade-pass {
      color: #28a745;
    }
    
    .certificates-table .grade-fail {
      color: #dc3545;
    }
    
    .summary-box {
      background: #f0f8ff;
      padding: 12px;
      border-radius: 4px;
      border: 2px solid #621132;
      margin-bottom: 15px;
      text-align: center;
    }
    
    .summary-box h3 {
      color: #621132;
      font-size: 12pt;
      margin-bottom: 8px;
    }
    
    .summary-box .total {
      font-size: 24pt;
      font-weight: bold;
      color: #621132;
    }
    
    .summary-box .period {
      font-size: 10pt;
      color: #666;
      margin-top: 5px;
    }
    
    .signature-box {
      text-align: center;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #fafafa;
      margin-top: 30px;
      margin-bottom: 15px;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }
    
    .signature-box .signature-line {
      border-top: 2px solid #000;
      margin: 50px 15px 8px 15px;
      padding-top: 6px;
    }
    
    .signature-box .signature-name {
      font-weight: bold;
      font-size: 10pt;
      color: #000;
      margin-bottom: 2px;
    }
    
    .signature-box .signature-role {
      font-size: 8pt;
      color: #666;
      font-style: italic;
    }
    
    .qr-section {
      text-align: center;
      margin-top: 20px;
      padding: 12px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    
    .qr-section p {
      font-size: 8pt;
      color: #666;
      margin-bottom: 6px;
    }
    
    .qr-section .uuid {
      font-family: 'Courier New', monospace;
      font-size: 9pt;
      color: #000;
      font-weight: bold;
      background: #fff;
      padding: 6px;
      border-radius: 3px;
      display: inline-block;
    }
    
    .footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 2px solid #621132;
      font-size: 7pt;
      color: #666;
      text-align: center;
    }
    
    @media print {
      .container {
        padding: 0;
      }
      
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .certificates-table {
        font-size: 7pt;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Encabezado -->
    <div class="header">
      <h1>Secretaría del Trabajo y Previsión Social</h1>
      <h2>Formato DC-4</h2>
      <p>Lista de Constancias de Competencias o de Habilidades Laborales</p>
    </div>
    
    <!-- Folio y Fecha -->
    <div class="folio-section">
      <div class="folio">Folio: {{folio}}</div>
      <div class="date">Fecha de emisión: {{issueDate}}</div>
    </div>
    
    <!-- Resumen -->
    <div class="summary-box">
      <h3>{{reportTitle}}</h3>
      <div class="total">{{totalCertificates}}</div>
      <div class="period">Constancias emitidas - {{reportPeriod}}</div>
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
    
    <!-- Tabla de Constancias -->
    <div class="section">
      <div class="section-title">Relación de Constancias Emitidas</div>
      <table class="certificates-table">
        <thead>
          <tr>
            <th class="row-number">#</th>
            <th>Nombre del Trabajador</th>
            <th>CURP</th>
            <th>Curso de Capacitación</th>
            <th style="width: 60px;">Duración (hrs)</th>
            <th style="width: 85px;">Fecha Término</th>
            <th style="width: 50px;">Calif.</th>
            <th style="width: 100px;">Folio</th>
          </tr>
        </thead>
        <tbody>
          {{#each certificates}}
          <tr>
            <td class="row-number">{{@index}}</td>
            <td>{{employeeName}}</td>
            <td>{{employeeCurp}}</td>
            <td>{{courseTitle}}</td>
            <td style="text-align: center;">{{courseDuration}}</td>
            <td style="text-align: center;">{{completionDate}}</td>
            <td class="grade-cell {{#if (gte grade 70)}}grade-pass{{else}}grade-fail{{/if}}">{{grade}}</td>
            <td style="font-size: 7pt;">{{folio}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>
    </div>
    
    <!-- Firma -->
    <div class="signature-box">
      <div class="signature-line">
        <div class="signature-name">{{representativeName}}</div>
        <div class="signature-role">Patrón o Representante Legal</div>
      </div>
    </div>
    
    <!-- Código QR y UUID -->
    <div class="qr-section">
      <p>Código de verificación único:</p>
      <div class="uuid">{{uuid}}</div>
      <p style="margin-top: 8px;">Este documento puede ser verificado en el sistema oficial de la STPS</p>
    </div>
    
    <!-- Pie de página -->
    <div class="footer">
      <p>Este documento es una lista oficial emitida conforme a la Ley Federal del Trabajo</p>
      <p>Secretaría del Trabajo y Previsión Social - Sistema de Capacitación NOM-035 STPS 2018</p>
    </div>
  </div>
</body>
</html>
  `;
}
