ALTER TABLE `jobPositions` ADD `catalogPositionId` int;
--> statement-breakpoint
ALTER TABLE `jobPositions` ADD CONSTRAINT `jobPositions_catalogPositionId_positions_id_fk` FOREIGN KEY (`catalogPositionId`) REFERENCES `positions`(`id`) ON DELETE set null ON UPDATE no action;
