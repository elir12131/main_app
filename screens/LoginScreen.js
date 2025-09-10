import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
// --- MODIFICATION 1: Import new components from React Native Paper ---
import { Button, Text, TextInput } from 'react-native-paper';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // For loading indicator on button

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
        Alert.alert("Login Failed", "Please enter both email and password.");
        return;
    }
    setLoading(true);
    signInWithEmailAndPassword(auth, email.trim(), password)
      .catch(error => {
          let friendlyMessage = "The email or password you entered is incorrect.";
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            friendlyMessage = "The email or password you entered is incorrect.";
          }
          Alert.alert('Login Error', friendlyMessage);
        })
      .finally(() => {
          setLoading(false);
      });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.mainContent}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />
          <Text variant="headlineLarge" style={styles.title}>Poppy's Produce</Text>
          
          {/* --- MODIFICATION 2: Replaced default TextInput with Paper's version --- */}
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            mode="outlined"
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
            mode="outlined"
          />

          {/* --- MODIFICATION 3: Replaced TouchableOpacity with Paper's Button --- */}
          <Button 
            mode="contained" 
            onPress={handleLogin} 
            style={styles.button}
            loading={loading}
            disabled={loading}
            labelStyle={styles.buttonText}
          >
            Access
          </Button>

        </View>
        <View style={styles.footerContainer}>
          <Button onPress={() => navigation.navigate('ForgotPassword')}>Forgot Password?</Button>
          <Button onPress={() => navigation.navigate('Support')}>Contact Support</Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

// --- MODIFICATION 4: Updated styles for the new components ---
const styles = StyleSheet.create({
  keyboardAvoidingContainer: { flex: 1, backgroundColor: '#F5F5F7' },
  container: { flexGrow: 1, justifyContent: 'space-between', padding: 20 },
  mainContent: { alignItems: 'center', justifyContent: 'center', paddingTop: '15%' },
  logo: { width: 150, height: 150, resizeMode: 'contain', marginBottom: 20 },
  title: { color: '#2E7D32', marginBottom: 50, fontWeight: 'bold' },
  input: { width: '100%', marginBottom: 15 },
  button: { width: '100%', paddingVertical: 8, marginTop: 20, borderRadius: 10 },
  buttonText: { fontSize: 16, fontWeight: 'bold' },
  footerContainer: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 20, marginTop: 40 },
});