import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { FormField, FormSection, FieldType, JOURNEY_TYPES } from '../types';
import api from '../api/client';

const FIELD_TYPES: { type: FieldType; label: string; icon: string }[] = [
  { type: 'text', label: 'Text', icon: 'text' },
  { type: 'number', label: 'Number', icon: 'calculator' },
  { type: 'currency', label: 'Currency', icon: 'cash' },
  { type: 'date', label: 'Date', icon: 'calendar' },
  { type: 'select', label: 'Dropdown', icon: 'chevron-down-circle' },
  { type: 'radio', label: 'Radio', icon: 'radio-button-on' },
  { type: 'checkbox', label: 'Checkbox', icon: 'checkbox' },
  { type: 'textarea', label: 'Text Area', icon: 'document-text' },
  { type: 'email', label: 'Email', icon: 'mail' },
  { type: 'phone', label: 'Phone', icon: 'call' },
  { type: 'signature', label: 'Signature', icon: 'pencil' },
  { type: 'account_lookup', label: 'Account', icon: 'search' },
];

export default function FormBuilderScreen() {
  const { theme } = useTheme();
  const [templates, setTemplates] = useState<any[]>([]);
  const [sections, setSections] = useState<FormSection[]>([{ id: 'section-1', title: 'Section 1', fields: [] }]);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [journeyType, setJourneyType] = useState('CASH_DEPOSIT');
  const [description, setDescription] = useState('');
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editSectionIdx, setEditSectionIdx] = useState(0);
  const [editField, setEditField] = useState<Partial<FormField>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    try { setTemplates(await api.getAllTemplates()); } catch {}
  }

  function addField(type: FieldType) {
    setEditField({ id: `field-${Date.now()}`, type, label: '', placeholder: '', required: false });
    setShowFieldModal(true);
  }

  function saveField() {
    if (!editField.label) { Alert.alert('Error', 'Label is required'); return; }
    const field: FormField = {
      id: editField.id || `field-${Date.now()}`,
      type: editField.type || 'text',
      label: editField.label || '',
      placeholder: editField.placeholder,
      required: editField.required,
      options: editField.options,
      helpText: editField.helpText,
    };
    const newSections = [...sections];
    newSections[editSectionIdx].fields.push(field);
    setSections(newSections);
    setShowFieldModal(false);
    setEditField({});
  }

  function removeField(sectionIdx: number, fieldIdx: number) {
    const newSections = [...sections];
    newSections[sectionIdx].fields.splice(fieldIdx, 1);
    setSections(newSections);
  }

  function addSection() {
    setSections([...sections, { id: `section-${Date.now()}`, title: `Section ${sections.length + 1}`, fields: [] }]);
  }

  async function saveTemplate() {
    if (!formName || !formCode) { Alert.alert('Error', 'Name and code are required'); return; }
    setSaving(true);
    try {
      const tpl = await api.createTemplate({
        formCode, journeyType, name: formName, description,
        schema: { sections },
      });
      await api.publishTemplate(tpl.id);
      Alert.alert('Success', 'Template created and published');
      setFormName(''); setFormCode(''); setDescription('');
      setSections([{ id: 'section-1', title: 'Section 1', fields: [] }]);
      loadTemplates();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      {/* Template List */}
      <Text style={[styles.heading, { color: theme.textPrimary }]}>Existing Templates ({templates.length})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateList}>
        {templates.map(t => (
          <View key={t.id} style={[styles.templateCard, { backgroundColor: theme.surfaceColor }]}>
            <Text style={[styles.templateName, { color: theme.textPrimary }]}>{t.name}</Text>
            <Text style={[styles.templateJourney, { color: theme.textSecondary }]}>{JOURNEY_TYPES[t.journeyType]?.label}</Text>
            <View style={[styles.statusDot, { backgroundColor: t.status === 'PUBLISHED' ? theme.successColor : theme.warningColor }]} />
          </View>
        ))}
      </ScrollView>

      {/* Builder */}
      <Text style={[styles.heading, { color: theme.textPrimary }]}>Create New Template</Text>
      <View style={[styles.builderCard, { backgroundColor: theme.surfaceColor }]}>
        <TextInput style={styles.builderInput} placeholder="Form Code (e.g., CASH_DEP_V1)" value={formCode} onChangeText={setFormCode} />
        <TextInput style={styles.builderInput} placeholder="Form Name" value={formName} onChangeText={setFormName} />
        <TextInput style={styles.builderInput} placeholder="Description" value={description} onChangeText={setDescription} />
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Journey Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Object.entries(JOURNEY_TYPES).map(([key, val]) => (
            <TouchableOpacity key={key} style={[styles.journeyChip, journeyType === key && { backgroundColor: theme.primaryColor }]}
              onPress={() => setJourneyType(key)}>
              <Text style={[styles.journeyChipText, journeyType === key && { color: '#FFF' }]}>{val.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sections */}
      {sections.map((section, sIdx) => (
        <View key={section.id} style={[styles.sectionCard, { backgroundColor: theme.surfaceColor }]}>
          <TextInput style={[styles.sectionTitle, { color: theme.primaryColor }]} value={section.title}
            onChangeText={t => { const s = [...sections]; s[sIdx].title = t; setSections(s); }} />
          {section.fields.map((field, fIdx) => (
            <View key={field.id} style={styles.fieldRow}>
              <Ionicons name="reorder-three" size={20} color={theme.textSecondary} />
              <View style={styles.fieldInfo}>
                <Text style={[styles.fieldName, { color: theme.textPrimary }]}>{field.label}</Text>
                <Text style={[styles.fieldType, { color: theme.textSecondary }]}>{field.type}{field.required ? ' *' : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => removeField(sIdx, fIdx)}><Ionicons name="trash" size={18} color={theme.dangerColor} /></TouchableOpacity>
            </View>
          ))}
          {/* Add Field Palette */}
          <Text style={[styles.addFieldLabel, { color: theme.textSecondary }]}>Add Field:</Text>
          <View style={styles.fieldPalette}>
            {FIELD_TYPES.map(ft => (
              <TouchableOpacity key={ft.type} style={[styles.paletteItem, { borderColor: theme.accentColor }]}
                onPress={() => { setEditSectionIdx(sIdx); addField(ft.type); }}>
                <Ionicons name={ft.icon as any} size={16} color={theme.accentColor} />
                <Text style={[styles.paletteLabel, { color: theme.accentColor }]}>{ft.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={[styles.addSectionBtn, { borderColor: theme.accentColor }]} onPress={addSection}>
        <Ionicons name="add-circle" size={20} color={theme.accentColor} />
        <Text style={[styles.addSectionText, { color: theme.accentColor }]}>Add Section</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primaryColor, opacity: saving ? 0.5 : 1 }]}
        onPress={saveTemplate} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save & Publish Template'}</Text>
      </TouchableOpacity>

      {/* Field Edit Modal */}
      <Modal visible={showFieldModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surfaceColor }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Configure Field ({editField.type})</Text>
            <TextInput style={styles.modalInput} placeholder="Label *" value={editField.label || ''} onChangeText={v => setEditField({ ...editField, label: v })} />
            <TextInput style={styles.modalInput} placeholder="Placeholder" value={editField.placeholder || ''} onChangeText={v => setEditField({ ...editField, placeholder: v })} />
            <TextInput style={styles.modalInput} placeholder="Help text" value={editField.helpText || ''} onChangeText={v => setEditField({ ...editField, helpText: v })} />
            <TouchableOpacity style={styles.checkRow} onPress={() => setEditField({ ...editField, required: !editField.required })}>
              <Ionicons name={editField.required ? 'checkbox' : 'square-outline'} size={22} color={theme.primaryColor} />
              <Text style={{ marginLeft: 8 }}>Required</Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowFieldModal(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.primaryColor }]} onPress={saveField}>
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Add Field</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 12 },
  templateList: { marginBottom: 8 },
  templateCard: { width: 160, borderRadius: 10, padding: 12, marginRight: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  templateName: { fontSize: 13, fontWeight: '600' },
  templateJourney: { fontSize: 11, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, position: 'absolute', top: 12, right: 12 },
  builderCard: { borderRadius: 12, padding: 16, marginBottom: 12 },
  builderInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  journeyChip: { borderWidth: 1, borderColor: '#DDD', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  journeyChipText: { fontSize: 11 },
  sectionCard: { borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E0E0E0', paddingBottom: 8 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0', gap: 10 },
  fieldInfo: { flex: 1 },
  fieldName: { fontSize: 13, fontWeight: '600' },
  fieldType: { fontSize: 11 },
  addFieldLabel: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  fieldPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paletteItem: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  paletteLabel: { fontSize: 11 },
  addSectionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10, padding: 14, marginBottom: 16 },
  addSectionText: { fontWeight: '600' },
  saveBtn: { borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 20 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginBottom: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { padding: 12 },
  confirmBtn: { borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
});
