ALTER TABLE `company_survey_report` ADD `nombre_centro_trabajo` varchar(255);--> statement-breakpoint
ALTER TABLE `company_survey_report` ADD `domicilio_centro_trabajo` text;--> statement-breakpoint
ALTER TABLE `company_survey_report` ADD `actividad_principal` text;--> statement-breakpoint
ALTER TABLE `company_survey_report` ADD `objetivo_informe` text;--> statement-breakpoint
ALTER TABLE `company_survey_report` ADD `actividades_realizadas` text;--> statement-breakpoint
ALTER TABLE `company_survey_report` ADD `metodo_utilizado` text;--> statement-breakpoint
ALTER TABLE `company_survey_report` ADD `resultados_obtenidos` text;--> statement-breakpoint
ALTER TABLE `company_survey_report` ADD `nivel_riesgo_general` enum('bajo','medio','alto','muy_alto');--> statement-breakpoint
ALTER TABLE `company_survey_report` ADD `conclusiones` text;--> statement-breakpoint
ALTER TABLE `company_survey_report` ADD `recomendaciones` text;--> statement-breakpoint
ALTER TABLE `company_survey_report` ADD `acciones_intervencion` text;--> statement-breakpoint
ALTER TABLE `company_survey_report` ADD `nombre_responsable_evaluacion` varchar(255);--> statement-breakpoint
ALTER TABLE `company_survey_report` ADD `cedula_profesional` varchar(20);