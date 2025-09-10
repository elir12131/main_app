import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useSubAccount } from '../context/temp_context';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Button, Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
// --- MODIFICATION 1: Import LinearGradient ---
import { LinearGradient } from 'expo-linear-gradient';


const HomeScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [saleMessage, setSaleMessage] = useState('');
  const [featuredItems, setFeaturedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { activeSubAccount, setActiveSubAccount } = useSubAccount();

  const fetchData = async () => {
    // ... This function's logic remains the same ...
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
      }
    } catch (error) { console.error("Could not fetch sale message:", error); }
    setLoading(false);
  };

  useFocusEffect(React.useCallback(() => { setActiveSubAccount(null); fetchData(); }, []));

  const handleSalePress = () => { if (featuredItems.length > 0) { navigation.navigate('Order', { prefillCart: featuredItems }); } };

  if (loading) { return <View style={styles.centered}><ActivityIndicator size="large" /></View>; }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineMedium" style={styles.welcomeText}>
        Welcome, {userData?.username || auth.currentUser.email}
      </Text>
      {activeSubAccount && (
        <Text variant="titleMedium" style={styles.subAccountText}>
          Ordering for: {activeSubAccount}
        </Text>
      )}

      {/* --- MODIFICATION 2: The entire sale section has been redesigned --- */}
      {featuredItems.length > 0 && (
        <TouchableOpacity onPress={handleSalePress} style={styles.saleContainer}>
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']} // A trendy green gradient
            style={styles.gradient}
          >
            <View style={styles.saleHeader}>
                <Ionicons name="sparkles" size={28} color="white" />
                <Text variant="headlineSmall" style={styles.saleTitle}>{saleMessage || 'Featured Items'}</Text>
            </View>
            <View style={styles.saleItemsList}>
                {featuredItems.map(item => (
                    <View key={item.id} style={styles.saleItem}>
                        <Ionicons name="checkmark-circle-outline" size={22} color="#C8E6C9" />
                        <Text style={styles.saleItemText}>{item.name}</Text>
                    </View>
                ))}
            </View>
            <View style={styles.saleFooter}>
                <Text style={styles.saleActionText}>Tap to add to cart</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      <Card style={styles.card} mode="outlined">
        <Card.Content style={styles.cardContent}>
            <Ionicons name="add-circle-outline" size={48} color="#007AFF" />
            <Text variant="titleMedium" style={styles.cardTitle}>Ready to Order?</Text>
            <Button 
                icon="arrow-right"
                mode="contained" 
                onPress={() => navigation.navigate('Order')}
                style={{marginTop: 15}}
            >
                Create New Order
            </Button>
        </Card.Content>
      </Card>
      {/* --- MODIFICATION: Add the new AI Assistant card here --- */}
            <Card style={styles.card} mode="outlined" onPress={() => navigation.navigate('Chat')}>
                <Card.Content style={styles.cardContent}>
                    <Ionicons name="chatbubbles-outline" size={48} color="#5856D6" />
                    <Text variant="titleMedium" style={styles.cardTitle}>AI Assistant</Text>
                    <Text variant="bodySmall" style={{textAlign: 'center', marginTop: 5}}>Generate reports and get help with your orders.</Text>
                </Card.Content>
            </Card>

  


    </ScrollView>
  );
};
export default HomeScreen;

// --- MODIFICATION 3: Styles are updated for the new gradient card ---
const styles = StyleSheet.create({
  container: { backgroundColor: '#F5F5F7', padding: 15, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  welcomeText: { marginBottom: 5, fontWeight: 'bold' },
  subAccountText: { color: 'gray', marginBottom: 20 },
  card: { marginBottom: 20 },
  cardContent: { alignItems: 'center', paddingVertical: 20 },
  cardTitle: { marginTop: 10 },
  // New styles for the sale section
  saleContainer: {
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  gradient: {
    borderRadius: 16,
    padding: 20,
  },
  saleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    borderBottomWidth: 1,
    paddingBottom: 15,
    marginBottom: 15,
  },
  saleTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  saleItemsList: {
    marginBottom: 15,
  },
  saleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  saleItemText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 10,
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 5,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    borderTopWidth: 1,
  },
  saleActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});