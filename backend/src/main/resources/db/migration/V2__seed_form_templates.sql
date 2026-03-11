-- FormSync V2: Seed all 10 journey type form templates with comprehensive field schemas

-- ============================================
-- 1. CASH DEPOSIT
-- ============================================
INSERT INTO fs_form_templates (form_code, version, journey_type, name, description, schema, approval_config, cbs_mapping, dms_config, status, created_by) VALUES
('CASH_DEP_V1', 1, 'CASH_DEPOSIT', 'Cash Deposit Voucher', 'Standard cash deposit form for over-the-counter transactions',
'{
  "sections": [
    {
      "id": "account_info",
      "title": "Account Information",
      "fields": [
        {"id": "accountNumber", "type": "text", "label": "Account Number", "required": true, "placeholder": "Enter account number", "validation": {"pattern": "^[0-9]{10,16}$", "message": "Account number must be 10-16 digits"}},
        {"id": "accountName", "type": "text", "label": "Account Name", "required": true, "readOnly": true, "placeholder": "Auto-populated from CBS"},
        {"id": "accountType", "type": "select", "label": "Account Type", "readOnly": true, "options": [{"label": "Savings", "value": "SAVINGS"}, {"label": "Current", "value": "CURRENT"}, {"label": "Fixed Deposit", "value": "FD"}]},
        {"id": "branchCode", "type": "text", "label": "Branch Code", "required": true, "readOnly": true}
      ]
    },
    {
      "id": "deposit_details",
      "title": "Deposit Details",
      "fields": [
        {"id": "currency", "type": "select", "label": "Currency", "required": true, "options": [{"label": "KES", "value": "KES"}, {"label": "USD", "value": "USD"}, {"label": "EUR", "value": "EUR"}, {"label": "GBP", "value": "GBP"}]},
        {"id": "amount", "type": "currency", "label": "Deposit Amount", "required": true, "validation": {"min": 1, "message": "Amount must be greater than 0"}},
        {"id": "amountInWords", "type": "text", "label": "Amount in Words", "required": true},
        {"id": "narrative", "type": "textarea", "label": "Narrative / Remarks", "placeholder": "Purpose of deposit"}
      ]
    },
    {
      "id": "depositor_info",
      "title": "Depositor Information",
      "fields": [
        {"id": "depositorName", "type": "text", "label": "Depositor Name", "required": true},
        {"id": "depositorIdType", "type": "select", "label": "ID Type", "required": true, "options": [{"label": "National ID", "value": "NATIONAL_ID"}, {"label": "Passport", "value": "PASSPORT"}, {"label": "Driving License", "value": "DRIVING_LICENSE"}, {"label": "Military ID", "value": "MILITARY_ID"}]},
        {"id": "depositorIdNumber", "type": "text", "label": "ID Number", "required": true},
        {"id": "depositorPhone", "type": "phone", "label": "Phone Number"},
        {"id": "sourceOfFunds", "type": "select", "label": "Source of Funds", "required": true, "options": [{"label": "Salary", "value": "SALARY"}, {"label": "Business Income", "value": "BUSINESS"}, {"label": "Investment Returns", "value": "INVESTMENT"}, {"label": "Gift/Inheritance", "value": "GIFT"}, {"label": "Other", "value": "OTHER"}]},
        {"id": "sourceOfFundsOther", "type": "text", "label": "Specify Source", "conditionalOn": {"field": "sourceOfFunds", "value": "OTHER"}}
      ]
    },
    {
      "id": "denomination",
      "title": "Denomination Breakdown",
      "fields": [
        {"id": "denom1000", "type": "number", "label": "1000 x", "placeholder": "0"},
        {"id": "denom500", "type": "number", "label": "500 x", "placeholder": "0"},
        {"id": "denom200", "type": "number", "label": "200 x", "placeholder": "0"},
        {"id": "denom100", "type": "number", "label": "100 x", "placeholder": "0"},
        {"id": "denom50", "type": "number", "label": "50 x", "placeholder": "0"},
        {"id": "denomCoins", "type": "number", "label": "Coins Total", "placeholder": "0"}
      ]
    }
  ]
}',
'{"thresholds": [{"amount": 500000, "tiers": 1}, {"amount": 1000000, "tiers": 2}]}',
'{"endpoint": "/tXact/deposit", "method": "POST", "fieldMapping": {"accountId": "accountNumber", "txnAmount": "amount", "txnCurrency": "currency", "txnNarrative": "narrative"}}',
'{"category": "DEPOSITS", "retentionYears": 7, "indexFields": ["accountNumber", "amount", "depositorName"]}',
'PUBLISHED', 'system');

-- ============================================
-- 2. CASH WITHDRAWAL
-- ============================================
INSERT INTO fs_form_templates (form_code, version, journey_type, name, description, schema, approval_config, cbs_mapping, dms_config, status, created_by) VALUES
('CASH_WDL_V1', 1, 'CASH_WITHDRAWAL', 'Cash Withdrawal Voucher', 'Standard cash withdrawal form for over-the-counter transactions',
'{
  "sections": [
    {
      "id": "account_info",
      "title": "Account Information",
      "fields": [
        {"id": "accountNumber", "type": "text", "label": "Account Number", "required": true, "validation": {"pattern": "^[0-9]{10,16}$", "message": "Account number must be 10-16 digits"}},
        {"id": "accountName", "type": "text", "label": "Account Name", "required": true, "readOnly": true},
        {"id": "availableBalance", "type": "currency", "label": "Available Balance", "readOnly": true},
        {"id": "branchCode", "type": "text", "label": "Branch Code", "required": true, "readOnly": true}
      ]
    },
    {
      "id": "withdrawal_details",
      "title": "Withdrawal Details",
      "fields": [
        {"id": "currency", "type": "select", "label": "Currency", "required": true, "options": [{"label": "KES", "value": "KES"}, {"label": "USD", "value": "USD"}, {"label": "EUR", "value": "EUR"}, {"label": "GBP", "value": "GBP"}]},
        {"id": "amount", "type": "currency", "label": "Withdrawal Amount", "required": true, "validation": {"min": 1}},
        {"id": "amountInWords", "type": "text", "label": "Amount in Words", "required": true},
        {"id": "narrative", "type": "textarea", "label": "Narrative / Remarks"}
      ]
    },
    {
      "id": "withdrawer_info",
      "title": "Withdrawer Information",
      "fields": [
        {"id": "withdrawerName", "type": "text", "label": "Withdrawer Name", "required": true},
        {"id": "withdrawerIdType", "type": "select", "label": "ID Type", "required": true, "options": [{"label": "National ID", "value": "NATIONAL_ID"}, {"label": "Passport", "value": "PASSPORT"}, {"label": "Driving License", "value": "DRIVING_LICENSE"}]},
        {"id": "withdrawerIdNumber", "type": "text", "label": "ID Number", "required": true},
        {"id": "isAccountHolder", "type": "checkbox", "label": "Withdrawer is account holder"},
        {"id": "purposeOfWithdrawal", "type": "select", "label": "Purpose of Withdrawal", "required": true, "options": [{"label": "Personal Use", "value": "PERSONAL"}, {"label": "Business Expenses", "value": "BUSINESS"}, {"label": "Education", "value": "EDUCATION"}, {"label": "Medical", "value": "MEDICAL"}, {"label": "Other", "value": "OTHER"}]},
        {"id": "authorisationLetter", "type": "checkbox", "label": "Third-party authorisation letter provided", "conditionalOn": {"field": "isAccountHolder", "value": false}}
      ]
    },
    {
      "id": "denomination",
      "title": "Denomination Preference",
      "fields": [
        {"id": "denom1000", "type": "number", "label": "1000 x", "placeholder": "0"},
        {"id": "denom500", "type": "number", "label": "500 x", "placeholder": "0"},
        {"id": "denom200", "type": "number", "label": "200 x", "placeholder": "0"},
        {"id": "denom100", "type": "number", "label": "100 x", "placeholder": "0"},
        {"id": "denom50", "type": "number", "label": "50 x", "placeholder": "0"},
        {"id": "denomCoins", "type": "number", "label": "Coins Total", "placeholder": "0"}
      ]
    }
  ]
}',
'{"thresholds": [{"amount": 500000, "tiers": 1}, {"amount": 1000000, "tiers": 3}]}',
'{"endpoint": "/tXact/withdrawal", "method": "POST", "fieldMapping": {"accountId": "accountNumber", "txnAmount": "amount", "txnCurrency": "currency", "txnNarrative": "narrative"}}',
'{"category": "WITHDRAWALS", "retentionYears": 7, "indexFields": ["accountNumber", "amount", "withdrawerName"]}',
'PUBLISHED', 'system');

-- ============================================
-- 3. FUNDS TRANSFER
-- ============================================
INSERT INTO fs_form_templates (form_code, version, journey_type, name, description, schema, approval_config, cbs_mapping, dms_config, status, created_by) VALUES
('FT_V1', 1, 'FUNDS_TRANSFER', 'Funds Transfer Request', 'Internal and external funds transfer form supporting RTGS, EFT, and SWIFT',
'{
  "sections": [
    {
      "id": "sender_info",
      "title": "Sender (Debit) Account",
      "fields": [
        {"id": "fromAccount", "type": "text", "label": "Debit Account Number", "required": true, "validation": {"pattern": "^[0-9]{10,16}$"}},
        {"id": "fromAccountName", "type": "text", "label": "Account Name", "readOnly": true},
        {"id": "availableBalance", "type": "currency", "label": "Available Balance", "readOnly": true}
      ]
    },
    {
      "id": "beneficiary_info",
      "title": "Beneficiary (Credit) Details",
      "fields": [
        {"id": "transferType", "type": "select", "label": "Transfer Type", "required": true, "options": [{"label": "Internal Transfer", "value": "INTERNAL"}, {"label": "RTGS", "value": "RTGS"}, {"label": "EFT / ACH", "value": "EFT"}, {"label": "SWIFT / International", "value": "SWIFT"}]},
        {"id": "toAccount", "type": "text", "label": "Beneficiary Account Number", "required": true},
        {"id": "beneficiaryName", "type": "text", "label": "Beneficiary Name", "required": true},
        {"id": "beneficiaryBank", "type": "text", "label": "Beneficiary Bank", "conditionalOn": {"field": "transferType", "value": "INTERNAL", "negate": true}},
        {"id": "beneficiaryBankBranch", "type": "text", "label": "Beneficiary Bank Branch", "conditionalOn": {"field": "transferType", "value": "INTERNAL", "negate": true}},
        {"id": "swiftCode", "type": "text", "label": "SWIFT / BIC Code", "conditionalOn": {"field": "transferType", "value": "SWIFT"}, "validation": {"pattern": "^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$", "message": "Invalid SWIFT code format"}},
        {"id": "sortCode", "type": "text", "label": "Sort Code / Routing Number", "conditionalOn": {"field": "transferType", "value": "SWIFT"}},
        {"id": "intermediaryBank", "type": "text", "label": "Intermediary Bank", "conditionalOn": {"field": "transferType", "value": "SWIFT"}},
        {"id": "iban", "type": "text", "label": "IBAN", "conditionalOn": {"field": "transferType", "value": "SWIFT"}}
      ]
    },
    {
      "id": "transfer_details",
      "title": "Transfer Details",
      "fields": [
        {"id": "currency", "type": "select", "label": "Currency", "required": true, "options": [{"label": "KES", "value": "KES"}, {"label": "USD", "value": "USD"}, {"label": "EUR", "value": "EUR"}, {"label": "GBP", "value": "GBP"}]},
        {"id": "amount", "type": "currency", "label": "Transfer Amount", "required": true, "validation": {"min": 1}},
        {"id": "valueDate", "type": "date", "label": "Value Date", "required": true},
        {"id": "purposeOfTransfer", "type": "select", "label": "Purpose of Transfer", "required": true, "options": [{"label": "Salary Payment", "value": "SALARY"}, {"label": "Supplier Payment", "value": "SUPPLIER"}, {"label": "Loan Repayment", "value": "LOAN"}, {"label": "Investment", "value": "INVESTMENT"}, {"label": "Personal", "value": "PERSONAL"}, {"label": "Other", "value": "OTHER"}]},
        {"id": "chargeType", "type": "select", "label": "Charges", "required": true, "options": [{"label": "OUR (Sender pays all)", "value": "OUR"}, {"label": "BEN (Beneficiary pays all)", "value": "BEN"}, {"label": "SHA (Shared)", "value": "SHA"}]},
        {"id": "narrative", "type": "textarea", "label": "Payment Reference / Narrative", "required": true}
      ]
    }
  ]
}',
'{"thresholds": [{"amount": 0, "tiers": 1}, {"amount": 1000000, "tiers": 2}]}',
'{"endpoint": "/tXact/fundsTransfer", "method": "POST", "fieldMapping": {"debitAcctId": "fromAccount", "creditAcctId": "toAccount", "txnAmount": "amount", "txnCurrency": "currency"}}',
'{"category": "TRANSFERS", "retentionYears": 7, "indexFields": ["fromAccount", "toAccount", "amount", "beneficiaryName"]}',
'PUBLISHED', 'system');

-- ============================================
-- 4. DEMAND DRAFT
-- ============================================
INSERT INTO fs_form_templates (form_code, version, journey_type, name, description, schema, approval_config, cbs_mapping, dms_config, status, created_by) VALUES
('DD_V1', 1, 'DEMAND_DRAFT', 'Demand Draft Request', 'Demand draft / bankers cheque issuance form',
'{
  "sections": [
    {
      "id": "applicant_info",
      "title": "Applicant Details",
      "fields": [
        {"id": "applicantName", "type": "text", "label": "Applicant Name", "required": true},
        {"id": "applicantAccount", "type": "text", "label": "Debit Account Number", "required": true, "validation": {"pattern": "^[0-9]{10,16}$"}},
        {"id": "applicantAccountName", "type": "text", "label": "Account Name", "readOnly": true},
        {"id": "applicantPhone", "type": "phone", "label": "Contact Phone", "required": true},
        {"id": "applicantAddress", "type": "textarea", "label": "Applicant Address"}
      ]
    },
    {
      "id": "draft_details",
      "title": "Draft Details",
      "fields": [
        {"id": "payeeName", "type": "text", "label": "Pay To (Payee Name)", "required": true},
        {"id": "currency", "type": "select", "label": "Currency", "required": true, "options": [{"label": "KES", "value": "KES"}, {"label": "USD", "value": "USD"}, {"label": "EUR", "value": "EUR"}, {"label": "GBP", "value": "GBP"}]},
        {"id": "amount", "type": "currency", "label": "Draft Amount", "required": true, "validation": {"min": 1}},
        {"id": "amountInWords", "type": "text", "label": "Amount in Words", "required": true},
        {"id": "favouringBank", "type": "text", "label": "Favouring Bank"},
        {"id": "deliveryBranch", "type": "text", "label": "Delivery Branch"},
        {"id": "purpose", "type": "select", "label": "Purpose", "required": true, "options": [{"label": "Education Fees", "value": "EDUCATION"}, {"label": "Government Payment", "value": "GOVERNMENT"}, {"label": "Supplier Payment", "value": "SUPPLIER"}, {"label": "Insurance Premium", "value": "INSURANCE"}, {"label": "Other", "value": "OTHER"}]},
        {"id": "deliveryMode", "type": "select", "label": "Delivery Mode", "options": [{"label": "Collect at Branch", "value": "BRANCH"}, {"label": "Courier", "value": "COURIER"}, {"label": "Registered Post", "value": "POST"}]}
      ]
    },
    {
      "id": "charges",
      "title": "Charges",
      "fields": [
        {"id": "commissionAmount", "type": "currency", "label": "Commission", "readOnly": true},
        {"id": "postageCharge", "type": "currency", "label": "Postage Charge", "readOnly": true},
        {"id": "totalDebit", "type": "currency", "label": "Total Debit Amount", "readOnly": true}
      ]
    }
  ]
}',
'{"thresholds": [{"amount": 0, "tiers": 1}]}',
'{"endpoint": "/tXact/demandDraft", "method": "POST", "fieldMapping": {"applicantAcct": "applicantAccount", "payee": "payeeName", "ddAmount": "amount", "ddCurrency": "currency"}}',
'{"category": "INSTRUMENTS", "retentionYears": 10, "indexFields": ["applicantAccount", "payeeName", "amount"]}',
'PUBLISHED', 'system');

-- ============================================
-- 5. ACCOUNT SERVICING
-- ============================================
INSERT INTO fs_form_templates (form_code, version, journey_type, name, description, schema, approval_config, cbs_mapping, dms_config, status, created_by) VALUES
('ACCT_SVC_V1', 1, 'ACCOUNT_SERVICING', 'Account Servicing Request', 'Account maintenance and servicing requests including address change, nominee update, KYC refresh',
'{
  "sections": [
    {
      "id": "account_info",
      "title": "Account Information",
      "fields": [
        {"id": "accountNumber", "type": "text", "label": "Account Number", "required": true, "validation": {"pattern": "^[0-9]{10,16}$"}},
        {"id": "accountName", "type": "text", "label": "Account Holder Name", "readOnly": true},
        {"id": "accountType", "type": "text", "label": "Account Type", "readOnly": true},
        {"id": "branchCode", "type": "text", "label": "Branch Code", "readOnly": true}
      ]
    },
    {
      "id": "service_type",
      "title": "Service Request",
      "fields": [
        {"id": "serviceType", "type": "select", "label": "Service Type", "required": true, "options": [{"label": "Address Change", "value": "ADDRESS_CHANGE"}, {"label": "Phone Number Update", "value": "PHONE_UPDATE"}, {"label": "Email Update", "value": "EMAIL_UPDATE"}, {"label": "Nominee Change", "value": "NOMINEE_CHANGE"}, {"label": "KYC Refresh", "value": "KYC_REFRESH"}, {"label": "Signature Update", "value": "SIGNATURE_UPDATE"}, {"label": "Standing Instruction", "value": "STANDING_INSTRUCTION"}, {"label": "SMS Alert Registration", "value": "SMS_ALERT"}, {"label": "Internet Banking Activation", "value": "IB_ACTIVATION"}, {"label": "Debit Card Request", "value": "DEBIT_CARD"}, {"label": "Account Closure", "value": "ACCOUNT_CLOSURE"}]},
        {"id": "requestPriority", "type": "select", "label": "Priority", "options": [{"label": "Normal", "value": "NORMAL"}, {"label": "Urgent", "value": "URGENT"}]}
      ]
    },
    {
      "id": "existing_details",
      "title": "Existing Details",
      "fields": [
        {"id": "existingAddress", "type": "textarea", "label": "Current Address", "conditionalOn": {"field": "serviceType", "value": "ADDRESS_CHANGE"}},
        {"id": "existingPhone", "type": "phone", "label": "Current Phone", "conditionalOn": {"field": "serviceType", "value": "PHONE_UPDATE"}},
        {"id": "existingEmail", "type": "email", "label": "Current Email", "conditionalOn": {"field": "serviceType", "value": "EMAIL_UPDATE"}},
        {"id": "existingNominee", "type": "text", "label": "Current Nominee Name", "conditionalOn": {"field": "serviceType", "value": "NOMINEE_CHANGE"}}
      ]
    },
    {
      "id": "new_details",
      "title": "New Details",
      "fields": [
        {"id": "newAddress", "type": "textarea", "label": "New Address", "required": true, "conditionalOn": {"field": "serviceType", "value": "ADDRESS_CHANGE"}},
        {"id": "newPhone", "type": "phone", "label": "New Phone Number", "required": true, "conditionalOn": {"field": "serviceType", "value": "PHONE_UPDATE"}},
        {"id": "newEmail", "type": "email", "label": "New Email", "required": true, "conditionalOn": {"field": "serviceType", "value": "EMAIL_UPDATE"}},
        {"id": "newNomineeName", "type": "text", "label": "New Nominee Name", "required": true, "conditionalOn": {"field": "serviceType", "value": "NOMINEE_CHANGE"}},
        {"id": "newNomineeRelation", "type": "text", "label": "Relationship with Nominee", "conditionalOn": {"field": "serviceType", "value": "NOMINEE_CHANGE"}},
        {"id": "newNomineeIdNumber", "type": "text", "label": "Nominee ID Number", "conditionalOn": {"field": "serviceType", "value": "NOMINEE_CHANGE"}}
      ]
    },
    {
      "id": "documents",
      "title": "Supporting Documents",
      "fields": [
        {"id": "supportingDocType", "type": "select", "label": "Document Type", "options": [{"label": "ID Copy", "value": "ID_COPY"}, {"label": "Utility Bill", "value": "UTILITY_BILL"}, {"label": "Bank Statement", "value": "BANK_STATEMENT"}, {"label": "Court Order", "value": "COURT_ORDER"}, {"label": "Other", "value": "OTHER"}]},
        {"id": "documentReference", "type": "text", "label": "Document Reference"},
        {"id": "remarks", "type": "textarea", "label": "Additional Remarks"}
      ]
    }
  ]
}',
'{"thresholds": [{"amount": 0, "tiers": 1}]}',
'{"endpoint": "/tXact/accountServicing", "method": "POST", "fieldMapping": {"accountId": "accountNumber", "serviceCode": "serviceType"}}',
'{"category": "ACCOUNT_SERVICING", "retentionYears": 10, "indexFields": ["accountNumber", "serviceType"]}',
'PUBLISHED', 'system');

-- ============================================
-- 6. FIXED DEPOSIT
-- ============================================
INSERT INTO fs_form_templates (form_code, version, journey_type, name, description, schema, approval_config, cbs_mapping, dms_config, status, created_by) VALUES
('FD_V1', 1, 'FIXED_DEPOSIT', 'Fixed Deposit Placement', 'Fixed deposit / term deposit placement and booking form',
'{
  "sections": [
    {
      "id": "customer_info",
      "title": "Customer & Account",
      "fields": [
        {"id": "accountNumber", "type": "text", "label": "Source Account Number", "required": true, "validation": {"pattern": "^[0-9]{10,16}$"}},
        {"id": "accountName", "type": "text", "label": "Account Holder Name", "readOnly": true},
        {"id": "availableBalance", "type": "currency", "label": "Available Balance", "readOnly": true},
        {"id": "customerId", "type": "text", "label": "Customer ID", "readOnly": true}
      ]
    },
    {
      "id": "deposit_details",
      "title": "Deposit Details",
      "fields": [
        {"id": "currency", "type": "select", "label": "Currency", "required": true, "options": [{"label": "KES", "value": "KES"}, {"label": "USD", "value": "USD"}, {"label": "EUR", "value": "EUR"}, {"label": "GBP", "value": "GBP"}]},
        {"id": "principalAmount", "type": "currency", "label": "Principal Amount", "required": true, "validation": {"min": 10000, "message": "Minimum deposit is 10,000"}},
        {"id": "tenor", "type": "number", "label": "Tenor", "required": true, "validation": {"min": 1, "max": 120}},
        {"id": "tenorUnit", "type": "select", "label": "Tenor Unit", "required": true, "options": [{"label": "Days", "value": "DAYS"}, {"label": "Months", "value": "MONTHS"}, {"label": "Years", "value": "YEARS"}]},
        {"id": "interestRate", "type": "number", "label": "Interest Rate (%)", "readOnly": true, "placeholder": "Auto-calculated based on tenor"},
        {"id": "maturityDate", "type": "date", "label": "Maturity Date", "readOnly": true},
        {"id": "maturityAmount", "type": "currency", "label": "Maturity Amount", "readOnly": true},
        {"id": "interestPayment", "type": "select", "label": "Interest Payment Frequency", "required": true, "options": [{"label": "At Maturity", "value": "MATURITY"}, {"label": "Monthly", "value": "MONTHLY"}, {"label": "Quarterly", "value": "QUARTERLY"}, {"label": "Half-Yearly", "value": "HALF_YEARLY"}, {"label": "Yearly", "value": "YEARLY"}]}
      ]
    },
    {
      "id": "maturity_instructions",
      "title": "Maturity Instructions",
      "fields": [
        {"id": "maturityInstruction", "type": "select", "label": "On Maturity", "required": true, "options": [{"label": "Auto-Renew Principal + Interest", "value": "RENEW_ALL"}, {"label": "Auto-Renew Principal Only", "value": "RENEW_PRINCIPAL"}, {"label": "Credit to Account", "value": "CREDIT_ACCOUNT"}, {"label": "Advise Before Maturity", "value": "ADVISE"}]},
        {"id": "creditAccount", "type": "text", "label": "Credit Account for Maturity Proceeds", "conditionalOn": {"field": "maturityInstruction", "value": "CREDIT_ACCOUNT"}}
      ]
    },
    {
      "id": "nominee_details",
      "title": "Nominee Details",
      "fields": [
        {"id": "nomineeName", "type": "text", "label": "Nominee Name"},
        {"id": "nomineeRelation", "type": "text", "label": "Relationship"},
        {"id": "nomineeIdNumber", "type": "text", "label": "Nominee ID Number"},
        {"id": "nomineeAddress", "type": "textarea", "label": "Nominee Address"}
      ]
    }
  ]
}',
'{"thresholds": [{"amount": 0, "tiers": 1}, {"amount": 5000000, "tiers": 2}]}',
'{"endpoint": "/tXact/fixedDeposit", "method": "POST", "fieldMapping": {"sourceAcct": "accountNumber", "fdAmount": "principalAmount", "fdCurrency": "currency", "fdTenor": "tenor"}}',
'{"category": "DEPOSITS", "retentionYears": 10, "indexFields": ["accountNumber", "principalAmount", "maturityDate"]}',
'PUBLISHED', 'system');

-- ============================================
-- 7. LOAN DISBURSEMENT
-- ============================================
INSERT INTO fs_form_templates (form_code, version, journey_type, name, description, schema, approval_config, cbs_mapping, dms_config, status, created_by) VALUES
('LOAN_DISB_V1', 1, 'LOAN_DISBURSEMENT', 'Loan Disbursement Request', 'Loan drawdown and disbursement processing form',
'{
  "sections": [
    {
      "id": "loan_info",
      "title": "Loan Details",
      "fields": [
        {"id": "loanAccountNumber", "type": "text", "label": "Loan Account Number", "required": true},
        {"id": "loanType", "type": "select", "label": "Loan Type", "required": true, "options": [{"label": "Personal Loan", "value": "PERSONAL"}, {"label": "Home Loan", "value": "HOME"}, {"label": "Vehicle Loan", "value": "VEHICLE"}, {"label": "Business Loan", "value": "BUSINESS"}, {"label": "Education Loan", "value": "EDUCATION"}, {"label": "Agriculture Loan", "value": "AGRICULTURE"}, {"label": "Overdraft", "value": "OVERDRAFT"}]},
        {"id": "sanctionedAmount", "type": "currency", "label": "Sanctioned Amount", "readOnly": true},
        {"id": "disbursedToDate", "type": "currency", "label": "Already Disbursed", "readOnly": true},
        {"id": "availableForDisburse", "type": "currency", "label": "Available for Disbursement", "readOnly": true},
        {"id": "sanctionDate", "type": "date", "label": "Sanction Date", "readOnly": true},
        {"id": "sanctionExpiryDate", "type": "date", "label": "Sanction Expiry", "readOnly": true}
      ]
    },
    {
      "id": "disbursement_details",
      "title": "Disbursement Details",
      "fields": [
        {"id": "currency", "type": "select", "label": "Currency", "required": true, "options": [{"label": "KES", "value": "KES"}, {"label": "USD", "value": "USD"}]},
        {"id": "disbursementAmount", "type": "currency", "label": "Disbursement Amount", "required": true, "validation": {"min": 1}},
        {"id": "disbursementAccount", "type": "text", "label": "Credit Account", "required": true, "validation": {"pattern": "^[0-9]{10,16}$"}},
        {"id": "disbursementAccountName", "type": "text", "label": "Account Name", "readOnly": true},
        {"id": "disbursementMode", "type": "select", "label": "Disbursement Mode", "required": true, "options": [{"label": "Credit to Account", "value": "ACCOUNT"}, {"label": "Demand Draft", "value": "DD"}, {"label": "Direct to Vendor", "value": "VENDOR"}]},
        {"id": "vendorName", "type": "text", "label": "Vendor/Payee Name", "conditionalOn": {"field": "disbursementMode", "value": "VENDOR"}},
        {"id": "vendorAccount", "type": "text", "label": "Vendor Account", "conditionalOn": {"field": "disbursementMode", "value": "VENDOR"}},
        {"id": "purpose", "type": "textarea", "label": "Purpose of Disbursement", "required": true}
      ]
    },
    {
      "id": "guarantor_info",
      "title": "Guarantor Details",
      "fields": [
        {"id": "guarantorName", "type": "text", "label": "Guarantor Name"},
        {"id": "guarantorIdNumber", "type": "text", "label": "Guarantor ID Number"},
        {"id": "guarantorPhone", "type": "phone", "label": "Guarantor Phone"},
        {"id": "guarantorRelation", "type": "text", "label": "Relationship with Borrower"}
      ]
    },
    {
      "id": "documents_checklist",
      "title": "Pre-Disbursement Checklist",
      "fields": [
        {"id": "loanAgreementSigned", "type": "checkbox", "label": "Loan agreement signed"},
        {"id": "securityDocumentsComplete", "type": "checkbox", "label": "Security documents complete"},
        {"id": "insurancePolicyCurrent", "type": "checkbox", "label": "Insurance policy current"},
        {"id": "kycVerified", "type": "checkbox", "label": "KYC verification complete"},
        {"id": "creditApprovalInFile", "type": "checkbox", "label": "Credit approval in file"}
      ]
    }
  ]
}',
'{"thresholds": [{"amount": 0, "tiers": 2}]}',
'{"endpoint": "/tXact/loanDisbursement", "method": "POST", "fieldMapping": {"loanAcct": "loanAccountNumber", "disbAmount": "disbursementAmount", "creditAcct": "disbursementAccount"}}',
'{"category": "LOANS", "retentionYears": 15, "indexFields": ["loanAccountNumber", "disbursementAmount", "disbursementAccount"]}',
'PUBLISHED', 'system');

-- ============================================
-- 8. CHEQUE BOOK REQUEST
-- ============================================
INSERT INTO fs_form_templates (form_code, version, journey_type, name, description, schema, approval_config, cbs_mapping, dms_config, status, created_by) VALUES
('CHQ_REQ_V1', 1, 'CHEQUE_BOOK_REQUEST', 'Cheque Book Request', 'Cheque book issuance request form',
'{
  "sections": [
    {
      "id": "account_info",
      "title": "Account Information",
      "fields": [
        {"id": "accountNumber", "type": "text", "label": "Account Number", "required": true, "validation": {"pattern": "^[0-9]{10,16}$"}},
        {"id": "accountName", "type": "text", "label": "Account Holder Name", "readOnly": true},
        {"id": "accountType", "type": "text", "label": "Account Type", "readOnly": true},
        {"id": "branchCode", "type": "text", "label": "Branch Code", "readOnly": true}
      ]
    },
    {
      "id": "cheque_details",
      "title": "Cheque Book Details",
      "fields": [
        {"id": "numberOfLeaves", "type": "select", "label": "Number of Leaves", "required": true, "options": [{"label": "10 Leaves", "value": "10"}, {"label": "25 Leaves", "value": "25"}, {"label": "50 Leaves", "value": "50"}, {"label": "100 Leaves", "value": "100"}]},
        {"id": "numberOfBooks", "type": "number", "label": "Number of Books", "required": true, "validation": {"min": 1, "max": 5, "message": "Maximum 5 books per request"}},
        {"id": "chequeType", "type": "select", "label": "Cheque Type", "required": true, "options": [{"label": "Bearer", "value": "BEARER"}, {"label": "Order", "value": "ORDER"}, {"label": "Crossed - A/C Payee Only", "value": "CROSSED"}]},
        {"id": "nameToPrint", "type": "text", "label": "Name to Print on Cheque", "required": true},
        {"id": "micrRequired", "type": "checkbox", "label": "MICR encoding required"}
      ]
    },
    {
      "id": "delivery",
      "title": "Delivery Preference",
      "fields": [
        {"id": "deliveryPreference", "type": "select", "label": "Delivery Mode", "required": true, "options": [{"label": "Collect at Branch", "value": "BRANCH_COLLECT"}, {"label": "Courier to Address", "value": "COURIER"}, {"label": "Registered Post", "value": "REGISTERED_POST"}]},
        {"id": "deliveryAddress", "type": "textarea", "label": "Delivery Address", "conditionalOn": {"field": "deliveryPreference", "value": "BRANCH_COLLECT", "negate": true}},
        {"id": "contactPhone", "type": "phone", "label": "Contact Phone for Delivery", "required": true},
        {"id": "remarks", "type": "textarea", "label": "Remarks"}
      ]
    }
  ]
}',
'{"thresholds": [{"amount": 0, "tiers": 1}]}',
'{"endpoint": "/tXact/chequeBook", "method": "POST", "fieldMapping": {"accountId": "accountNumber", "leaves": "numberOfLeaves", "chequeType": "chequeType"}}',
'{"category": "INSTRUMENTS", "retentionYears": 7, "indexFields": ["accountNumber", "chequeType"]}',
'PUBLISHED', 'system');

-- ============================================
-- 9. ACCOUNT OPENING
-- ============================================
INSERT INTO fs_form_templates (form_code, version, journey_type, name, description, schema, approval_config, cbs_mapping, dms_config, status, created_by) VALUES
('ACCT_OPEN_V1', 1, 'ACCOUNT_OPENING', 'New Account Opening', 'Comprehensive new account opening form with KYC details',
'{
  "sections": [
    {
      "id": "personal_info",
      "title": "Personal Information",
      "fields": [
        {"id": "salutation", "type": "select", "label": "Salutation", "options": [{"label": "Mr.", "value": "MR"}, {"label": "Mrs.", "value": "MRS"}, {"label": "Ms.", "value": "MS"}, {"label": "Dr.", "value": "DR"}]},
        {"id": "applicantName", "type": "text", "label": "Full Name (as per ID)", "required": true},
        {"id": "dateOfBirth", "type": "date", "label": "Date of Birth", "required": true},
        {"id": "gender", "type": "select", "label": "Gender", "required": true, "options": [{"label": "Male", "value": "MALE"}, {"label": "Female", "value": "FEMALE"}, {"label": "Other", "value": "OTHER"}]},
        {"id": "maritalStatus", "type": "select", "label": "Marital Status", "options": [{"label": "Single", "value": "SINGLE"}, {"label": "Married", "value": "MARRIED"}, {"label": "Divorced", "value": "DIVORCED"}, {"label": "Widowed", "value": "WIDOWED"}]},
        {"id": "nationality", "type": "text", "label": "Nationality", "required": true},
        {"id": "motherMaidenName", "type": "text", "label": "Mother''s Maiden Name"}
      ]
    },
    {
      "id": "identification",
      "title": "Identification Documents",
      "fields": [
        {"id": "idType", "type": "select", "label": "Primary ID Type", "required": true, "options": [{"label": "National ID", "value": "NATIONAL_ID"}, {"label": "Passport", "value": "PASSPORT"}, {"label": "Driving License", "value": "DRIVING_LICENSE"}, {"label": "Alien ID", "value": "ALIEN_ID"}]},
        {"id": "idNumber", "type": "text", "label": "ID Number", "required": true},
        {"id": "idIssueDate", "type": "date", "label": "ID Issue Date"},
        {"id": "idExpiryDate", "type": "date", "label": "ID Expiry Date"},
        {"id": "kraPin", "type": "text", "label": "KRA PIN", "required": true, "validation": {"pattern": "^[A-Z][0-9]{9}[A-Z]$", "message": "Invalid KRA PIN format"}},
        {"id": "secondaryIdType", "type": "select", "label": "Secondary ID Type", "options": [{"label": "Passport", "value": "PASSPORT"}, {"label": "Driving License", "value": "DRIVING_LICENSE"}, {"label": "NHIF Card", "value": "NHIF"}, {"label": "Voter ID", "value": "VOTER_ID"}]},
        {"id": "secondaryIdNumber", "type": "text", "label": "Secondary ID Number"}
      ]
    },
    {
      "id": "contact_info",
      "title": "Contact Details",
      "fields": [
        {"id": "phone", "type": "phone", "label": "Mobile Phone", "required": true},
        {"id": "alternatePhone", "type": "phone", "label": "Alternate Phone"},
        {"id": "email", "type": "email", "label": "Email Address", "required": true},
        {"id": "postalAddress", "type": "textarea", "label": "Postal Address", "required": true},
        {"id": "physicalAddress", "type": "textarea", "label": "Physical / Residential Address", "required": true},
        {"id": "city", "type": "text", "label": "City / Town", "required": true},
        {"id": "county", "type": "text", "label": "County / State", "required": true}
      ]
    },
    {
      "id": "employment",
      "title": "Employment & Income",
      "fields": [
        {"id": "employmentStatus", "type": "select", "label": "Employment Status", "required": true, "options": [{"label": "Employed", "value": "EMPLOYED"}, {"label": "Self-Employed", "value": "SELF_EMPLOYED"}, {"label": "Business Owner", "value": "BUSINESS"}, {"label": "Student", "value": "STUDENT"}, {"label": "Retired", "value": "RETIRED"}, {"label": "Unemployed", "value": "UNEMPLOYED"}]},
        {"id": "employerName", "type": "text", "label": "Employer Name", "conditionalOn": {"field": "employmentStatus", "value": "EMPLOYED"}},
        {"id": "occupation", "type": "text", "label": "Occupation / Designation"},
        {"id": "monthlyIncome", "type": "currency", "label": "Monthly Income (KES)"},
        {"id": "sourceOfIncome", "type": "select", "label": "Primary Source of Income", "required": true, "options": [{"label": "Salary", "value": "SALARY"}, {"label": "Business", "value": "BUSINESS"}, {"label": "Agriculture", "value": "AGRICULTURE"}, {"label": "Investments", "value": "INVESTMENTS"}, {"label": "Pension", "value": "PENSION"}, {"label": "Other", "value": "OTHER"}]}
      ]
    },
    {
      "id": "account_details",
      "title": "Account Details",
      "fields": [
        {"id": "accountType", "type": "select", "label": "Account Type", "required": true, "options": [{"label": "Savings Account", "value": "SAVINGS"}, {"label": "Current Account", "value": "CURRENT"}, {"label": "Fixed Deposit", "value": "FD"}, {"label": "Joint Account", "value": "JOINT"}]},
        {"id": "currency", "type": "select", "label": "Account Currency", "required": true, "options": [{"label": "KES", "value": "KES"}, {"label": "USD", "value": "USD"}, {"label": "EUR", "value": "EUR"}, {"label": "GBP", "value": "GBP"}]},
        {"id": "initialDeposit", "type": "currency", "label": "Initial Deposit Amount", "required": true, "validation": {"min": 1000, "message": "Minimum initial deposit is 1,000"}},
        {"id": "operatingMode", "type": "select", "label": "Mode of Operation", "options": [{"label": "Single", "value": "SINGLE"}, {"label": "Joint - Either or Survivor", "value": "JOINT_EOS"}, {"label": "Joint - Both to Sign", "value": "JOINT_BOTH"}]},
        {"id": "statementFrequency", "type": "select", "label": "Statement Frequency", "options": [{"label": "Monthly", "value": "MONTHLY"}, {"label": "Quarterly", "value": "QUARTERLY"}, {"label": "Half-Yearly", "value": "HALF_YEARLY"}, {"label": "Yearly", "value": "YEARLY"}]},
        {"id": "chequeBookRequired", "type": "checkbox", "label": "Cheque book required"},
        {"id": "debitCardRequired", "type": "checkbox", "label": "Debit card required"},
        {"id": "internetBanking", "type": "checkbox", "label": "Internet banking required"},
        {"id": "mobileBanking", "type": "checkbox", "label": "Mobile banking required"},
        {"id": "smsAlerts", "type": "checkbox", "label": "SMS alerts required"}
      ]
    },
    {
      "id": "nominee_details",
      "title": "Nominee Details",
      "fields": [
        {"id": "nomineeName", "type": "text", "label": "Nominee Full Name"},
        {"id": "nomineeRelation", "type": "text", "label": "Relationship"},
        {"id": "nomineeDob", "type": "date", "label": "Nominee Date of Birth"},
        {"id": "nomineeIdNumber", "type": "text", "label": "Nominee ID Number"},
        {"id": "nomineeAddress", "type": "textarea", "label": "Nominee Address"},
        {"id": "nomineePhone", "type": "phone", "label": "Nominee Phone"}
      ]
    },
    {
      "id": "kyc_docs",
      "title": "KYC Documents",
      "fields": [
        {"id": "idCopyProvided", "type": "checkbox", "label": "ID copy provided"},
        {"id": "kraProvided", "type": "checkbox", "label": "KRA PIN certificate provided"},
        {"id": "passportPhotoProvided", "type": "checkbox", "label": "Passport photograph provided"},
        {"id": "utilityBillProvided", "type": "checkbox", "label": "Utility bill provided"},
        {"id": "introductionLetterProvided", "type": "checkbox", "label": "Introduction letter provided"}
      ]
    }
  ]
}',
'{"thresholds": [{"amount": 0, "tiers": 1}]}',
'{"endpoint": "/tXact/accountOpening", "method": "POST", "fieldMapping": {"customerName": "applicantName", "acctType": "accountType", "acctCurrency": "currency", "initialAmt": "initialDeposit"}}',
'{"category": "ACCOUNT_OPENING", "retentionYears": 15, "indexFields": ["applicantName", "idNumber", "accountType"]}',
'PUBLISHED', 'system');

-- ============================================
-- 10. INSTRUMENT CLEARING
-- ============================================
INSERT INTO fs_form_templates (form_code, version, journey_type, name, description, schema, approval_config, cbs_mapping, dms_config, status, created_by) VALUES
('INST_CLR_V1', 1, 'INSTRUMENT_CLEARING', 'Instrument Clearing', 'Clearing of cheques and other negotiable instruments',
'{
  "sections": [
    {
      "id": "instrument_details",
      "title": "Instrument Details",
      "fields": [
        {"id": "instrumentType", "type": "select", "label": "Instrument Type", "required": true, "options": [{"label": "Cheque", "value": "CHEQUE"}, {"label": "Demand Draft", "value": "DD"}, {"label": "Pay Order", "value": "PAY_ORDER"}, {"label": "Bankers Cheque", "value": "BANKERS_CHEQUE"}, {"label": "Dividend Warrant", "value": "DIVIDEND_WARRANT"}, {"label": "Interest Warrant", "value": "INTEREST_WARRANT"}]},
        {"id": "instrumentNumber", "type": "text", "label": "Instrument Number", "required": true},
        {"id": "instrumentDate", "type": "date", "label": "Instrument Date", "required": true},
        {"id": "currency", "type": "select", "label": "Currency", "required": true, "options": [{"label": "KES", "value": "KES"}, {"label": "USD", "value": "USD"}, {"label": "EUR", "value": "EUR"}, {"label": "GBP", "value": "GBP"}]},
        {"id": "amount", "type": "currency", "label": "Instrument Amount", "required": true, "validation": {"min": 1}},
        {"id": "amountInWords", "type": "text", "label": "Amount in Words", "readOnly": true}
      ]
    },
    {
      "id": "drawer_info",
      "title": "Drawer Details",
      "fields": [
        {"id": "drawerName", "type": "text", "label": "Drawer Name", "required": true},
        {"id": "drawerBank", "type": "text", "label": "Drawer Bank", "required": true},
        {"id": "drawerBranch", "type": "text", "label": "Drawer Bank Branch"},
        {"id": "drawerAccountNumber", "type": "text", "label": "Drawer Account Number"},
        {"id": "micrCode", "type": "text", "label": "MICR Code"}
      ]
    },
    {
      "id": "deposit_info",
      "title": "Deposit Account",
      "fields": [
        {"id": "depositAccount", "type": "text", "label": "Credit Account Number", "required": true, "validation": {"pattern": "^[0-9]{10,16}$"}},
        {"id": "depositAccountName", "type": "text", "label": "Account Name", "readOnly": true},
        {"id": "payeeName", "type": "text", "label": "Payee Name", "required": true}
      ]
    },
    {
      "id": "clearing_info",
      "title": "Clearing Details",
      "fields": [
        {"id": "clearingType", "type": "select", "label": "Clearing Type", "required": true, "options": [{"label": "Normal Clearing (T+1)", "value": "NORMAL"}, {"label": "Speed Clearing (Same Day)", "value": "SPEED"}, {"label": "Outstation", "value": "OUTSTATION"}, {"label": "Return", "value": "RETURN"}]},
        {"id": "clearingZone", "type": "text", "label": "Clearing Zone"},
        {"id": "specialInstructions", "type": "select", "label": "Special Crossing", "options": [{"label": "None", "value": "NONE"}, {"label": "A/C Payee Only", "value": "AC_PAYEE"}, {"label": "Not Negotiable", "value": "NOT_NEGOTIABLE"}, {"label": "Double Crossed", "value": "DOUBLE_CROSSED"}]},
        {"id": "endorsementVerified", "type": "checkbox", "label": "Endorsement verified"},
        {"id": "signatureVerified", "type": "checkbox", "label": "Drawer signature verified"},
        {"id": "remarks", "type": "textarea", "label": "Remarks"}
      ]
    }
  ]
}',
'{"thresholds": [{"amount": 0, "tiers": 1}]}',
'{"endpoint": "/tXact/instrumentClearing", "method": "POST", "fieldMapping": {"instType": "instrumentType", "instNumber": "instrumentNumber", "instAmount": "amount", "creditAcct": "depositAccount"}}',
'{"category": "CLEARING", "retentionYears": 10, "indexFields": ["instrumentNumber", "amount", "depositAccount", "drawerName"]}',
'PUBLISHED', 'system');
