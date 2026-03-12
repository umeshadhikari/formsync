import React from 'react';
import { Text } from 'react-native';

// Simple Unicode icon mapping replacing @expo/vector-icons Ionicons
// This avoids native module dependency issues on web
const ICON_MAP: Record<string, string> = {
  // Navigation & UI
  'home': '🏠', 'home-outline': '🏠',
  'document-text': '📄', 'document-text-outline': '📄',
  'build': '⚙️', 'build-outline': '⚙️',
  'shield-checkmark': '🛡️', 'shield-checkmark-outline': '🛡️',
  'analytics': '📊', 'analytics-outline': '📊',
  'search': '🔍', 'search-outline': '🔍',
  'close': '✕', 'close-outline': '✕',
  'close-circle': '⊗', 'close-circle-outline': '⊗',
  'add': '＋', 'add-outline': '＋', 'add-circle': '⊕', 'add-circle-outline': '⊕',
  'remove-circle-outline': '⊖',
  'checkmark': '✓', 'checkmark-circle': '✅', 'checkmark-circle-outline': '✅',
  'arrow-back': '←', 'arrow-back-outline': '←',
  'arrow-forward': '→', 'arrow-forward-outline': '→',
  'chevron-up': '▲', 'chevron-down': '▼', 'chevron-forward': '▶', 'chevron-back': '◀',
  'chevron-down-circle-outline': '▽',
  'log-out': '🚪', 'log-out-outline': '🚪',
  'log-in': '🔑', 'log-in-outline': '🔑',
  'settings': '⚙️', 'settings-outline': '⚙️',
  'eye': '👁️', 'eye-outline': '👁️', 'eye-off-outline': '🙈',
  'refresh': '↻', 'refresh-outline': '↻',
  'ellipsis-vertical': '⋮',

  // Form / Data
  'text': '𝐓', 'text-outline': '𝐓',
  'calculator': '🔢', 'calculator-outline': '🔢',
  'cash': '💰', 'cash-outline': '💰',
  'mail': '✉️', 'mail-outline': '✉️',
  'call': '📞', 'call-outline': '📞',
  'calendar': '📅', 'calendar-outline': '📅',
  'radio-button-on': '◉', 'radio-button-on-outline': '◉',
  'radio-button-off': '○', 'radio-button-off-outline': '○',
  'checkbox': '☑️', 'checkbox-outline': '☑️',
  'square-outline': '☐',
  'cloud-upload': '☁️', 'cloud-upload-outline': '☁️',
  'create': '✏️', 'create-outline': '✏️',

  // Status & Actions
  'time': '🕐', 'time-outline': '🕐',
  'person': '👤', 'person-outline': '👤',
  'people': '👥', 'people-outline': '👥',
  'lock-closed': '🔒', 'lock-closed-outline': '🔒',
  'warning': '⚠️', 'warning-outline': '⚠️',
  'information-circle': 'ℹ️', 'information-circle-outline': 'ℹ️',
  'alert-circle': '⚠️', 'alert-circle-outline': '⚠️',
  'notifications': '🔔', 'notifications-outline': '🔔',
  'trash': '🗑️', 'trash-outline': '🗑️',
  'copy': '📋', 'copy-outline': '📋',
  'save': '💾', 'save-outline': '💾',
  'download': '⬇️', 'download-outline': '⬇️',
  'send': '📤', 'send-outline': '📤',
  'filter': '🔽', 'filter-outline': '🔽',
  'layers': '📚', 'layers-outline': '📚',
  'color-palette': '🎨', 'color-palette-outline': '🎨',
  'swap-horizontal': '⇄', 'swap-horizontal-outline': '⇄',
  'star': '⭐', 'star-outline': '☆',
  'help-circle': '❓', 'help-circle-outline': '❓',

  // Journey type icons
  'trending-up': '📈', 'trending-up-outline': '📈',
  'card': '💳', 'card-outline': '💳',
  'wallet': '👛', 'wallet-outline': '👛',
  'briefcase': '💼', 'briefcase-outline': '💼',
  'business': '🏢', 'business-outline': '🏢',
  'ribbon': '🎗️', 'ribbon-outline': '🎗️',
  'globe': '🌐', 'globe-outline': '🌐',
  'cube': '📦', 'cube-outline': '📦',
  'finger-print': '🔏', 'finger-print-outline': '🔏',
  'key': '🔑', 'key-outline': '🔑',
  'document': '📃', 'document-outline': '📃',
  'documents': '📑', 'documents-outline': '📑',
  'filing': '🗂️', 'filing-outline': '🗂️',
  'folder': '📁', 'folder-outline': '📁',
  'newspaper': '📰', 'newspaper-outline': '📰',

  // Admin & workflow icons
  'speedometer': '⏱️', 'speedometer-outline': '⏱️',
  'construct': '🔧', 'construct-outline': '🔧',
  'person-add': '➕👤', 'person-add-outline': '➕',
  'timer': '⏳', 'timer-outline': '⏳',
  'hammer': '🔨', 'hammer-outline': '🔨',
  'list': '☰', 'list-outline': '☰',
  'checkmark-done': '✓✓', 'checkmark-done-outline': '✓✓',
  'pause': '⏸', 'pause-outline': '⏸', 'pause-circle': '⏸', 'pause-circle-outline': '⏸',
  'play': '▶', 'play-outline': '▶', 'play-circle': '▶', 'play-circle-outline': '▶',
  'map': '🗺️', 'map-outline': '🗺️',
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export function Ionicons({ name, size = 24, color = '#000', style }: IconProps) {
  const icon = ICON_MAP[name] || '●';
  return (
    <Text style={[{ fontSize: size * 0.75, color, lineHeight: size, textAlign: 'center', width: size }, style]}>
      {icon}
    </Text>
  );
}

export default Ionicons;
