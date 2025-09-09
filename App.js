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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- Navigators (No Changes Here) ---
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
  // --- THIS IS THE FIX ---
  // We rename the loading state to be more specific and add an `appReady` state.
  const [authChecked, setAuthChecked] = useState(false);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
        if (authenticatedUser) {
            await authenticatedUser.getIdToken(true); 
            const userDoc = await getDoc(doc(db, 'users', authenticatedUser.uid));
            
            setUserData(userDoc.exists() ? userDoc.data() : {}); // Use empty object if no doc
            setUser(authenticatedUser);
        } else {
            setUser(null);
            setUserData(null);
        }
        // --- THIS IS THE FIX ---
        // We now explicitly control when the app is "ready" to be shown.
        setAuthChecked(true);
        setAppReady(true);
    });
    return unsubscribe;
  }, []);

  // --- THIS IS THE FIX ---
  // The app will now show a loading indicator until it is fully ready.
  if (!appReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
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