import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen = () => {
    const navigation = useNavigation();

    const handleSignOut = () => {
        auth.signOut().then(() => {
            navigation.replace("Login");
        }).catch(error => alert(error.message));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Settings</Text>

            <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate('Account')}>
                <Ionicons name="person-circle-outline" size={24} color="#007AFF" />
                <Text style={styles.optionText}>Account</Text>
                <Ionicons name="chevron-forward" size={22} color="#8A8A8E" />
            </TouchableOpacity>

            {/* THEME BUTTON HAS BEEN REMOVED */}

            <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate('Support')}>
                <Ionicons name="help-buoy-outline" size={24} color="#007AFF" />
                <Text style={styles.optionText}>Support</Text>
                <Ionicons name="chevron-forward" size={22} color="#8A8A8E" />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
                <Text style={styles.logoutButtonText}>LOGOUT</Text>
            </TouchableOpacity>
        </View>
    );
};

export default SettingsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F7',
        paddingTop: 60,
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#1D1D1F',
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F7',
    },
    optionText: {
        flex: 1,
        fontSize: 18,
        marginLeft: 15,
    },
    logoutButton: {
        margin: 20,
        backgroundColor: '#FF3B30',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    logoutButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
});