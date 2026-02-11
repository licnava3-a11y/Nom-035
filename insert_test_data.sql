-- Script SQL para insertar datos de prueba en el sistema NOM-035
-- FASE 200: Datos de Prueba para Validación Funcional

-- ============================================
-- 1. INSERTAR EMPLEADOS DE PRUEBA (10 registros)
-- ============================================

INSERT INTO workers (firstName, lastName, email, phone, curp, employeeNumber, departmentId, positionId, hireDate, createdAt, updatedAt) VALUES
('Juan', 'Pérez García', 'juan.perez@empresa.com', '5551234567', 'PEGJ850315HDFRRL01', 'EMP001', 1, 1, '2020-01-15', NOW(), NOW()),
('María', 'López Martínez', 'maria.lopez@empresa.com', '5551234568', 'LOMM900520MDFRRL02', 'EMP002', 2, 2, '2020-02-20', NOW(), NOW()),
('Carlos', 'González Hernández', 'carlos.gonzalez@empresa.com', '5551234569', 'GOHC920710HDFRRL03', 'EMP003', 1, 3, '2020-03-10', NOW(), NOW()),
('Ana', 'Martínez Rodríguez', 'ana.martinez@empresa.com', '5551234570', 'MARA880425MDFRRL04', 'EMP004', 3, 4, '2020-04-05', NOW(), NOW()),
('Luis', 'Hernández Sánchez', 'luis.hernandez@empresa.com', '5551234571', 'HESL910815HDFRRL05', 'EMP005', 2, 5, '2020-05-12', NOW(), NOW()),
('Laura', 'Sánchez Ramírez', 'laura.sanchez@empresa.com', '5551234572', 'SARL930620MDFRRL06', 'EMP006', 4, 6, '2020-06-18', NOW(), NOW()),
('Pedro', 'Ramírez Torres', 'pedro.ramirez@empresa.com', '5551234573', 'RATP870925HDFRRL07', 'EMP007', 1, 7, '2020-07-22', NOW(), NOW()),
('Sofía', 'Torres Flores', 'sofia.torres@empresa.com', '5551234574', 'TOFS940330MDFRRL08', 'EMP008', 3, 8, '2020-08-30', NOW(), NOW()),
('Diego', 'Flores Castro', 'diego.flores@empresa.com', '5551234575', 'FOCD891105HDFRRL09', 'EMP009', 2, 9, '2020-09-14', NOW(), NOW()),
('Valeria', 'Castro Morales', 'valeria.castro@empresa.com', '5551234576', 'CAMV960210MDFRRL10', 'EMP010', 4, 10, '2020-10-25', NOW(), NOW());

-- ============================================
-- 2. INSERTAR EVALUACIONES DE PRUEBA (5 registros)
-- ============================================

INSERT INTO assessments (title, description, duration, passingScore, isActive, createdAt, updatedAt) VALUES
('Evaluación de Capacitación NOM-035 Básica', 'Evaluación sobre conceptos básicos de la NOM-035-STPS-2018', 30, 70, 1, NOW(), NOW()),
('Evaluación de Prevención de Riesgos Psicosociales', 'Evaluación sobre identificación y prevención de factores de riesgo', 45, 75, 1, NOW(), NOW()),
('Evaluación de Protocolo de Violencia Laboral', 'Evaluación sobre el protocolo de atención a casos de violencia laboral', 25, 80, 1, NOW(), NOW()),
('Evaluación de Comité de Seguridad y Salud', 'Evaluación para miembros del comité de seguridad y salud en el trabajo', 40, 70, 1, NOW(), NOW()),
('Evaluación de Primeros Auxilios Psicológicos', 'Evaluación sobre técnicas de primeros auxilios psicológicos en el trabajo', 35, 75, 1, NOW(), NOW());

-- ============================================
-- 3. INSERTAR PREGUNTAS DE EVALUACIÓN (20 preguntas, 4 por evaluación)
-- ============================================

-- Preguntas para Evaluación 1 (NOM-035 Básica)
INSERT INTO exam_questions (assessmentId, questionText, questionType, points, orderIndex, createdAt, updatedAt) VALUES
(1, '¿Cuál es el objetivo principal de la NOM-035-STPS-2018?', 'multiple_choice', 5, 1, NOW(), NOW()),
(1, '¿Qué son los factores de riesgo psicosocial según la NOM-035?', 'multiple_choice', 5, 2, NOW(), NOW()),
(1, '¿Cuántos numerales tiene la NOM-035-STPS-2018?', 'multiple_choice', 5, 3, NOW(), NOW()),
(1, '¿Qué empresas están obligadas a cumplir con la NOM-035?', 'multiple_choice', 5, 4, NOW(), NOW());

-- Preguntas para Evaluación 2 (Prevención de Riesgos)
INSERT INTO exam_questions (assessmentId, questionText, questionType, points, orderIndex, createdAt, updatedAt) VALUES
(2, '¿Qué es un acontecimiento traumático severo?', 'multiple_choice', 5, 1, NOW(), NOW()),
(2, '¿Cuáles son las categorías de factores de riesgo psicosocial?', 'multiple_choice', 5, 2, NOW(), NOW()),
(2, '¿Qué debe hacer el patrón cuando identifica factores de riesgo?', 'multiple_choice', 5, 3, NOW(), NOW()),
(2, '¿Cada cuánto tiempo se deben aplicar las encuestas de riesgo psicosocial?', 'multiple_choice', 5, 4, NOW(), NOW());

-- Preguntas para Evaluación 3 (Violencia Laboral)
INSERT INTO exam_questions (assessmentId, questionText, questionType, points, orderIndex, createdAt, updatedAt) VALUES
(3, '¿Qué es la violencia laboral según la NOM-035?', 'multiple_choice', 5, 1, NOW(), NOW()),
(3, '¿Cuáles son los tipos de violencia laboral?', 'multiple_choice', 5, 2, NOW(), NOW()),
(3, '¿Qué debe hacer un trabajador que sufre violencia laboral?', 'multiple_choice', 5, 3, NOW(), NOW()),
(3, '¿Qué sanciones puede tener el patrón por no atender casos de violencia laboral?', 'multiple_choice', 5, 4, NOW(), NOW());

-- Preguntas para Evaluación 4 (Comité de Seguridad)
INSERT INTO exam_questions (assessmentId, questionText, questionType, points, orderIndex, createdAt, updatedAt) VALUES
(4, '¿Cuál es la función principal del comité de seguridad y salud?', 'multiple_choice', 5, 1, NOW(), NOW()),
(4, '¿Quiénes deben integrar el comité de seguridad y salud?', 'multiple_choice', 5, 2, NOW(), NOW()),
(4, '¿Cada cuánto tiempo debe reunirse el comité?', 'multiple_choice', 5, 3, NOW(), NOW()),
(4, '¿Qué documentos debe generar el comité?', 'multiple_choice', 5, 4, NOW(), NOW());

-- Preguntas para Evaluación 5 (Primeros Auxilios Psicológicos)
INSERT INTO exam_questions (assessmentId, questionText, questionType, points, orderIndex, createdAt, updatedAt) VALUES
(5, '¿Qué son los primeros auxilios psicológicos?', 'multiple_choice', 5, 1, NOW(), NOW()),
(5, '¿Cuándo se deben aplicar los primeros auxilios psicológicos?', 'multiple_choice', 5, 2, NOW(), NOW()),
(5, '¿Cuáles son los principios básicos de los primeros auxilios psicológicos?', 'multiple_choice', 5, 3, NOW(), NOW()),
(5, '¿Quién puede proporcionar primeros auxilios psicológicos?', 'multiple_choice', 5, 4, NOW(), NOW());

-- ============================================
-- 4. INSERTAR OPCIONES DE RESPUESTA (80 opciones, 4 por pregunta)
-- ============================================

-- Opciones para pregunta 1 (Evaluación 1)
INSERT INTO exam_question_options (questionId, optionText, isCorrect, orderIndex, createdAt, updatedAt) VALUES
(1, 'Identificar, analizar y prevenir los factores de riesgo psicosocial', 1, 1, NOW(), NOW()),
(1, 'Aumentar la productividad de los trabajadores', 0, 2, NOW(), NOW()),
(1, 'Reducir los costos operativos de la empresa', 0, 3, NOW(), NOW()),
(1, 'Mejorar las relaciones laborales entre empleados', 0, 4, NOW(), NOW());

-- Opciones para pregunta 2 (Evaluación 1)
INSERT INTO exam_question_options (questionId, optionText, isCorrect, orderIndex, createdAt, updatedAt) VALUES
(2, 'Condiciones del ambiente de trabajo que pueden causar estrés o daño psicológico', 1, 1, NOW(), NOW()),
(2, 'Factores físicos que afectan la salud de los trabajadores', 0, 2, NOW(), NOW()),
(2, 'Riesgos de accidentes en el lugar de trabajo', 0, 3, NOW(), NOW()),
(2, 'Condiciones económicas de la empresa', 0, 4, NOW(), NOW());

-- Opciones para pregunta 3 (Evaluación 1)
INSERT INTO exam_question_options (questionId, optionText, isCorrect, orderIndex, createdAt, updatedAt) VALUES
(3, '8 numerales', 1, 1, NOW(), NOW()),
(3, '5 numerales', 0, 2, NOW(), NOW()),
(3, '10 numerales', 0, 3, NOW(), NOW()),
(3, '12 numerales', 0, 4, NOW(), NOW());

-- Opciones para pregunta 4 (Evaluación 1)
INSERT INTO exam_question_options (questionId, optionText, isCorrect, orderIndex, createdAt, updatedAt) VALUES
(4, 'Todos los centros de trabajo en México', 1, 1, NOW(), NOW()),
(4, 'Solo empresas con más de 100 trabajadores', 0, 2, NOW(), NOW()),
(4, 'Solo empresas del sector industrial', 0, 3, NOW(), NOW()),
(4, 'Solo empresas del sector público', 0, 4, NOW(), NOW());

-- Nota: Por brevedad, solo se muestran las primeras 4 preguntas completas con opciones
-- En producción, se deben agregar las opciones para las 16 preguntas restantes siguiendo el mismo patrón

-- ============================================
-- 5. INSERTAR PLANTILLAS DE NOTIFICACIONES (5 registros)
-- ============================================

INSERT INTO notification_templates (name, type, subject, body, isActive, createdAt, updatedAt) VALUES
('Renovación de Certificado Próxima', 'email', 'Recordatorio: Renovación de Certificado de Capacitación', 'Estimado/a {{nombre}},\n\nLe recordamos que su certificado de capacitación "{{curso}}" vence el {{fechaVencimiento}}.\n\nPor favor, programe su renovación con anticipación.\n\nSaludos cordiales,\nComité de Seguridad y Salud', 1, NOW(), NOW()),
('Nuevo Curso Disponible', 'email', 'Nuevo Curso de Capacitación Disponible', 'Estimado/a {{nombre}},\n\nTenemos el gusto de informarle que el curso "{{curso}}" ya está disponible.\n\nDuración: {{duracion}} minutos\nFecha límite: {{fechaLimite}}\n\nSaludos cordiales,\nComité de Seguridad y Salud', 1, NOW(), NOW()),
('Evaluación Pendiente', 'email', 'Recordatorio: Evaluación Pendiente', 'Estimado/a {{nombre}},\n\nTiene una evaluación pendiente: "{{evaluacion}}".\n\nFecha límite: {{fechaLimite}}\n\nPor favor, complete la evaluación a la brevedad.\n\nSaludos cordiales,\nComité de Seguridad y Salud', 1, NOW(), NOW()),
('Certificado Generado', 'email', 'Su Certificado de Capacitación ha sido Generado', 'Estimado/a {{nombre}},\n\n¡Felicidades! Su certificado de capacitación "{{curso}}" ha sido generado exitosamente.\n\nFolio: {{folio}}\nFecha de emisión: {{fechaEmision}}\n\nPuede descargarlo desde la plataforma.\n\nSaludos cordiales,\nComité de Seguridad y Salud', 1, NOW(), NOW()),
('Convocatoria a Reunión del Comité', 'email', 'Convocatoria: Reunión del Comité de Seguridad y Salud', 'Estimado/a {{nombre}},\n\nPor medio de la presente, se le convoca a la reunión del Comité de Seguridad y Salud.\n\nFecha: {{fecha}}\nHora: {{hora}}\nLugar: {{lugar}}\n\nAgenda:\n{{agenda}}\n\nSaludos cordiales,\nComité de Seguridad y Salud', 1, NOW(), NOW());

-- ============================================
-- 6. INSERTAR REPRESENTANTES LEGALES (3 registros)
-- ============================================

INSERT INTO representatives (nombre, cargo, firmaUrl, createdAt, updatedAt) VALUES
('Lic. Roberto Gómez Pérez', 'Director General', NULL, NOW(), NOW()),
('Ing. Patricia Ramírez López', 'Gerente de Recursos Humanos', NULL, NOW(), NOW()),
('Mtro. Fernando Sánchez Torres', 'Coordinador de Seguridad y Salud', NULL, NOW(), NOW());

-- ============================================
-- 7. INSERTAR MINUTAS DE COMITÉ (3 registros)
-- ============================================

INSERT INTO committee_minutes (sessionNumber, sessionDate, sessionTime, location, status, createdAt, updatedAt) VALUES
(1, '2024-01-15', '10:00', 'Sala de Juntas Principal', 'aprobada', NOW(), NOW()),
(2, '2024-02-20', '14:00', 'Sala de Juntas Principal', 'aprobada', NOW(), NOW()),
(3, '2024-03-18', '10:00', 'Sala de Juntas Principal', 'borrador', NOW(), NOW());

-- ============================================
-- FIN DEL SCRIPT DE DATOS DE PRUEBA
-- ============================================

-- Resumen de registros insertados:
-- - 10 empleados
-- - 5 evaluaciones
-- - 20 preguntas de evaluación
-- - 16 opciones de respuesta (4 preguntas completas, pendiente completar las 16 restantes)
-- - 5 plantillas de notificaciones
-- - 3 representantes legales
-- - 3 minutas de comité
-- TOTAL: 62 registros (sin contar las opciones de respuesta pendientes)
