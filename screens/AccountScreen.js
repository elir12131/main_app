import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { auth, db } from '../firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AccountScreen = () => {
    const [username, setUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const user = auth.currentUser;
    const userDocRef = doc(db, "users", user.uid);

    useEffect(() => {
        const fetchUserData = async () => {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                setUsername(docSnap.data().username || '');
            }
        };
        fetchUserData();
    }, []);

    const handleSaveUsername = async () => {
        if (!username.trim()) {
            Alert.alert("Invalid Username", "Username cannot be empty.");
            return;
        }
        await setDoc(userDocRef, { username: username }, { merge: true });
        Alert.alert("Success", "Username updated successfully.");
    };

    const handleChangePassword = () => {
        if (!currentPassword || !newPassword) {
            Alert.alert("Missing Information", "Please enter both your current and new password.");
            return;
        }
        const credential = EmailAuthProvider.credential(user.email, currentPassword);

        reauthenticateWithCredential(user, credential).then(() => {
            updatePassword(user, newPassword).then(() => {
                Alert.alert("Success", "Your password has been updated.");
                setNewPassword('');
                setCurrentPassword('');
            }).catch((error) => {
                Alert.alert("Error", "Could not update password: " + error.message);
            });
        }).catch((error) => {
            Alert.alert("Authentication Failed", "The current password you entered is incorrect.");
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>My Account</Text>

            <Text style={styles.fieldTitle}>Username</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter your display name"
                value={username}
                onChangeText={setUsername}
            />
            <TouchableOpacity style={styles.button} onPress={handleSaveUsername}>
                <Text style={styles.buttonText}>Save Username</Text>
            </TouchableOpacity>

            <Text style={[styles.fieldTitle, { marginTop: 30 }]}>Change Password</Text>
            <TextInput
                style={styles.input}
                placeholder="Current Password"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
            />
            <TextInput
                style={styles.input}
                placeholder="New Password (at least 6 characters)"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
            />
            <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
                <Text style={styles.buttonText}>Save New Password</Text>
            </TouchableOpacity>
        </View>
    );
};

export default AccountScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F7', padding: 20 },
    title: { fontSize: 34, fontWeight: 'bold', color: '#1D1D1F', marginBottom: 30 },
    fieldTitle: { fontSize: 22, fontWeight: 'bold', color: '#1D1D1F', marginBottom: 15 },
    input: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 15, marginBottom: 10, fontSize: 16 },
    button: { width: '100%', backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 5, marginBottom: 20 },
    buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});