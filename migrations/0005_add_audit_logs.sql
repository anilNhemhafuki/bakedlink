
-- Migration: Enhanced audit logs table with security fields
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
	"error_message" text,
	"session_id" varchar(255),
	"request_id" varchar(255),
	"correlation_id" varchar(255),
	"security_level" varchar(20) DEFAULT 'normal',
	"compliance_flags" jsonb
);

-- Enhanced login logs table
CREATE TABLE IF NOT EXISTS "login_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"login_time" timestamp DEFAULT now(),
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text,
	"status" varchar(20) DEFAULT 'success',
	"failure_reason" text,
	"device_type" varchar(50),
	"browser" varchar(100),
	"location" varchar(200),
	"session_id" varchar(255),
	"timestamp" timestamp DEFAULT now(),
	"two_factor_used" boolean DEFAULT false,
	"risk_score" integer DEFAULT 0
);

-- Create comprehensive indexes for performance and security monitoring
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs" ("resource");
CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs" ("timestamp");
CREATE INDEX IF NOT EXISTS "audit_logs_status_idx" ON "audit_logs" ("status");
CREATE INDEX IF NOT EXISTS "audit_logs_ip_address_idx" ON "audit_logs" ("ip_address");
CREATE INDEX IF NOT EXISTS "audit_logs_security_level_idx" ON "audit_logs" ("security_level");
CREATE INDEX IF NOT EXISTS "audit_logs_user_timestamp_idx" ON "audit_logs" ("user_id", "timestamp");

CREATE INDEX IF NOT EXISTS "login_logs_user_id_idx" ON "login_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "login_logs_timestamp_idx" ON "login_logs" ("timestamp");
CREATE INDEX IF NOT EXISTS "login_logs_status_idx" ON "login_logs" ("status");
CREATE INDEX IF NOT EXISTS "login_logs_ip_address_idx" ON "login_logs" ("ip_address");
CREATE INDEX IF NOT EXISTS "login_logs_risk_score_idx" ON "login_logs" ("risk_score");

-- Create trigger to prevent audit log modifications (immutability)
CREATE OR REPLACE FUNCTION prevent_audit_modifications()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable_trigger
    BEFORE UPDATE OR DELETE ON "audit_logs"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modifications();

CREATE TRIGGER login_logs_immutable_trigger
    BEFORE UPDATE OR DELETE ON "login_logs"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modifications();

-- Create view for security dashboard
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
    DATE(timestamp) as log_date,
    COUNT(*) as total_activities,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_activities,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips,
    COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as delete_operations,
    COUNT(CASE WHEN security_level = 'high' THEN 1 END) as high_security_events
FROM audit_logs 
GROUP BY DATE(timestamp)
ORDER BY log_date DESC;
