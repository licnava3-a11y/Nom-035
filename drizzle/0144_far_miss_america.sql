ALTER TABLE `correctiveActions` ADD `startDate` date;--> statement-breakpoint
ALTER TABLE `correctiveActions` ADD `clinicalTitle` enum('medico','psicologo','psiquiatra');--> statement-breakpoint
ALTER TABLE `correctiveActions` ADD `cedulaProfesional` varchar(20);