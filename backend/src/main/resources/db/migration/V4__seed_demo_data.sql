-- FormSync V4: Seed comprehensive demo data for all screens
-- Creates realistic form submissions across multiple journeys, statuses, and branches

-- ============================================
-- FORM INSTANCES (25 submissions across journeys)
-- ============================================

-- === COMPLETED forms (8) - full lifecycle done ===

-- 1. Cash Deposit - 250,000 KES (auto-approved, completed)
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, completed_at, cbs_reference, cbs_response, dms_reference, created_at)
VALUES ('FS-CD-20260301-001', 1, 1, 'CASH_DEPOSIT',
'{"accountNumber":"0110298374","accountName":"James Kariuki","accountType":"Savings","branchCode":"NRB001","depositAmount":"250000","currency":"KES","depositorName":"James Kariuki","depositorId":"29384756","idType":"National ID","sourceOfFunds":"Business Income","narration":"Monthly business deposit","denomination500":"200","denomination1000":"150"}',
'COMPLETED', 'NRB001', 'CUST001', 'James Kariuki', 250000.00, 'KES', 'teller1',
NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days',
'CBS-T24-20260301-8834', '{"status":"SUCCESS","t24Reference":"FT2603018834","message":"Transaction posted successfully"}',
'DMS-20260301-4421', NOW() - INTERVAL '7 days');

-- 2. Cash Deposit - 750,000 KES (supervisor approved, completed)
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, completed_at, cbs_reference, cbs_response, dms_reference, created_at)
VALUES ('FS-CD-20260302-002', 1, 1, 'CASH_DEPOSIT',
'{"accountNumber":"0110445521","accountName":"Mary Wambui","accountType":"Current","branchCode":"NRB001","depositAmount":"750000","currency":"KES","depositorName":"Mary Wambui","depositorId":"31298765","idType":"Passport","sourceOfFunds":"Property Sale","narration":"Property sale proceeds","denomination1000":"750"}',
'COMPLETED', 'NRB001', 'CUST002', 'Mary Wambui', 750000.00, 'KES', 'teller1',
NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days',
'CBS-T24-20260302-9102', '{"status":"SUCCESS","t24Reference":"FT2603029102","message":"Transaction posted successfully"}',
'DMS-20260302-4498', NOW() - INTERVAL '6 days');

-- 3. Cash Withdrawal - 100,000 KES (auto-approved, completed)
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, completed_at, cbs_reference, cbs_response, dms_reference, created_at)
VALUES ('FS-CW-20260303-003', 2, 1, 'CASH_WITHDRAWAL',
'{"accountNumber":"0110298374","accountName":"James Kariuki","accountType":"Savings","branchCode":"NRB001","withdrawalAmount":"100000","currency":"KES","withdrawerName":"James Kariuki","idNumber":"29384756","idType":"National ID","narration":"Business expenses"}',
'COMPLETED', 'NRB001', 'CUST001', 'James Kariuki', 100000.00, 'KES', 'teller2',
NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days',
'CBS-T24-20260303-7756', '{"status":"SUCCESS","t24Reference":"FT2603037756","message":"Withdrawal processed"}',
'DMS-20260303-4501', NOW() - INTERVAL '5 days');

-- 4. Funds Transfer - 500,000 KES (supervisor approved, completed)
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, completed_at, cbs_reference, cbs_response, dms_reference, created_at)
VALUES ('FS-FT-20260304-004', 3, 1, 'FUNDS_TRANSFER',
'{"senderAccount":"0110298374","senderName":"James Kariuki","beneficiaryAccount":"0220887654","beneficiaryName":"Peter Njuguna","beneficiaryBank":"Kenya Commercial Bank","transferAmount":"500000","currency":"KES","transferType":"Internal","purpose":"Loan repayment","narration":"March loan payment"}',
'COMPLETED', 'NRB001', 'CUST001', 'James Kariuki', 500000.00, 'KES', 'teller1',
NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days',
'CBS-T24-20260304-6623', '{"status":"SUCCESS","t24Reference":"FT2603046623","message":"Transfer completed"}',
'DMS-20260304-4520', NOW() - INTERVAL '4 days');

-- 5. Account Servicing - Address change (completed)
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, completed_at, cbs_reference, cbs_response, dms_reference, created_at)
VALUES ('FS-AS-20260305-005', 5, 1, 'ACCOUNT_SERVICING',
'{"accountNumber":"0110445521","accountName":"Mary Wambui","serviceType":"Address Change","currentAddress":"123 Moi Avenue, Nairobi","newAddress":"456 Uhuru Highway, Nairobi","contactPhone":"+254722334455","email":"mary.wambui@email.com","reason":"Relocation"}',
'COMPLETED', 'NRB001', 'CUST002', 'Mary Wambui', 0.00, 'KES', 'teller2',
NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days',
'CBS-T24-20260305-5590', '{"status":"SUCCESS","t24Reference":"AS2603055590","message":"Address updated"}',
'DMS-20260305-4533', NOW() - INTERVAL '4 days');

-- 6. Demand Draft - 200,000 KES (completed)
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, completed_at, cbs_reference, cbs_response, dms_reference, created_at)
VALUES ('FS-DD-20260306-006', 4, 1, 'DEMAND_DRAFT',
'{"applicantAccount":"0110667788","applicantName":"Samuel Otieno","beneficiaryName":"Kenya Power & Lighting","amount":"200000","currency":"KES","purpose":"Utility payment","deliveryMode":"Counter Collection","urgency":"Normal"}',
'COMPLETED', 'NRB001', 'CUST003', 'Samuel Otieno', 200000.00, 'KES', 'teller1',
NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days',
'CBS-T24-20260306-4478', '{"status":"SUCCESS","t24Reference":"DD2603064478","message":"Draft issued","ddNumber":"DD-NRB-0025678"}',
'DMS-20260306-4545', NOW() - INTERVAL '3 days');

-- 7. Cheque Book Request (completed)
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, completed_at, cbs_reference, cbs_response, dms_reference, created_at)
VALUES ('FS-CB-20260307-007', 8, 1, 'CHEQUE_BOOK_REQUEST',
'{"accountNumber":"0110298374","accountName":"James Kariuki","accountType":"Current","numberOfLeaves":"50","chequeType":"Standard","deliveryMode":"Branch Pickup","contactPhone":"+254711223344"}',
'COMPLETED', 'NRB001', 'CUST001', 'James Kariuki', 0.00, 'KES', 'teller2',
NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days',
'CBS-T24-20260307-3365', '{"status":"SUCCESS","t24Reference":"CB2603073365","message":"Cheque book request processed"}',
'DMS-20260307-4558', NOW() - INTERVAL '2 days');

-- 8. Fixed Deposit - 2,000,000 KES (completed)
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, completed_at, cbs_reference, cbs_response, dms_reference, created_at)
VALUES ('FS-FD-20260307-008', 6, 1, 'FIXED_DEPOSIT',
'{"accountNumber":"0110445521","accountName":"Mary Wambui","depositAmount":"2000000","currency":"KES","tenure":"12","tenureUnit":"Months","interestRate":"9.5","maturityInstruction":"Auto Renew","sourceAccount":"0110445521","narration":"12-month fixed deposit"}',
'COMPLETED', 'NRB001', 'CUST002', 'Mary Wambui', 2000000.00, 'KES', 'teller1',
NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days',
'CBS-T24-20260307-2248', '{"status":"SUCCESS","t24Reference":"FD2603072248","message":"Fixed deposit created","fdAccountNumber":"FD-0110445521-001"}',
'DMS-20260307-4567', NOW() - INTERVAL '2 days');


-- === PENDING APPROVAL forms (5) - waiting in supervisor queue ===

-- 9. Cash Deposit - 800,000 KES (pending tier 1)
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, created_at)
VALUES ('FS-CD-20260311-009', 1, 1, 'CASH_DEPOSIT',
'{"accountNumber":"0110334455","accountName":"Grace Njoki","accountType":"Savings","branchCode":"NRB001","depositAmount":"800000","currency":"KES","depositorName":"Grace Njoki","depositorId":"44556677","idType":"National ID","sourceOfFunds":"Salary","narration":"Savings deposit"}',
'PENDING_APPROVAL', 'NRB001', 'CUST004', 'Grace Njoki', 800000.00, 'KES', 'teller1',
NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours');

-- 10. Cash Withdrawal - 600,000 KES (pending tier 1)
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, created_at)
VALUES ('FS-CW-20260311-010', 2, 1, 'CASH_WITHDRAWAL',
'{"accountNumber":"0110667788","accountName":"Samuel Otieno","accountType":"Current","branchCode":"NRB001","withdrawalAmount":"600000","currency":"KES","withdrawerName":"Samuel Otieno","idNumber":"55667788","idType":"National ID","narration":"Business purchase"}',
'PENDING_APPROVAL', 'NRB001', 'CUST003', 'Samuel Otieno', 600000.00, 'KES', 'teller2',
NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '90 minutes');

-- 11. Funds Transfer RTGS - 2,500,000 KES (pending tier 1, high value)
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, created_at)
VALUES ('FS-FT-20260311-011', 3, 1, 'FUNDS_TRANSFER',
'{"senderAccount":"0110445521","senderName":"Mary Wambui","beneficiaryAccount":"0330998877","beneficiaryName":"Nairobi Real Estate Ltd","beneficiaryBank":"Equity Bank","transferAmount":"2500000","currency":"KES","transferType":"RTGS","purpose":"Property purchase deposit","narration":"Plot deposit payment"}',
'PENDING_APPROVAL', 'NRB001', 'CUST002', 'Mary Wambui', 2500000.00, 'KES', 'teller1',
NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes');

-- 12. Loan Disbursement - 5,000,000 KES (pending tier 1)
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, created_at)
VALUES ('FS-LD-20260311-012', 7, 1, 'LOAN_DISBURSEMENT',
'{"loanAccount":"LN-0110298374-001","borrowerName":"James Kariuki","borrowerAccount":"0110298374","loanAmount":"5000000","currency":"KES","loanType":"Personal Loan","tenure":"36","tenureUnit":"Months","interestRate":"14.5","disbursementAccount":"0110298374","purpose":"Home renovation"}',
'PENDING_APPROVAL', 'NRB001', 'CUST001', 'James Kariuki', 5000000.00, 'KES', 'teller1',
NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes');

-- 13. Account Opening (pending tier 1)
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, created_at)
VALUES ('FS-AO-20260311-013', 9, 1, 'ACCOUNT_OPENING',
'{"firstName":"Diana","lastName":"Mutua","dateOfBirth":"1992-05-15","nationality":"Kenyan","idType":"National ID","idNumber":"33445566","phone":"+254733445566","email":"diana.mutua@email.com","accountType":"Savings","initialDeposit":"50000","currency":"KES","employmentStatus":"Employed","employer":"Safaricom PLC","occupation":"Software Engineer","monthlyIncome":"250000","sourceOfFunds":"Employment","residentialAddress":"789 Ngong Road, Nairobi","postalAddress":"P.O. Box 12345, Nairobi"}',
'PENDING_APPROVAL', 'NRB001', 'CUST005', 'Diana Mutua', 50000.00, 'KES', 'teller2',
NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes');


-- === REJECTED form (2) ===

-- 14. Cash Deposit - rejected for incorrect details
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, created_at)
VALUES ('FS-CD-20260309-014', 1, 1, 'CASH_DEPOSIT',
'{"accountNumber":"0110999888","accountName":"John Doe","accountType":"Savings","branchCode":"NRB001","depositAmount":"1500000","currency":"KES","depositorName":"Unknown Depositor","depositorId":"","idType":"","sourceOfFunds":"","narration":"Large cash deposit"}',
'REJECTED', 'NRB001', 'CUST006', 'John Doe', 1500000.00, 'KES', 'teller1',
NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

-- 15. Funds Transfer - rejected for insufficient documentation
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, created_at)
VALUES ('FS-FT-20260310-015', 3, 1, 'FUNDS_TRANSFER',
'{"senderAccount":"0110667788","senderName":"Samuel Otieno","beneficiaryAccount":"9999887766","beneficiaryName":"Offshore Trading Corp","beneficiaryBank":"International Bank","transferAmount":"3000000","currency":"USD","transferType":"SWIFT","purpose":"Investment","narration":"Overseas transfer"}',
'REJECTED', 'NRB001', 'CUST003', 'Samuel Otieno', 3000000.00, 'USD', 'teller2',
NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');


-- === DRAFT forms (3) - saved but not submitted ===

-- 16. Cash Deposit draft
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, created_at)
VALUES ('FS-CD-20260311-016', 1, 1, 'CASH_DEPOSIT',
'{"accountNumber":"0110112233","accountName":"Rose Achieng","accountType":"Savings","depositAmount":"350000","currency":"KES","depositorName":"Rose Achieng"}',
'DRAFT', 'NRB001', 'CUST007', 'Rose Achieng', 350000.00, 'KES', 'teller1', NOW() - INTERVAL '1 hour');

-- 17. Instrument Clearing draft
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, created_at)
VALUES ('FS-IC-20260311-017', 10, 1, 'INSTRUMENT_CLEARING',
'{"depositorAccount":"0110298374","depositorName":"James Kariuki","chequeNumber":"000456","chequeDate":"2026-03-08","drawerName":"Acme Corp","drawerBank":"Standard Chartered","amount":"175000","currency":"KES"}',
'DRAFT', 'NRB001', 'CUST001', 'James Kariuki', 175000.00, 'KES', 'teller2', NOW() - INTERVAL '30 minutes');

-- 18. Account Servicing draft
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, created_at)
VALUES ('FS-AS-20260311-018', 5, 1, 'ACCOUNT_SERVICING',
'{"accountNumber":"0110667788","accountName":"Samuel Otieno","serviceType":"Nominee Update","nomineeName":"Grace Otieno","nomineeRelation":"Spouse","nomineeId":"77889900"}',
'DRAFT', 'NRB001', 'CUST003', 'Samuel Otieno', 0.00, 'KES', 'teller1', NOW() - INTERVAL '20 minutes');


-- === RETURNED form (1) ===

-- 19. Cash Withdrawal returned for correction
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, created_at)
VALUES ('FS-CW-20260310-019', 2, 1, 'CASH_WITHDRAWAL',
'{"accountNumber":"0110445521","accountName":"Mary Wambui","accountType":"Current","branchCode":"NRB001","withdrawalAmount":"450000","currency":"KES","withdrawerName":"Mary Wambui","idNumber":"31298765","idType":"Passport","narration":"Medical expenses"}',
'RETURNED', 'NRB001', 'CUST002', 'Mary Wambui', 450000.00, 'KES', 'teller1',
NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');


-- === PENDING TIER 2 form (1) - tier 1 approved, awaiting tier 2 ===

-- 20. Cash Deposit - 1,500,000 (tier 1 done, pending tier 2)
INSERT INTO fs_form_instances (reference_number, template_id, template_version, journey_type, form_data, status, branch_code, customer_id, customer_name, amount, currency, created_by, submitted_at, created_at)
VALUES ('FS-CD-20260311-020', 1, 1, 'CASH_DEPOSIT',
'{"accountNumber":"0110778899","accountName":"Patrick Maina","accountType":"Current","branchCode":"NRB001","depositAmount":"1500000","currency":"KES","depositorName":"Patrick Maina","depositorId":"22334455","idType":"National ID","sourceOfFunds":"Business Revenue","narration":"Q1 revenue deposit"}',
'PENDING_APPROVAL', 'NRB001', 'CUST008', 'Patrick Maina', 1500000.00, 'KES', 'teller1',
NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours');


-- ============================================
-- WORKFLOW INSTANCES
-- ============================================

-- Completed workflows (for forms 1-8)
INSERT INTO fs_workflow_instances (form_instance_id, current_state, current_tier, required_tiers, approval_mode, sla_deadline, escalated, created_at) VALUES
(1, 'COMPLETED', 0, 0, 'NONE', NOW() - INTERVAL '7 days', false, NOW() - INTERVAL '7 days'),
(2, 'COMPLETED', 1, 1, 'SEQUENTIAL', NOW() - INTERVAL '6 days', false, NOW() - INTERVAL '6 days'),
(3, 'COMPLETED', 0, 0, 'NONE', NOW() - INTERVAL '5 days', false, NOW() - INTERVAL '5 days'),
(4, 'COMPLETED', 1, 1, 'SEQUENTIAL', NOW() - INTERVAL '4 days', false, NOW() - INTERVAL '4 days'),
(5, 'COMPLETED', 1, 1, 'SEQUENTIAL', NOW() - INTERVAL '4 days', false, NOW() - INTERVAL '4 days'),
(6, 'COMPLETED', 1, 1, 'SEQUENTIAL', NOW() - INTERVAL '3 days', false, NOW() - INTERVAL '3 days'),
(7, 'COMPLETED', 1, 1, 'SEQUENTIAL', NOW() - INTERVAL '2 days', false, NOW() - INTERVAL '2 days'),
(8, 'COMPLETED', 1, 1, 'SEQUENTIAL', NOW() - INTERVAL '2 days', false, NOW() - INTERVAL '2 days');

-- Pending workflows (for forms 9-13)
INSERT INTO fs_workflow_instances (form_instance_id, current_state, current_tier, required_tiers, approval_mode, sla_deadline, escalated, created_at) VALUES
(9,  'PENDING_TIER_1', 1, 1, 'SEQUENTIAL', NOW() + INTERVAL '28 minutes', false, NOW() - INTERVAL '2 hours'),
(10, 'PENDING_TIER_1', 1, 1, 'SEQUENTIAL', NOW() + INTERVAL '60 minutes', false, NOW() - INTERVAL '90 minutes'),
(11, 'PENDING_TIER_1', 1, 2, 'SEQUENTIAL', NOW() + INTERVAL '10 minutes', false, NOW() - INTERVAL '45 minutes'),
(12, 'PENDING_TIER_1', 1, 2, 'SEQUENTIAL', NOW() + INTERVAL '15 minutes', false, NOW() - INTERVAL '30 minutes'),
(13, 'PENDING_TIER_1', 1, 1, 'SEQUENTIAL', NOW() + INTERVAL '45 minutes', false, NOW() - INTERVAL '15 minutes');

-- Rejected workflows (for forms 14-15)
INSERT INTO fs_workflow_instances (form_instance_id, current_state, current_tier, required_tiers, approval_mode, sla_deadline, escalated, created_at) VALUES
(14, 'REJECTED', 1, 2, 'SEQUENTIAL', NOW() - INTERVAL '2 days', false, NOW() - INTERVAL '2 days'),
(15, 'REJECTED', 1, 2, 'SEQUENTIAL', NOW() - INTERVAL '1 day', false, NOW() - INTERVAL '1 day');

-- Returned workflow (for form 19)
INSERT INTO fs_workflow_instances (form_instance_id, current_state, current_tier, required_tiers, approval_mode, sla_deadline, escalated, created_at) VALUES
(19, 'RETURNED', 1, 1, 'SEQUENTIAL', NOW() - INTERVAL '1 day', false, NOW() - INTERVAL '1 day');

-- Pending Tier 2 workflow (for form 20)
INSERT INTO fs_workflow_instances (form_instance_id, current_state, current_tier, required_tiers, approval_mode, sla_deadline, escalated, created_at) VALUES
(20, 'PENDING_TIER_2', 2, 2, 'SEQUENTIAL', NOW() + INTERVAL '20 minutes', false, NOW() - INTERVAL '3 hours');


-- ============================================
-- APPROVAL ACTIONS (immutable history)
-- ============================================

-- Form 2: Supervisor approved cash deposit 750K
INSERT INTO fs_approval_actions (workflow_id, form_instance_id, tier, action, actor_id, actor_name, actor_role, comments, created_at) VALUES
(2, 2, 1, 'APPROVE', 'supervisor1', 'Carol Wanjiku', 'CHECKER', 'Amount verified, depositor ID confirmed.', NOW() - INTERVAL '6 days');

-- Form 4: Supervisor approved funds transfer
INSERT INTO fs_approval_actions (workflow_id, form_instance_id, tier, action, actor_id, actor_name, actor_role, comments, created_at) VALUES
(4, 4, 1, 'APPROVE', 'supervisor1', 'Carol Wanjiku', 'CHECKER', 'Beneficiary details verified.', NOW() - INTERVAL '4 days');

-- Form 5: Supervisor approved account servicing
INSERT INTO fs_approval_actions (workflow_id, form_instance_id, tier, action, actor_id, actor_name, actor_role, comments, created_at) VALUES
(5, 5, 1, 'APPROVE', 'supervisor1', 'Carol Wanjiku', 'CHECKER', 'Address change documentation verified.', NOW() - INTERVAL '4 days');

-- Form 6: Supervisor approved demand draft
INSERT INTO fs_approval_actions (workflow_id, form_instance_id, tier, action, actor_id, actor_name, actor_role, comments, created_at) VALUES
(6, 6, 1, 'APPROVE', 'supervisor1', 'Carol Wanjiku', 'CHECKER', 'DD issuance approved.', NOW() - INTERVAL '3 days');

-- Form 7: Supervisor approved cheque book
INSERT INTO fs_approval_actions (workflow_id, form_instance_id, tier, action, actor_id, actor_name, actor_role, comments, created_at) VALUES
(7, 7, 1, 'APPROVE', 'supervisor1', 'Carol Wanjiku', 'CHECKER', 'Account in good standing.', NOW() - INTERVAL '2 days');

-- Form 8: Supervisor approved fixed deposit
INSERT INTO fs_approval_actions (workflow_id, form_instance_id, tier, action, actor_id, actor_name, actor_role, comments, created_at) VALUES
(8, 8, 1, 'APPROVE', 'supervisor1', 'Carol Wanjiku', 'CHECKER', 'FD terms confirmed with customer.', NOW() - INTERVAL '2 days');

-- Form 14: Rejected - incomplete depositor ID
INSERT INTO fs_approval_actions (workflow_id, form_instance_id, tier, action, actor_id, actor_name, actor_role, comments, created_at) VALUES
(14, 14, 1, 'REJECT', 'supervisor1', 'Carol Wanjiku', 'CHECKER', 'Depositor ID is missing. Source of funds not declared. Cannot process large cash deposit without proper KYC documentation.', NOW() - INTERVAL '2 days');

-- Form 15: Rejected - compliance concern
INSERT INTO fs_approval_actions (workflow_id, form_instance_id, tier, action, actor_id, actor_name, actor_role, comments, created_at) VALUES
(15, 15, 1, 'REJECT', 'manager1', 'David Kamau', 'BRANCH_MANAGER', 'SWIFT transfer to offshore entity requires enhanced due diligence. Insufficient documentation provided. Please obtain source of funds declaration and beneficial ownership information.', NOW() - INTERVAL '1 day');

-- Form 19: Returned for correction (workflow_id=16: 16th workflow inserted)
INSERT INTO fs_approval_actions (workflow_id, form_instance_id, tier, action, actor_id, actor_name, actor_role, comments, created_at) VALUES
(16, 19, 1, 'RETURN', 'supervisor1', 'Carol Wanjiku', 'CHECKER', 'Please verify the withdrawal amount - customer verbal confirmation was 400,000 but form shows 450,000. Correct and resubmit.', NOW() - INTERVAL '1 day');

-- Form 20: Tier 1 approved, now at tier 2 (workflow_id=17: 17th workflow inserted)
INSERT INTO fs_approval_actions (workflow_id, form_instance_id, tier, action, actor_id, actor_name, actor_role, comments, created_at) VALUES
(17, 20, 1, 'APPROVE', 'supervisor1', 'Carol Wanjiku', 'CHECKER', 'Tier 1 approved. Large deposit - forwarding to Branch Manager for Tier 2 approval.', NOW() - INTERVAL '2 hours');


-- ============================================
-- DIGITAL SIGNATURES (for completed forms)
-- ============================================
INSERT INTO fs_digital_signatures (form_instance_id, signer_type, signer_identity, signature_svg, signature_png, data_hash, device_info, ip_address, timestamp) VALUES
(1, 'CUSTOMER', 'James Kariuki', 'M 50,80 C 60,30 100,20 120,60 S 160,90 180,50', NULL, 'a3f2b8c1d4e5', 'iPad Pro 12.9, Safari', '10.0.1.45', NOW() - INTERVAL '7 days'),
(1, 'TELLER', 'teller1', 'M 40,70 C 55,25 95,15 115,55 S 155,85 175,45', NULL, 'a3f2b8c1d4e5', 'Branch Terminal NRB001-T1', '10.0.1.101', NOW() - INTERVAL '7 days'),
(2, 'CUSTOMER', 'Mary Wambui', 'M 45,75 C 58,28 98,18 118,58 S 158,88 178,48', NULL, 'b4g3c9d2e6f7', 'iPad Pro 12.9, Safari', '10.0.1.45', NOW() - INTERVAL '6 days'),
(2, 'TELLER', 'teller1', 'M 40,70 C 55,25 95,15 115,55 S 155,85 175,45', NULL, 'b4g3c9d2e6f7', 'Branch Terminal NRB001-T1', '10.0.1.101', NOW() - INTERVAL '6 days'),
(4, 'CUSTOMER', 'James Kariuki', 'M 50,80 C 60,30 100,20 120,60 S 160,90 180,50', NULL, 'd6i5e1f8g9h0', 'iPad Pro 12.9, Safari', '10.0.1.45', NOW() - INTERVAL '4 days'),
(8, 'CUSTOMER', 'Mary Wambui', 'M 45,75 C 58,28 98,18 118,58 S 158,88 178,48', NULL, 'h0m9j5k2l3n4', 'iPad Pro 12.9, Safari', '10.0.1.45', NOW() - INTERVAL '2 days');


-- ============================================
-- AUDIT LOGS (comprehensive activity trail)
-- ============================================
INSERT INTO fs_audit_logs (entity_type, entity_id, action, actor_id, actor_name, actor_role, ip_address, branch_code, details, created_at) VALUES

-- Login events
('USER', '1', 'LOGIN', 'teller1', 'Alice Mwangi', 'MAKER', '10.0.1.101', 'NRB001', '{"event":"User authenticated via SSO","device":"Branch Terminal"}', NOW() - INTERVAL '7 days'),
('USER', '2', 'LOGIN', 'teller2', 'Bob Ochieng', 'MAKER', '10.0.1.102', 'NRB001', '{"event":"User authenticated via SSO","device":"Branch Terminal"}', NOW() - INTERVAL '7 days'),
('USER', '3', 'LOGIN', 'supervisor1', 'Carol Wanjiku', 'CHECKER', '10.0.1.103', 'NRB001', '{"event":"User authenticated via SSO","device":"Branch Terminal"}', NOW() - INTERVAL '7 days'),

-- Form template events
('FORM_TEMPLATE', '1', 'PUBLISH', 'admin1', 'Eve Njeri', 'SYSTEM_ADMIN', '10.0.1.200', 'HQ001', '{"templateName":"Cash Deposit Voucher","version":1,"journeyType":"CASH_DEPOSIT"}', NOW() - INTERVAL '14 days'),
('FORM_TEMPLATE', '2', 'PUBLISH', 'admin1', 'Eve Njeri', 'SYSTEM_ADMIN', '10.0.1.200', 'HQ001', '{"templateName":"Cash Withdrawal Voucher","version":1,"journeyType":"CASH_WITHDRAWAL"}', NOW() - INTERVAL '14 days'),
('FORM_TEMPLATE', '3', 'PUBLISH', 'admin1', 'Eve Njeri', 'SYSTEM_ADMIN', '10.0.1.200', 'HQ001', '{"templateName":"Funds Transfer Request","version":1,"journeyType":"FUNDS_TRANSFER"}', NOW() - INTERVAL '14 days'),

-- Form instance lifecycle events
('FORM_INSTANCE', '1', 'CREATE', 'teller1', 'Alice Mwangi', 'MAKER', '10.0.1.101', 'NRB001', '{"formRef":"FS-CD-20260301-001","journeyType":"CASH_DEPOSIT","amount":250000,"customer":"James Kariuki"}', NOW() - INTERVAL '7 days'),
('FORM_INSTANCE', '1', 'SUBMIT', 'teller1', 'Alice Mwangi', 'MAKER', '10.0.1.101', 'NRB001', '{"formRef":"FS-CD-20260301-001","status":"SUBMITTED","autoApproved":true}', NOW() - INTERVAL '7 days'),
('FORM_INSTANCE', '1', 'COMPLETE', 'SYSTEM', 'System', 'SYSTEM', '10.0.1.1', 'NRB001', '{"formRef":"FS-CD-20260301-001","cbsReference":"CBS-T24-20260301-8834","dmsReference":"DMS-20260301-4421"}', NOW() - INTERVAL '7 days'),

('FORM_INSTANCE', '2', 'CREATE', 'teller1', 'Alice Mwangi', 'MAKER', '10.0.1.101', 'NRB001', '{"formRef":"FS-CD-20260302-002","journeyType":"CASH_DEPOSIT","amount":750000,"customer":"Mary Wambui"}', NOW() - INTERVAL '6 days'),
('FORM_INSTANCE', '2', 'SUBMIT', 'teller1', 'Alice Mwangi', 'MAKER', '10.0.1.101', 'NRB001', '{"formRef":"FS-CD-20260302-002","status":"PENDING_APPROVAL","requiredTiers":1}', NOW() - INTERVAL '6 days'),

('FORM_INSTANCE', '4', 'CREATE', 'teller1', 'Alice Mwangi', 'MAKER', '10.0.1.101', 'NRB001', '{"formRef":"FS-FT-20260304-004","journeyType":"FUNDS_TRANSFER","amount":500000,"customer":"James Kariuki"}', NOW() - INTERVAL '4 days'),
('FORM_INSTANCE', '4', 'SUBMIT', 'teller1', 'Alice Mwangi', 'MAKER', '10.0.1.101', 'NRB001', '{"formRef":"FS-FT-20260304-004","status":"PENDING_APPROVAL"}', NOW() - INTERVAL '4 days'),

('FORM_INSTANCE', '9', 'CREATE', 'teller1', 'Alice Mwangi', 'MAKER', '10.0.1.101', 'NRB001', '{"formRef":"FS-CD-20260311-009","journeyType":"CASH_DEPOSIT","amount":800000,"customer":"Grace Njoki"}', NOW() - INTERVAL '2 hours'),
('FORM_INSTANCE', '9', 'SUBMIT', 'teller1', 'Alice Mwangi', 'MAKER', '10.0.1.101', 'NRB001', '{"formRef":"FS-CD-20260311-009","status":"PENDING_APPROVAL","requiredTiers":1}', NOW() - INTERVAL '2 hours'),

('FORM_INSTANCE', '12', 'CREATE', 'teller1', 'Alice Mwangi', 'MAKER', '10.0.1.101', 'NRB001', '{"formRef":"FS-LD-20260311-012","journeyType":"LOAN_DISBURSEMENT","amount":5000000,"customer":"James Kariuki"}', NOW() - INTERVAL '30 minutes'),
('FORM_INSTANCE', '12', 'SUBMIT', 'teller1', 'Alice Mwangi', 'MAKER', '10.0.1.101', 'NRB001', '{"formRef":"FS-LD-20260311-012","status":"PENDING_APPROVAL","requiredTiers":2}', NOW() - INTERVAL '30 minutes'),

-- Workflow approval events
('WORKFLOW', '2', 'APPROVE', 'supervisor1', 'Carol Wanjiku', 'CHECKER', '10.0.1.103', 'NRB001', '{"formRef":"FS-CD-20260302-002","tier":1,"action":"APPROVE"}', NOW() - INTERVAL '6 days'),
('WORKFLOW', '4', 'APPROVE', 'supervisor1', 'Carol Wanjiku', 'CHECKER', '10.0.1.103', 'NRB001', '{"formRef":"FS-FT-20260304-004","tier":1,"action":"APPROVE"}', NOW() - INTERVAL '4 days'),
('WORKFLOW', '6', 'APPROVE', 'supervisor1', 'Carol Wanjiku', 'CHECKER', '10.0.1.103', 'NRB001', '{"formRef":"FS-DD-20260306-006","tier":1,"action":"APPROVE"}', NOW() - INTERVAL '3 days'),
('WORKFLOW', '8', 'APPROVE', 'supervisor1', 'Carol Wanjiku', 'CHECKER', '10.0.1.103', 'NRB001', '{"formRef":"FS-FD-20260307-008","tier":1,"action":"APPROVE"}', NOW() - INTERVAL '2 days'),
('WORKFLOW', '14', 'REJECT', 'supervisor1', 'Carol Wanjiku', 'CHECKER', '10.0.1.103', 'NRB001', '{"formRef":"FS-CD-20260309-014","tier":1,"action":"REJECT","reason":"Missing KYC documentation"}', NOW() - INTERVAL '2 days'),
('WORKFLOW', '15', 'REJECT', 'manager1', 'David Kamau', 'BRANCH_MANAGER', '10.0.1.104', 'NRB001', '{"formRef":"FS-FT-20260310-015","tier":1,"action":"REJECT","reason":"Enhanced due diligence required"}', NOW() - INTERVAL '1 day'),
('WORKFLOW', '16', 'RETURN', 'supervisor1', 'Carol Wanjiku', 'CHECKER', '10.0.1.103', 'NRB001', '{"formRef":"FS-CW-20260310-019","tier":1,"action":"RETURN","reason":"Amount mismatch"}', NOW() - INTERVAL '1 day'),
('WORKFLOW', '17', 'APPROVE', 'supervisor1', 'Carol Wanjiku', 'CHECKER', '10.0.1.103', 'NRB001', '{"formRef":"FS-CD-20260311-020","tier":1,"action":"APPROVE","note":"Forwarding to Tier 2"}', NOW() - INTERVAL '2 hours'),

-- Recent login events (today)
('USER', '1', 'LOGIN', 'teller1', 'Alice Mwangi', 'MAKER', '10.0.1.101', 'NRB001', '{"event":"Morning shift login","device":"Branch Terminal NRB001-T1"}', NOW() - INTERVAL '4 hours'),
('USER', '2', 'LOGIN', 'teller2', 'Bob Ochieng', 'MAKER', '10.0.1.102', 'NRB001', '{"event":"Morning shift login","device":"Branch Terminal NRB001-T2"}', NOW() - INTERVAL '4 hours'),
('USER', '3', 'LOGIN', 'supervisor1', 'Carol Wanjiku', 'CHECKER', '10.0.1.103', 'NRB001', '{"event":"Morning shift login","device":"Supervisor Station"}', NOW() - INTERVAL '3 hours 45 minutes'),
('USER', '4', 'LOGIN', 'manager1', 'David Kamau', 'BRANCH_MANAGER', '10.0.1.104', 'NRB001', '{"event":"Morning login","device":"Manager Office"}', NOW() - INTERVAL '3 hours 30 minutes'),
('USER', '5', 'LOGIN', 'admin1', 'Eve Njeri', 'SYSTEM_ADMIN', '10.0.1.200', 'HQ001', '{"event":"Admin session","device":"HQ Workstation"}', NOW() - INTERVAL '2 hours');
