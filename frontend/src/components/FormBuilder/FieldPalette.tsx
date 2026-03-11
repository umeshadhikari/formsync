import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const FIELD_TYPES = [
  { type: 'text', label: 'Text Input', icon: 'text-outline' },
  { type: 'number', label: 'Number', icon: 'calculator-outline' },
  { type: 'currency', label: 'Currency', icon: 'cash-outline' },
  { type: 'email', label: 'Email', icon: 'mail-outline' },
  { type: 'phone', label: 'Phone', icon: 'call-outline' },
  { type: 'date', label: 'Date', icon: 'calendar-outline' },
  { type: 'select', label: 'Dropdown', icon: 'chevron-down-circle-outline' },
  { type: 'radio', label: 'Radio Group', icon: 'radio-button-on-outline' },
  { type: 'checkbox', label: 'Checkbox', icon: 'checkbox-outline' },
  { type: 'textarea', label: 'Text Area', icon: 'document-text-outline' },
  { type: 'file', label: 'File Upload', icon: 'cloud-upload-outline' },
  { type: 'signature', label: 'Signature', icon: 'create-outline' },
];

interface FieldPaletteProps {
  onAddField: (fieldType: string) => void;
}

export default function FieldPalette({ onAddField }: FieldPaletteProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Field Types</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {FIELD_TYPES.map(ft => (
          <TouchableOpacity key={ft.type} style={[styles.fieldTile, { backgroundColor: theme.surfaceColor, borderColor: theme.accentColor + '30' }]}
            onPress={() => onAddField(ft.type)}>
            <Ionicons name={ft.icon as any} size={22} color={theme.accentColor} />
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>{ft.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  title: { fontSize: 14, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 },
  scrollContent: { paddingHorizontal: 12 },
  fieldTile: { width: 90, height: 80, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, padding: 8 },
  fieldLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 4 },
});
