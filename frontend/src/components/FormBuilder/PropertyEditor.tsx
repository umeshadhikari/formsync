import React, { useState } from 'react';
import { View, Text, TextInput, Switch, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { FormField } from '../../types';

interface PropertyEditorProps {
  field: FormField;
  visible: boolean;
  onClose: () => void;
  onSave: (field: FormField) => void;
}

export default function PropertyEditor({ field, visible, onClose, onSave }: PropertyEditorProps) {
  const { theme } = useTheme();
  const [edited, setEdited] = useState<FormField>({ ...field });
  const [optionText, setOptionText] = useState('');

  const update = (key: string, value: any) => setEdited(prev => ({ ...prev, [key]: value }));

  const addOption = () => {
    if (!optionText.trim()) return;
    const options = [...(edited.options || []), { label: optionText.trim(), value: optionText.trim().toUpperCase().replace(/\s+/g, '_') }];
    update('options', options);
    setOptionText('');
  };

  const removeOption = (idx: number) => {
    const options = [...(edited.options || [])];
    options.splice(idx, 1);
    update('options', options);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.surfaceColor }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Field Properties</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={theme.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.body}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Field ID</Text>
            <TextInput style={[styles.input, { color: theme.textPrimary, borderColor: theme.textSecondary + '40' }]}
              value={edited.id} onChangeText={v => update('id', v.replace(/\s/g, ''))} />

            <Text style={[styles.label, { color: theme.textSecondary }]}>Label</Text>
            <TextInput style={[styles.input, { color: theme.textPrimary, borderColor: theme.textSecondary + '40' }]}
              value={edited.label} onChangeText={v => update('label', v)} />

            <Text style={[styles.label, { color: theme.textSecondary }]}>Placeholder</Text>
            <TextInput style={[styles.input, { color: theme.textPrimary, borderColor: theme.textSecondary + '40' }]}
              value={edited.placeholder || ''} onChangeText={v => update('placeholder', v)} />

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>Required</Text>
              <Switch value={!!edited.required} onValueChange={v => update('required', v)} />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>Read Only</Text>
              <Switch value={!!edited.readOnly} onValueChange={v => update('readOnly', v)} />
            </View>

            {['select', 'radio'].includes(edited.type) && (
              <View style={styles.optionsSection}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Options</Text>
                {(edited.options || []).map((opt, idx) => (
                  <View key={idx} style={styles.optionRow}>
                    <Text style={[styles.optionText, { color: theme.textPrimary }]}>{opt.label}</Text>
                    <TouchableOpacity onPress={() => removeOption(idx)}>
                      <Ionicons name="trash-outline" size={18} color={theme.dangerColor} />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={styles.addOptionRow}>
                  <TextInput style={[styles.input, styles.optionInput, { color: theme.textPrimary, borderColor: theme.textSecondary + '40' }]}
                    placeholder="Option label" value={optionText} onChangeText={setOptionText} placeholderTextColor={theme.textSecondary} />
                  <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.accentColor }]} onPress={addOption}>
                    <Ionicons name="add" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={[styles.label, { color: theme.textSecondary }]}>Validation Pattern (regex)</Text>
            <TextInput style={[styles.input, { color: theme.textPrimary, borderColor: theme.textSecondary + '40' }]}
              value={edited.validation?.pattern || ''} onChangeText={v => update('validation', { ...edited.validation, pattern: v })} />
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primaryColor }]} onPress={() => onSave(edited)}>
              <Text style={styles.saveBtnText}>Save Field</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  title: { fontSize: 18, fontWeight: '700' },
  body: { padding: 20 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1.5, borderRadius: 8, padding: 10, fontSize: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  switchLabel: { fontSize: 14, fontWeight: '500' },
  optionsSection: { marginTop: 12 },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0' },
  optionText: { fontSize: 13 },
  addOptionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  optionInput: { flex: 1 },
  addBtn: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: 20 },
  saveBtn: { borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
