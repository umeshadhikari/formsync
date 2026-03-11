import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SignaturePad from '../components/SignaturePad';
import { FormTemplate, JOURNEY_TYPES } from '../types';
import api from '../api/client';

export default function CustomerReviewScreen({ route, navigation }: any) {
  const { template, values, user: passedUser } = route.params;
  const { user } = useAuth();
  const { theme } = useTheme();
  const [customerSig, setCustomerSig] = useState<string | null>(null);
  const [tellerSig, setTellerSig] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);

  const journeyInfo = JOURNEY_TYPES[template.journeyType];

  async function handleFinalSubmit() {
    if (!customerSig) { Alert.alert('Required', 'Customer signature is required'); return; }
    setSubmitting(true);
    try {
      const response = await api.submitForm({
        templateId: template.id,
        journeyType: template.journeyType,
        formData: values,
        customerId: values.customerId || values.accountNumber,
        customerName: values.customerName || values.depositorName || values.applicantName || values.withdrawerName || 'Customer',
        branchCode: user?.branchCode,
        customerSignature: { svgData: customerSig, deviceInfo: 'FormSync App' },
        tellerSignature: tellerSig ? { svgData: tellerSig, deviceInfo: 'FormSync App' } : null,
      });
      setResult(response);
      setSubmitted(true);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSubmitting(false); }
  }

  if (submitted && result) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: theme.successColor + '20' }]}>
            <Ionicons name="checkmark-circle" size={64} color={theme.successColor} />
          </View>
          <Text style={[styles.successTitle, { color: theme.textPrimary }]}>Form Submitted Successfully</Text>
          <Text style={[styles.refText, { color: theme.accentColor }]}>Reference: {result.referenceNumber}</Text>
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>Status: {result.status}</Text>
          {result.cbsReference && <Text style={[styles.statusText, { color: theme.textSecondary }]}>CBS Ref: {result.cbsReference}</Text>}
          <TouchableOpacity style={[styles.doneBtn, { backgroundColor: theme.primaryColor }]} onPress={() => navigation.popToTop()}>
            <Text style={styles.doneBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      {/* Summary Header */}
      <View style={[styles.header, { backgroundColor: journeyInfo?.color || theme.primaryColor }]}>
        <Ionicons name="document-text" size={24} color="#FFF" />
        <Text style={styles.headerTitle}>Instruction Summary</Text>
        <Text style={styles.headerSub}>{template.name}</Text>
      </View>

      {/* Data Summary */}
      <View style={[styles.card, { backgroundColor: theme.surfaceColor }]}>
        <Text style={[styles.cardTitle, { color: theme.primaryColor }]}>Transaction Details</Text>
        {Object.entries(values).filter(([_, v]) => v).map(([key, val]) => (
          <View key={key} style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{formatLabel(key)}</Text>
            <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>{String(val)}</Text>
          </View>
        ))}
      </View>

      {/* Customer Signature */}
      <View style={[styles.card, { backgroundColor: theme.surfaceColor }]}>
        <Text style={[styles.cardTitle, { color: theme.primaryColor }]}>Customer Consent</Text>
        <Text style={[styles.consentText, { color: theme.textSecondary }]}>
          I confirm that the above details are correct and I authorise this transaction.
        </Text>
        <SignaturePad label="Customer Signature" onSave={setCustomerSig} />
        {customerSig && <View style={styles.sigConfirm}><Ionicons name="checkmark-circle" size={18} color={theme.successColor} /><Text style={{ color: theme.successColor, marginLeft: 4 }}>Signed</Text></View>}
      </View>

      {/* Teller Signature */}
      <View style={[styles.card, { backgroundColor: theme.surfaceColor }]}>
        <SignaturePad label="Teller Signature (Optional)" onSave={setTellerSig} />
        {tellerSig && <View style={styles.sigConfirm}><Ionicons name="checkmark-circle" size={18} color={theme.successColor} /><Text style={{ color: theme.successColor, marginLeft: 4 }}>Signed</Text></View>}
      </View>

      {/* Submit */}
      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.primaryColor, opacity: submitting ? 0.6 : 1 }]}
        onPress={handleFinalSubmit} disabled={submitting}>
        <Ionicons name="send" size={20} color="#FFF" />
        <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Confirm & Submit'}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function formatLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginTop: 8 },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  card: { margin: 16, marginBottom: 8, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  summaryLabel: { fontSize: 13, flex: 1 },
  summaryValue: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  consentText: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  sigConfirm: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  submitBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, margin: 16, borderRadius: 12, padding: 16 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  successIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  refText: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  statusText: { fontSize: 14, marginBottom: 4 },
  doneBtn: { marginTop: 30, borderRadius: 10, paddingHorizontal: 32, paddingVertical: 14 },
  doneBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
