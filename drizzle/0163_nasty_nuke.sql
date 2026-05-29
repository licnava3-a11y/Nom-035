CREATE TABLE `nom035_action_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action_id` int NOT NULL,
	`plan_id` int,
	`campo` enum('estado','responsable','plazo','prioridad','objetivo','observaciones','evidencia_agregada','evidencia_eliminada','creacion') NOT NULL,
	`valor_anterior` text,
	`valor_nuevo` text,
	`changed_by_user_id` int,
	`changed_by_name` varchar(255),
	`changed_by_email` varchar(320),
	`nota` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nom035_action_history_id` PRIMARY KEY(`id`)
);
