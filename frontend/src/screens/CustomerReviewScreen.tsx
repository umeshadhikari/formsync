import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { Ionicons } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SignaturePad from '../components/SignaturePad';
import { FormTemplate, JOURNEY_TYPES } from '../types';
import { getGlassStyle, getGlowShadow, getElevation } from '../utils/styles';
import api from '../api/client';
import AlertModal, { useAlert } from '../components/AlertModal';

export default function CustomerReviewScreen({ route, navigation }: any) {
  const { template, values, user: passedUser, existingFormId } = route.params;
  const { user } = useAuth();
  const { theme } = useTheme();
  const [customerSig, setCustomerSig] = useState<string | null>(null);
  const [tellerSig, setTellerSig] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const { alert, showAlert, hideAlert } = useAlert();

  const journeyInfo = JOURNEY_TYPES[template.journeyType];

  async function handleFinalSubmit() {
    if (!customerSig) { showAlert('warning', 'Required', 'Customer signature is required'); return; }
    if (!confirmationChecked) { showAlert('warning', 'Required', 'Please confirm the details are correct'); return; }
    setSubmitting(true);
    try {
      const submitPayload: any = {
        templateId: template.id,
        journeyType: template.journeyType,
        formData: values,
        customerId: values.customerId || values.accountNumber,
        customerName: values.customerName || values.depositorName || values.applicantName || values.withdrawerName || 'Customer',
        branchCode: user?.branchCode,
        customerSignature: { svgData: customerSig, deviceInfo: 'Coral Bank App' },
        tellerSignature: tellerSig ? { svgData: tellerSig, deviceInfo: 'Coral Bank App' } : null,
      };
      // If resuming a draft, include the existing form ID so backend updates instead of creating new
      if (existingFormId) submitPayload.existingFormId = existingFormId;
      const response = await api.submitForm(submitPayload);
      setResult(response);
      setSubmitted(true);

      // Fetch receipt data after submission
      try {
        const receipt = await api.getReceipt(response.id);
        setReceiptData(receipt);
      } catch (e: any) {
        // If receipt fetch fails, don't block the success state
        console.warn('Failed to fetch receipt:', e.message);
      }
    } catch (e: any) { showAlert('error', 'Error', e.message); }
    finally { setSubmitting(false); }
  }

  if (submitted && result) {
    return (
      <>
        <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
          <View style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: theme.successColor + '20', ...getGlowShadow(theme.successColor, 0.3) }]}>
              <Ionicons name="checkmark-circle" size={64} color={theme.successColor} />
            </View>
            <Text style={[styles.successTitle, { color: theme.textPrimary }]}>Form Submitted Successfully</Text>
            <Text style={[styles.refText, { color: theme.accentColor }]}>Reference: {result.referenceNumber}</Text>
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>Status: {result.status}</Text>
            {result.cbsReference && <Text style={[styles.statusText, { color: theme.textSecondary }]}>CBS Ref: {result.cbsReference}</Text>}
            <View style={styles.successButtonGroup}>
              {receiptData && (
                <TouchableOpacity style={[styles.receiptBtn, { backgroundColor: theme.accentColor, ...getGlowShadow(theme.accentColor, 0.3) }]} onPress={() => setShowReceiptModal(true)}>
                  <Ionicons name="receipt" size={18} color="#FFF" />
                  <Text style={styles.receiptBtnText}>Print Receipt</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: theme.primaryColor, ...getGlowShadow(theme.primaryColor, 0.3) }]} onPress={() => navigation.popToTop()}>
                <Text style={styles.doneBtnText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Receipt Modal */}
        <Modal visible={showReceiptModal} transparent animationType="slide" onRequestClose={() => setShowReceiptModal(false)}>
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.receiptModal, { backgroundColor: theme.backgroundColor }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Receipt</Text>
                <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
                  <Ionicons name="close" size={28} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.receiptContent}>
                {receiptData && (
                  <>
                    <View style={[styles.receiptSection, { backgroundColor: theme.primaryColor + '15', borderColor: theme.primaryColor }]}>
                      <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Receipt Type</Text>
                      <Text style={[styles.receiptValue, { color: theme.textPrimary }]}>{receiptData.receiptType}</Text>
                    </View>
                    <View style={[styles.receiptRow]}>
                      <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Reference Number</Text>
                      <Text style={[styles.receiptValue, { color: theme.accentColor, fontWeight: '700' }]}>{receiptData.referenceNumber}</Text>
                    </View>
                    <View style={[styles.receiptRow]}>
                      <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Journey Type</Text>
                      <Text style={[styles.receiptValue, { color: theme.textPrimary }]}>{receiptData.journeyType}</Text>
                    </View>
                    <View style={[styles.receiptRow]}>
                      <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Status</Text>
                      <Text style={[styles.receiptValue, { color: theme.textPrimary }]}>{receiptData.status}</Text>
                    </View>
                    {receiptData.accountNumber && (
                      <View style={[styles.receiptRow]}>
                        <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Account Number</Text>
                        <Text style={[styles.receiptValue, { color: theme.textPrimary }]}>{receiptData.accountNumber}</Text>
                      </View>
                    )}
                    {receiptData.accountName && (
                      <View style={[styles.receiptRow]}>
                        <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Account Name</Text>
                        <Text style={[styles.receiptValue, { color: theme.textPrimary }]}>{receiptData.accountName}</Text>
                      </View>
                    )}
                    {receiptData.amount && (
                      <View style={[styles.receiptRow]}>
                        <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Amount</Text>
                        <Text style={[styles.receiptValue, { color: theme.textPrimary }]}>{receiptData.amount} {receiptData.currency || ''}</Text>
                      </View>
                    )}
                    {receiptData.branchCode && (
                      <View style={[styles.receiptRow]}>
                        <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Branch Code</Text>
                        <Text style={[styles.receiptValue, { color: theme.textPrimary }]}>{receiptData.branchCode}</Text>
                      </View>
                    )}
                    {receiptData.submittedAt && (
                      <View style={[styles.receiptRow]}>
                        <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Submitted At</Text>
                        <Text style={[styles.receiptValue, { color: theme.textPrimary }]}>{receiptData.submittedAt}</Text>
                      </View>
                    )}
                    {receiptData.generatedAt && (
                      <View style={[styles.receiptRow]}>
                        <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Generated At</Text>
                        <Text style={[styles.receiptValue, { color: theme.textPrimary }]}>{receiptData.generatedAt}</Text>
                      </View>
                    )}
                    {receiptData.disclaimer && (
                      <View style={[styles.disclaimerSection, { backgroundColor: theme.warningColor + '10', borderColor: theme.warningColor }]}>
                        <Ionicons name="information-circle" size={16} color={theme.warningColor} style={{ marginRight: 8 }} />
                        <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>{receiptData.disclaimer}</Text>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      {/* Customer Review Mode Indicator */}
      <View style={[styles.modeIndicator, { backgroundColor: theme.accentColor + '15', borderColor: theme.accentColor }]}>
        <View style={styles.modeIconContainer}>
          <Ionicons name="person-circle" size={16} color={theme.accentColor} />
        </View>
        <Text style={[styles.modeIndicatorText, { color: theme.accentColor }]}>Customer Review Mode</Text>
      </View>

      {/* Summary Header */}
      <View style={[styles.header, { backgroundColor: journeyInfo?.color || theme.primaryColor }]}>
        <Ionicons name="document-text" size={24} color="#FFF" />
        <Text style={styles.headerTitle}>Instruction Summary</Text>
        <Text style={styles.headerSub}>{template.name}</Text>
      </View>

      {/* Data Summary - Enhanced */}
      <View style={[styles.card, getGlassStyle(theme), getElevation(1, theme)]}>
        <View style={styles.cardHeaderContainer}>
          <Ionicons name="checkmark-circle-outline" size={24} color={theme.primaryColor} />
          <Text style={[styles.cardTitle, { color: theme.primaryColor, marginLeft: 8 }]}>Transaction Details</Text>
        </View>
        {Object.entries(values).filter(([_, v]) => v).map(([key, val], idx) => (
          <View key={key} style={[styles.summaryRow, { backgroundColor: idx % 2 === 0 ? 'transparent' : theme.surfaceElevated }]}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{formatLabel(key)}</Text>
            <Text style={[styles.summaryValueEnhanced, { color: theme.textPrimary }]}>{String(val)}</Text>
          </View>
        ))}
      </View>

      {/* Customer Signature and Confirmation */}
      <View style={[styles.card, getGlassStyle(theme), getElevation(1, theme)]}>
        <Text style={[styles.cardTitle, { color: theme.primaryColor }]}>Customer Consent & Authorization</Text>
        <Text style={[styles.consentText, { color: theme.textSecondary }]}>
          Please review the transaction details above and provide your signature to authorize this transaction.
        </Text>
        <SignaturePad label="Customer Signature" onSave={setCustomerSig} />
        {customerSig && <View style={styles.sigConfirm}><Ionicons name="checkmark-circle" size={18} color={theme.successColor} /><Text style={{ color: theme.successColor, marginLeft: 4 }}>Signed</Text></View>}

        {/* Confirmation Checkbox */}
        <TouchableOpacity style={styles.checkboxContainer} onPress={() => setConfirmationChecked(!confirmationChecked)}>
          <View style={[styles.checkbox, { borderColor: theme.primaryColor, backgroundColor: confirmationChecked ? theme.primaryColor : 'transparent' }]}>
            {confirmationChecked && <Ionicons name="checkmark" size={16} color="#FFF" />}
          </View>
          <Text style={[styles.checkboxLabel, { color: theme.textPrimary }]}>I confirm the above details are correct and authorize this transaction</Text>
        </TouchableOpacity>
      </View>

      {/* Teller Signature */}
      <View style={[styles.card, getGlassStyle(theme), getElevation(1, theme)]}>
        <SignaturePad label="Teller Signature (Optional)" onSave={setTellerSig} />
        {tellerSig && <View style={styles.sigConfirm}><Ionicons name="checkmark-circle" size={18} color={theme.successColor} /><Text style={{ color: theme.successColor, marginLeft: 4 }}>Signed</Text></View>}
      </View>

      {/* Submit Button - Disabled if confirmation not checked */}
      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: confirmationChecked ? theme.successColor : theme.textSecondary, ...getGlowShadow(confirmationChecked ? theme.successColor : theme.textSecondary, 0.4), opacity: submitting ? 0.6 : 1 }]}
        onPress={handleFinalSubmit} disabled={submitting || !confirmationChecked}>
        <Ionicons name="send" size={20} color="#FFF" />
        <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Confirm & Submit'}</Text>
      </TouchableOpacity>

      {!confirmationChecked && (
        <Text style={[styles.validationText, { color: theme.warningColor }]}>Please confirm the details to proceed</Text>
      )}

      <View style={{ height: 40 }} />
      <AlertModal alert={alert} onClose={hideAlert} />
    </ScrollView>
  );
}

function formatLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modeIndicator: { marginTop: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 8, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  modeIconContainer: { marginRight: 8 },
  modeIndicatorText: { fontSize: 12, fontWeight: '600' },
  header: { padding: 24, alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginTop: 8 },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  card: { margin: 16, marginBottom: 8, borderRadius: 12, padding: 16 },
  cardHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6 },
  summaryLabel: { fontSize: 13, flex: 1 },
  summaryValue: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  summaryValueEnhanced: { fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'right' },
  consentText: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  sigConfirm: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingVertical: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxLabel: { fontSize: 14, flex: 1, lineHeight: 20, fontWeight: '500' },
  submitBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, margin: 16, borderRadius: 12, padding: 16 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  validationText: { fontSize: 12, textAlign: 'center', marginHorizontal: 16, marginBottom: 16 },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  successIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  refText: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  statusText: { fontSize: 14, marginBottom: 4 },
  successButtonGroup: { marginTop: 30, gap: 12 },
  receiptBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  receiptBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  doneBtn: { borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  doneBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  receiptModal: { maxHeight: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  receiptContent: { paddingHorizontal: 16, paddingVertical: 12 },
  receiptSection: { borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 12 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 6 },
  receiptLabel: { fontSize: 12 },
  receiptValue: { fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 },
  disclaimerSection: { borderRadius: 8, borderWidth: 1, padding: 12, marginTop: 12, flexDirection: 'row', alignItems: 'flex-start' },
  disclaimerText: { fontSize: 12, flex: 1, lineHeight: 18 },
});
