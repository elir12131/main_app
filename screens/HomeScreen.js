import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useSubAccount } from '../context/temp_context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const HomeScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [saleMessage, setSaleMessage] = useState('');
  const [featuredItems, setFeaturedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { activeSubAccount, setActiveSubAccount } = useSubAccount();

  const fetchData = async () => {
    setLoading(true);
    if (auth.currentUser) {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        const defaultData = { email: auth.currentUser.email, username: auth.currentUser.email.split('@')[0], isParentAccount: false };
        await setDoc(userDocRef, defaultData);
        setUserData(defaultData);
      }
    }
    try {
      const settingsDocRef = doc(db, 'settings', 'global');
      const settingsDoc = await getDoc(settingsDocRef);
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setSaleMessage(data.saleMessage || '');
        setFeaturedItems(data.featuredSaleItems || []);
      } else {
        setSaleMessage('');
        setFeaturedItems([]);
      }
    } catch (error) { console.error("Could not fetch sale message:", error); }
    setLoading(false);
  };

  useFocusEffect(React.useCallback(() => { setActiveSubAccount(null); fetchData(); }, []));

  const handleSalePress = () => { if (featuredItems.length > 0) { navigation.navigate('Order', { prefillCart: featuredItems }); } };

  if (loading) { return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>; }

  if (userData?.isParentAccount && !activeSubAccount) {
    const subAccounts = userData.subAccounts || [];
    return (
      <View style={styles.container}>
        <Text style={styles.welcomeText}>Select a Customer</Text>
        <Text style={styles.emailText}>Logged in as {userData.username}</Text>
        <TouchableOpacity 
          style={styles.pickerButton} 
          onPress={() => navigation.navigate('SubAccountPicker', { subAccounts })}
        >
          <Text style={styles.pickerButtonText}>Search and Select Customer</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.continueButton} 
          onPress={() => setActiveSubAccount(userData.username || 'Main Account')}
        >
          <Text style={styles.continueButtonText}>Order for Main Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {featuredItems.length > 0 && (
        <TouchableOpacity style={styles.saleBox} onPress={handleSalePress}>
          <View style={styles.saleHeader}>
            <Ionicons name="pricetag" size={24} color="#2E7D32" />
            <Text style={styles.saleTitle}>{saleMessage || 'Featured Items'}</Text>
          </View>
          <View style={styles.saleItemsContainer}>
            {featuredItems.map(item => (<Text key={item.id} style={styles.saleItemText}>• {item.name}</Text>))}
          </View>
          <Text style={styles.saleActionText}>Tap to add all items to cart!</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.welcomeText}>Welcome, {userData?.username || auth.currentUser.email}</Text>
      {activeSubAccount && <Text style={styles.emailText}>Using: {activeSubAccount}</Text>}
      <TouchableOpacity onPress={() => navigation.navigate('Order')} style={styles.button}>
        <Text style={styles.buttonText}>CREATE NEW ORDER</Text>
      </TouchableOpacity>
    </View>
  );
};
export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  welcomeText: { fontSize: 32, fontWeight: 'bold', color: '#1D1D1F' },
  emailText: { fontSize: 16, color: '#8A8A8E', marginBottom: 40, marginTop: 5, textAlign: 'center' },
  pickerButton: { width: '100%', backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center' },
  pickerButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  continueButton: { marginTop: 15 },
  continueButtonText: { color: '#007AFF', fontSize: 16 },
  button: { width: '100%', backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  saleBox: { width: '100%', backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: '#C8E6C9', borderRadius: 12, padding: 15, marginBottom: 30 },
  saleHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#A5D6A7', paddingBottom: 10, marginBottom: 10 },
  saleTitle: { fontSize: 18, fontWeight: '600', color: '#1B5E20', marginLeft: 10 },
  saleItemsContainer: { marginBottom: 10 },
  saleItemText: { fontSize: 16, color: '#388E3C', paddingVertical: 3 },
  saleActionText: { fontSize: 14, fontWeight: 'bold', color: '#2E7D32', textAlign: 'center', marginTop: 5 },
});