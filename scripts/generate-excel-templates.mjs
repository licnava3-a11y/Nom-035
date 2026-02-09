import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const templatesDir = join(__dirname, '../client/public/templates');

// Plantilla de Departamentos
function generateDepartmentsTemplate() {
  const data = [
    ['Nombre', 'Descripción'],
    ['Recursos Humanos', 'Gestión de personal y nómina'],
    ['Tecnología', 'Desarrollo y soporte de sistemas'],
    ['Operaciones', 'Gestión de procesos operativos'],
    ['Ventas', 'Comercialización y atención a clientes'],
    ['Finanzas', 'Administración financiera y contabilidad']
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Establecer anchos de columna
  ws['!cols'] = [
    { wch: 25 }, // Nombre
    { wch: 50 }  // Descripción
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Departamentos');
  
  XLSX.writeFile(wb, join(templatesDir, 'departments_template.xlsx'));
  console.log('✅ Plantilla de Departamentos generada');
}

// Plantilla de Puestos
function generatePositionsTemplate() {
  const data = [
    ['Nombre del Puesto', 'Departamento', 'Nivel', 'Descripción'],
    ['Gerente de Recursos Humanos', 'Recursos Humanos', 'gerente', 'Responsable de la gestión integral del personal'],
    ['Desarrollador Full Stack', 'Tecnología', 'operativo', 'Desarrollo de aplicaciones web y móviles'],
    ['Analista de Finanzas', 'Finanzas', 'operativo', 'Análisis financiero y reportes contables'],
    ['Director de Operaciones', 'Operaciones', 'directivo', 'Dirección estratégica de operaciones'],
    ['Ejecutivo de Ventas', 'Ventas', 'operativo', 'Atención y seguimiento a clientes']
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Establecer anchos de columna
  ws['!cols'] = [
    { wch: 30 }, // Nombre del Puesto
    { wch: 25 }, // Departamento
    { wch: 15 }, // Nivel
    { wch: 50 }  // Descripción
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Puestos');
  
  // Agregar hoja de instrucciones
  const instructionsData = [
    ['INSTRUCCIONES PARA LLENAR LA PLANTILLA DE PUESTOS'],
    [''],
    ['Campo', 'Descripción', 'Valores Permitidos'],
    ['Nombre del Puesto', 'Título oficial del puesto de trabajo', 'Texto libre (máx. 100 caracteres)'],
    ['Departamento', 'Nombre exacto del departamento al que pertenece', 'Debe existir previamente en el sistema'],
    ['Nivel', 'Nivel jerárquico del puesto', 'operativo, gerente, directivo'],
    ['Descripción', 'Descripción detallada de responsabilidades', 'Texto libre (máx. 500 caracteres)'],
    [''],
    ['NOTAS IMPORTANTES:'],
    ['- El departamento debe existir previamente en el sistema o importarse primero'],
    ['- Los niveles válidos son: operativo, gerente, directivo (en minúsculas)'],
    ['- Todos los campos son obligatorios']
  ];
  
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 25 }, { wch: 50 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');
  
  XLSX.writeFile(wb, join(templatesDir, 'positions_template.xlsx'));
  console.log('✅ Plantilla de Puestos generada');
}

// Plantilla de Trabajadores
function generateEmployeesTemplate() {
  const data = [
    ['Nombre', 'Apellido Paterno', 'Apellido Materno', 'Email', 'Teléfono', 'CURP', 'Fecha de Nacimiento', 'Fecha de Ingreso', 'Departamento', 'Puesto', 'Activo'],
    ['Juan', 'García', 'López', 'juan.garcia@empresa.com', '6141234567', 'GALJ850315HCHPRN01', '1985-03-15', '2020-01-15', 'Recursos Humanos', 'Gerente de Recursos Humanos', 'true'],
    ['María', 'Martínez', 'Hernández', 'maria.martinez@empresa.com', '6147654321', 'MAHM900520MCHRRR02', '1990-05-20', '2021-06-01', 'Tecnología', 'Desarrollador Full Stack', 'true'],
    ['Carlos', 'Rodríguez', 'Sánchez', 'carlos.rodriguez@empresa.com', '6149876543', 'ROSC880710HCHDRR03', '1988-07-10', '2019-03-10', 'Finanzas', 'Analista de Finanzas', 'true'],
    ['Ana', 'López', 'Pérez', 'ana.lopez@empresa.com', '6142345678', 'LOPA920815MCHPRN04', '1992-08-15', '2022-02-20', 'Operaciones', 'Director de Operaciones', 'true'],
    ['Pedro', 'Hernández', 'González', 'pedro.hernandez@empresa.com', '6148765432', 'HEGP870925HCHRNR05', '1987-09-25', '2018-11-05', 'Ventas', 'Ejecutivo de Ventas', 'true']
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Establecer anchos de columna
  ws['!cols'] = [
    { wch: 15 }, // Nombre
    { wch: 18 }, // Apellido Paterno
    { wch: 18 }, // Apellido Materno
    { wch: 30 }, // Email
    { wch: 15 }, // Teléfono
    { wch: 20 }, // CURP
    { wch: 18 }, // Fecha de Nacimiento
    { wch: 18 }, // Fecha de Ingreso
    { wch: 25 }, // Departamento
    { wch: 30 }, // Puesto
    { wch: 10 }  // Activo
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Trabajadores');
  
  // Agregar hoja de instrucciones
  const instructionsData = [
    ['INSTRUCCIONES PARA LLENAR LA PLANTILLA DE TRABAJADORES'],
    [''],
    ['Campo', 'Descripción', 'Formato/Valores Permitidos'],
    ['Nombre', 'Nombre(s) del trabajador', 'Texto libre (obligatorio)'],
    ['Apellido Paterno', 'Apellido paterno del trabajador', 'Texto libre (obligatorio)'],
    ['Apellido Materno', 'Apellido materno del trabajador', 'Texto libre (opcional)'],
    ['Email', 'Correo electrónico corporativo', 'formato: usuario@dominio.com (obligatorio)'],
    ['Teléfono', 'Número telefónico de contacto', '10 dígitos (obligatorio)'],
    ['CURP', 'Clave Única de Registro de Población', '18 caracteres alfanuméricos (obligatorio, único)'],
    ['Fecha de Nacimiento', 'Fecha de nacimiento del trabajador', 'Formato: AAAA-MM-DD (obligatorio)'],
    ['Fecha de Ingreso', 'Fecha de ingreso a la empresa', 'Formato: AAAA-MM-DD (obligatorio)'],
    ['Departamento', 'Nombre exacto del departamento', 'Debe existir en el sistema (obligatorio)'],
    ['Puesto', 'Nombre exacto del puesto', 'Debe existir en el sistema (obligatorio)'],
    ['Activo', 'Estado del trabajador', 'true o false (obligatorio)'],
    [''],
    ['NOTAS IMPORTANTES:'],
    ['- El CURP debe ser válido y único (18 caracteres)'],
    ['- Si el CURP ya existe, se detectará como reingreso'],
    ['- El departamento y puesto deben existir previamente o importarse primero'],
    ['- Las fechas deben estar en formato AAAA-MM-DD (ejemplo: 2020-01-15)'],
    ['- El email debe ser único en el sistema'],
    ['- Todos los campos son obligatorios excepto Apellido Materno'],
    ['- Para trabajadores activos use "true", para inactivos use "false"']
  ];
  
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 25 }, { wch: 50 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');
  
  XLSX.writeFile(wb, join(templatesDir, 'employees_template.xlsx'));
  console.log('✅ Plantilla de Trabajadores generada');
}

// Ejecutar generación de plantillas
try {
  console.log('🔄 Generando plantillas Excel...');
  generateDepartmentsTemplate();
  generatePositionsTemplate();
  generateEmployeesTemplate();
  console.log('\n✅ Todas las plantillas fueron generadas exitosamente en client/public/templates/');
} catch (error) {
  console.error('❌ Error al generar plantillas:', error);
  process.exit(1);
}
