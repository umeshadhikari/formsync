import { registerRootComponent } from 'expo';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </ThemeProvider>
    </AuthProvider>
  );
}

registerRootComponent(App);

export default App;
