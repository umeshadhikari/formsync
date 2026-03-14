-- V7: Permission-driven tab visibility
-- All tab access is now controlled by permissions in this table, not hardcoded role checks.
-- Admins can reassign any permission to any role via the Admin panel.
--
-- Tab → Permission mapping:
--   My Submissions  → FORM_CREATE
--   Approvals       → QUEUE_VIEW
--   Form Builder    → FORM_BUILDER
--   Audit Logs      → AUDIT_VIEW
--   Admin           → USER_MANAGE

-- SENIOR_MAKER: add QUEUE_VIEW (sees Approvals tab for tier-1 approvals)
UPDATE fs_role_mappings
SET permissions = '["FORM_CREATE","FORM_SUBMIT","FORM_VIEW_OWN","APPROVE_TIER1","QUEUE_VIEW"]'
WHERE formsync_role = 'SENIOR_MAKER';

-- CHECKER: add FORM_CREATE, FORM_SUBMIT (can also submit forms, not just approve)
UPDATE fs_role_mappings
SET permissions = '["FORM_CREATE","FORM_SUBMIT","FORM_VIEW_BRANCH","APPROVE_TIER1","APPROVE_TIER2","QUEUE_VIEW","BULK_APPROVE"]'
WHERE formsync_role = 'CHECKER';

-- BRANCH_MANAGER: add FORM_CREATE, FORM_SUBMIT, FORM_BUILDER, AUDIT_VIEW
UPDATE fs_role_mappings
SET permissions = '["FORM_CREATE","FORM_SUBMIT","FORM_VIEW_BRANCH","APPROVE_TIER1","APPROVE_TIER2","APPROVE_TIER3","QUEUE_VIEW","BRANCH_CONFIG","DELEGATION","FORM_BUILDER","AUDIT_VIEW"]'
WHERE formsync_role = 'BRANCH_MANAGER';

-- OPS_ADMIN: add FORM_CREATE, FORM_SUBMIT, QUEUE_VIEW, FORM_BUILDER, AUDIT_VIEW
UPDATE fs_role_mappings
SET permissions = '["FORM_CREATE","FORM_SUBMIT","DASHBOARD_ALL","SLA_MONITOR","ESCALATION_OVERRIDE","CROSS_BRANCH","QUEUE_VIEW","FORM_BUILDER","AUDIT_VIEW"]'
WHERE formsync_role = 'OPS_ADMIN';

-- SYSTEM_ADMIN: add AUDIT_VIEW (IT admin can view audit trail)
UPDATE fs_role_mappings
SET permissions = '["FORM_BUILDER","WORKFLOW_CONFIG","THEME_MANAGE","USER_MANAGE","ROLE_MAPPING","AUDIT_VIEW"]'
WHERE formsync_role = 'SYSTEM_ADMIN';
