ALTER TABLE `employeeDocuments` MODIFY COLUMN `documentType` enum('ine','curp_document','rfc_document','nss_document','birth_certificate','proof_of_address','contract','job_offer','resignation','termination','recommendation','diploma','certificate','medical_exam','background_check','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `employeeDocuments` MODIFY COLUMN `fileUrl` varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE `employeeDocuments` MODIFY COLUMN `fileSize` int NOT NULL;--> statement-breakpoint
ALTER TABLE `employeeDocuments` MODIFY COLUMN `mimeType` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `employeeDocuments` ADD `fileKey` varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE `employeeDocuments` ADD `expiresAt` date;--> statement-breakpoint
ALTER TABLE `employeeDocuments` ADD `status` enum('vigente','por_vencer','vencido') DEFAULT 'vigente' NOT NULL;--> statement-breakpoint
ALTER TABLE `employeeDocuments` ADD `uploadedAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `employeeDocuments` DROP COLUMN `expirationDate`;