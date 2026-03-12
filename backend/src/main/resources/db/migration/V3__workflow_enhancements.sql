-- V3: Workflow enhancements - SLA, Escalation, Rule refinements

-- Add SLA and escalation columns
ALTER TABLE fs_workflow_rules ADD COLUMN IF NOT EXISTS sla_minutes INTEGER DEFAULT 30;
ALTER TABLE fs_workflow_rules ADD COLUMN IF NOT EXISTS escalation_tier INTEGER;

-- Update Account Opening to match spec: Parallel Tier 1 + Tier 2
UPDATE fs_workflow_rules SET required_tiers = 2, approval_mode = 'PARALLEL', tier_roles = '["CHECKER","BRANCH_MANAGER"]' WHERE rule_name = 'Account Opening All';

-- Add Cash Withdrawal Medium tier (500K-1M = 2 tiers per spec)
INSERT INTO fs_workflow_rules (rule_name, journey_type, condition_field, condition_op, condition_value, required_tiers, approval_mode, tier_roles, priority, sla_minutes, escalation_tier)
VALUES ('Cash Withdrawal Medium Value', 'CASH_WITHDRAWAL', 'amount', 'GT', '500000', 2, 'SEQUENTIAL', '["CHECKER","BRANCH_MANAGER"]', 25, 15, 3);

-- Set SLA minutes based on risk
UPDATE fs_workflow_rules SET sla_minutes = 15 WHERE rule_name LIKE '%High Value%';
UPDATE fs_workflow_rules SET sla_minutes = 30 WHERE sla_minutes IS NULL;

-- Set escalation tiers
UPDATE fs_workflow_rules SET escalation_tier = 2 WHERE required_tiers = 1;
UPDATE fs_workflow_rules SET escalation_tier = 3 WHERE required_tiers = 2;
UPDATE fs_workflow_rules SET escalation_tier = 3 WHERE required_tiers = 3;
