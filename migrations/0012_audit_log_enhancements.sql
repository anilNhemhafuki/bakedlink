
-- Migration: Enhanced audit log constraints for tamper evidence and compliance

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_timestamp" ON "audit_logs" ("user_id", "timestamp");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action_resource" ON "audit_logs" ("action", "resource");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_status" ON "audit_logs" ("status");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_ip_timestamp" ON "audit_logs" ("ip_address", "timestamp");

-- Add check constraints for data integrity
ALTER TABLE "audit_logs" ADD CONSTRAINT "chk_audit_logs_action_valid" 
  CHECK ("action" IN ('CREATE', 'UPDATE', 'DELETE', 'READ', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT', 'IMPORT', 'ERROR'));

ALTER TABLE "audit_logs" ADD CONSTRAINT "chk_audit_logs_status_valid" 
  CHECK ("status" IN ('success', 'failed', 'error'));

ALTER TABLE "audit_logs" ADD CONSTRAINT "chk_audit_logs_timestamp_valid" 
  CHECK ("timestamp" <= NOW() + INTERVAL '1 hour'); -- Prevent future timestamps

-- Add NOT NULL constraints for critical fields
ALTER TABLE "audit_logs" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "user_email" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "user_name" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "action" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "resource" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "ip_address" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "timestamp" SET NOT NULL;

-- Create immutability trigger (prevents modification/deletion)
CREATE OR REPLACE FUNCTION prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted for compliance reasons';
END;
$$ LANGUAGE plpgsql;

-- Apply immutability trigger
DROP TRIGGER IF EXISTS audit_logs_immutable_trigger ON "audit_logs";
CREATE TRIGGER audit_logs_immutable_trigger
    BEFORE UPDATE OR DELETE ON "audit_logs"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_tampering();

-- Create audit log archival view for compliance reporting
CREATE OR REPLACE VIEW audit_compliance_view AS
SELECT 
    id,
    user_id,
    user_email,
    user_name,
    action,
    resource,
    resource_id,
    timestamp,
    status,
    ip_address,
    CASE 
        WHEN action IN ('DELETE', 'UPDATE') AND resource IN ('users', 'settings') THEN 'HIGH'
        WHEN action = 'LOGIN' AND status = 'failed' THEN 'MEDIUM'
        ELSE 'LOW'
    END as risk_level,
    DATE_TRUNC('day', timestamp) as audit_date
FROM audit_logs
ORDER BY timestamp DESC;

-- Grant appropriate permissions
GRANT SELECT ON audit_compliance_view TO postgres;

COMMENT ON TABLE "audit_logs" IS 'Immutable audit trail for compliance and security monitoring';
COMMENT ON TRIGGER audit_logs_immutable_trigger ON "audit_logs" IS 'Ensures audit logs cannot be tampered with for compliance';
