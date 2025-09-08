import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { SubAccountProvider } from './context/temp_context';

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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function SuperUserTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Orders') iconName = focused ? 'file-tray-full' : 'file-tray-full-outline';
          else if (route.name === 'Customers') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Trucks') iconName = focused ? 'bus' : 'bus-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Orders" component={OrderHistoryScreen} options={{ title: "Order History" }}/>
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Trucks" component={TrucksScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function MainAppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Orders') iconName = focused ? 'file-tray-full' : 'file-tray-full-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Orders" component={OrderHistoryScreen} options={{ title: "Order History" }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loadingAuthState, setLoadingAuthState] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
        if (authenticatedUser) {
            // Force refresh the token to get the latest custom claims
            await authenticatedUser.getIdToken(true); 
            const idTokenResult = await authenticatedUser.getIdTokenResult();
            
            // --- DIAGNOSTIC LOG ---
            console.log("\n\n--- TOKEN CLAIMS ---");
            console.log("This is what your security rules and functions see.");
            console.log("Is isSuperUser: true present? If not, the claim was not set correctly.");
            console.log(idTokenResult.claims);
            console.log("--- END TOKEN CLAIMS ---\n\n");

            const userDoc = await getDoc(doc(db, 'users', authenticatedUser.uid));
            setUserData(userDoc.exists() ? userDoc.data() : null);
            setUser(authenticatedUser);
        } else {
            setUser(null);
            setUserData(null);
        }
        setLoadingAuthState(false);
    });
    return unsubscribe;
  }, []);

  if (loadingAuthState) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SubAccountProvider>
      <NavigationContainer>
        <Stack.Navigator>
          {user ? (
            <>
              <Stack.Screen name="MainApp" component={userData?.isSuperUser ? SuperUserTabs : MainAppTabs} options={{ headerShown: false }} />
              <Stack.Screen name="Order" component={OrderScreen} options={{ presentation: 'modal', title: 'Create New Order' }} />
              <Stack.Screen name="Account" component={AccountScreen} />
              <Stack.Screen name="Support" component={SupportScreen} />
              <Stack.Screen name="SubAccountPicker" component={SubAccountPickerScreen} options={{ title: "Select Customer" }}/>
              <Stack.Screen name="TruckDetail" component={TruckDetailScreen} />
              <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Manage Customer' }} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset Password' }} />
              <Stack.Screen name="Support" component={SupportScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SubAccountProvider>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});