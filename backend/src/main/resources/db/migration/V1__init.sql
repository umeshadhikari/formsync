-- FormSync Database Schema
-- V1: Initial schema

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================
CREATE TABLE fs_users (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(200) NOT NULL,
    email           VARCHAR(200),
    phone           VARCHAR(50),
    role            VARCHAR(50) NOT NULL DEFAULT 'MAKER',
    branch_code     VARCHAR(20) NOT NULL DEFAULT 'HQ001',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE fs_role_mappings (
    id                BIGSERIAL PRIMARY KEY,
    bank_role         VARCHAR(100) NOT NULL,
    formsync_role     VARCHAR(50) NOT NULL,
    permissions       JSONB NOT NULL DEFAULT '[]',
    branch_scope      VARCHAR(20),
    journey_scope     JSONB,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- FORM TEMPLATES (BUILDER OUTPUT)
-- ============================================
CREATE TABLE fs_form_templates (
    id              BIGSERIAL PRIMARY KEY,
    form_code       VARCHAR(50) NOT NULL,
    version         INTEGER NOT NULL DEFAULT 1,
    journey_type    VARCHAR(50) NOT NULL,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    schema          JSONB NOT NULL,
    approval_config JSONB,
    cbs_mapping     JSONB,
    dms_config      JSONB,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_by      VARCHAR(100),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(form_code, version)
);

CREATE INDEX idx_form_templates_journey ON fs_form_templates(journey_type);
CREATE INDEX idx_form_templates_status ON fs_form_templates(status);

-- ============================================
-- FORM INSTANCES (SUBMITTED FORMS)
-- ============================================
CREATE TABLE fs_form_instances (
    id                  BIGSERIAL PRIMARY KEY,
    reference_number    VARCHAR(50) NOT NULL UNIQUE,
    template_id         BIGINT NOT NULL REFERENCES fs_form_templates(id),
    template_version    INTEGER NOT NULL,
    journey_type        VARCHAR(50) NOT NULL,
    form_data           JSONB NOT NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    branch_code         VARCHAR(20) NOT NULL,
    customer_id         VARCHAR(50),
    customer_name       VARCHAR(200),
    amount              DECIMAL(18,2),
    currency            VARCHAR(3) DEFAULT 'KES',
    created_by          VARCHAR(100) NOT NULL,
    submitted_at        TIMESTAMP,
    completed_at        TIMESTAMP,
    cbs_reference       VARCHAR(100),
    cbs_response        JSONB,
    dms_reference       VARCHAR(100),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_form_instances_status ON fs_form_instances(status);
CREATE INDEX idx_form_instances_branch ON fs_form_instances(branch_code);
CREATE INDEX idx_form_instances_journey ON fs_form_instances(journey_type);
CREATE INDEX idx_form_instances_created_by ON fs_form_instances(created_by);

-- ============================================
-- WORKFLOW INSTANCES
-- ============================================
CREATE TABLE fs_workflow_instances (
    id                      BIGSERIAL PRIMARY KEY,
    form_instance_id        BIGINT NOT NULL REFERENCES fs_form_instances(id),
    process_instance_id     VARCHAR(100),
    current_state           VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    current_tier            INTEGER NOT NULL DEFAULT 0,
    required_tiers          INTEGER NOT NULL DEFAULT 1,
    approval_mode           VARCHAR(20) NOT NULL DEFAULT 'SEQUENTIAL',
    sla_deadline            TIMESTAMP,
    escalated               BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_state ON fs_workflow_instances(current_state);
CREATE INDEX idx_workflow_form ON fs_workflow_instances(form_instance_id);

-- ============================================
-- APPROVAL ACTIONS (IMMUTABLE HISTORY)
-- ============================================
CREATE TABLE fs_approval_actions (
    id                  BIGSERIAL PRIMARY KEY,
    workflow_id         BIGINT NOT NULL REFERENCES fs_workflow_instances(id),
    form_instance_id    BIGINT NOT NULL REFERENCES fs_form_instances(id),
    tier                INTEGER NOT NULL,
    action              VARCHAR(20) NOT NULL,
    actor_id            VARCHAR(100) NOT NULL,
    actor_name          VARCHAR(200),
    actor_role          VARCHAR(50),
    comments            TEXT,
    signature_id        BIGINT,
    metadata            JSONB,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_workflow ON fs_approval_actions(workflow_id);

-- ============================================
-- DIGITAL SIGNATURES
-- ============================================
CREATE TABLE fs_digital_signatures (
    id                  BIGSERIAL PRIMARY KEY,
    form_instance_id    BIGINT NOT NULL REFERENCES fs_form_instances(id),
    signer_type         VARCHAR(20) NOT NULL,
    signer_identity     VARCHAR(200) NOT NULL,
    signature_svg       TEXT,
    signature_png       TEXT,
    data_hash           VARCHAR(128) NOT NULL,
    device_info         VARCHAR(500),
    ip_address          VARCHAR(50),
    timestamp           TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE fs_audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       VARCHAR(100),
    action          VARCHAR(50) NOT NULL,
    actor_id        VARCHAR(100),
    actor_name      VARCHAR(200),
    actor_role      VARCHAR(50),
    ip_address      VARCHAR(50),
    branch_code     VARCHAR(20),
    details         JSONB,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON fs_audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON fs_audit_logs(actor_id);
CREATE INDEX idx_audit_created ON fs_audit_logs(created_at);

-- ============================================
-- THEME CONFIGURATION
-- ============================================
CREATE TABLE fs_theme_configs (
    id              BIGSERIAL PRIMARY KEY,
    bank_id         VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
    name            VARCHAR(100) NOT NULL,
    css_url         VARCHAR(500),
    design_tokens   JSONB NOT NULL DEFAULT '{}',
    logo_url        VARCHAR(500),
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- WORKFLOW RULES (CONFIGURABLE APPROVAL ROUTING)
-- ============================================
CREATE TABLE fs_workflow_rules (
    id              BIGSERIAL PRIMARY KEY,
    rule_name       VARCHAR(200) NOT NULL,
    journey_type    VARCHAR(50) NOT NULL,
    condition_field VARCHAR(50) NOT NULL DEFAULT 'amount',
    condition_op    VARCHAR(10) NOT NULL DEFAULT 'GT',
    condition_value VARCHAR(100) NOT NULL,
    required_tiers  INTEGER NOT NULL DEFAULT 1,
    approval_mode   VARCHAR(20) NOT NULL DEFAULT 'SEQUENTIAL',
    tier_roles      JSONB NOT NULL DEFAULT '["CHECKER"]',
    priority        INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_rules_journey ON fs_workflow_rules(journey_type, is_active);

-- ============================================
-- SEED DATA: DEMO USERS
-- ============================================
-- Passwords are BCrypt hash of 'demo123'
INSERT INTO fs_users (username, password_hash, full_name, email, role, branch_code) VALUES
('teller1', '$2b$10$N6GK3iUy.cFLpF8jv5QXYOnG7UMaCwogG1sAFedHoJK3r8sskl5yG', 'Alice Mwangi', 'alice@bank.co.ke', 'MAKER', 'NRB001'),
('teller2', '$2b$10$N6GK3iUy.cFLpF8jv5QXYOnG7UMaCwogG1sAFedHoJK3r8sskl5yG', 'Bob Ochieng', 'bob@bank.co.ke', 'MAKER', 'NRB001'),
('supervisor1', '$2b$10$N6GK3iUy.cFLpF8jv5QXYOnG7UMaCwogG1sAFedHoJK3r8sskl5yG', 'Carol Wanjiku', 'carol@bank.co.ke', 'CHECKER', 'NRB001'),
('manager1', '$2b$10$N6GK3iUy.cFLpF8jv5QXYOnG7UMaCwogG1sAFedHoJK3r8sskl5yG', 'David Kamau', 'david@bank.co.ke', 'BRANCH_MANAGER', 'NRB001'),
('admin1', '$2b$10$N6GK3iUy.cFLpF8jv5QXYOnG7UMaCwogG1sAFedHoJK3r8sskl5yG', 'Eve Njeri', 'eve@bank.co.ke', 'SYSTEM_ADMIN', 'HQ001'),
('auditor1', '$2b$10$N6GK3iUy.cFLpF8jv5QXYOnG7UMaCwogG1sAFedHoJK3r8sskl5yG', 'Frank Kiprop', 'frank@bank.co.ke', 'AUDITOR', 'HQ001'),
('opsadmin1', '$2b$10$N6GK3iUy.cFLpF8jv5QXYOnG7UMaCwogG1sAFedHoJK3r8sskl5yG', 'Grace Akinyi', 'grace@bank.co.ke', 'OPS_ADMIN', 'HQ001');

-- ============================================
-- SEED DATA: ROLE MAPPINGS
-- ============================================
INSERT INTO fs_role_mappings (bank_role, formsync_role, permissions) VALUES
('Branch Teller', 'MAKER', '["FORM_CREATE","FORM_SUBMIT","FORM_VIEW_OWN"]'),
('Senior Teller', 'SENIOR_MAKER', '["FORM_CREATE","FORM_SUBMIT","FORM_VIEW_OWN","APPROVE_TIER1"]'),
('Branch Supervisor', 'CHECKER', '["FORM_VIEW_BRANCH","APPROVE_TIER1","APPROVE_TIER2","QUEUE_VIEW","BULK_APPROVE"]'),
('Branch Manager', 'BRANCH_MANAGER', '["FORM_VIEW_BRANCH","APPROVE_TIER1","APPROVE_TIER2","APPROVE_TIER3","QUEUE_VIEW","BRANCH_CONFIG","DELEGATION"]'),
('Operations Head', 'OPS_ADMIN', '["DASHBOARD_ALL","SLA_MONITOR","ESCALATION_OVERRIDE","CROSS_BRANCH"]'),
('IT Admin', 'SYSTEM_ADMIN', '["FORM_BUILDER","WORKFLOW_CONFIG","THEME_MANAGE","USER_MANAGE","ROLE_MAPPING"]'),
('Auditor', 'AUDITOR', '["AUDIT_VIEW","COMPLIANCE_REPORT"]');

-- ============================================
-- SEED DATA: WORKFLOW RULES
-- ============================================
INSERT INTO fs_workflow_rules (rule_name, journey_type, condition_field, condition_op, condition_value, required_tiers, approval_mode, tier_roles, priority) VALUES
('Cash Deposit Standard', 'CASH_DEPOSIT', 'amount', 'LTE', '500000', 1, 'SEQUENTIAL', '["CHECKER"]', 10),
('Cash Deposit Supervisor', 'CASH_DEPOSIT', 'amount', 'GT', '500000', 1, 'SEQUENTIAL', '["CHECKER"]', 20),
('Cash Deposit High Value', 'CASH_DEPOSIT', 'amount', 'GT', '1000000', 2, 'SEQUENTIAL', '["CHECKER","BRANCH_MANAGER"]', 30),
('Cash Withdrawal Standard', 'CASH_WITHDRAWAL', 'amount', 'LTE', '500000', 1, 'SEQUENTIAL', '["CHECKER"]', 10),
('Cash Withdrawal Supervisor', 'CASH_WITHDRAWAL', 'amount', 'GT', '500000', 1, 'SEQUENTIAL', '["CHECKER"]', 20),
('Cash Withdrawal High Value', 'CASH_WITHDRAWAL', 'amount', 'GT', '1000000', 3, 'SEQUENTIAL', '["CHECKER","BRANCH_MANAGER","OPS_ADMIN"]', 30),
('Funds Transfer All', 'FUNDS_TRANSFER', 'amount', 'GT', '0', 1, 'SEQUENTIAL', '["CHECKER"]', 10),
('Funds Transfer RTGS', 'FUNDS_TRANSFER', 'amount', 'GT', '1000000', 2, 'SEQUENTIAL', '["CHECKER","BRANCH_MANAGER"]', 20),
('Demand Draft All', 'DEMAND_DRAFT', 'amount', 'GT', '0', 1, 'SEQUENTIAL', '["CHECKER"]', 10),
('Account Servicing All', 'ACCOUNT_SERVICING', 'amount', 'GTE', '0', 1, 'SEQUENTIAL', '["CHECKER"]', 10),
('Fixed Deposit All', 'FIXED_DEPOSIT', 'amount', 'GT', '0', 1, 'SEQUENTIAL', '["CHECKER"]', 10),
('Fixed Deposit High Value', 'FIXED_DEPOSIT', 'amount', 'GT', '5000000', 2, 'SEQUENTIAL', '["CHECKER","BRANCH_MANAGER"]', 20),
('Loan Disbursement All', 'LOAN_DISBURSEMENT', 'amount', 'GT', '0', 2, 'SEQUENTIAL', '["CHECKER","BRANCH_MANAGER"]', 10),
('Cheque Book All', 'CHEQUE_BOOK_REQUEST', 'amount', 'GTE', '0', 1, 'SEQUENTIAL', '["CHECKER"]', 10),
('Account Opening All', 'ACCOUNT_OPENING', 'amount', 'GTE', '0', 1, 'SEQUENTIAL', '["CHECKER"]', 10),
('Instrument Clearing All', 'INSTRUMENT_CLEARING', 'amount', 'GT', '0', 1, 'SEQUENTIAL', '["CHECKER"]', 10);

-- ============================================
-- SEED DATA: DEFAULT THEME
-- ============================================
INSERT INTO fs_theme_configs (bank_id, name, design_tokens, is_active) VALUES
('DEFAULT', 'FormSync Default', '{
  "primaryColor": "#1B4F72",
  "secondaryColor": "#2C3E50",
  "accentColor": "#3498DB",
  "successColor": "#27AE60",
  "warningColor": "#F39C12",
  "dangerColor": "#E74C3C",
  "backgroundColor": "#F8F9FA",
  "surfaceColor": "#FFFFFF",
  "textPrimary": "#2C3E50",
  "textSecondary": "#7F8C8D",
  "fontFamily": "Inter, Arial, sans-serif",
  "borderRadius": "8px",
  "headerGradient": "linear-gradient(135deg, #1B4F72, #2C3E50)"
}', true);
