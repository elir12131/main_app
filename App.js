import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { PaperProvider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { SubAccountProvider } from './context/temp_context';
// --- MODIFICATION 1: Import SafeAreaProvider and use SafeAreaView/hook from the same library ---
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from './theme';

// --- Screen Imports ---
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import OrderScreen from './screens/OrderScreen';
import OrderHistoryScreen from './screens/OrderHistoryScreen';
import SettingsScreen from './screens/SettingsScreen';
import AccountScreen from './screens/AccountScreen';
import SupportScreen from './screens/SupportScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import SubAccountPickerScreen from './screens/SubAccountPickerScreen';
import CustomersScreen from './screens/CustomersScreen';
import CustomerDetailScreen from './screens/CustomerDetailScreen';
import TrucksScreen from './screens/TrucksScreen';
import TruckDetailScreen from './screens/TruckDetailScreen';
import ChatScreen from './screens/ChatScreen';

const Stack = createNativeStackNavigator();
const Tab = createMaterialTopTabNavigator();

function SuperUserTabs() {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Tab.Navigator
        tabBarPosition="bottom"
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          tabBarShowIcon: true,
          tabBarIndicatorStyle: { backgroundColor: '#007AFF', height: 3 },
          tabBarStyle: {
            height: 50 + insets.bottom,
            paddingBottom: insets.bottom,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            marginTop: -4,
          },
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} /> }} />
        <Tab.Screen name="Orders" component={OrderHistoryScreen} options={{ title: "History", tabBarIcon: ({ color }) => <Ionicons name="file-tray-full" size={24} color={color} /> }}/>
        <Tab.Screen name="Customers" component={CustomersScreen} options={{ tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} /> }} />
        <Tab.Screen name="Trucks" component={TrucksScreen} options={{ tabBarIcon: ({ color }) => <Ionicons name="bus" size={24} color={color} /> }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} /> }} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

function MainAppTabs() {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Tab.Navigator
        tabBarPosition="bottom"
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          tabBarShowIcon: true,
          tabBarIndicatorStyle: { backgroundColor: '#007AFF', height: 3 },
          tabBarStyle: {
            height: 50 + insets.bottom,
            paddingBottom: insets.bottom,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            marginTop: -4,
          },
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} /> }} />
        <Tab.Screen name="Orders" component={OrderHistoryScreen} options={{ title: "History", tabBarIcon: ({ color }) => <Ionicons name="file-tray-full" size={24} color={color} /> }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} /> }} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}


export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
        if (authenticatedUser) {
            await authenticatedUser.getIdToken(true); 
            const userDoc = await getDoc(doc(db, 'users', authenticatedUser.uid));
            
            setUserData(userDoc.exists() ? userDoc.data() : {});
            setUser(authenticatedUser);
        } else {
            setUser(null);
            setUserData(null);
        }
        setAppReady(true);
    });
    return unsubscribe;
  }, []);

  if (!appReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    // --- MODIFICATION 2: Wrap the ENTIRE app in SafeAreaProvider ---
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
          <SubAccountProvider>
              <NavigationContainer>
                  <Stack.Navigator screenOptions={{ headerShown: false }}>
                  {user ? (
                      <>
                      <Stack.Screen name="MainApp" component={userData?.isSuperUser ? SuperUserTabs : MainAppTabs} />
                      <Stack.Screen name="Order" component={OrderScreen} options={{ presentation: 'modal', title: 'Create New Order', headerShown: true }} />
                      <Stack.Screen name="Account" component={AccountScreen} options={{ headerShown: true }} />
                      <Stack.Screen name="Support" component={SupportScreen} options={{ headerShown: true }} />
                      <Stack.Screen name="SubAccountPicker" component={SubAccountPickerScreen} options={{ title: "Select Customer", headerShown: true }}/>
                      <Stack.Screen name="TruckDetail" component={TruckDetailScreen} options={{ headerShown: true }} />
                      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Manage Customer', headerShown: true }} />
                      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'AI Assistant', headerShown: true }} />
                      </>
                  ) : (
                      <>
                      <Stack.Screen name="Login" component={LoginScreen} />
                      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset Password', headerShown: true }} />
                      <Stack.Screen name="Support" component={SupportScreen} options={{ headerShown: true }} />
                      </>
                  )}
                  </Stack.Navigator>
              </NavigationContainer>
          </SubAccountProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    safeArea: {
        flex: 1,
        backgroundColor: '#F5F5F7',
    }
});