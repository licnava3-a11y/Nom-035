CREATE TABLE `employeeDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`documentType` enum('contrato','identificacion','comprobante_domicilio','acta_nacimiento','curp','rfc','nss','certificado_estudios','carta_recomendacion','examen_medico','carta_antecedentes','otro') NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int,
	`mimeType` varchar(100),
	`uploadedBy` int NOT NULL,
	`notes` text,
	`expirationDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employeeDocuments_id` PRIMARY KEY(`id`)
);
