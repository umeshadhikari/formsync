import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { Ionicons } from './Icon';
import { useTheme } from '../context/ThemeContext';

export interface AlertState {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onDismiss?: () => void;
}

interface AlertModalProps {
  alert: AlertState | null;
  onClose: () => void;
}

const ALERT_CONFIG = {
  success: { icon: 'checkmark-circle' as const, label: 'Success' },
  error: { icon: 'close-circle' as const, label: 'Error' },
  warning: { icon: 'warning' as const, label: 'Warning' },
  info: { icon: 'information-circle' as const, label: 'Info' },
};

export default function AlertModal({ alert, onClose }: AlertModalProps) {
  const { theme } = useTheme();

  if (!alert || !alert.visible) return null;

  const config = ALERT_CONFIG[alert.type] || ALERT_CONFIG.info;

  const accentColor =
    alert.type === 'success' ? theme.successColor
    : alert.type === 'error' ? theme.dangerColor
    : alert.type === 'warning' ? theme.warningColor
    : theme.accentColor;

  const handleClose = () => {
    if (alert.onDismiss) alert.onDismiss();
    onClose();
  };

  return (
    <Modal visible={true} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, {
          backgroundColor: theme.surfaceColor,
          borderColor: theme.borderColor,
          ...(Platform.OS === 'web' ? { boxShadow: `0 8px 32px rgba(0,0,0,0.3)` } as any : {}),
        }]}>
          {/* Color accent bar */}
          <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

          {/* Icon */}
          <View style={[styles.iconContainer, {
            backgroundColor: accentColor + '15',
            ...(Platform.OS === 'web' ? { boxShadow: `0 0 24px ${accentColor}40` } as any : {}),
          }]}>
            <Ionicons name={config.icon} size={36} color={accentColor} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {alert.title || config.label}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {alert.message}
          </Text>

          {/* Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: accentColor }]}
            onPress={handleClose}
          >
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Hook for easy usage
export function useAlert() {
  const [alert, setAlert] = React.useState<AlertState | null>(null);

  const showAlert = React.useCallback((type: AlertState['type'], title: string, message: string, onDismiss?: () => void) => {
    setAlert({ visible: true, type, title, message, onDismiss });
  }, []);

  const hideAlert = React.useCallback(() => {
    setAlert(null);
  }, []);

  return { alert, showAlert, hideAlert };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 24,
  },
  accentBar: {
    width: '100%',
    height: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
