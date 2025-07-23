
-- Migration: Add audit logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"user_name" varchar(200) NOT NULL,
	"action" varchar(100) NOT NULL,
	"resource" varchar(100) NOT NULL,
	"resource_id" varchar(100),
	"details" jsonb,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now(),
	"status" varchar(20) DEFAULT 'success',
	"error_message" text
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs" ("resource");
CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs" ("timestamp");
CREATE INDEX IF NOT EXISTS "audit_logs_status_idx" ON "audit_logs" ("status");
