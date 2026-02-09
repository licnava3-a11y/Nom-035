CREATE TABLE `department_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`departmentId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`code` varchar(50),
	`parentId` int,
	`managerId` int,
	`isActive` boolean NOT NULL,
	`changeType` enum('created','updated','deleted') NOT NULL,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	`changedBy` int,
	CONSTRAINT `department_history_id` PRIMARY KEY(`id`)
);
