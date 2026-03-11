import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { FormField, FormSection } from '../../types';

interface DragDropCanvasProps {
  sections: FormSection[];
  onFieldPress: (sectionIdx: number, fieldIdx: number) => void;
  onMoveField: (sectionIdx: number, fieldIdx: number, direction: 'up' | 'down') => void;
  onDeleteField: (sectionIdx: number, fieldIdx: number) => void;
  onDeleteSection: (sectionIdx: number) => void;
}

export default function DragDropCanvas({ sections, onFieldPress, onMoveField, onDeleteField, onDeleteSection }: DragDropCanvasProps) {
  const { theme } = useTheme();

  const fieldTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      text: 'text-outline', number: 'calculator-outline', currency: 'cash-outline',
      email: 'mail-outline', phone: 'call-outline', date: 'calendar-outline',
      select: 'chevron-down-circle-outline', radio: 'radio-button-on-outline',
      checkbox: 'checkbox-outline', textarea: 'document-text-outline',
      file: 'cloud-upload-outline', signature: 'create-outline',
    };
    return icons[type] || 'help-circle-outline';
  };

  return (
    <ScrollView style={styles.container}>
      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="layers-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Add sections and fields to build your form</Text>
        </View>
      ) : (
        sections.map((section, sIdx) => (
          <View key={section.id} style={[styles.section, { borderColor: theme.accentColor + '30' }]}>
            <View style={[styles.sectionHeader, { backgroundColor: theme.accentColor + '10' }]}>
              <Text style={[styles.sectionTitle, { color: theme.accentColor }]}>{section.title}</Text>
              <TouchableOpacity onPress={() => onDeleteSection(sIdx)}>
                <Ionicons name="trash-outline" size={18} color={theme.dangerColor} />
              </TouchableOpacity>
            </View>
            {section.fields.map((field, fIdx) => (
              <View key={field.id} style={[styles.fieldItem, { backgroundColor: theme.surfaceColor }]}>
                <TouchableOpacity style={styles.fieldContent} onPress={() => onFieldPress(sIdx, fIdx)}>
                  <Ionicons name={fieldTypeIcon(field.type) as any} size={18} color={theme.primaryColor} />
                  <View style={styles.fieldInfo}>
                    <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>{field.label}</Text>
                    <Text style={[styles.fieldMeta, { color: theme.textSecondary }]}>{field.type}{field.required ? ' • required' : ''}</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.fieldActions}>
                  {fIdx > 0 && (
                    <TouchableOpacity onPress={() => onMoveField(sIdx, fIdx, 'up')} style={styles.moveBtn}>
                      <Ionicons name="chevron-up" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                  )}
                  {fIdx < section.fields.length - 1 && (
                    <TouchableOpacity onPress={() => onMoveField(sIdx, fIdx, 'down')} style={styles.moveBtn}>
                      <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => onDeleteField(sIdx, fIdx)} style={styles.moveBtn}>
                    <Ionicons name="close-circle-outline" size={16} color={theme.dangerColor} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {section.fields.length === 0 && (
              <Text style={[styles.noFields, { color: theme.textSecondary }]}>No fields yet — tap a field type above to add</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center', paddingHorizontal: 40 },
  section: { margin: 12, borderWidth: 1.5, borderRadius: 12, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  fieldItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 0.5, borderTopColor: '#E0E0E0' },
  fieldContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldInfo: { flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  fieldMeta: { fontSize: 10, marginTop: 2 },
  fieldActions: { flexDirection: 'row', gap: 4 },
  moveBtn: { padding: 4 },
  noFields: { padding: 16, textAlign: 'center', fontSize: 12 },
});
