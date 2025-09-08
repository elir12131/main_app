import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const TrucksScreen = () => {
  const [truckData, setTruckData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const fetchData = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) { 
        setLoading(false); 
        return; 
      }

      // 1. Get all sub-accounts owned by the Super User to know their names and trucks
      const subAccountsQuery = query(collection(db, 'subAccounts'), where('parentId', '==', currentUser.uid));
      const subAccountsSnapshot = await getDocs(subAccountsQuery);
      
      const truckToSubAccountMap = new Map();
      const allMySubAccountNames = [];
      subAccountsSnapshot.forEach(doc => {
          const data = doc.data();
          allMySubAccountNames.push(data.name);
          if (data.truckNumber) {
              if (!truckToSubAccountMap.has(data.truckNumber)) {
                  truckToSubAccountMap.set(data.truckNumber, []);
              }
              truckToSubAccountMap.get(data.truckNumber).push(data.name);
          }
      });

      // 2. Fetch only the pending orders that belong to this Super User's sub-accounts
      let ordersQuery;
      if (allMySubAccountNames.length > 0) {
        ordersQuery = query(
            collection(db, 'orders'), 
            where('status', '==', 'Pending'),
            where('subAccountName', 'in', allMySubAccountNames)
        );
      } else {
        // If the user has no sub-accounts, don't fetch any orders.
        setTruckData([]);
        setLoading(false);
        return;
      }
      
      const ordersSnapshot = await getDocs(ordersQuery);
      
      const trucks = new Map();
      ordersSnapshot.forEach(doc => {
        const order = { id: doc.id, ...doc.data() };
        // We no longer need the userMap, as all orders are known to be for the Super User's customers
        order.username = order.subAccountName; 

        let truckNumber = 'Unassigned';
        for (const [tn, subAccountNames] of truckToSubAccountMap.entries()) {
            if (subAccountNames.includes(order.subAccountName)) {
                truckNumber = tn;
                break;
            }
        }
        
        if (!trucks.has(truckNumber)) {
          trucks.set(truckNumber, { totalItems: 0, orders: [] });
        }
        
        const truck = trucks.get(truckNumber);
        truck.orders.push(order);
        truck.totalItems += order.items.reduce((sum, item) => sum + item.quantity, 0);
      });

      const formattedTrucks = Array.from(trucks, ([truckNumber, data]) => ({ truckNumber, ...data }))
        .sort((a, b) => a.truckNumber.localeCompare(b.truckNumber));
      
      setTruckData(formattedTrucks);
    } catch (error) { 
      console.error("Error fetching truck data:", error); 
      Alert.alert("Permissions Error", "Could not fetch truck data. Please log out and log back in to refresh your permissions.");
    } 
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const renderTruckItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('TruckDetail', { truck: item })}>
      <View style={styles.cardHeader}>
        <Ionicons name="bus-outline" size={24} color="#007AFF" />
        <Text style={styles.truckNumber}>Truck {item.truckNumber}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.infoText}>Total Items: <Text style={styles.boldText}>{item.totalItems}</Text></Text>
        <Text style={styles.infoText}>Total Orders: <Text style={styles.boldText}>{item.orders.length}</Text></Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" /></View>;

  return (
    <FlatList
      data={truckData}
      renderItem={renderTruckItem}
      keyExtractor={item => item.truckNumber}
      contentContainerStyle={styles.container}
      ListEmptyComponent={<View style={styles.centered}><Text>No pending orders found for your customers.</Text></View>}
    />
  );
};
export default TrucksScreen;

const styles = StyleSheet.create({
    container: { padding: 10, backgroundColor: '#F5F5F7' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
    card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginVertical: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E5EA', paddingBottom: 10 },
    truckNumber: { fontSize: 20, fontWeight: 'bold', marginLeft: 10, color: '#1D1D1F' },
    cardBody: { paddingTop: 10 },
    infoText: { fontSize: 16, color: '#3C3C43', marginBottom: 5 },
    boldText: { fontWeight: '600' },
});