/**
 * Responsabilidades por tipo de cargo en el Comité de Seguridad y Salud en el Trabajo
 * Según NOM-035-STPS-2018
 */

export const COMMITTEE_RESPONSIBILITIES: Record<string, string> = {
  president: `**RESPONSABILIDADES DEL PRESIDENTE DEL COMITÉ:**

1. **Liderazgo y Coordinación**: Dirigir y coordinar las actividades del Comité de Seguridad y Salud en el Trabajo, asegurando el cumplimiento de los objetivos establecidos en la NOM-035-STPS-2018.

2. **Convocatoria de Reuniones**: Convocar y presidir las reuniones ordinarias y extraordinarias del Comité, garantizando la participación activa de todos los miembros.

3. **Representación**: Actuar como representante del Comité ante la dirección de la empresa y las autoridades laborales competentes.

4. **Supervisión de Acciones**: Supervisar la implementación de las acciones preventivas y correctivas derivadas de la identificación de factores de riesgo psicosocial.

5. **Toma de Decisiones**: Tomar decisiones colegiadas con los demás miembros del Comité sobre las medidas de prevención y atención de riesgos psicosociales.

6. **Seguimiento de Acuerdos**: Dar seguimiento al cumplimiento de los acuerdos tomados en las reuniones del Comité.

7. **Comunicación Institucional**: Mantener comunicación constante con la dirección de la empresa sobre los avances y necesidades del Comité.

8. **Promoción de la Cultura de Prevención**: Fomentar una cultura organizacional de prevención de riesgos psicosociales y promoción de entornos organizacionales favorables.`,

  secretary: `**RESPONSABILIDADES DEL SECRETARIO DEL COMITÉ:**

1. **Elaboración de Minutas**: Elaborar las minutas de las reuniones del Comité, registrando los acuerdos, compromisos y seguimiento de acciones.

2. **Gestión Documental**: Mantener actualizado el archivo documental del Comité, incluyendo minutas, reportes, evidencias y documentación normativa.

3. **Convocatorias**: Apoyar al Presidente en la elaboración y envío de convocatorias para las reuniones del Comité.

4. **Registro de Asistencia**: Llevar el registro de asistencia de los miembros del Comité en cada reunión.

5. **Comunicación Interna**: Difundir los acuerdos y comunicados del Comité entre los trabajadores de la organización.

6. **Seguimiento de Compromisos**: Dar seguimiento a los compromisos adquiridos por los miembros del Comité y reportar su cumplimiento.

7. **Organización de Agenda**: Preparar la orden del día de las reuniones en coordinación con el Presidente.

8. **Custodia de Evidencias**: Resguardar las evidencias documentales que acrediten el cumplimiento de la NOM-035-STPS-2018.`,

  vocal: `**RESPONSABILIDADES DEL VOCAL DEL COMITÉ:**

1. **Participación Activa**: Asistir puntualmente a las reuniones ordinarias y extraordinarias del Comité, participando activamente en las discusiones y toma de decisiones.

2. **Análisis de Casos**: Analizar los casos de trabajadores expuestos a factores de riesgo psicosocial y proponer medidas de atención.

3. **Investigación de Incidentes**: Participar en la investigación de eventos traumáticos severos que afecten a los trabajadores.

4. **Propuestas de Mejora**: Proponer acciones preventivas y correctivas para mitigar los factores de riesgo psicosocial identificados.

5. **Difusión de Información**: Colaborar en la difusión de información sobre prevención de riesgos psicosociales entre los trabajadores.

6. **Representación de Trabajadores**: Representar los intereses y preocupaciones de los trabajadores en materia de salud mental y bienestar laboral.

7. **Seguimiento de Acciones**: Verificar la implementación de las acciones acordadas por el Comité en su área de influencia.

8. **Retroalimentación**: Proporcionar retroalimentación al Comité sobre la efectividad de las medidas implementadas.`,

  alternate: `**RESPONSABILIDADES DEL SUPLENTE DEL COMITÉ:**

1. **Sustitución**: Sustituir al miembro titular en caso de ausencia temporal o definitiva, asumiendo todas sus responsabilidades.

2. **Asistencia a Reuniones**: Asistir a las reuniones del Comité cuando sea convocado, ya sea como suplente o como observador.

3. **Actualización Continua**: Mantenerse informado sobre los acuerdos, acciones y avances del Comité.

4. **Apoyo en Actividades**: Apoyar al miembro titular en la realización de sus funciones cuando sea requerido.

5. **Preparación para Asumir el Cargo**: Estar preparado para asumir las responsabilidades del cargo titular en cualquier momento.

6. **Participación en Capacitaciones**: Participar en las capacitaciones y actividades de formación del Comité.

7. **Comunicación con el Titular**: Mantener comunicación constante con el miembro titular para conocer el estado de los asuntos del Comité.

8. **Compromiso con la Prevención**: Mantener el mismo nivel de compromiso con la prevención de riesgos psicosociales que los miembros titulares.`,

  advisor: `**RESPONSABILIDADES DEL ASESOR DEL COMITÉ:**

1. **Asesoría Técnica**: Proporcionar asesoría técnica especializada al Comité en materia de prevención de riesgos psicosociales.

2. **Interpretación Normativa**: Orientar al Comité en la interpretación y aplicación correcta de la NOM-035-STPS-2018 y demás normatividad aplicable.

3. **Capacitación**: Impartir o coordinar capacitaciones para los miembros del Comité y los trabajadores en temas de salud mental laboral.

4. **Análisis de Resultados**: Apoyar en el análisis de los resultados de las evaluaciones de factores de riesgo psicosocial.

5. **Diseño de Estrategias**: Colaborar en el diseño de estrategias de intervención y programas de prevención.

6. **Evaluación de Acciones**: Evaluar la efectividad de las acciones preventivas y correctivas implementadas.

7. **Investigación y Actualización**: Mantenerse actualizado en las mejores prácticas y tendencias en prevención de riesgos psicosociales.

8. **Apoyo en Casos Complejos**: Brindar apoyo especializado en la atención de casos complejos o eventos traumáticos severos.`,
};

/**
 * Obtener responsabilidades por tipo de cargo
 */
export function getResponsibilitiesByPosition(position: string): string {
  return (
    COMMITTEE_RESPONSIBILITIES[position] || COMMITTEE_RESPONSIBILITIES.vocal
  );
}
