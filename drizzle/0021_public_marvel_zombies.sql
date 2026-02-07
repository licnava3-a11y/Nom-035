CREATE TABLE `alertLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alertType` varchar(50) NOT NULL,
	`surveyId` int NOT NULL,
	`triggeredAt` timestamp NOT NULL DEFAULT (now()),
	`details` text,
	`notificationSent` boolean NOT NULL DEFAULT false,
	`notificationError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alertLogs_id` PRIMARY KEY(`id`)
);
