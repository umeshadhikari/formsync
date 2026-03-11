import { FormField, ValidationRule } from '../types';

export function validateField(field: FormField, value: any): string | null {
  if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return `${field.label} is required`;
  }
  if (!value) return null;

  const strVal = String(value);

  if (field.validation) {
    const v = field.validation;
    if (v.pattern) {
      const regex = new RegExp(v.pattern);
      if (!regex.test(strVal)) return v.message || `Invalid format for ${field.label}`;
    }
    if (v.min !== undefined && Number(value) < v.min) {
      return v.message || `${field.label} must be at least ${v.min}`;
    }
    if (v.max !== undefined && Number(value) > v.max) {
      return v.message || `${field.label} must be at most ${v.max}`;
    }
    if (v.minLength !== undefined && strVal.length < v.minLength) {
      return v.message || `${field.label} must be at least ${v.minLength} characters`;
    }
    if (v.maxLength !== undefined && strVal.length > v.maxLength) {
      return v.message || `${field.label} must be at most ${v.maxLength} characters`;
    }
  }

  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
    return 'Invalid email address';
  }
  if (field.type === 'phone' && !/^\+?[\d\s\-()]{7,20}$/.test(strVal)) {
    return 'Invalid phone number';
  }
  return null;
}

export function validateForm(fields: FormField[], formData: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (field.conditionalOn) {
      const { field: condField, value: condValue, negate } = field.conditionalOn as any;
      const actual = formData[condField];
      const matches = actual === condValue;
      if (negate ? matches : !matches) continue;
    }
    const error = validateField(field, formData[field.id]);
    if (error) errors[field.id] = error;
  }
  return errors;
}

export function isFormValid(fields: FormField[], formData: Record<string, any>): boolean {
  return Object.keys(validateForm(fields, formData)).length === 0;
}

export function formatCurrency(amount: number | string, currency: string = 'KES'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  return `${currency} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

export function generateReferenceNumber(journeyType: string): string {
  const prefixes: Record<string, string> = {
    CASH_DEPOSIT: 'CD', CASH_WITHDRAWAL: 'CW', FUNDS_TRANSFER: 'FT',
    DEMAND_DRAFT: 'DD', ACCOUNT_SERVICING: 'AS', FIXED_DEPOSIT: 'FD',
    LOAN_DISBURSEMENT: 'LD', CHEQUE_BOOK_REQUEST: 'CB', ACCOUNT_OPENING: 'AO',
    INSTRUMENT_CLEARING: 'IC',
  };
  const prefix = prefixes[journeyType] || 'FS';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}
