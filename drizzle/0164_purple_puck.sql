CREATE TABLE `nom035_evidence_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`action_id` int NOT NULL,
	`plan_id` int NOT NULL,
	`descripcion_esperada` text,
	`created_by_user_id` int NOT NULL,
	`created_by_name` varchar(255),
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`max_uses` int NOT NULL DEFAULT 1,
	`use_count` int NOT NULL DEFAULT 0,
	`signer_name` varchar(255),
	`signer_email` varchar(320),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nom035_evidence_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `nom035_evidence_tokens_token_unique` UNIQUE(`token`)
);
