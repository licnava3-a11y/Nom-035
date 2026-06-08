/**
 * Script: Generar plantilla DC-3 de prueba con 10 registros reales
 * Uso: node scripts/generate-dc3-test.mjs
 */
import * as XLSX from "xlsx";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATOS_PRUEBA = [
  ["GARCÍA LÓPEZ JUAN CARLOS","GALJ850101HDFXXX00","08.2","Administración","Analista Administrativo","INDUSTRIAS MONTERREY S.A. DE C.V.","IMO850101AAA","Prevención de Factores de Riesgo Psicosocial NOM-035-STPS-2018","16","2025-01-15","2025-01-16","6000","Seguridad","Consultoría NOM-035 S.C.","LIC. PEDRO MARTÍNEZ SÁNCHEZ","ING. ROBERTO FLORES HERNÁNDEZ","","issued","DC3-0001/2025",""],
  ["RODRÍGUEZ PÉREZ ANA LAURA","ROPA900215MDFXXX01","09.1","Servicios médicos","Enfermera","INDUSTRIAS MONTERREY S.A. DE C.V.","IMO850101AAA","Primeros Auxilios y Manejo de Emergencias","8","2025-02-10","2025-02-10","6000","Seguridad","Cruz Roja Mexicana","DR. CARLOS MENDOZA RUIZ","ING. ROBERTO FLORES HERNÁNDEZ","MARÍA ELENA TORRES VEGA","issued","DC3-0002/2025",""],
  ["HERNÁNDEZ MORALES LUIS ALBERTO","HEML920730HDFXXX02","04.4","Informática","Técnico en Sistemas","INDUSTRIAS MONTERREY S.A. DE C.V.","IMO850101AAA","Uso de Tecnologías de la Información para la Productividad","24","2025-03-01","2025-03-03","8000","Uso de tecnologías de la información y comunicación","Instituto de Capacitación Tecnológica","ING. SOFÍA RAMÍREZ LUNA","ING. ROBERTO FLORES HERNÁNDEZ","","draft","","Pendiente de firma del instructor"],
  ["MARTÍNEZ SÁNCHEZ CLAUDIA ELENA","MASC880520MDFXXX03","07.1","Comercio","Ejecutiva de Ventas","COMERCIALIZADORA DEL NORTE S.A.","CNO880520BBB","Técnicas de Negociación y Ventas Efectivas","12","2025-04-07","2025-04-08","2000","Calidad","Centro de Capacitación Empresarial A.C.","LIC. DIANA FUENTES CASTILLO","C.P. ARTURO VEGA MORALES","","issued","DC3-0003/2025",""],
  ["LÓPEZ RAMÍREZ MIGUEL ÁNGEL","LORM750312HDFXXX04","03.4","Instalación y mantenimiento","Técnico de Mantenimiento","MANUFACTURA INDUSTRIAL S.A. DE C.V.","MIN750312CCC","Mantenimiento Preventivo de Maquinaria Industrial","40","2025-05-05","2025-05-09","3000","Productividad","CECATI No. 15","ING. FRANCISCO JIMÉNEZ OLVERA","ING. PATRICIA LUNA ESPINOZA","JORGE ALBERTO REYES CAMPOS","issued","DC3-0004/2025",""],
  ["TORRES VEGA KARLA PATRICIA","TOVK950628MDFXXX05","10.5","Publicidad, propaganda y relaciones públicas","Diseñadora Gráfica","AGENCIA CREATIVA DIGITAL S.C.","ACD950628DDD","Diseño UX/UI para Aplicaciones Móviles","20","2025-06-02","2025-06-04","8000","Uso de tecnologías de la información y comunicación","Escuela de Diseño Digital A.C.","DIS. ALEJANDRA MORENO SILVA","LIC. SAMUEL ORTEGA PEÑA","","issued","DC3-0005/2025",""],
  ["FLORES HERNÁNDEZ ROBERTO CARLOS","FOHR800905HDFXXX06","06.2","Autotransporte","Operador de Transporte","LOGÍSTICA NACIONAL S.A. DE C.V.","LNA800905EEE","Manejo Defensivo y Seguridad Vial","8","2025-07-14","2025-07-14","6000","Seguridad","Secretaría de Comunicaciones y Transportes","ING. HÉCTOR SALINAS MORA","LIC. VERÓNICA CASTILLO RÍOS","","issued","DC3-0006/2025",""],
  ["MENDOZA RUIZ DIANA SOFÍA","MERD970415MDFXXX07","11.2","Enseñanza","Instructora de Capacitación","GRUPO EDUCATIVO NACIONAL S.C.","GEN970415FFF","Metodología de Capacitación por Competencias","32","2025-08-04","2025-08-07","1000","Administración","CONOCER — Consejo Nacional de Normalización","MTRA. LUCÍA VARGAS ESPINOZA","DR. MANUEL RÍOS FUENTES","PROF. ERNESTO CAMPOS LUNA","issued","DC3-0007/2025",""],
  ["JIMÉNEZ OLVERA FRANCISCO JAVIER","JIOF830622HDFXXX08","05.3","Alimentos y bebidas","Supervisor de Producción","ALIMENTOS DEL BAJÍO S.A. DE C.V.","ABA830622GGG","Buenas Prácticas de Manufactura en Industria Alimentaria","16","2025-09-15","2025-09-16","6000","Seguridad","COFEPRIS","Q.F.B. ADRIANA MORALES SOTO","ING. BERNARDO ESTRADA VILLA","","issued","DC3-0008/2025","Certificado con vigencia de 2 años"],
  ["CASTILLO RÍOS VERÓNICA ISABEL","CARV910810MDFXXX09","08.1","Bolsa, banca y seguros","Analista Financiera","SERVICIOS FINANCIEROS INTEGRALES S.A.","SFI910810HHH","Prevención de Lavado de Dinero y Financiamiento al Terrorismo","8","2025-10-20","2025-10-20","1000","Administración","Comisión Nacional Bancaria y de Valores (CNBV)","LIC. GABRIEL TORRES MEDINA","C.P. ROSA ELENA GUTIÉRREZ PONCE","","issued","DC3-0009/2025",""],
];

const HEADERS = [
  "Nombre del Trabajador *\n(Apellido paterno, apellido materno y nombre(s))",
  "CURP\n(Clave Única de Registro de Población)",
  "Clave CNO\n(Catálogo Nacional de Ocupaciones)",
  "Descripción Ocupación CNO",
  "Puesto\n(Dato no obligatorio)",
  "Nombre o Razón Social Empresa *\n(Persona física: apellidos y nombre(s))",
  "RFC Empresa\n(Con homoclave SHCP)",
  "Nombre del Curso *",
  "Duración\n(horas)",
  "Fecha Inicio\n(YYYY-MM-DD)",
  "Fecha Fin\n(YYYY-MM-DD)",
  "Clave Área Temática\n(Ver hoja Áreas Temáticas)",
  "Descripción Área Temática",
  "Nombre del Agente Capacitador o STPS",
  "Instructor o Tutor\n(Nombre)",
  "Patrón o Representante Legal *\n(Nombre)",
  "Representante de los Trabajadores\n(Solo para empresas con más de 50 trabajadores)",
  "Estado\n(draft / issued / cancelled)",
  "Folio\n(Auto-generado al emitir)",
  "Notas internas",
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...DATOS_PRUEBA]);
ws["!cols"] = [
  { wch: 40 }, { wch: 22 }, { wch: 12 }, { wch: 38 }, { wch: 25 },
  { wch: 40 }, { wch: 18 }, { wch: 55 }, { wch: 12 }, { wch: 14 },
  { wch: 14 }, { wch: 12 }, { wch: 40 }, { wch: 40 }, { wch: 35 },
  { wch: 35 }, { wch: 35 }, { wch: 12 }, { wch: 18 }, { wch: 30 },
];
XLSX.utils.book_append_sheet(wb, ws, "DC-3 Plantilla");

const outPath = resolve(__dirname, "../dc3_prueba_10_registros.xlsx");
writeFileSync(outPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`✅ Archivo generado: ${outPath}`);
console.log(`   Registros: ${DATOS_PRUEBA.length}`);
console.log(`   Columnas: ${HEADERS.length}`);
