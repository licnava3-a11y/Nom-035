ALTER TABLE `users` ADD `curp` varchar(18);--> statement-breakpoint
ALTER TABLE `users` ADD `rfc` varchar(13);--> statement-breakpoint
ALTER TABLE `users` ADD `telefono` varchar(15);--> statement-breakpoint
ALTER TABLE `users` ADD `fechaNacimiento` date;--> statement-breakpoint
ALTER TABLE `users` ADD `sexo` enum('Masculino','Femenino','Otro');--> statement-breakpoint
ALTER TABLE `users` ADD `estadoCivil` enum('Soltero(a)','Casado(a)','Divorciado(a)','Viudo(a)','Unión libre');--> statement-breakpoint
ALTER TABLE `users` ADD `puesto` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `departamento` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `fechaIngreso` date;--> statement-breakpoint
ALTER TABLE `users` ADD `tipoContrato` enum('Planta','Temporal','Por obra','Honorarios','Otro');--> statement-breakpoint
ALTER TABLE `users` ADD `jornadaLaboral` enum('Diurna','Nocturna','Mixta','Por turnos');--> statement-breakpoint
ALTER TABLE `users` ADD `direccion` text;--> statement-breakpoint
ALTER TABLE `users` ADD `ultimoGradoEstudios` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `nombreCarrera` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `habilidadesTransversales` text;--> statement-breakpoint
ALTER TABLE `users` ADD `habilidadesLongitudinales` text;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_curp_unique` UNIQUE(`curp`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_rfc_unique` UNIQUE(`rfc`);