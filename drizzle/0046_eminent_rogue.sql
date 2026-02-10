ALTER TABLE `correctiveActions` ADD `surveyPeriodId` int;--> statement-breakpoint
ALTER TABLE `correctiveActions` ADD `actionLevel` enum('organizacional','grupal','individual') NOT NULL;--> statement-breakpoint
ALTER TABLE `correctiveActions` ADD `targetScope` int;--> statement-breakpoint
ALTER TABLE `correctiveActions` ADD `atsDetected` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `correctiveActions` ADD `sourceGuide` enum('guia_i','guia_ii','guia_iii');