import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

const ForgotPasswordScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');

    const handlePasswordReset = () => {
        if (email.trim() === '') {
            Alert.alert("Email Required", "Please enter your email address to reset your password.");
            return;
        }

        sendPasswordResetEmail(auth, email)
            .then(() => {
                Alert.alert(
                    "Check Your Email",
                    "A password reset link has been sent to your email address. Please follow the instructions to reset your password."
                );
                navigation.goBack();
            })
            .catch(error => {
                let friendlyMessage = "An error occurred. Please try again.";
                if (error.code === 'auth/user-not-found') {
                    friendlyMessage = "No account found with this email address. Please check your spelling.";
                }
                Alert.alert("Reset Failed", friendlyMessage);
            });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.instructions}>
                Enter the email address associated with your account, and we'll send you a link to reset your password.
            </Text>
            <TextInput
                placeholder="Email"
                placeholderTextColor="#8A8A8E"
                value={email}
                onChangeText={text => setEmail(text.trim())}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TouchableOpacity onPress={handlePasswordReset} style={styles.button}>
                <Text style={styles.buttonText}>SEND RESET LINK</Text>
            </TouchableOpacity>
        </View>
    );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F7',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1D1D1F',
        marginBottom: 15,
    },
    instructions: {
        fontSize: 16,
        color: '#8A8A8E',
        textAlign: 'center',
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    input: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        color: '#1D1D1F',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    button: {
        width: '100%',
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
});