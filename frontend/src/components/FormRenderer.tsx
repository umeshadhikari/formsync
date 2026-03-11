import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormSchema, FormField, FormSection } from '../types';
import { useTheme } from '../context/ThemeContext';

interface FormRendererProps {
  schema: FormSchema;
  values: Record<string, any>;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
  readOnly?: boolean;
}

export default function FormRenderer({ schema, values, onChange, errors, readOnly }: FormRendererProps) {
  const { theme } = useTheme();

  function shouldShowField(field: FormField): boolean {
    if (!field.conditionalRules) return true;
    return field.conditionalRules.every(rule => {
      const val = values[rule.field];
      let conditionMet = false;
      switch (rule.operator) {
        case 'equals': conditionMet = val == rule.value; break;
        case 'notEquals': conditionMet = val != rule.value; break;
        case 'greaterThan': conditionMet = Number(val) > Number(rule.value); break;
        case 'lessThan': conditionMet = Number(val) < Number(rule.value); break;
        case 'contains': conditionMet = String(val).includes(rule.value); break;
      }
      return rule.action === 'show' ? conditionMet : !conditionMet;
    });
  }

  function renderField(field: FormField) {
    if (!shouldShowField(field)) return null;
    const error = errors[field.id];
    const value = values[field.id];

    switch (field.type) {
      case 'section_header':
        return <Text key={field.id} style={[styles.sectionHeader, { color: theme.primaryColor }]}>{field.label}</Text>;
      case 'text': case 'email': case 'phone':
        return (
          <View key={field.id} style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>{field.label}{field.required && <Text style={{ color: theme.dangerColor }}> *</Text>}</Text>
            <TextInput style={[styles.input, { borderColor: error ? theme.dangerColor : '#DDD' }, readOnly && styles.readOnly]}
              value={value || ''} onChangeText={v => onChange(field.id, v)} placeholder={field.placeholder}
              keyboardType={field.type === 'phone' ? 'phone-pad' : field.type === 'email' ? 'email-address' : 'default'}
              editable={!readOnly} placeholderTextColor={theme.textSecondary} />
            {field.helpText && <Text style={[styles.helpText, { color: theme.textSecondary }]}>{field.helpText}</Text>}
            {error && <Text style={[styles.errorText, { color: theme.dangerColor }]}>{error}</Text>}
          </View>
        );
      case 'number': case 'currency':
        return (
          <View key={field.id} style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>{field.label}{field.required && <Text style={{ color: theme.dangerColor }}> *</Text>}</Text>
            <TextInput style={[styles.input, { borderColor: error ? theme.dangerColor : '#DDD' }, readOnly && styles.readOnly]}
              value={value?.toString() || ''} onChangeText={v => onChange(field.id, v)} placeholder={field.placeholder}
              keyboardType="numeric" editable={!readOnly} placeholderTextColor={theme.textSecondary} />
            {error && <Text style={[styles.errorText, { color: theme.dangerColor }]}>{error}</Text>}
          </View>
        );
      case 'textarea':
        return (
          <View key={field.id} style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>{field.label}{field.required && <Text style={{ color: theme.dangerColor }}> *</Text>}</Text>
            <TextInput style={[styles.input, styles.textarea, { borderColor: error ? theme.dangerColor : '#DDD' }, readOnly && styles.readOnly]}
              value={value || ''} onChangeText={v => onChange(field.id, v)} placeholder={field.placeholder}
              multiline numberOfLines={3} editable={!readOnly} placeholderTextColor={theme.textSecondary} />
            {error && <Text style={[styles.errorText, { color: theme.dangerColor }]}>{error}</Text>}
          </View>
        );
      case 'date':
        return (
          <View key={field.id} style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>{field.label}{field.required && <Text style={{ color: theme.dangerColor }}> *</Text>}</Text>
            <TextInput style={[styles.input, { borderColor: error ? theme.dangerColor : '#DDD' }, readOnly && styles.readOnly]}
              value={value || ''} onChangeText={v => onChange(field.id, v)} placeholder="YYYY-MM-DD"
              editable={!readOnly} placeholderTextColor={theme.textSecondary} />
            {error && <Text style={[styles.errorText, { color: theme.dangerColor }]}>{error}</Text>}
          </View>
        );
      case 'select':
        return (
          <View key={field.id} style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>{field.label}{field.required && <Text style={{ color: theme.dangerColor }}> *</Text>}</Text>
            <View style={styles.optionGroup}>
              {field.options?.map(opt => (
                <TouchableOpacity key={opt.value} style={[styles.optionChip, value === opt.value && { backgroundColor: theme.primaryColor }]}
                  onPress={() => !readOnly && onChange(field.id, opt.value)} disabled={readOnly}>
                  <Text style={[styles.optionText, value === opt.value && { color: '#FFF' }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {error && <Text style={[styles.errorText, { color: theme.dangerColor }]}>{error}</Text>}
          </View>
        );
      case 'radio':
        return (
          <View key={field.id} style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>{field.label}{field.required && <Text style={{ color: theme.dangerColor }}> *</Text>}</Text>
            {field.options?.map(opt => (
              <TouchableOpacity key={opt.value} style={styles.radioRow} onPress={() => !readOnly && onChange(field.id, opt.value)} disabled={readOnly}>
                <Ionicons name={value === opt.value ? 'radio-button-on' : 'radio-button-off'} size={20} color={theme.primaryColor} />
                <Text style={[styles.radioLabel, { color: theme.textPrimary }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            {error && <Text style={[styles.errorText, { color: theme.dangerColor }]}>{error}</Text>}
          </View>
        );
      case 'checkbox':
        return (
          <View key={field.id} style={styles.fieldGroup}>
            <TouchableOpacity style={styles.checkboxRow} onPress={() => !readOnly && onChange(field.id, !value)} disabled={readOnly}>
              <Ionicons name={value ? 'checkbox' : 'square-outline'} size={22} color={theme.primaryColor} />
              <Text style={[styles.checkboxLabel, { color: theme.textPrimary }]}>{field.label}</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return (
          <View key={field.id} style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>{field.label}</Text>
            <TextInput style={[styles.input, readOnly && styles.readOnly]} value={value || ''} onChangeText={v => onChange(field.id, v)} editable={!readOnly} />
          </View>
        );
    }
  }

  return (
    <View>
      {schema.sections.map((section: FormSection) => (
        <View key={section.id} style={[styles.section, { backgroundColor: theme.surfaceColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.primaryColor }]}>{section.title}</Text>
          {section.description && <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>{section.description}</Text>}
          {section.fields.map(renderField)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 12, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionDesc: { fontSize: 12, marginBottom: 12 },
  sectionHeader: { fontSize: 15, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 5 },
  input: { borderWidth: 1.5, borderRadius: 8, padding: 12, fontSize: 15 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  readOnly: { backgroundColor: '#F5F5F5' },
  helpText: { fontSize: 11, marginTop: 3 },
  errorText: { fontSize: 11, marginTop: 3 },
  optionGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { borderWidth: 1, borderColor: '#DDD', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  optionText: { fontSize: 13 },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  radioLabel: { fontSize: 14 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkboxLabel: { fontSize: 14 },
});
