import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { getGradientStyle, getElevation } from '../utils/styles';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import FormEntryScreen from '../screens/FormEntryScreen';
import FormBuilderScreen from '../screens/FormBuilderScreen';
import CustomerReviewScreen from '../screens/CustomerReviewScreen';
import SupervisorDashboard from '../screens/SupervisorDashboard';
import AuditLogScreen from '../screens/AuditLogScreen';
import AdminPanel from '../screens/AdminPanel';
import WorkflowConfigScreen from '../screens/WorkflowConfigScreen';
import TellerSubmissionsScreen from '../screens/TellerSubmissionsScreen';
import FormDetailScreen from '../screens/FormDetailScreen';

const Tab = createBottomTabNavigator();

function MainTabs() {
  const { hasRole } = useAuth();
  const { theme } = useTheme();
  const isAdmin = hasRole('SYSTEM_ADMIN');
  const isChecker = hasRole('CHECKER') || hasRole('BRANCH_MANAGER') || hasRole('OPS_ADMIN');
  const isAuditor = hasRole('AUDITOR');
  const isTeller = hasRole('MAKER') || hasRole('SENIOR_MAKER');

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.accentColor,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.surfaceColor,
          borderTopColor: theme.borderColor,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 6,
          height: 68,
          ...(Platform.OS === 'web' && theme.isDark ? { boxShadow: '0 -4px 20px rgba(0,0,0,0.3)' } as any : {}),
        },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        headerStyle: {
          backgroundColor: theme.surfaceColor,
          borderBottomWidth: 0,
          ...(Platform.OS === 'web' ? { boxShadow: theme.isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)' } as any : {}),
        },
        headerTintColor: theme.textPrimary,
        headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
        headerRight: () => (
          <View style={{ marginRight: 16 }}>
            <ThemeSwitcher />
          </View>
        ),
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardWithNav}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />, title: 'Home' }} />
      <Tab.Screen name="MySubmissions" component={TellerSubmissionsWithNav}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="folder-open" size={size} color={color} />, title: 'My Items' }} />
      {(isChecker || isAdmin) && (
        <Tab.Screen name="Approvals" component={SupervisorDashboard}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle" size={size} color={color} /> }} />
      )}
      {isAdmin && (
        <Tab.Screen name="Builder" component={FormBuilderScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="create" size={size} color={color} />, title: 'Form Builder' }} />
      )}
      {(isAuditor || isAdmin) && (
        <Tab.Screen name="Audit" component={AuditLogScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />, title: 'Audit Logs' }} />
      )}
      {isAdmin && (
        <Tab.Screen name="Admin" component={AdminWithNav}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} /> }} />
      )}
    </Tab.Navigator>
  );
}

function AdminWithNav() {
  const [subScreen, setSubScreen] = React.useState<string | null>(null);
  const { theme } = useTheme();

  const subHeaderStyle = [
    styles.subHeader,
    { backgroundColor: theme.surfaceColor, borderBottomWidth: 1, borderBottomColor: theme.borderColor },
    Platform.OS === 'web' ? { boxShadow: theme.isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)' } as any : {},
  ];

  if (subScreen === 'WorkflowConfig') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
        <View style={subHeaderStyle}>
          <TouchableOpacity onPress={() => setSubScreen(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={theme.accentColor} />
            <Text style={[styles.backText, { color: theme.accentColor }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.subHeaderTitle, { color: theme.textPrimary }]}>Workflow Rules</Text>
          <View style={{ width: 60 }} />
        </View>
        <WorkflowConfigScreen
          navigation={{ navigate: () => {}, goBack: () => setSubScreen(null), popToTop: () => setSubScreen(null) }}
          route={{ params: {} }}
        />
      </View>
    );
  }

  return (
    <AdminPanel
      navigation={{ navigate: (name: string) => setSubScreen(name), goBack: () => setSubScreen(null), popToTop: () => setSubScreen(null) }}
    />
  );
}

function TellerSubmissionsWithNav({ navigation: tabNav }: any) {
  const [subScreen, setSubScreen] = React.useState<{ name: string; params?: any } | null>(null);
  const { theme } = useTheme();

  React.useEffect(() => {
    const unsubscribe = tabNav.addListener('tabPress', (e: any) => {
      if (subScreen) {
        e.preventDefault();
        setSubScreen(null);
      }
    });
    return unsubscribe;
  }, [tabNav, subScreen]);

  const subHeaderStyle = [
    styles.subHeader,
    { backgroundColor: theme.surfaceColor, borderBottomWidth: 1, borderBottomColor: theme.borderColor },
    Platform.OS === 'web' ? { boxShadow: theme.isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)' } as any : {},
  ];

  if (subScreen?.name === 'FormDetail') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
        <View style={subHeaderStyle}>
          <TouchableOpacity onPress={() => setSubScreen(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={theme.accentColor} />
            <Text style={[styles.backText, { color: theme.accentColor }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.subHeaderTitle, { color: theme.textPrimary }]}>Form Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <FormDetailScreen
          navigation={{ navigate: (name: string, params?: any) => setSubScreen({ name, params }), goBack: () => setSubScreen(null), popToTop: () => setSubScreen(null) }}
          route={{ params: subScreen.params }}
        />
      </View>
    );
  }

  return (
    <TellerSubmissionsScreen
      navigation={{ navigate: (name: string, params?: any) => setSubScreen({ name, params }), goBack: () => setSubScreen(null), popToTop: () => setSubScreen(null) }}
    />
  );
}

function DashboardWithNav({ navigation: tabNav }: any) {
  const [subScreen, setSubScreen] = React.useState<{ name: string; params?: any } | null>(null);
  const { theme } = useTheme();

  // Reset to dashboard when the tab is pressed while already active
  React.useEffect(() => {
    const unsubscribe = tabNav.addListener('tabPress', (e: any) => {
      if (subScreen) {
        e.preventDefault();
        setSubScreen(null);
      }
    });
    return unsubscribe;
  }, [tabNav, subScreen]);

  const subHeaderStyle = [
    styles.subHeader,
    { backgroundColor: theme.surfaceColor, borderBottomWidth: 1, borderBottomColor: theme.borderColor },
    Platform.OS === 'web' ? { boxShadow: theme.isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)' } as any : {},
  ];

  if (subScreen?.name === 'FormEntry') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
        <View style={subHeaderStyle}>
          <TouchableOpacity onPress={() => setSubScreen(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={theme.accentColor} />
            <Text style={[styles.backText, { color: theme.accentColor }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.subHeaderTitle, { color: theme.textPrimary }]}>Fill Form</Text>
          <View style={{ width: 60 }} />
        </View>
        <FormEntryScreen
          navigation={{ navigate: (name: string, params?: any) => setSubScreen({ name, params }), goBack: () => setSubScreen(null), popToTop: () => setSubScreen(null) }}
          route={{ params: subScreen.params }}
        />
      </View>
    );
  }

  if (subScreen?.name === 'CustomerReview') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
        <View style={subHeaderStyle}>
          <TouchableOpacity onPress={() => setSubScreen(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={theme.accentColor} />
            <Text style={[styles.backText, { color: theme.accentColor }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.subHeaderTitle, { color: theme.textPrimary }]}>Customer Review</Text>
          <View style={{ width: 60 }} />
        </View>
        <CustomerReviewScreen
          navigation={{ navigate: (name: string, params?: any) => setSubScreen({ name, params }), goBack: () => setSubScreen(null), popToTop: () => setSubScreen(null) }}
          route={{ params: subScreen.params }}
        />
      </View>
    );
  }

  if (subScreen?.name === 'WorkflowConfig') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
        <View style={subHeaderStyle}>
          <TouchableOpacity onPress={() => setSubScreen(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={theme.accentColor} />
            <Text style={[styles.backText, { color: theme.accentColor }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.subHeaderTitle, { color: theme.textPrimary }]}>Workflow Rules</Text>
          <View style={{ width: 60 }} />
        </View>
        <WorkflowConfigScreen
          navigation={{ navigate: (name: string, params?: any) => setSubScreen({ name, params }), goBack: () => setSubScreen(null), popToTop: () => setSubScreen(null) }}
          route={{ params: subScreen.params }}
        />
      </View>
    );
  }

  if (subScreen?.name === 'FormDetail') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
        <View style={subHeaderStyle}>
          <TouchableOpacity onPress={() => setSubScreen(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={theme.accentColor} />
            <Text style={[styles.backText, { color: theme.accentColor }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.subHeaderTitle, { color: theme.textPrimary }]}>Form Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <FormDetailScreen
          navigation={{ navigate: (name: string, params?: any) => setSubScreen({ name, params }), goBack: () => setSubScreen(null), popToTop: () => setSubScreen(null) }}
          route={{ params: subScreen.params }}
        />
      </View>
    );
  }

  return (
    <DashboardScreen
      navigation={{ navigate: (name: string, params?: any) => setSubScreen({ name, params }), goBack: () => setSubScreen(null), popToTop: () => setSubScreen(null) }}
      route={{ params: {} }}
    />
  );
}

export default function AppNavigator() {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={{ minHeight: Platform.OS === 'web' ? '100vh' as any : undefined, flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.backgroundColor }}>
        <ActivityIndicator size="large" color={theme.accentColor} />
        <Text style={{ marginTop: 16, color: theme.textSecondary, fontSize: 14 }}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ minHeight: Platform.OS === 'web' ? '100vh' as any : undefined, flex: 1 }}>
        <LoginScreen />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'web' ? 14 : 50, paddingBottom: 14, paddingHorizontal: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 80 },
  backText: { fontSize: 14, fontWeight: '600' },
  subHeaderTitle: { fontSize: 17, fontWeight: '700' },
});
