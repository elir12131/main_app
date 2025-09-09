import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, LayoutAnimation, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CustomerCard = ({ customerIdentifier, items }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    return (
        <View style={styles.customerSection}>
            <TouchableOpacity style={styles.customerHeader} onPress={toggleExpand}>
                <View style={styles.customerInfo}>
                    <Text style={styles.customerEmail}>{customerIdentifier}</Text>
                    <Text style={styles.itemCount}>{totalItems} items</Text>
                </View>
                <Ionicons name={isExpanded ? "chevron-up-circle" : "chevron-down-circle"} size={26} color="#8A8A8E" />
            </TouchableOpacity>
            {isExpanded && (
                <View style={styles.itemsContainer}>
                    {items.map((product, index) => (
                        <View key={`${product.id}-${index}`} style={styles.productRow}>
                            <Text style={styles.productQuantity}>{product.quantity}x</Text>
                            <Text style={styles.productName}>{product.name}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

const TruckDetailScreen = ({ route, navigation }) => {
  const { truck } = route.params;

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: `Pick List for Truck ${truck.truckNumber}` });
  }, [navigation, truck.truckNumber]);

  const itemsByCustomer = new Map();
  truck.orders.forEach(order => {
    const customerIdentifier = order.subAccountName || order.username;
    if (!itemsByCustomer.has(customerIdentifier)) {
      itemsByCustomer.set(customerIdentifier, []);
    }
    itemsByCustomer.get(customerIdentifier).push(...order.items);
  });

  return (
    <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={Array.from(itemsByCustomer.entries())}
          renderItem={({ item: [customerIdentifier, items] }) => <CustomerCard customerIdentifier={customerIdentifier} items={items} />}
          keyExtractor={([customerIdentifier]) => customerIdentifier}
          contentContainerStyle={styles.container}
        />
    </SafeAreaView>
  );
};

export default TruckDetailScreen;

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F5F5F7' },
    container: { padding: 15 },
    customerSection: { backgroundColor: 'white', borderRadius: 12, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E5EA', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    customerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15 },
    customerInfo: { flex: 1 },
    customerEmail: { fontSize: 16, fontWeight: 'bold', color: '#1D1D1F' },
    itemCount: { fontSize: 14, color: '#8A8A8E', marginTop: 2 },
    itemsContainer: { borderTopWidth: 1, borderTopColor: '#E5E5EA', paddingHorizontal: 15, paddingBottom: 10 },
    productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F7' },
    productQuantity: { fontSize: 16, fontWeight: '600', color: '#007AFF', marginRight: 15, minWidth: 40 },
    productName: { fontSize: 16, color: '#3C3C43', flex: 1 },
});