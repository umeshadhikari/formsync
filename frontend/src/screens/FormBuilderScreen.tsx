import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Platform, Animated } from 'react-native';
import { Ionicons } from '../components/Icon';
import { useTheme } from '../context/ThemeContext';
import { FormField, FormSection, FieldType, JOURNEY_TYPES } from '../types';
import api from '../api/client';
import { getGlassStyle, getGlowShadow, getElevation, getInputStyle, typography } from '../utils/styles';
import AlertModal, { useAlert } from '../components/AlertModal';

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

type BuilderMode = 'create' | 'edit' | 'duplicate';

export default function FormBuilderScreen() {
  const { theme } = useTheme();
  const { alert, showAlert, hideAlert } = useAlert();
  const scrollRef = useRef<ScrollView>(null);
  const saveAreaRef = useRef<View>(null);

  // Template list
  const [templates, setTemplates] = useState<any[]>([]);
  const [filterJourney, setFilterJourney] = useState<string | null>(null);

  // Builder state
  const [sections, setSections] = useState<FormSection[]>([{ id: 'section-1', title: 'Section 1', fields: [] }]);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [journeyType, setJourneyType] = useState('CASH_DEPOSIT');
  const [description, setDescription] = useState('');
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editSectionIdx, setEditSectionIdx] = useState(0);
  const [editField, setEditField] = useState<Partial<FormField>>({});
  const [saving, setSaving] = useState(false);

  // Mode: create new, edit existing (new version), or duplicate
  const [mode, setMode] = useState<BuilderMode>('create');
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [supersedesTemplateId, setSupersedesTemplateId] = useState<number | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);

  // Expiry for old version when creating new version
  const [oldVersionExpiry, setOldVersionExpiry] = useState<string>('');
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);

  // Preview modal
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);

  // Version history modal
  const [versionHistory, setVersionHistory] = useState<any[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Inline status near save button
  const [saveStatus, setSaveStatus] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const statusOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    try {
      const res = await api.getAllTemplates();
      setTemplates(res?.content || res || []);
    } catch {}
  }

  function showSaveStatus(text: string, type: 'success' | 'error') {
    setSaveStatus({ text, type });
    statusOpacity.setValue(0);
    Animated.timing(statusOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    // Auto-scroll to bottom so user sees the message
    setTimeout(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    }, 100);
    // Fade out after 8 seconds
    setTimeout(() => {
      Animated.timing(statusOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
        setSaveStatus(null);
      });
    }, 8000);
  }

  // === EDIT existing template (creates new version) ===
  function startEditTemplate(tpl: any) {
    setMode('edit');
    setSupersedesTemplateId(tpl.id);
    setEditingTemplateId(tpl.id);
    setEditingVersion(tpl.version || 1);
    setFormCode(tpl.formCode); // Keep same formCode — new version
    setFormName(tpl.name);
    setDescription(tpl.description || '');
    setJourneyType(tpl.journeyType || 'CASH_DEPOSIT');
    // Default expiry for old version: 7 days from now
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 7);
    setOldVersionExpiry(defaultExpiry.toISOString().slice(0, 16));
    loadSections(tpl);
    setPreviewTemplate(null);
    showSaveStatus(`Creating new version of "${tpl.name}" (v${(tpl.version || 1) + 1}) — old version will expire`, 'success');
  }

  // === VIEW VERSION HISTORY ===
  async function loadVersionHistory(formCode: string) {
    try {
      const versions = await api.getTemplateVersions(formCode);
      setVersionHistory(versions);
      setShowVersionHistory(true);
    } catch {
      setVersionHistory([]);
    }
  }

  // === SET EXPIRY on existing template ===
  async function setTemplateExpiry(templateId: number, expiresAt: string | null) {
    try {
      await api.setTemplateExpiry(templateId, expiresAt);
      showSaveStatus(`Expiry ${expiresAt ? 'set' : 'removed'} successfully`, 'success');
      loadTemplates();
    } catch (e: any) {
      showSaveStatus(e.message || 'Failed to set expiry', 'error');
    }
  }

  // === DUPLICATE template ===
  function duplicateTemplate(tpl: any) {
    setMode('duplicate');
    setEditingTemplateId(null);
    setFormCode(tpl.formCode + '_COPY');
    setFormName(tpl.name + ' (Copy)');
    setDescription(tpl.description || '');
    setJourneyType(tpl.journeyType || 'CASH_DEPOSIT');
    loadSections(tpl);
    setPreviewTemplate(null);
    showSaveStatus(`Duplicated "${tpl.name}" — edit and save as new template`, 'success');
  }

  function loadSections(tpl: any) {
    if (tpl.schema?.sections && Array.isArray(tpl.schema.sections)) {
      const clonedSections = tpl.schema.sections.map((s: any, idx: number) => ({
        id: `section-${Date.now()}-${idx}`,
        title: s.title || `Section ${idx + 1}`,
        fields: (s.fields || []).map((f: any) => ({
          ...f,
          id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        })),
      }));
      setSections(clonedSections);
    } else {
      setSections([{ id: 'section-1', title: 'Section 1', fields: [] }]);
    }
  }

  // === RESET to create mode ===
  function resetBuilder() {
    setMode('create');
    setEditingTemplateId(null);
    setSupersedesTemplateId(null);
    setEditingVersion(null);
    setOldVersionExpiry('');
    setFormName('');
    setFormCode('');
    setDescription('');
    setJourneyType('CASH_DEPOSIT');
    setSections([{ id: 'section-1', title: 'Section 1', fields: [] }]);
    setSaveStatus(null);
  }

  function addField(type: FieldType) {
    setEditField({ id: `field-${Date.now()}`, type, label: '', placeholder: '', required: false });
    setShowFieldModal(true);
  }

  function saveField() {
    if (!editField.label) { showAlert('error', 'Error', 'Label is required'); return; }
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

  function removeSection(sectionIdx: number) {
    if (sections.length <= 1) { showAlert('error', 'Error', 'Must have at least one section'); return; }
    const newSections = [...sections];
    newSections.splice(sectionIdx, 1);
    setSections(newSections);
  }

  function addSection() {
    setSections([...sections, { id: `section-${Date.now()}`, title: `Section ${sections.length + 1}`, fields: [] }]);
  }

  async function saveTemplate() {
    if (!formName || !formCode) {
      showAlert('error', 'Error', 'Name and Form Code are required');
      return;
    }
    const totalFields = sections.reduce((sum, s) => sum + s.fields.length, 0);
    if (totalFields === 0) {
      showAlert('error', 'Error', 'Add at least one field before saving');
      return;
    }

    setSaving(true);
    setSaveStatus(null);
    try {
      const payload: any = {
        formCode, journeyType, name: formName, description,
        schema: { sections },
      };

      if (mode === 'edit' && supersedesTemplateId) {
        // Create a NEW VERSION — don't update in place
        payload.supersedesTemplateId = supersedesTemplateId;
        if (oldVersionExpiry) {
          // Parse local datetime string to ISO
          payload.effectiveFrom = new Date().toISOString();
        }
        const newTpl = await api.createTemplate(payload);
        await api.publishTemplate(newTpl.id);

        // Set expiry on old version
        if (oldVersionExpiry) {
          await api.setTemplateExpiry(supersedesTemplateId, new Date(oldVersionExpiry).toISOString());
        }

        const newVersion = (editingVersion || 1) + 1;
        showSaveStatus(`Version ${newVersion} of "${formName}" created and published! Old version will expire.`, 'success');
      } else {
        // Create new (both 'create' and 'duplicate' modes)
        const tpl = await api.createTemplate(payload);
        await api.publishTemplate(tpl.id);
        showSaveStatus(`Template "${formName}" saved and published!`, 'success');
      }

      // Reset form after save
      resetBuilder();
      loadTemplates();
    } catch (e: any) {
      showSaveStatus(e.message || 'Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Filtered template list
  const filteredTemplates = filterJourney
    ? templates.filter(t => t.journeyType === filterJourney)
    : templates;

  return (
    <ScrollView ref={scrollRef} style={[styles.container, { backgroundColor: theme.backgroundColor }]}>

      {/* ═══ EXISTING TEMPLATES ═══ */}
      <Text style={[styles.heading, typography.h2, { color: theme.textPrimary, marginTop: 20, marginBottom: 8 }]}>
        Existing Templates ({templates.length})
      </Text>

      {/* Journey filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <TouchableOpacity
          style={[
            styles.filterPill,
            !filterJourney
              ? { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor }
              : { backgroundColor: 'transparent', borderColor: theme.borderColor },
          ]}
          onPress={() => setFilterJourney(null)}
        >
          <Text style={[typography.small, { color: !filterJourney ? '#FFF' : theme.textSecondary, fontWeight: !filterJourney ? '700' : '500' }]}>
            All
          </Text>
        </TouchableOpacity>
        {Object.entries(JOURNEY_TYPES)
          .filter(([key]) => templates.some(t => t.journeyType === key))
          .map(([key, val]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterPill,
                filterJourney === key
                  ? { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor }
                  : { backgroundColor: 'transparent', borderColor: theme.borderColor },
              ]}
              onPress={() => setFilterJourney(filterJourney === key ? null : key)}
            >
              <Text style={[typography.small, { color: filterJourney === key ? '#FFF' : theme.textSecondary, fontWeight: filterJourney === key ? '700' : '500' }]}>
                {val.label}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>

      {/* Template cards — now showing as a wrapped grid */}
      <View style={styles.templateGrid}>
        {filteredTemplates.map(t => {
          const sectionCount = t.schema?.sections?.length || 0;
          const fieldCount = t.schema?.sections?.reduce((sum: number, s: any) => sum + (s.fields?.length || 0), 0) || 0;
          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.templateCard,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: t.status === 'PUBLISHED' ? theme.successColor : theme.borderColor,
                  borderWidth: t.status === 'PUBLISHED' ? 1.5 : 1,
                },
                getElevation('low', theme),
              ]}
              onPress={() => setPreviewTemplate(t)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[typography.bodyBold, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>
                  {t.name}
                </Text>
                {t.status === 'PUBLISHED' && (
                  <View style={[styles.statusDot, { backgroundColor: theme.successColor }]} />
                )}
              </View>
              <Text style={[typography.small, { color: theme.textSecondary, marginTop: 4 }]}>
                {JOURNEY_TYPES[t.journeyType]?.label}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Text style={[typography.small, { color: theme.textTertiary }]}>
                  v{t.version || 1} &middot; {sectionCount}s, {fieldCount}f
                </Text>
                {t.expiresAt && (
                  <View style={{ backgroundColor: theme.warningColor + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={[{ fontSize: 10, color: theme.warningColor, fontWeight: '700' }]}>
                      {new Date(t.expiresAt) <= new Date() ? 'EXPIRED' : 'EXPIRING'}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ═══ TEMPLATE PREVIEW MODAL ═══ */}
      <Modal visible={!!previewTemplate} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.previewModal, { backgroundColor: theme.surfaceElevated }, getElevation('high', theme)]}>
            {previewTemplate && (
              <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={true}>
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.h3, { color: theme.textPrimary }]}>
                      {previewTemplate.name}
                    </Text>
                    <Text style={[typography.small, { color: theme.textSecondary, marginTop: 4 }]}>
                      {previewTemplate.formCode} &middot; v{previewTemplate.version || 1} &middot; {JOURNEY_TYPES[previewTemplate.journeyType]?.label}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: previewTemplate.status === 'PUBLISHED' ? theme.successColor + '20' : theme.warningColor + '20' },
                  ]}>
                    <Text style={[typography.small, {
                      color: previewTemplate.status === 'PUBLISHED' ? theme.successColor : theme.warningColor,
                      fontWeight: '700',
                    }]}>
                      {previewTemplate.status}
                    </Text>
                  </View>
                </View>

                {/* Version & Expiry info */}
                <View style={[styles.versionInfoRow, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: theme.borderColor }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.small, { color: theme.textSecondary }]}>
                      Version {previewTemplate.version || 1}
                      {previewTemplate.createdBy ? ` by ${previewTemplate.createdBy}` : ''}
                    </Text>
                    {previewTemplate.expiresAt && (
                      <Text style={[typography.small, { color: theme.warningColor, marginTop: 2 }]}>
                        Expires: {new Date(previewTemplate.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                    {previewTemplate.supersededBy && (
                      <Text style={[typography.small, { color: theme.textTertiary, marginTop: 2 }]}>
                        Superseded by newer version
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.versionHistoryBtn, { borderColor: theme.borderColor }]}
                    onPress={() => loadVersionHistory(previewTemplate.formCode)}
                  >
                    <Ionicons name="time" size={14} color={theme.textSecondary} />
                    <Text style={[typography.small, { color: theme.textSecondary, marginLeft: 4 }]}>History</Text>
                  </TouchableOpacity>
                </View>

                {previewTemplate.description ? (
                  <Text style={[typography.body, { color: theme.textSecondary, marginBottom: 16 }]}>
                    {previewTemplate.description}
                  </Text>
                ) : null}

                {/* Full schema preview */}
                {previewTemplate.schema?.sections?.map((section: any, sIdx: number) => (
                  <View key={sIdx} style={[styles.previewSection, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: theme.borderColor }]}>
                    <Text style={[typography.bodyBold, { color: theme.primaryColor, marginBottom: 8 }]}>
                      {section.title || `Section ${sIdx + 1}`}
                    </Text>
                    {(section.fields || []).map((field: any, fIdx: number) => (
                      <View key={fIdx} style={[styles.previewField, { borderBottomColor: theme.borderColor }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons
                            name={FIELD_TYPES.find(ft => ft.type === field.type)?.icon || 'text'}
                            size={14}
                            color={theme.textTertiary}
                          />
                          <Text style={[typography.body, { color: theme.textPrimary }]}>
                            {field.label}
                          </Text>
                          {field.required && (
                            <Text style={{ color: theme.dangerColor, fontSize: 12, fontWeight: '700' }}>*</Text>
                          )}
                        </View>
                        <Text style={[typography.small, { color: theme.textTertiary }]}>
                          {field.type}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Action buttons */}
            <View style={[styles.previewActions, { borderTopColor: theme.borderColor }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: theme.surfaceColor, borderWidth: 1, borderColor: theme.borderColor }]}
                onPress={() => setPreviewTemplate(null)}
              >
                <Text style={[typography.bodyBold, { color: theme.textSecondary }]}>Close</Text>
              </TouchableOpacity>
              {previewTemplate?.status === 'PUBLISHED' && !previewTemplate?.expiresAt && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.warningColor }]}
                  onPress={() => {
                    setShowExpiryPicker(true);
                  }}
                >
                  <Ionicons name="timer" size={16} color="#FFF" />
                  <Text style={[typography.bodyBold, { color: '#FFF', marginLeft: 6 }]}>Set Expiry</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.primaryColor }]}
                onPress={() => startEditTemplate(previewTemplate)}
              >
                <Ionicons name="create" size={16} color="#FFF" />
                <Text style={[typography.bodyBold, { color: '#FFF', marginLeft: 6 }]}>New Version</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.accentColor }, getGlowShadow(theme.accentColor, 0.4)]}
                onPress={() => duplicateTemplate(previewTemplate)}
              >
                <Ionicons name="copy" size={16} color="#FFF" />
                <Text style={[typography.bodyBold, { color: '#FFF', marginLeft: 6 }]}>Duplicate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══ BUILDER SECTION ═══ */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 4 }}>
        <Text style={[typography.h2, { color: theme.textPrimary }]}>
          {mode === 'edit' ? 'Edit Template' : mode === 'duplicate' ? 'Duplicate Template' : 'Create New Template'}
        </Text>
        {mode !== 'create' && (
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: theme.borderColor }]}
            onPress={resetBuilder}
          >
            <Ionicons name="close" size={16} color={theme.textSecondary} />
            <Text style={[typography.small, { color: theme.textSecondary, marginLeft: 4 }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Mode indicator banner */}
      {mode !== 'create' && (
        <View style={[
          styles.modeBanner,
          {
            backgroundColor: mode === 'edit'
              ? (theme.primaryColor + '15')
              : (theme.accentColor + '15'),
            borderLeftColor: mode === 'edit' ? theme.primaryColor : theme.accentColor,
          },
        ]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name={mode === 'edit' ? 'create' : 'copy'}
                size={16}
                color={mode === 'edit' ? theme.primaryColor : theme.accentColor}
              />
              <Text style={[typography.small, {
                color: mode === 'edit' ? theme.primaryColor : theme.accentColor,
                marginLeft: 8,
                fontWeight: '600',
              }]}>
                {mode === 'edit'
                  ? `New Version of "${formName}" (v${editingVersion || 1} → v${(editingVersion || 1) + 1})`
                  : `Duplicating — will be saved as a new template`
                }
              </Text>
            </View>
            {mode === 'edit' && (
              <Text style={[typography.small, { color: theme.textSecondary, marginTop: 4, marginLeft: 24 }]}>
                A new version will be created. Set when the old version should expire below.
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Expiry date for old version (shown in edit/versioning mode) */}
      {mode === 'edit' && (
        <View style={[styles.expiryCard, { backgroundColor: theme.warningColor + '10', borderColor: theme.warningColor + '40' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="timer" size={18} color={theme.warningColor} />
            <Text style={[typography.bodyBold, { color: theme.warningColor, marginLeft: 8 }]}>
              Old Version (v{editingVersion || 1}) Expiry
            </Text>
          </View>
          <Text style={[typography.small, { color: theme.textSecondary, marginBottom: 10 }]}>
            Set when the current published version should stop being available. After this date, only the new version will be active.
          </Text>
          <TextInput
            style={[getInputStyle(theme), typography.body, { marginBottom: 8 }]}
            placeholderTextColor={theme.textTertiary}
            placeholder="YYYY-MM-DDTHH:MM (e.g., 2026-03-20T18:00)"
            value={oldVersionExpiry}
            onChangeText={setOldVersionExpiry}
          />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Immediately', days: 0 },
              { label: 'In 3 days', days: 3 },
              { label: 'In 7 days', days: 7 },
              { label: 'In 30 days', days: 30 },
            ].map(preset => {
              const d = new Date();
              if (preset.days === 0) { /* use now */ }
              else { d.setDate(d.getDate() + preset.days); d.setHours(23, 59, 0, 0); }
              return (
                <TouchableOpacity
                  key={preset.label}
                  style={[styles.presetChip, { borderColor: theme.warningColor + '40', backgroundColor: theme.warningColor + '10' }]}
                  onPress={() => setOldVersionExpiry(d.toISOString().slice(0, 16))}
                >
                  <Text style={[typography.small, { color: theme.warningColor, fontWeight: '600' }]}>{preset.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View style={[styles.builderCard, { backgroundColor: theme.surfaceElevated }, getElevation('low', theme)]}>
        <TextInput
          style={[getInputStyle(theme), typography.body, mode === 'edit' && { opacity: 0.6 }]}
          placeholderTextColor={theme.textTertiary}
          placeholder="Form Code (e.g., CASH_DEP_V1)"
          value={formCode}
          onChangeText={setFormCode}
          editable={mode !== 'edit'}
        />
        <TextInput
          style={[getInputStyle(theme), typography.body, { marginTop: 10 }]}
          placeholderTextColor={theme.textTertiary}
          placeholder="Form Name"
          value={formName}
          onChangeText={setFormName}
        />
        <TextInput
          style={[getInputStyle(theme), typography.body, { marginTop: 10 }]}
          placeholderTextColor={theme.textTertiary}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
        />
        <Text style={[styles.fieldLabel, typography.label, { color: theme.textSecondary, marginTop: 14 }]}>
          Journey Type
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {Object.entries(JOURNEY_TYPES).map(([key, val]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.journeyChip,
                journeyType === key
                  ? { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor }
                  : { backgroundColor: 'transparent', borderColor: theme.borderColor },
              ]}
              onPress={() => setJourneyType(key)}
            >
              <Text
                style={[
                  typography.small,
                  {
                    color: journeyType === key ? '#FFF' : theme.textSecondary,
                    fontWeight: journeyType === key ? '700' : '500',
                  },
                ]}
              >
                {val.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sections */}
      {sections.map((section, sIdx) => (
        <View key={section.id} style={[styles.sectionCard, { backgroundColor: theme.surfaceElevated }, getElevation('low', theme)]}>
          <View style={[styles.sectionHeader, { borderBottomColor: theme.borderColor }]}>
            <TextInput
              style={[styles.sectionTitle, typography.h3, { color: theme.primaryColor, flex: 1 }]}
              value={section.title}
              onChangeText={t => {
                const s = [...sections];
                s[sIdx].title = t;
                setSections(s);
              }}
            />
            {sections.length > 1 && (
              <TouchableOpacity onPress={() => removeSection(sIdx)} style={{ padding: 6, marginLeft: 8 }}>
                <Ionicons name="trash" size={18} color={theme.dangerColor} />
              </TouchableOpacity>
            )}
          </View>

          {section.fields.map((field, fIdx) => (
            <View key={field.id} style={[styles.fieldRow, { borderBottomColor: theme.borderColor }]}>
              <Ionicons name="reorder-three" size={20} color={theme.textTertiary} />
              <View style={styles.fieldInfo}>
                <Text style={[styles.fieldName, typography.bodyBold, { color: theme.textPrimary }]}>
                  {field.label}
                </Text>
                <Text style={[styles.fieldType, typography.small, { color: theme.textSecondary, marginTop: 2 }]}>
                  {field.type}
                  {field.required ? ' *' : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => removeField(sIdx, fIdx)}
                style={{ padding: 6 }}
              >
                <Ionicons name="trash" size={18} color={theme.dangerColor} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Add Field Palette */}
          <Text style={[styles.addFieldLabel, typography.label, { color: theme.textSecondary, marginTop: 14 }]}>
            Add Field:
          </Text>
          <View style={styles.fieldPalette}>
            {FIELD_TYPES.map(ft => (
              <TouchableOpacity
                key={ft.type}
                style={[
                  styles.paletteItem,
                  {
                    borderColor: theme.accentColor,
                    backgroundColor: theme.isDark
                      ? 'rgba(99, 102, 241, 0.1)'
                      : 'rgba(99, 102, 241, 0.05)',
                  },
                ]}
                onPress={() => {
                  setEditSectionIdx(sIdx);
                  addField(ft.type);
                }}
              >
                <Ionicons name={ft.icon as any} size={16} color={theme.accentColor} />
                <Text style={[styles.paletteLabel, typography.small, { color: theme.accentColor }]}>
                  {ft.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[
          styles.addSectionBtn,
          {
            borderColor: theme.accentColor,
            backgroundColor: theme.isDark
              ? 'rgba(99, 102, 241, 0.08)'
              : 'rgba(99, 102, 241, 0.04)',
          },
        ]}
        onPress={addSection}
      >
        <Ionicons name="add-circle" size={20} color={theme.accentColor} />
        <Text style={[styles.addSectionText, typography.bodyBold, { color: theme.accentColor }]}>
          Add Section
        </Text>
      </TouchableOpacity>

      {/* Save button */}
      <TouchableOpacity
        style={[
          styles.saveBtn,
          {
            backgroundColor: mode === 'edit' ? theme.primaryColor : theme.primaryColor,
            opacity: saving ? 0.6 : 1,
          },
          getGlowShadow(theme.primaryColor, 0.5),
        ]}
        onPress={saveTemplate}
        disabled={saving}
      >
        <Ionicons name={mode === 'edit' ? 'save' : 'cloud-upload'} size={18} color="#FFF" />
        <Text style={[styles.saveBtnText, typography.bodyBold, { marginLeft: 8 }]}>
          {saving
            ? 'Saving...'
            : mode === 'edit'
            ? 'Update & Publish Template'
            : 'Save & Publish Template'}
        </Text>
      </TouchableOpacity>

      {/* ═══ INLINE STATUS MESSAGE (near save button) ═══ */}
      {saveStatus && (
        <Animated.View
          ref={saveAreaRef}
          style={[
            styles.inlineStatus,
            {
              backgroundColor: saveStatus.type === 'success' ? theme.successColor + '15' : theme.dangerColor + '15',
              borderLeftColor: saveStatus.type === 'success' ? theme.successColor : theme.dangerColor,
              opacity: statusOpacity,
            },
          ]}
        >
          <Ionicons
            name={saveStatus.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={20}
            color={saveStatus.type === 'success' ? theme.successColor : theme.dangerColor}
          />
          <Text style={[typography.body, {
            color: saveStatus.type === 'success' ? theme.successColor : theme.dangerColor,
            flex: 1,
            marginLeft: 10,
            fontWeight: '600',
          }]}>
            {saveStatus.text}
          </Text>
          <TouchableOpacity onPress={() => setSaveStatus(null)}>
            <Ionicons name="close" size={18} color={theme.textTertiary} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ═══ EXPIRY PICKER MODAL ═══ */}
      <Modal visible={showExpiryPicker} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, getGlassStyle(theme), getElevation('high', theme)]}>
            <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: 16 }]}>
              Set Template Expiry
            </Text>
            <Text style={[typography.body, { color: theme.textSecondary, marginBottom: 16 }]}>
              After this date, the template will no longer be available for new form submissions. Existing submissions are unaffected.
            </Text>

            <Text style={[typography.label, { color: theme.textSecondary, marginBottom: 6 }]}>Expiry Date & Time</Text>
            <TextInput
              style={[getInputStyle(theme), typography.body, { marginBottom: 8 }]}
              placeholderTextColor={theme.textTertiary}
              placeholder="YYYY-MM-DD HH:MM (e.g., 2026-03-20 18:00)"
              value={oldVersionExpiry}
              onChangeText={setOldVersionExpiry}
            />

            {/* Quick presets */}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {[
                { label: 'End of today', days: 0 },
                { label: 'In 3 days', days: 3 },
                { label: 'In 7 days', days: 7 },
                { label: 'In 30 days', days: 30 },
                { label: 'In 90 days', days: 90 },
              ].map(preset => {
                const d = new Date();
                if (preset.days === 0) { d.setHours(23, 59, 0, 0); }
                else { d.setDate(d.getDate() + preset.days); d.setHours(23, 59, 0, 0); }
                return (
                  <TouchableOpacity
                    key={preset.label}
                    style={[styles.presetChip, { borderColor: theme.borderColor, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                    onPress={() => setOldVersionExpiry(d.toISOString().slice(0, 16))}
                  >
                    <Text style={[typography.small, { color: theme.textSecondary }]}>{preset.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: theme.surfaceColor, borderWidth: 1, borderColor: theme.borderColor }]}
                onPress={() => { setShowExpiryPicker(false); setOldVersionExpiry(''); }}
              >
                <Text style={[typography.bodyBold, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.warningColor }]}
                onPress={async () => {
                  if (previewTemplate && oldVersionExpiry) {
                    await setTemplateExpiry(previewTemplate.id, new Date(oldVersionExpiry).toISOString());
                    setShowExpiryPicker(false);
                    setPreviewTemplate(null);
                    setOldVersionExpiry('');
                  }
                }}
              >
                <Text style={[typography.bodyBold, { color: '#FFF' }]}>Set Expiry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══ VERSION HISTORY MODAL ═══ */}
      <Modal visible={showVersionHistory} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.previewModal, { backgroundColor: theme.surfaceElevated }, getElevation('high', theme)]}>
            <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: 16 }]}>
              Version History
            </Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {versionHistory.map((v, idx) => {
                const isActive = v.status === 'PUBLISHED' && (!v.expiresAt || new Date(v.expiresAt) > new Date());
                const isExpired = v.expiresAt && new Date(v.expiresAt) <= new Date();
                return (
                  <View key={v.id} style={[
                    styles.versionCard,
                    {
                      backgroundColor: isActive ? (theme.successColor + '10') : theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                      borderColor: isActive ? theme.successColor : theme.borderColor,
                    },
                  ]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>
                        v{v.version} — {v.name}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isActive ? theme.successColor + '20'
                            : isExpired ? theme.dangerColor + '20'
                            : theme.warningColor + '20',
                        },
                      ]}>
                        <Text style={[typography.small, {
                          fontWeight: '700',
                          color: isActive ? theme.successColor
                            : isExpired ? theme.dangerColor
                            : theme.warningColor,
                        }]}>
                          {isActive ? 'ACTIVE' : isExpired ? 'EXPIRED' : v.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={[typography.small, { color: theme.textSecondary, marginTop: 4 }]}>
                      Created: {new Date(v.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {v.createdBy ? ` by ${v.createdBy}` : ''}
                    </Text>
                    {v.expiresAt && (
                      <Text style={[typography.small, { color: isExpired ? theme.dangerColor : theme.warningColor, marginTop: 2 }]}>
                        {isExpired ? 'Expired' : 'Expires'}: {new Date(v.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                    {v.supersededBy && (
                      <Text style={[typography.small, { color: theme.textTertiary, marginTop: 2 }]}>
                        Superseded by newer version
                      </Text>
                    )}
                    {idx === 0 && versionHistory.length > 1 && (
                      <Text style={[typography.small, { color: theme.primaryColor, marginTop: 4, fontWeight: '600' }]}>
                        Latest version
                      </Text>
                    )}
                  </View>
                );
              })}
              {versionHistory.length === 0 && (
                <Text style={[typography.body, { color: theme.textTertiary, textAlign: 'center', padding: 20 }]}>
                  No version history found
                </Text>
              )}
            </ScrollView>
            <View style={[styles.previewActions, { borderTopColor: theme.borderColor }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: theme.surfaceColor, borderWidth: 1, borderColor: theme.borderColor }]}
                onPress={() => setShowVersionHistory(false)}
              >
                <Text style={[typography.bodyBold, { color: theme.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Field Edit Modal */}
      <Modal visible={showFieldModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, getGlassStyle(theme), getElevation('high', theme)]}>
            <Text style={[styles.modalTitle, typography.h3, { color: theme.textPrimary, marginBottom: 16 }]}>
              Configure Field ({editField.type})
            </Text>

            <TextInput
              style={[getInputStyle(theme), typography.body, { marginBottom: 12 }]}
              placeholderTextColor={theme.textTertiary}
              placeholder="Label *"
              value={editField.label || ''}
              onChangeText={v => setEditField({ ...editField, label: v })}
            />
            <TextInput
              style={[getInputStyle(theme), typography.body, { marginBottom: 12 }]}
              placeholderTextColor={theme.textTertiary}
              placeholder="Placeholder"
              value={editField.placeholder || ''}
              onChangeText={v => setEditField({ ...editField, placeholder: v })}
            />
            <TextInput
              style={[getInputStyle(theme), typography.body, { marginBottom: 12 }]}
              placeholderTextColor={theme.textTertiary}
              placeholder="Help text"
              value={editField.helpText || ''}
              onChangeText={v => setEditField({ ...editField, helpText: v })}
            />

            {(editField.type === 'select' || editField.type === 'radio') && (
              <TextInput
                style={[getInputStyle(theme), typography.body, { marginBottom: 12 }]}
                placeholderTextColor={theme.textTertiary}
                placeholder="Options (comma-separated, e.g.: Option A, Option B)"
                value={(editField.options || [])
                  .map((o: any) => (typeof o === 'string' ? o : o.label))
                  .join(', ')}
                onChangeText={v =>
                  setEditField({
                    ...editField,
                    options: v
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean)
                      .map(s => ({
                        label: s,
                        value: s.toUpperCase().replace(/\s+/g, '_'),
                      })),
                  })
                }
              />
            )}

            <TouchableOpacity
              style={[
                styles.checkRow,
                {
                  backgroundColor: theme.isDark
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.02)',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginBottom: 16,
                },
              ]}
              onPress={() => setEditField({ ...editField, required: !editField.required })}
            >
              <Ionicons
                name={editField.required ? 'checkbox' : 'square-outline'}
                size={22}
                color={theme.primaryColor}
              />
              <Text style={[typography.bodyBold, { marginLeft: 12, color: theme.textPrimary }]}>
                Required
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  {
                    backgroundColor: theme.surfaceColor,
                    borderWidth: 1,
                    borderColor: theme.borderColor,
                  },
                ]}
                onPress={() => setShowFieldModal(false)}
              >
                <Text style={[typography.bodyBold, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  { backgroundColor: theme.primaryColor },
                  getGlowShadow(theme.primaryColor, 0.4),
                ]}
                onPress={saveField}
              >
                <Text style={[typography.bodyBold, { color: '#FFF' }]}>Add Field</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
      <AlertModal alert={alert} onClose={hideAlert} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { marginTop: 16, marginBottom: 12 },

  // Filter pills
  filterPill: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },

  // Template grid
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  templateCard: {
    width: Platform.OS === 'web' ? 'calc(33.33% - 8px)' as any : 200,
    padding: 14,
    borderRadius: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  // Preview modal
  previewModal: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 540,
    maxHeight: '80%',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  previewSection: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  previewField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  // Version info
  versionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  versionHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  versionCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  expiryCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },

  // Mode banner
  modeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
    marginTop: 8,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  // Builder
  builderCard: { padding: 16, marginBottom: 16, borderRadius: 12 },
  fieldLabel: { marginBottom: 8 },
  journeyChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 10 },
  sectionCard: { padding: 16, marginBottom: 16, borderRadius: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 12,
  },
  sectionTitle: {},
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  fieldInfo: { flex: 1 },
  fieldName: {},
  fieldType: { marginTop: 2 },
  addFieldLabel: { marginTop: 14, marginBottom: 10 },
  fieldPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paletteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  paletteLabel: {},
  addSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  addSectionText: {},
  saveBtn: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 15 },

  // Inline status
  inlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginBottom: 16,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
  },
  modalTitle: { marginBottom: 16 },
  checkRow: { flexDirection: 'row', alignItems: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  confirmBtn: {
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
