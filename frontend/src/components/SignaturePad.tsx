import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { getElevation, getStatusGlow, typography } from '../utils/styles';

interface SignaturePadProps {
  onSave: (svgData: string) => void;
  label?: string;
}

export default function SignaturePad({ onSave, label = 'Signature' }: SignaturePadProps) {
  const { theme } = useTheme();
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isSigned, setIsSigned] = useState(false);
  const containerRef = useRef<View>(null);
  const [layout, setLayout] = useState({ x: 0, y: 0, width: 300, height: 150 });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath(`M${locationX},${locationY}`);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath(prev => prev + ` L${locationX},${locationY}`);
    },
    onPanResponderRelease: () => {
      if (currentPath) {
        setPaths(prev => [...prev, currentPath]);
        setCurrentPath('');
        setIsSigned(true);
      }
    },
  });

  function clear() {
    setPaths([]);
    setCurrentPath('');
    setIsSigned(false);
  }

  function save() {
    const allPaths = [...paths, currentPath].filter(Boolean);
    const svgData = allPaths.map(d => `<path d="${d}" stroke="${theme.accentColor}" stroke-width="2" fill="none"/>`).join('');
    const svgString = `<svg width="${layout.width}" height="${layout.height}" xmlns="http://www.w3.org/2000/svg">${svgData}</svg>`;
    onSave(svgString);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceElevated }, getElevation(2, theme)]}>
      <Text style={[styles.label, { color: theme.textPrimary }, typography.label]}>{label}</Text>
      <View ref={containerRef} style={[styles.padContainer, { borderColor: theme.borderColor, backgroundColor: theme.inputBackground }]}
        onLayout={(e) => setLayout(e.nativeEvent.layout)}
        {...panResponder.panHandlers}>
        <Svg width="100%" height="100%">
          {paths.map((d, i) => <Path key={i} d={d} stroke={theme.accentColor} strokeWidth={2} fill="none" />)}
          {currentPath ? <Path d={currentPath} stroke={theme.accentColor} strokeWidth={2} fill="none" /> : null}
        </Svg>
        {!isSigned && <Text style={[styles.placeholder, { color: theme.textTertiary }]}>Sign here</Text>}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, { borderColor: theme.dangerColor }]} onPress={clear}>
          <Text style={[styles.btnText, { color: theme.dangerColor }]}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.saveBtn, { backgroundColor: theme.accentColor }, isSigned && getStatusGlow(theme.successColor, theme)]} onPress={save} disabled={!isSigned}>
          <Text style={[styles.btnText, { color: theme.isDark ? theme.surfaceElevated : '#FFF' }]}>Confirm Signature</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 12, padding: 16, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  padContainer: { height: 150, borderWidth: 1.5, borderRadius: 8, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  placeholder: { position: 'absolute', fontSize: 16, fontWeight: '500' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  btn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtn: { borderWidth: 0 },
  btnText: { fontSize: 13, fontWeight: '600', ...typography.label },
});
