import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
        Alert.alert("Login Failed", "Please enter both email and password.");
        return;
    }
    signInWithEmailAndPassword(auth, email.trim(), password)
      .then(userCredentials => {
        // --- THIS IS THE FIX ---
        // We no longer need to navigate here. The onAuthStateChanged listener in App.js
        // will automatically handle showing the correct screens. This prevents the crash.
      })
      .catch(error => {
          let friendlyMessage = "The email or password you entered is incorrect.";
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            friendlyMessage = "The email or password you entered is incorrect.";
          }
          Alert.alert('Login Error', friendlyMessage);
        });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.mainContent}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />
          <Text style={styles.title}>Poppy's Produce</Text>
          <TextInput placeholder="Email" placeholderTextColor="#8A8A8E" value={email} onChangeText={text => setEmail(text)} style={styles.input} autoCapitalize="none" keyboardType="email-address" />
          <TextInput placeholder="Password" placeholderTextColor="#8A8A8E" value={password} onChangeText={text => setPassword(text)} style={styles.input} secureTextEntry />
          <TouchableOpacity onPress={handleLogin} style={styles.button}><Text style={styles.buttonText}>ACCESS</Text></TouchableOpacity>
        </View>
        <View style={styles.footerContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}><Text style={styles.footerText}>Forgot Password?</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Support')}><Text style={styles.footerText}>Contact Support</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  keyboardAvoidingContainer: { flex: 1, backgroundColor: '#F5F5F7' },
  container: { flexGrow: 1, justifyContent: 'space-between', padding: 20 },
  mainContent: { alignItems: 'center', justifyContent: 'center', paddingTop: '15%' },
  logo: { width: 150, height: 150, resizeMode: 'contain', marginBottom: 20 },
  title: { fontSize: 40, fontWeight: 'bold', color: '#2E7D32', marginBottom: 50 },
  input: { width: '100%', backgroundColor: '#FFFFFF', color: '#1D1D1F', borderRadius: 10, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#E5E5EA', fontSize: 16 },
  button: { width: '100%', backgroundColor: '#2E7D32', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  footerContainer: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 20, marginTop: 40 },
  footerText: { color: '#2E7D32', fontSize: 16, fontWeight: '500' },
});