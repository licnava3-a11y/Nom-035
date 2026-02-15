ALTER TABLE `correctiveActions` ADD `source_guide` enum('guia_i','guia_ii','guia_iii');--> statement-breakpoint
ALTER TABLE `correctiveActions` DROP COLUMN `sourceGuide`;