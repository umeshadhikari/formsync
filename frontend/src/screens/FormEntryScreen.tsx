import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import FormRenderer from '../components/FormRenderer';
import { FormTemplate, JOURNEY_TYPES } from '../types';
import api from '../api/client';
import AlertModal, { useAlert } from '../components/AlertModal';
import { getGlassStyle, getGlowShadow, getElevation, getGradientStyle, typography } from '../utils/styles';

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
  const { alert, showAlert, hideAlert } = useAlert();

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
    } catch (e: any) { showAlert('error', 'Error', e.message); }
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
    if (!validate()) { showAlert('warning', 'Validation Error', 'Please fix the highlighted fields'); return; }
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
      showAlert('success', 'Saved', 'Draft saved successfully');
      navigation.goBack();
    } catch (e: any) { showAlert('error', 'Error', e.message); }
    finally { setSubmitting(false); }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.primaryColor} /></View>;
  if (!template) return <View style={styles.center}><Text>No template loaded</Text></View>;

  const journeyInfo = JOURNEY_TYPES[template.journeyType];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      {/* Header with gradient */}
      <View
        style={[
          styles.formHeader,
          getGradientStyle(
            journeyInfo?.color || theme.primaryColor,
            journeyInfo?.color || theme.gradientEnd,
            135
          ),
          getElevation('medium', theme),
        ]}
      >
        <Text style={[styles.formTitle, typography.h1, { color: '#FFF' }]}>
          {template.name}
        </Text>
        {template.description && (
          <Text style={[styles.formDesc, typography.body, { color: 'rgba(255,255,255,0.85)', marginTop: 6 }]}>
            {template.description}
          </Text>
        )}
        {existingForm && (
          <Text style={[styles.refNumber, typography.small, { color: 'rgba(255,255,255,0.75)', marginTop: 8 }]}>
            Ref: {existingForm.referenceNumber} • Status: {existingForm.status}
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.formBody}
        contentContainerStyle={[styles.formContent, { paddingBottom: viewMode ? 24 : 0 }]}
      >
        <FormRenderer
          schema={template.schema}
          values={values}
          onChange={handleChange}
          errors={errors}
          readOnly={viewMode}
        />
      </ScrollView>

      {/* Action Bar */}
      {!viewMode && (
        <View
          style={[
            styles.actionBar,
            { backgroundColor: theme.surfaceElevated, borderTopColor: theme.borderColor },
            getElevation('low', theme),
          ]}
        >
          <TouchableOpacity
            style={[
              styles.draftBtn,
              {
                borderColor: theme.borderColor,
                backgroundColor: 'transparent',
              },
            ]}
            onPress={handleSaveDraft}
            disabled={submitting}
          >
            <Text style={[typography.bodyBold, { color: theme.textSecondary, fontSize: 14 }]}>
              Save Draft
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: theme.accentColor, opacity: submitting ? 0.6 : 1 },
              getGlowShadow(theme.accentColor, 0.5),
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={[typography.bodyBold, { color: '#FFF', fontSize: 14 }]}>
              {submitting ? 'Processing...' : 'Review & Submit'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <AlertModal alert={alert} onClose={hideAlert} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  formHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  formTitle: {},
  formDesc: {},
  refNumber: {},
  formBody: { flex: 1 },
  formContent: { padding: 16 },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderTopWidth: 1,
  },
  draftBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBtnText: {},
  submitBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {},
});
