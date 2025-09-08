import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SupportScreen = () => {

    const handleCall = () => {
        // This function opens the phone's dialer with the number pre-filled
        Linking.openURL('tel:9292165491');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Support</Text>
            <Ionicons name="call-outline" size={80} color="#007AFF" style={styles.icon} />
            <Text style={styles.prompt}>For immediate assistance, please call us directly.</Text>

            <TouchableOpacity style={styles.callButton} onPress={handleCall}>
                <Text style={styles.callButtonText}>Tap to Call Support</Text>
            </TouchableOpacity>
        </View>
    );
};
export default SupportScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F7',
        padding: 20,
        justifyContent: 'center', // Center content vertically
        alignItems: 'center',     // Center content horizontally
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#1D1D1F',
        marginBottom: 30,
    },
    icon: {
        marginBottom: 20,
    },
    prompt: {
        fontSize: 18,
        color: '#8A8A8E',
        textAlign: 'center',
        marginBottom: 40,
        maxWidth: '80%',
    },
    callButton: {
        backgroundColor: '#34C759',
        paddingVertical: 20,
        paddingHorizontal: 40,
        borderRadius: 15,
        alignItems: 'center',
        flexDirection: 'row', // To align icon and text if needed later
    },
    callButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 20,
    },
});