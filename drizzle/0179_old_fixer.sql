CREATE INDEX `idx_corrective_actions_status_due_date` ON `correctiveActions` (`status`,`dueDate`);--> statement-breakpoint
CREATE INDEX `idx_corrective_actions_responsible_user_id` ON `correctiveActions` (`responsibleUserId`);--> statement-breakpoint
CREATE INDEX `idx_corrective_actions_survey_response_id` ON `correctiveActions` (`surveyResponseId`);--> statement-breakpoint
CREATE INDEX `idx_corrective_actions_survey_period_id` ON `correctiveActions` (`surveyPeriodId`);--> statement-breakpoint
CREATE INDEX `idx_corrective_actions_target_scope` ON `correctiveActions` (`targetScope`);