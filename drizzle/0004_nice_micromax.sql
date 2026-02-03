ALTER TABLE `committeeMembers` ADD `employeeId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `committeeMembers` ADD CONSTRAINT `committeeMembers_employeeId_unique` UNIQUE(`employeeId`);