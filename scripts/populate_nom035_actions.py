#!/usr/bin/env python3
"""
Script para poblar el catálogo completo de acciones NOM-035
Total: 220 acciones (110 preventivas + 110 correctivas)
- 2 Categorías × 10 acciones = 20
- 5 Dominios × 10 acciones = 50
- 15 Dimensiones × 10 acciones = 150
"""

import mysql.connector
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Conexión a base de datos
db = mysql.connector.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    user=os.getenv('DB_USER', 'root'),
    password=os.getenv('DB_PASSWORD', ''),
    database=os.getenv('DB_NAME', 'nom035_moodle_platform')
)

cursor = db.cursor()

# Catálogo completo de acciones
actions = [
    # DOMINIOS (50 acciones)
    # DOMINIO A: AMBIENTE DE TRABAJO
    ('domain', 'DOM_A', 'preventive', 1, 'Implementar mantenimiento preventivo programado de instalaciones, equipos y sistemas para garantizar condiciones óptimas.'),
    ('domain', 'DOM_A', 'preventive', 2, 'Establecer protocolos de limpieza y orden (5S) con participación rotativa de trabajadores en su implementación.'),
    ('domain', 'DOM_A', 'preventive', 3, 'Realizar monitoreos ambientales periódicos de ruido, iluminación, temperatura y calidad del aire, con ajustes basados en resultados.'),
    ('domain', 'DOM_A', 'preventive', 4, 'Diseñar estaciones de trabajo ergonómicas con mobiliario ajustable y adecuado a las tareas específicas.'),
    ('domain', 'DOM_A', 'preventive', 5, 'Implementar señalización clara y uniforme de áreas de riesgo, rutas de evacuación y ubicación de equipos de seguridad.'),
    ('domain', 'DOM_A', 'corrective', 1, 'Realizar inspecciones de seguridad diarias en áreas críticas, documentando y atendiendo hallazgos en menos de 24 horas.'),
    ('domain', 'DOM_A', 'corrective', 2, 'Adecuar espacios físicos para garantizar distancias mínimas entre trabajadores, ventilación adecuada e iluminación suficiente.'),
    ('domain', 'DOM_A', 'corrective', 3, 'Reponer inmediatamente equipo de protección personal dañado o desgastado, con verificación de uso correcto.'),
    ('domain', 'DOM_A', 'corrective', 4, 'Reorganizar flujos de trabajo para reducir congestiones en áreas comunes y puntos críticos de movimiento.'),
    ('domain', 'DOM_A', 'corrective', 5, 'Instalar barreras físicas o acústicas en áreas con niveles de ruido que excedan límites permisibles.'),
    
    # DOMINIO B: FACTORES PROPIOS DE LA ACTIVIDAD
    ('domain', 'DOM_B', 'preventive', 1, 'Realizar análisis de puestos detallados para identificar y distribuir equitativamente cargas mentales y complejidad de tareas.'),
    ('domain', 'DOM_B', 'preventive', 2, 'Implementar sistemas de gestión de tareas (kanban, tableros visuales) que clarifiquen prioridades y plazos.'),
    ('domain', 'DOM_B', 'preventive', 3, 'Diseñar procedimientos operativos estandarizados para tareas críticas, reduciendo ambigüedad y margen de error.'),
    ('domain', 'DOM_B', 'preventive', 4, 'Establecer "horas de concentración" sin interrupciones (reuniones, llamadas) para tareas que requieren alta atención.'),
    ('domain', 'DOM_B', 'preventive', 5, 'Capacitar en técnicas de gestión del tiempo y métodos para manejar interrupciones inevitables.'),
    ('domain', 'DOM_B', 'corrective', 1, 'Redistribuir cargas de trabajo en equipos donde se identifiquen desbalances significativos mediante evaluaciones objetivas.'),
    ('domain', 'DOM_B', 'corrective', 2, 'Implementar sistemas de revisión por pares o supervisión para tareas con consecuencias graves por error.'),
    ('domain', 'DOM_B', 'corrective', 3, 'Establecer protocolos de manejo de interrupciones que prioricen urgencias reales sobre demandas inmediatas.'),
    ('domain', 'DOM_B', 'corrective', 4, 'Proporcionar herramientas tecnológicas que automaticen tareas repetitivas o de alto riesgo de error humano.'),
    ('domain', 'DOM_B', 'corrective', 5, 'Crear bancos de conocimientos accesibles que reduzcan la dependencia de personas específicas para tareas críticas.'),
    
    # DOMINIO C: ORGANIZACIÓN DEL TIEMPO DE TRABAJO
    ('domain', 'DOM_C', 'preventive', 1, 'Implementar políticas de horarios flexibles que consideren necesidades personales y maximicen productividad.'),
    ('domain', 'DOM_C', 'preventive', 2, 'Establecer períodos obligatorios de descanso entre jornadas extensas (mínimo 12 horas entre turnos).'),
    ('domain', 'DOM_C', 'preventive', 3, 'Diseñar calendarios de trabajo anticipados (mínimo 1 mes) que permitan planificación personal y familiar.'),
    ('domain', 'DOM_C', 'preventive', 4, 'Crear cultura de respeto al tiempo no laboral mediante políticas de no comunicación fuera de horario, excepto emergencias.'),
    ('domain', 'DOM_C', 'preventive', 5, 'Implementar sistemas de registro objetivo de horas trabajadas con alertas automáticas para jornadas excesivas.'),
    ('domain', 'DOM_C', 'corrective', 1, 'Revisar y ajustar asignación de turnos para garantizar descansos adecuados y evitar acumulación de horas extras.'),
    ('domain', 'DOM_C', 'corrective', 2, 'Establecer límites máximos de horas extras mensuales con requerimiento de autorización especial para excepciones.'),
    ('domain', 'DOM_C', 'corrective', 3, 'Implementar períodos de desconexión obligatoria (vacaciones) para trabajadores con alta acumulación de horas.'),
    ('domain', 'DOM_C', 'corrective', 4, 'Reorganizar procesos para reducir dependencia de horarios extendidos como solución habitual a problemas de capacidad.'),
    ('domain', 'DOM_C', 'corrective', 5, 'Capacitar a mandos en gestión eficiente de recursos para cumplir objetivos sin recurrir sistemáticamente a horas extras.'),
    
    # DOMINIO D: LIDERAZGO Y RELACIONES EN EL TRABAJO
    ('domain', 'DOM_D', 'preventive', 1, 'Implementar programas de desarrollo de liderazgo basados en estilos positivos, comunicación asertiva y gestión emocional.'),
    ('domain', 'DOM_D', 'preventive', 2, 'Establecer sistemas de feedback 360° periódicos para todos los mandos, con planes de desarrollo individuales.'),
    ('domain', 'DOM_D', 'preventive', 3, 'Crear espacios formales e informales de interacción social (eventos, actividades) que fomenten relaciones positivas.'),
    ('domain', 'DOM_D', 'preventive', 4, 'Implementar protocolos de manejo de conflictos con mediadores capacitados disponibles para equipos.'),
    ('domain', 'DOM_D', 'preventive', 5, 'Desarrollar códigos de conducta claros que definan expectativas de comportamiento interpersonal en el trabajo.'),
    ('domain', 'DOM_D', 'corrective', 1, 'Intervenir inmediatamente en conflictos interpersonales mediante mediación profesional antes de que escalen.'),
    ('domain', 'DOM_D', 'corrective', 2, 'Reasignar temporal o permanentemente a trabajadores en relaciones conflictivas irreconciliables.'),
    ('domain', 'DOM_D', 'corrective', 3, 'Proporcionar coaching especializado a mandos identificados con estilos de liderazgo negativo en evaluaciones.'),
    ('domain', 'DOM_D', 'corrective', 4, 'Implementar programas de reparación para equipos con clima deteriorado, con facilitadores externos si es necesario.'),
    ('domain', 'DOM_D', 'corrective', 5, 'Aplicar sanciones progresivas por comportamientos que violen códigos de conducta, con claridad en consecuencias.'),
    
    # DOMINIO E: ENTORNO ORGANIZACIONAL
    ('domain', 'DOM_E', 'preventive', 1, 'Comunicar regularmente logros organizacionales, cambios estratégicos y reconocimientos a través de múltiples canales.'),
    ('domain', 'DOM_E', 'preventive', 2, 'Establecer programas de desarrollo profesional con rutas de carrera claras y accesibles para todos los niveles.'),
    ('domain', 'DOM_E', 'preventive', 3, 'Implementar sistemas de sugerencias con reconocimiento por ideas implementadas y retroalimentación a todas las propuestas.'),
    ('domain', 'DOM_E', 'preventive', 4, 'Crear comités de trabajadores con injerencia real en decisiones sobre condiciones laborales y ambiente de trabajo.'),
    ('domain', 'DOM_E', 'preventive', 5, 'Desarrollar políticas de inclusión y diversidad con metas medibles y programas de sensibilización continua.'),
    ('domain', 'DOM_E', 'corrective', 1, 'Revisar y ajustar políticas de compensación para garantizar equidad interna y competitividad externa.'),
    ('domain', 'DOM_E', 'corrective', 2, 'Implementar programas de retención específicos para áreas con alta rotación, identificando y atendiendo causas raíz.'),
    ('domain', 'DOM_E', 'corrective', 3, 'Realizar auditorías de clima organizacional por áreas y desarrollar planes de acción específicos para cada unidad.'),
    ('domain', 'DOM_E', 'corrective', 4, 'Establecer sistemas de medición y reconocimiento del trabajo en equipo, no solo logros individuales.'),
    ('domain', 'DOM_E', 'corrective', 5, 'Crear programas de reconexión para trabajadores desmotivados, con oportunidades de rotación o proyectos especiales.'),
]

# Insertar acciones
query = """
INSERT INTO nom035_action_catalog (level, levelCode, actionType, actionNumber, description)
VALUES (%s, %s, %s, %s, %s)
"""

try:
    cursor.executemany(query, actions)
    db.commit()
    print(f"✅ {cursor.rowcount} acciones insertadas exitosamente")
    print(f"Total acumulado en catálogo: {cursor.rowcount + 20} acciones")
except Exception as e:
    print(f"❌ Error al insertar acciones: {e}")
    db.rollback()
finally:
    cursor.close()
    db.close()
