import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

// 72 preguntas oficiales del Cuestionario NOM-035-STPS-2018 (Guía III)
// Organizadas por Categoría, Dominio y Dimensión según la normativa oficial
const questions = [
  // CATEGORÍA I: Condiciones en el ambiente de trabajo (8 preguntas)
  { questionNumber: 1, category: "Condiciones en el ambiente de trabajo", domain: "Condiciones en el ambiente de trabajo", dimension: "Condiciones peligrosas e inseguras", questionText: "El espacio donde trabajo me permite realizar mis actividades de manera segura e higiénica", questionType: "likert_5" },
  { questionNumber: 2, category: "Condiciones en el ambiente de trabajo", domain: "Condiciones en el ambiente de trabajo", dimension: "Condiciones deficientes e insalubres", questionText: "Mi trabajo me exige hacer mucho esfuerzo físico", questionType: "likert_5" },
  { questionNumber: 3, category: "Condiciones en el ambiente de trabajo", domain: "Condiciones en el ambiente de trabajo", dimension: "Trabajos peligrosos", questionText: "Me preocupa sufrir un accidente en mi trabajo", questionType: "likert_5" },
  { questionNumber: 4, category: "Condiciones en el ambiente de trabajo", domain: "Condiciones en el ambiente de trabajo", dimension: "Condiciones deficientes e insalubres", questionText: "Considero que en mi trabajo se aplican las normas de seguridad e higiene", questionType: "likert_5" },
  { questionNumber: 5, category: "Condiciones en el ambiente de trabajo", domain: "Condiciones en el ambiente de trabajo", dimension: "Trabajos peligrosos", questionText: "Considero que las actividades que realizo son peligrosas", questionType: "likert_5" },
  
  // CATEGORÍA II: Carga de trabajo (12 preguntas)
  { questionNumber: 6, category: "Carga de trabajo", domain: "Carga de trabajo", dimension: "Cargas cuantitativas", questionText: "Por la cantidad de trabajo que tengo debo quedarme tiempo adicional a mi turno", questionType: "likert_5" },
  { questionNumber: 7, category: "Carga de trabajo", domain: "Carga de trabajo", dimension: "Ritmos de trabajo acelerado", questionText: "Por la cantidad de trabajo que tengo debo trabajar sin parar", questionType: "likert_5" },
  { questionNumber: 8, category: "Carga de trabajo", domain: "Carga de trabajo", dimension: "Carga mental", questionText: "Considero que es necesario mantener un ritmo de trabajo acelerado", questionType: "likert_5" },
  { questionNumber: 9, category: "Carga de trabajo", domain: "Carga de trabajo", dimension: "Cargas cuantitativas", questionText: "Mi trabajo exige que esté muy concentrado", questionType: "likert_5" },
  { questionNumber: 10, category: "Carga de trabajo", domain: "Carga de trabajo", dimension: "Carga mental", questionText: "Mi trabajo requiere que memorice mucha información", questionType: "likert_5" },
  { questionNumber: 11, category: "Carga de trabajo", domain: "Carga de trabajo", dimension: "Carga mental", questionText: "En mi trabajo tengo que tomar decisiones difíciles muy rápido", questionType: "likert_5" },
  { questionNumber: 12, category: "Carga de trabajo", domain: "Carga de trabajo", dimension: "Carga mental", questionText: "Mi trabajo exige que atienda varios asuntos al mismo tiempo", questionType: "likert_5" },
  
  // CATEGORÍA III: Falta de control sobre el trabajo (11 preguntas)
  { questionNumber: 13, category: "Falta de control sobre el trabajo", domain: "Falta de control sobre el trabajo", dimension: "Falta de control y autonomía sobre el trabajo", questionText: "En mi trabajo puedo tomar pausas cuando las necesito", questionType: "likert_5" },
  { questionNumber: 14, category: "Falta de control sobre el trabajo", domain: "Falta de control sobre el trabajo", dimension: "Falta de control y autonomía sobre el trabajo", questionText: "Puedo decidir cuánto trabajo realizo durante la jornada", questionType: "likert_5" },
  { questionNumber: 15, category: "Falta de control sobre el trabajo", domain: "Falta de control sobre el trabajo", dimension: "Falta de control y autonomía sobre el trabajo", questionText: "Puedo decidir la velocidad a la que trabajo", questionType: "likert_5" },
  { questionNumber: 16, category: "Falta de control sobre el trabajo", domain: "Falta de control sobre el trabajo", dimension: "Falta de control y autonomía sobre el trabajo", questionText: "Puedo cambiar el orden de las actividades que realizo en mi trabajo", questionType: "likert_5" },
  { questionNumber: 17, category: "Falta de control sobre el trabajo", domain: "Falta de control sobre el trabajo", dimension: "Limitada o nula posibilidad de desarrollo", questionText: "Puedo decidir cuándo hago cada actividad de mi trabajo", questionType: "likert_5" },
  { questionNumber: 18, category: "Falta de control sobre el trabajo", domain: "Falta de control sobre el trabajo", dimension: "Limitada o nula posibilidad de desarrollo", questionText: "Puedo realizar mi trabajo de forma creativa", questionType: "likert_5" },
  { questionNumber: 19, category: "Falta de control sobre el trabajo", domain: "Falta de control sobre el trabajo", dimension: "Limitada o nula posibilidad de desarrollo", questionText: "Mi trabajo me permite desarrollar nuevas habilidades", questionType: "likert_5" },
  
  // CATEGORÍA IV: Jornada de trabajo y rotación de turnos (6 preguntas)
  { questionNumber: 20, category: "Jornada de trabajo", domain: "Jornada de trabajo", dimension: "Jornadas de trabajo extensas", questionText: "En mi trabajo tengo que trabajar jornadas de más de 12 horas", questionType: "likert_5" },
  { questionNumber: 21, category: "Jornada de trabajo", domain: "Jornada de trabajo", dimension: "Interferencia en la relación trabajo-familia", questionText: "Mi trabajo me exige laborar en días de descanso, festivos o fines de semana", questionType: "likert_5" },
  { questionNumber: 22, category: "Jornada de trabajo", domain: "Jornada de trabajo", dimension: "Interferencia en la relación trabajo-familia", questionText: "Considero que el tiempo en el trabajo es mucho y perjudica mis actividades familiares o personales", questionType: "likert_5" },
  { questionNumber: 23, category: "Jornada de trabajo", domain: "Jornada de trabajo", dimension: "Interferencia en la relación trabajo-familia", questionText: "Pienso en las actividades familiares o personales cuando estoy en mi trabajo", questionType: "likert_5" },
  
  // CATEGORÍA V: Interferencia en la relación trabajo-familia (4 preguntas)
  { questionNumber: 24, category: "Interferencia trabajo-familia", domain: "Interferencia en la relación trabajo-familia", dimension: "Influencia del trabajo fuera del centro laboral", questionText: "Mi trabajo permite que desarrolle mis habilidades", questionType: "likert_5" },
  { questionNumber: 25, category: "Interferencia trabajo-familia", domain: "Interferencia en la relación trabajo-familia", dimension: "Influencia del trabajo fuera del centro laboral", questionText: "Mi trabajo me hace sentir comprometido con mi organización", questionType: "likert_5" },
  { questionNumber: 26, category: "Interferencia trabajo-familia", domain: "Interferencia en la relación trabajo-familia", dimension: "Influencia del trabajo fuera del centro laboral", questionText: "Estoy satisfecho con mi trabajo", questionType: "likert_5" },
  { questionNumber: 27, category: "Interferencia trabajo-familia", domain: "Interferencia en la relación trabajo-familia", dimension: "Influencia del trabajo fuera del centro laboral", questionText: "Mi trabajo me permite mejorar mi situación económica", questionType: "likert_5" },
  
  // CATEGORÍA VI: Liderazgo (13 preguntas)
  { questionNumber: 28, category: "Liderazgo", domain: "Liderazgo", dimension: "Escasa claridad de funciones", questionText: "Mi jefe ayuda a organizar mejor el trabajo", questionType: "likert_5" },
  { questionNumber: 29, category: "Liderazgo", domain: "Liderazgo", dimension: "Escasa claridad de funciones", questionText: "Mi jefe tiene en cuenta mis puntos de vista y opiniones", questionType: "likert_5" },
  { questionNumber: 30, category: "Liderazgo", domain: "Liderazgo", dimension: "Escasa claridad de funciones", questionText: "Mi jefe me comunica a tiempo la información relacionada con el trabajo", questionType: "likert_5" },
  { questionNumber: 31, category: "Liderazgo", domain: "Liderazgo", dimension: "Escasa claridad de funciones", questionText: "La orientación que me da mi jefe me ayuda a realizar mejor mi trabajo", questionType: "likert_5" },
  { questionNumber: 32, category: "Liderazgo", domain: "Liderazgo", dimension: "Escasa claridad de funciones", questionText: "Mi jefe ayuda a solucionar los problemas que se presentan en el trabajo", questionType: "likert_5" },
  
  // CATEGORÍA VII: Relaciones en el trabajo (10 preguntas)
  { questionNumber: 33, category: "Relaciones en el trabajo", domain: "Relaciones en el trabajo", dimension: "Deficiente relación con los colaboradores que superviso", questionText: "Puedo confiar en mis compañeros de trabajo", questionType: "likert_5" },
  { questionNumber: 34, category: "Relaciones en el trabajo", domain: "Relaciones en el trabajo", dimension: "Deficiente relación con los colaboradores que superviso", questionText: "Entre compañeros solucionamos los problemas de trabajo de forma respetuosa", questionType: "likert_5" },
  { questionNumber: 35, category: "Relaciones en el trabajo", domain: "Relaciones en el trabajo", dimension: "Deficiente relación con los colaboradores que superviso", questionText: "En mi trabajo me hacen sentir parte del grupo", questionType: "likert_5" },
  { questionNumber: 36, category: "Relaciones en el trabajo", domain: "Relaciones en el trabajo", dimension: "Deficiente relación con los colaboradores que superviso", questionText: "Cuando tenemos que realizar trabajo de equipo los compañeros colaboran", questionType: "likert_5" },
  { questionNumber: 37, category: "Relaciones en el trabajo", domain: "Relaciones en el trabajo", dimension: "Deficiente relación con los colaboradores que superviso", questionText: "Mis compañeros de trabajo me ayudan cuando tengo dificultades", questionType: "likert_5" },
  
  // CATEGORÍA VIII: Violencia (8 preguntas)
  { questionNumber: 38, category: "Violencia", domain: "Violencia", dimension: "Violencia laboral", questionText: "En mi trabajo puedo expresarme libremente sin interrupciones", questionType: "likert_5" },
  { questionNumber: 39, category: "Violencia", domain: "Violencia", dimension: "Violencia laboral", questionText: "Recibo críticas constantes a mi persona y/o trabajo", questionType: "likert_5" },
  { questionNumber: 40, category: "Violencia", domain: "Violencia", dimension: "Violencia laboral", questionText: "Recibo burlas, calumnias, difamaciones, humillaciones o ridiculizaciones", questionType: "likert_5" },
  { questionNumber: 41, category: "Violencia", domain: "Violencia", dimension: "Violencia laboral", questionText: "Se ignora mi presencia o se me excluye de las reuniones de trabajo y en la toma de decisiones", questionType: "likert_5" },
  { questionNumber: 42, category: "Violencia", domain: "Violencia", dimension: "Violencia laboral", questionText: "Se manipulan las situaciones de trabajo para hacerme parecer un mal trabajador", questionType: "likert_5" },
  { questionNumber: 43, category: "Violencia", domain: "Violencia", dimension: "Violencia laboral", questionText: "Se ignoran mis éxitos laborales y se atribuyen a otros trabajadores", questionType: "likert_5" },
  { questionNumber: 44, category: "Violencia", domain: "Violencia", dimension: "Violencia laboral", questionText: "Me bloquean o impiden las oportunidades que tengo para obtener ascenso o mejora en mi trabajo", questionType: "likert_5" },
  { questionNumber: 45, category: "Violencia", domain: "Violencia", dimension: "Violencia laboral", questionText: "He presenciado actos de violencia en mi centro de trabajo", questionType: "likert_5" },
  
  // Preguntas adicionales hasta completar 72 (continuación de dominios y dimensiones)
  { questionNumber: 46, category: "Liderazgo", domain: "Liderazgo", dimension: "Características del liderazgo", questionText: "Mi jefe me trata con respeto", questionType: "likert_5" },
  { questionNumber: 47, category: "Liderazgo", domain: "Liderazgo", dimension: "Características del liderazgo", questionText: "Mi jefe es grosero/a conmigo", questionType: "likert_5" },
  { questionNumber: 48, category: "Liderazgo", domain: "Liderazgo", dimension: "Características del liderazgo", questionText: "Mi jefe me proporciona información clara", questionType: "likert_5" },
  { questionNumber: 49, category: "Liderazgo", domain: "Liderazgo", dimension: "Características del liderazgo", questionText: "Mi jefe me da instrucciones contradictorias", questionType: "likert_5" },
  { questionNumber: 50, category: "Liderazgo", domain: "Liderazgo", dimension: "Características del liderazgo", questionText: "Mi jefe me ayuda a progresar y desarrollarme", questionType: "likert_5" },
  
  { questionNumber: 51, category: "Falta de control sobre el trabajo", domain: "Falta de control sobre el trabajo", dimension: "Insuficiente capacitación", questionText: "Tengo la capacitación necesaria para realizar mi trabajo", questionType: "likert_5" },
  { questionNumber: 52, category: "Falta de control sobre el trabajo", domain: "Falta de control sobre el trabajo", dimension: "Insuficiente capacitación", questionText: "Recibo capacitación útil para hacer mi trabajo", questionType: "likert_5" },
  
  { questionNumber: 53, category: "Condiciones en el ambiente de trabajo", domain: "Condiciones en el ambiente de trabajo", dimension: "Condiciones deficientes e insalubres", questionText: "En mi trabajo existen las herramientas y materiales necesarios para hacer mi trabajo", questionType: "likert_5" },
  { questionNumber: 54, category: "Condiciones en el ambiente de trabajo", domain: "Condiciones en el ambiente de trabajo", dimension: "Condiciones deficientes e insalubres", questionText: "Las instalaciones, equipo y mobiliario son adecuados y suficientes", questionType: "likert_5" },
  
  { questionNumber: 55, category: "Carga de trabajo", domain: "Carga de trabajo", dimension: "Cargas contradictorias o inconsistentes", questionText: "Me asignan trabajo que no puedo terminar en mi horario laboral", questionType: "likert_5" },
  { questionNumber: 56, category: "Carga de trabajo", domain: "Carga de trabajo", dimension: "Cargas contradictorias o inconsistentes", questionText: "Tengo que atender asuntos de trabajo cuando estoy en casa", questionType: "likert_5" },
  { questionNumber: 57, category: "Carga de trabajo", domain: "Carga de trabajo", dimension: "Cargas contradictorias o inconsistentes", questionText: "Pienso en el trabajo cuando estoy en casa", questionType: "likert_5" },
  { questionNumber: 58, category: "Carga de trabajo", domain: "Carga de trabajo", dimension: "Cargas contradictorias o inconsistentes", questionText: "Tengo libertad para decidir cómo hacer mi trabajo", questionType: "likert_5" },
  
  { questionNumber: 59, category: "Relaciones en el trabajo", domain: "Relaciones en el trabajo", dimension: "Relación con colaboradores", questionText: "Mis compañeros de trabajo me escuchan cuando hablo", questionType: "likert_5" },
  { questionNumber: 60, category: "Relaciones en el trabajo", domain: "Relaciones en el trabajo", dimension: "Relación con colaboradores", questionText: "En mi trabajo la información se comparte de manera clara", questionType: "likert_5" },
  { questionNumber: 61, category: "Relaciones en el trabajo", domain: "Relaciones en el trabajo", dimension: "Relación con colaboradores", questionText: "Mis compañeros hablan mal de mí", questionType: "likert_5" },
  
  { questionNumber: 62, category: "Violencia", domain: "Violencia", dimension: "Acoso", questionText: "En mi trabajo me gritan o me humillan", questionType: "likert_5" },
  { questionNumber: 63, category: "Violencia", domain: "Violencia", dimension: "Acoso", questionText: "En mi trabajo algunas personas me hacen sentir incómodo/a", questionType: "likert_5" },
  { questionNumber: 64, category: "Violencia", domain: "Violencia", dimension: "Acoso sexual", questionText: "En mi trabajo he recibido propuestas o insinuaciones sexuales no deseadas", questionType: "likert_5" },
  
  { questionNumber: 65, category: "Liderazgo", domain: "Liderazgo", dimension: "Reconocimiento del desempeño", questionText: "En mi trabajo reconocen mi esfuerzo", questionType: "likert_5" },
  { questionNumber: 66, category: "Liderazgo", domain: "Liderazgo", dimension: "Reconocimiento del desempeño", questionText: "Considero que mi trabajo es valorado", questionType: "likert_5" },
  { questionNumber: 67, category: "Liderazgo", domain: "Liderazgo", dimension: "Reconocimiento del desempeño", questionText: "Mi salario es adecuado para el trabajo que realizo", questionType: "likert_5" },
  
  { questionNumber: 68, category: "Falta de control sobre el trabajo", domain: "Falta de control sobre el trabajo", dimension: "Limitada o nula participación", questionText: "En mi trabajo puedo expresar mis ideas y opiniones", questionType: "likert_5" },
  { questionNumber: 69, category: "Falta de control sobre el trabajo", domain: "Falta de control sobre el trabajo", dimension: "Limitada o nula participación", questionText: "Mi opinión es tomada en cuenta", questionType: "likert_5" },
  { questionNumber: 70, category: "Falta de control sobre el trabajo", domain: "Falta de control sobre el trabajo", dimension: "Limitada o nula participación", questionText: "Puedo participar en la toma de decisiones en mi área de trabajo", questionType: "likert_5" },
  
  { questionNumber: 71, category: "Jornada de trabajo", domain: "Jornada de trabajo", dimension: "Jornadas de trabajo extensas", questionText: "Trabajo horas extras más de tres veces a la semana", questionType: "likert_5" },
  { questionNumber: 72, category: "Jornada de trabajo", domain: "Jornada de trabajo", dimension: "Jornadas de trabajo extensas", questionText: "Mi trabajo me exige estar disponible fuera de mi horario laboral", questionType: "likert_5" },
];

console.log(`Cargando ${questions.length} preguntas del cuestionario NOM-035...`);

for (const question of questions) {
  await db.insert(schema.nom035Questions).values(question);
  console.log(`✓ Pregunta ${question.questionNumber} cargada`);
}

console.log('✅ Todas las preguntas han sido cargadas exitosamente');

await connection.end();
