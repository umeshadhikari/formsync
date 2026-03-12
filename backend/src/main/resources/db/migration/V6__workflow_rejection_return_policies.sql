-- ============================================
-- V6: Configurable Rejection & Return Policies
-- ============================================
-- Adds per-journey-rule configuration for:
--   - What happens on rejection (PERMANENT / ALLOW_RESUBMIT)
--   - What happens on return (ALLOW_CORRECTION / ALLOW_RESUBMIT)
--   - Max resubmission attempts
--   - Predefined rejection reason categories
--   - Resubmission tracking on workflow instances and form instances

-- ── 1. Workflow Rules: add rejection/return policies ──
ALTER TABLE fs_workflow_rules
  ADD COLUMN IF NOT EXISTS rejection_policy VARCHAR(30) DEFAULT 'PERMANENT',
  ADD COLUMN IF NOT EXISTS return_policy VARCHAR(30) DEFAULT 'ALLOW_RESUBMIT',
  ADD COLUMN IF NOT EXISTS max_resubmissions INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS rejection_reasons JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS require_rejection_reason BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_return_instructions BOOLEAN DEFAULT true;

-- rejection_policy: PERMANENT (form is permanently rejected, no resubmit)
--                   ALLOW_RESUBMIT (teller can correct and resubmit the rejected form)
-- return_policy:    ALLOW_RESUBMIT (returned form goes back to teller for correction/resubmission)
-- max_resubmissions: maximum number of times a form can be resubmitted (0 = unlimited)
-- rejection_reasons: JSON array of predefined reason strings, e.g. ["Incomplete documentation", "Invalid amount"]
-- require_rejection_reason: whether supervisor must select/provide rejection reason
-- require_return_instructions: whether supervisor must provide correction instructions on return

-- ── 2. Workflow Instances: resubmission tracking ──
ALTER TABLE fs_workflow_instances
  ADD COLUMN IF NOT EXISTS resubmission_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_workflow_id BIGINT,
  ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS return_instructions TEXT;

-- ── 3. Form Instances: resubmission tracking ──
ALTER TABLE fs_form_instances
  ADD COLUMN IF NOT EXISTS resubmission_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_form_id BIGINT,
  ADD COLUMN IF NOT EXISTS last_rejection_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS last_return_instructions TEXT;

-- ── 4. Approval Actions: structured rejection reason ──
ALTER TABLE fs_approval_actions
  ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500);

-- ── 5. Indexes ──
CREATE INDEX IF NOT EXISTS idx_form_instances_original ON fs_form_instances(original_form_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_original ON fs_workflow_instances(original_workflow_id);

-- ── 6. Update existing rules with sensible defaults per journey type ──
-- Cash operations: permanent rejection (financial risk), allow resubmit on return
UPDATE fs_workflow_rules SET
  rejection_policy = 'PERMANENT',
  return_policy = 'ALLOW_RESUBMIT',
  max_resubmissions = 2,
  require_rejection_reason = true,
  require_return_instructions = true,
  rejection_reasons = '["Incomplete documentation","Invalid account details","Suspicious transaction","Amount mismatch","Customer identity not verified","Exceeds daily limit","Compliance violation"]'
WHERE journey_type IN ('CASH_DEPOSIT', 'CASH_WITHDRAWAL');

-- Funds transfer: allow resubmit on rejection (typos common), allow resubmit on return
UPDATE fs_workflow_rules SET
  rejection_policy = 'ALLOW_RESUBMIT',
  return_policy = 'ALLOW_RESUBMIT',
  max_resubmissions = 3,
  require_rejection_reason = true,
  require_return_instructions = true,
  rejection_reasons = '["Invalid beneficiary details","Insufficient funds","SWIFT/routing code error","Sanctions screening failed","Amount exceeds limit","Missing supporting documents"]'
WHERE journey_type IN ('FUNDS_TRANSFER', 'DEMAND_DRAFT');

-- Account operations: allow resubmit (documentation often needs correction)
UPDATE fs_workflow_rules SET
  rejection_policy = 'ALLOW_RESUBMIT',
  return_policy = 'ALLOW_RESUBMIT',
  max_resubmissions = 3,
  require_rejection_reason = true,
  require_return_instructions = true,
  rejection_reasons = '["Incomplete KYC documents","Invalid identification","Address verification failed","Duplicate account detected","Customer not eligible","Missing signatures"]'
WHERE journey_type IN ('ACCOUNT_OPENING', 'ACCOUNT_SERVICING');

-- Loan: permanent rejection (underwriting decision), allow resubmit on return
UPDATE fs_workflow_rules SET
  rejection_policy = 'PERMANENT',
  return_policy = 'ALLOW_RESUBMIT',
  max_resubmissions = 1,
  require_rejection_reason = true,
  require_return_instructions = true,
  rejection_reasons = '["Credit score below threshold","Insufficient collateral","Income verification failed","Debt-to-income ratio exceeded","Incomplete loan documentation","Fraudulent application"]'
WHERE journey_type = 'LOAN_DISBURSEMENT';

-- Fixed deposit: allow resubmit
UPDATE fs_workflow_rules SET
  rejection_policy = 'ALLOW_RESUBMIT',
  return_policy = 'ALLOW_RESUBMIT',
  max_resubmissions = 2,
  require_rejection_reason = true,
  require_return_instructions = true,
  rejection_reasons = '["Invalid tenure selection","Amount below minimum","KYC not current","Account not eligible","Nomination details missing"]'
WHERE journey_type = 'FIXED_DEPOSIT';

-- Cheque book: allow resubmit
UPDATE fs_workflow_rules SET
  rejection_policy = 'ALLOW_RESUBMIT',
  return_policy = 'ALLOW_RESUBMIT',
  max_resubmissions = 2,
  require_rejection_reason = true,
  require_return_instructions = true,
  rejection_reasons = '["Account dormant","Signature mismatch","Insufficient minimum balance","Account restricted"]'
WHERE journey_type = 'CHEQUE_BOOK_REQUEST';

-- Instrument clearing: permanent rejection (external instruments)
UPDATE fs_workflow_rules SET
  rejection_policy = 'PERMANENT',
  return_policy = 'ALLOW_RESUBMIT',
  max_resubmissions = 1,
  require_rejection_reason = true,
  require_return_instructions = true,
  rejection_reasons = '["Cheque dishonoured","Instrument expired","Signature mismatch","Amount in words/figures mismatch","Crossed cheque violation","MICR code invalid"]'
WHERE journey_type = 'INSTRUMENT_CLEARING';
