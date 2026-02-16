ALTER TABLE `company_digital_signature` MODIFY COLUMN `departamento` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `correctiveActions` MODIFY COLUMN `departamento` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `equality_affirmative_actions` MODIFY COLUMN `departamento` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `equality_salary_gap` MODIFY COLUMN `departamento` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `departamento` varchar(255) NOT NULL;