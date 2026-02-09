-- FASE 197: Sistema de Cursos y Programas de Capacitación NOM-035
-- Tablas para gestión de programas de capacitación con formato institucional de 11 secciones

-- Tabla principal de programas de capacitación
CREATE TABLE IF NOT EXISTS training_programs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Sección 1: Datos Generales del Curso
  nombre_curso VARCHAR(500) NOT NULL,
  norma_aplicable VARCHAR(255),
  modalidad ENUM('en_linea', 'presencial', 'mixta') NOT NULL DEFAULT 'mixta',
  duracion_total INT, -- en minutos
  perfil_participante TEXT,
  area_responsable VARCHAR(255),
  fecha_elaboracion DATE,
  version VARCHAR(50) DEFAULT '1.0',
  
  -- Sección 2: Objetivos
  objetivo_organizacional TEXT,
  objetivo_general TEXT,
  objetivos_especificos JSON, -- array de objetivos
  
  -- Sección 3: Alineación Normativa y Técnica
  normas_oficiales TEXT, -- NOM / NMX
  estandar_competencia VARCHAR(255), -- EC
  otros_marcos TEXT,
  evidencias_normativas TEXT,
  
  -- Sección 4: Estructura del Curso (módulos en tabla separada)
  numero_modulos INT DEFAULT 0,
  secuencia_didactica TEXT,
  
  -- Sección 5: Estrategia Didáctica
  tipo_aprendizaje VARCHAR(255), -- teórico, práctico, experiencial
  tecnicas_didacticas TEXT,
  actividades_aprendizaje TEXT,
  casos_practicos TEXT,
  
  -- Sección 6: Materiales de Capacitación (en tabla separada)
  -- presentaciones, manuales, videos, infografías, formatos
  
  -- Sección 7: Evaluación del Aprendizaje
  evaluacion_diagnostica TEXT,
  evaluacion_formativa TEXT,
  evaluacion_sumativa TEXT,
  criterios_acreditacion TEXT,
  instrumentos_evaluacion TEXT,
  
  -- Sección 8: Evidencias de Aprendizaje
  productos_esperados TEXT,
  listas_cotejo JSON, -- array de listas
  rubricas JSON, -- array de rúbricas
  registros_participacion TEXT,
  
  -- Sección 9: Requerimientos Modalidad en Línea
  plataforma_lms VARCHAR(255),
  formato_contenidos VARCHAR(255),
  interaccion_tipo VARCHAR(255), -- síncrona / asíncrona
  seguimiento_participante TEXT,
  
  -- Sección 10: Requerimientos Modalidad Presencial
  espacio_fisico TEXT,
  materiales_fisicos TEXT,
  equipo_requerido TEXT,
  control_asistencia TEXT,
  
  -- Sección 11: Control Documental
  responsable_actualizacion VARCHAR(255),
  frecuencia_revision VARCHAR(255),
  historial_cambios JSON, -- array de cambios
  codigo_documento VARCHAR(100) UNIQUE, -- ej: CAP-NOM035-001-V1.0
  
  -- Metadatos
  estado ENUM('borrador', 'revision', 'aprobado', 'publicado', 'archivado') DEFAULT 'borrador',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de módulos de programas de capacitación (Sección 4)
CREATE TABLE IF NOT EXISTS training_modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  numero_modulo INT NOT NULL,
  titulo VARCHAR(500) NOT NULL,
  objetivo TEXT,
  contenidos TEXT, -- descripción de contenidos
  duracion INT, -- en minutos
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (program_id) REFERENCES training_programs(id) ON DELETE CASCADE,
  INDEX idx_program_order (program_id, order_index)
);

-- Tabla de materiales de capacitación (Sección 6)
CREATE TABLE IF NOT EXISTS training_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  tipo_material ENUM('presentacion', 'manual_participante', 'manual_instructor', 'video', 'infografia', 'formato_descargable') NOT NULL,
  titulo VARCHAR(500) NOT NULL,
  descripcion TEXT,
  archivo_url VARCHAR(1000), -- URL del archivo en S3
  archivo_key VARCHAR(500), -- Key en S3
  mime_type VARCHAR(100),
  tamaño_bytes BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (program_id) REFERENCES training_programs(id) ON DELETE CASCADE,
  INDEX idx_program_tipo (program_id, tipo_material)
);

-- Tabla de evaluaciones (Sección 7)
CREATE TABLE IF NOT EXISTS training_evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  tipo_evaluacion ENUM('diagnostica', 'formativa', 'sumativa') NOT NULL,
  titulo VARCHAR(500) NOT NULL,
  descripcion TEXT,
  preguntas JSON, -- array de preguntas con opciones
  puntaje_minimo INT DEFAULT 70, -- porcentaje mínimo para aprobar
  duracion_minutos INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (program_id) REFERENCES training_programs(id) ON DELETE CASCADE,
  INDEX idx_program_tipo_eval (program_id, tipo_evaluacion)
);

-- Tabla de evidencias de aprendizaje (Sección 8)
CREATE TABLE IF NOT EXISTS training_evidence (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  user_id INT NOT NULL,
  tipo_evidencia ENUM('producto', 'lista_cotejo', 'rubrica', 'registro_participacion') NOT NULL,
  titulo VARCHAR(500) NOT NULL,
  descripcion TEXT,
  archivo_url VARCHAR(1000), -- URL del archivo en S3
  archivo_key VARCHAR(500), -- Key en S3
  calificacion DECIMAL(5,2), -- calificación obtenida
  retroalimentacion TEXT,
  fecha_entrega TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (program_id) REFERENCES training_programs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_program_user (program_id, user_id)
);

-- Tabla de versiones (Sección 11 - Control Documental ISO)
CREATE TABLE IF NOT EXISTS training_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  version VARCHAR(50) NOT NULL, -- ej: 1.0, 1.1, 2.0
  codigo_documento VARCHAR(100) NOT NULL, -- ej: CAP-NOM035-001-V1.0
  descripcion_cambios TEXT,
  tipo_cambio ENUM('creacion', 'revision_menor', 'revision_mayor', 'correccion') NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (program_id) REFERENCES training_programs(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_program_version (program_id, version)
);

-- Tabla de aprobaciones (Sección 11 - Control Documental ISO)
CREATE TABLE IF NOT EXISTS training_approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  version_id INT NOT NULL,
  rol_aprobador ENUM('elaboro', 'reviso', 'autorizo') NOT NULL,
  user_id INT NOT NULL,
  nombre_completo VARCHAR(255) NOT NULL,
  puesto VARCHAR(255),
  firma_url VARCHAR(1000), -- URL de la firma digital en S3
  fecha_aprobacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  comentarios TEXT,
  
  FOREIGN KEY (program_id) REFERENCES training_programs(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES training_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_program_version (program_id, version_id)
);

-- Tabla de inscripciones a programas
CREATE TABLE IF NOT EXISTS training_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  user_id INT NOT NULL,
  fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_inicio TIMESTAMP,
  fecha_finalizacion TIMESTAMP,
  progreso_porcentaje INT DEFAULT 0,
  estado ENUM('inscrito', 'en_curso', 'completado', 'abandonado', 'reprobado') DEFAULT 'inscrito',
  calificacion_final DECIMAL(5,2),
  certificado_url VARCHAR(1000), -- URL del certificado en S3
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (program_id) REFERENCES training_programs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (program_id, user_id),
  INDEX idx_user_estado (user_id, estado)
);
