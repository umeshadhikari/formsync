import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import FormEntryScreen from '../screens/FormEntryScreen';
import FormBuilderScreen from '../screens/FormBuilderScreen';
import CustomerReviewScreen from '../screens/CustomerReviewScreen';
import SupervisorDashboard from '../screens/SupervisorDashboard';
import AuditLogScreen from '../screens/AuditLogScreen';
import AdminPanel from '../screens/AdminPanel';
import WorkflowConfigScreen from '../screens/WorkflowConfigScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { user, hasRole } = useAuth();
  const { theme } = useTheme();
  const isAdmin = hasRole('SYSTEM_ADMIN');
  const isChecker = hasRole('CHECKER') || hasRole('BRANCH_MANAGER') || hasRole('OPS_ADMIN');
  const isAuditor = hasRole('AUDITOR');

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.primaryColor,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.surfaceColor, borderTopColor: '#E0E0E0', paddingBottom: 4, height: 60 },
        headerStyle: { backgroundColor: theme.primaryColor },
        headerTintColor: '#FFF',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />, title: 'FormSync' }} />
      {(isChecker || isAdmin) && (
        <Tab.Screen name="Approvals" component={SupervisorDashboard}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done" size={size} color={color} />, tabBarBadge: undefined }} />
      )}
      {isAdmin && (
        <Tab.Screen name="Builder" component={FormBuilderScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />, title: 'Form Builder' }} />
      )}
      {(isAuditor || isAdmin) && (
        <Tab.Screen name="Audit" component={AuditLogScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />, title: 'Audit Logs' }} />
      )}
      {isAdmin && (
        <Tab.Screen name="Admin" component={AdminPanel}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} /> }} />
      )}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={theme.primaryColor} /></View>;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.primaryColor }, headerTintColor: '#FFF' }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="FormEntry" component={FormEntryScreen} options={{ title: 'Fill Form' }} />
            <Stack.Screen name="CustomerReview" component={CustomerReviewScreen} options={{ title: 'Customer Review' }} />
            <Stack.Screen name="WorkflowConfig" component={WorkflowConfigScreen} options={{ title: 'Workflow Rules' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
