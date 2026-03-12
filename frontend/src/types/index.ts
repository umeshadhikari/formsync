// ── Auth Types ──
export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  branchCode: string;
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

// ── Form Template Types ──
export type FieldType =
  | 'text' | 'number' | 'currency' | 'date' | 'select' | 'radio'
  | 'checkbox' | 'textarea' | 'file' | 'signature' | 'account_lookup'
  | 'phone' | 'email' | 'section_header';

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'regex' | 'custom';
  value?: any;
  message: string;
}

export interface ConditionalRule {
  field: string;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains';
  value: any;
  action: 'show' | 'hide' | 'require';
  targetField: string;
}

export interface FieldValidation {
  pattern?: string;
  message?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  validationRules?: ValidationRule[];
  validation?: FieldValidation;
  options?: { label: string; value: string }[];
  defaultValue?: any;
  dataMapping?: string; // CBS field reference
  conditionalRules?: ConditionalRule[];
  conditionalOn?: { field: string; value: any; negate?: boolean };
  width?: 'full' | 'half' | 'third';
  helpText?: string;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  collapsible?: boolean;
}

export interface FormSchema {
  sections: FormSection[];
}

export interface FormTemplate {
  id: number;
  formCode: string;
  version: number;
  journeyType: string;
  name: string;
  description: string;
  schema: FormSchema;
  approvalConfig: any;
  cbsMapping: any;
  dmsConfig: any;
  status: string;
  createdBy: string;
  createdAt: string;
}

// ── Form Instance Types ──
export interface FormInstance {
  id: number;
  referenceNumber: string;
  templateId: number;
  templateVersion: number;
  journeyType: string;
  formData: Record<string, any>;
  status: string;
  branchCode: string;
  customerId?: string;
  customerName?: string;
  amount: number;
  currency: string;
  createdBy: string;
  submitterName?: string;
  submittedAt?: string;
  completedAt?: string;
  cbsReference?: string;
  dmsReference?: string;
  createdAt: string;
  // V6 resubmission fields
  resubmissionCount?: number;
  originalFormId?: number;
  lastRejectionReason?: string;
  lastReturnInstructions?: string;
}

// ── Workflow Types ──
export interface WorkflowInstance {
  id: number;
  formInstanceId: number;
  currentState: string;
  currentTier: number;
  requiredTiers: number;
  approvalMode: string;
  slaDeadline?: string;
  escalated: boolean;
  tierRoles?: string[];
  claimedBy?: string;
  claimedByName?: string;
  claimedAt?: string;
  claimExpiresAt?: string;
  // V6 resubmission fields
  resubmissionCount?: number;
  originalWorkflowId?: number;
  rejectionReason?: string;
  returnInstructions?: string;
}

export interface ApprovalAction {
  id: number;
  workflowId: number;
  formInstanceId: number;
  tier: number;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  comments?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface WorkflowRule {
  id: number;
  ruleName: string;
  journeyType: string;
  conditionField: string;
  conditionOp: string;
  conditionValue: string;
  requiredTiers: number;
  approvalMode: string;
  tierRoles: string[];
  priority: number;
  isActive: boolean;
  // V6 rejection/return policy fields
  rejectionPolicy?: string;
  returnPolicy?: string;
  maxResubmissions?: number;
  rejectionReasons?: string[];
  requireRejectionReason?: boolean;
  requireReturnInstructions?: boolean;
}

// ── Queue Item ──
export interface QueueItem {
  workflow: WorkflowInstance;
  form: FormInstance;
}

// ── Theme Types ──
export interface ThemeConfig {
  id: number;
  bankId: string;
  name: string;
  cssUrl?: string;
  designTokens: Record<string, string>;
  logoUrl?: string;
  isActive: boolean;
}

// ── Dashboard ──
export interface InsightCard {
  id: string;
  label: string;
  value: number;
  icon: string;
  color: string;
  trend?: string;    // "up" | "down" | "neutral"
  action?: string;   // optional navigation target
}

export interface DashboardStats {
  role?: string;
  totalForms: number;
  pendingApproval: number;
  approvedToday: number;
  rejectedToday: number;
  byJourneyType: Record<string, number>;
  byStatus: Record<string, number>;
  // Teller
  myDrafts?: number;
  myPending?: number;
  myReturned?: number;
  myRejected?: number;
  myCompleted?: number;
  myResubmissions?: number;
  // Supervisor
  queueDepth?: number;
  myPickedUp?: number;
  slaAtRisk?: number;
  escalated?: number;
  todayApproved?: number;
  todayRejected?: number;
  todayReturned?: number;
  // Admin
  activeRules?: number;
  totalUsers?: number;
  formsToday?: number;
  autoApproved?: number;
  avgApprovalTiers?: number;
  // Auditor
  slaBreach?: number;
  multiResubmit?: number;
  rejectionRate?: number;
  highValuePending?: number;
  // Universal
  insights?: InsightCard[];
}

// ── Audit ──
export interface AuditLog {
  id: number;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  ipAddress?: string;
  branchCode?: string;
  details?: Record<string, any>;
  createdAt: string;
}

// ── Journey Type Labels (Coral Bank palette) ──
export const JOURNEY_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  CASH_DEPOSIT: { label: 'Cash Deposit', icon: 'arrow-down-circle', color: '#10B981' },
  CASH_WITHDRAWAL: { label: 'Cash Withdrawal', icon: 'arrow-up-circle', color: '#F35B54' },
  FUNDS_TRANSFER: { label: 'Funds Transfer', icon: 'swap-horizontal', color: '#327787' },
  DEMAND_DRAFT: { label: 'Demand Draft', icon: 'document-text', color: '#8B5CF6' },
  ACCOUNT_SERVICING: { label: 'Account Servicing', icon: 'settings', color: '#E9AD3C' },
  FIXED_DEPOSIT: { label: 'Fixed Deposit', icon: 'lock-closed', color: '#8ABB9C' },
  LOAN_DISBURSEMENT: { label: 'Loan Disbursement', icon: 'cash', color: '#E67E22' },
  CHEQUE_BOOK_REQUEST: { label: 'Cheque Book', icon: 'book', color: '#14233C' },
  ACCOUNT_OPENING: { label: 'Account Opening', icon: 'person-add', color: '#327787' },
  INSTRUMENT_CLEARING: { label: 'Instrument Clearing', icon: 'checkmark-circle', color: '#8B5CF6' },
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#95A5A6',
  PENDING_APPROVAL: '#F39C12',
  PENDING_TIER_1: '#F39C12',
  PENDING_TIER_2: '#E67E22',
  PENDING_TIER_3: '#D35400',
  APPROVED: '#27AE60',
  SUBMITTING_CBS: '#3498DB',
  ARCHIVING_DMS: '#2980B9',
  COMPLETED: '#27AE60',
  REJECTED: '#E74C3C',
  RETURNED: '#9B59B6',
  FAILED: '#C0392B',
};
