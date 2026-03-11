import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import FormRenderer from '../components/FormRenderer';
import { FormTemplate, JOURNEY_TYPES } from '../types';
import api from '../api/client';

export default function FormEntryScreen({ route, navigation }: any) {
  const { template: passedTemplate, formId, viewMode } = route.params || {};
  const { user } = useAuth();
  const { theme } = useTheme();
  const [template, setTemplate] = useState<FormTemplate | null>(passedTemplate || null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingForm, setExistingForm] = useState<any>(null);

  useEffect(() => {
    if (formId) loadExistingForm();
  }, [formId]);

  async function loadExistingForm() {
    setLoading(true);
    try {
      const form = await api.getForm(formId);
      setExistingForm(form);
      setValues(form.formData || {});
      if (form.templateId) {
        const tpl = await api.getTemplate(form.templateId);
        setTemplate(tpl);
      }
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }

  function handleChange(field: string, value: any) {
    setValues(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!template?.schema?.sections) return true;
    template.schema.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.required && !values[field.id]) {
          newErrors[field.id] = `${field.label} is required`;
        }
        field.validationRules?.forEach(rule => {
          const val = values[field.id];
          switch (rule.type) {
            case 'minLength': if (val && val.length < rule.value) newErrors[field.id] = rule.message; break;
            case 'maxLength': if (val && val.length > rule.value) newErrors[field.id] = rule.message; break;
            case 'min': if (Number(val) < rule.value) newErrors[field.id] = rule.message; break;
            case 'max': if (Number(val) > rule.value) newErrors[field.id] = rule.message; break;
            case 'regex': if (val && !new RegExp(rule.value).test(val)) newErrors[field.id] = rule.message; break;
          }
        });
      });
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) { Alert.alert('Validation Error', 'Please fix the highlighted fields'); return; }
    navigation.navigate('CustomerReview', { template, values, user });
  }

  async function handleSaveDraft() {
    setSubmitting(true);
    try {
      await api.saveDraft({
        templateId: template!.id,
        journeyType: template!.journeyType,
        formData: values,
        branchCode: user?.branchCode,
      });
      Alert.alert('Saved', 'Draft saved successfully');
      navigation.goBack();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSubmitting(false); }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.primaryColor} /></View>;
  if (!template) return <View style={styles.center}><Text>No template loaded</Text></View>;

  const journeyInfo = JOURNEY_TYPES[template.journeyType];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      {/* Header */}
      <View style={[styles.formHeader, { backgroundColor: journeyInfo?.color || theme.primaryColor }]}>
        <Text style={styles.formTitle}>{template.name}</Text>
        <Text style={styles.formDesc}>{template.description}</Text>
        {existingForm && (
          <Text style={styles.refNumber}>Ref: {existingForm.referenceNumber} | Status: {existingForm.status}</Text>
        )}
      </View>

      <ScrollView style={styles.formBody} contentContainerStyle={styles.formContent}>
        <FormRenderer schema={template.schema} values={values} onChange={handleChange} errors={errors} readOnly={viewMode} />
      </ScrollView>

      {/* Action Bar */}
      {!viewMode && (
        <View style={[styles.actionBar, { backgroundColor: theme.surfaceColor }]}>
          <TouchableOpacity style={[styles.draftBtn, { borderColor: theme.textSecondary }]} onPress={handleSaveDraft} disabled={submitting}>
            <Text style={[styles.draftBtnText, { color: theme.textSecondary }]}>Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.primaryColor }]} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.submitBtnText}>{submitting ? 'Processing...' : 'Review & Submit'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  formHeader: { padding: 20, paddingTop: 12 },
  formTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  formDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  refNumber: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6 },
  formBody: { flex: 1 },
  formContent: { padding: 16 },
  actionBar: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  draftBtn: { flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 14, alignItems: 'center' },
  draftBtnText: { fontWeight: '600' },
  submitBtn: { flex: 2, borderRadius: 10, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
