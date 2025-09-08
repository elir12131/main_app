import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView, SafeAreaView } from 'react-native';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { Ionicons } from '@expo/vector-icons';

const CustomerDetailScreen = ({ route, navigation }) => {
    const { subAccount } = route.params;
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [truckNumber, setTruckNumber] = useState(subAccount.truckNumber || '');
    const [restrictedIds, setRestrictedIds] = useState(new Set(subAccount.restrictedProductIds || []));
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        navigation.setOptions({ title: subAccount.name });
        const fetchProducts = async () => {
            setLoading(true);
            const q = query(collection(db, 'products'), orderBy('name'));
            const snapshot = await getDocs(q);
            setAllProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        };
        fetchProducts();
    }, [subAccount]);

    const handleToggleProduct = (productId) => {
        const newSet = new Set(restrictedIds);
        if (newSet.has(productId)) {
            newSet.delete(productId);
        } else {
            newSet.add(productId);
        }
        setRestrictedIds(newSet);
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const updateFunc = httpsCallable(getFunctions(), 'updateSubAccountDetails');
            await updateFunc({
                subAccountId: subAccount.id,
                restrictedProductIds: Array.from(restrictedIds),
                truckNumber: truckNumber
            });
            Alert.alert("Success", `${subAccount.name} has been updated.`, [{
                text: 'OK',
                onPress: () => navigation.goBack()
            }]);
        } catch (error) {
            console.error("ERROR FROM CLOUD FUNCTION:", error);
            Alert.alert("Error", `Could not save changes: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <ActivityIndicator size="large" style={{marginTop: 50}} />;

    return (
        <SafeAreaView style={{flex: 1}}>
            <ScrollView style={styles.container}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Truck Assignment</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Truck Number"
                        value={truckNumber}
                        onChangeText={setTruckNumber}
                        keyboardType="number-pad"
                    />
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Allowed Products</Text>
                    <Text style={styles.sectionSubtitle}>Select products this customer can order. ({restrictedIds.size} of {allProducts.length} selected)</Text>
                    {allProducts.map(product => {
                        const isSelected = restrictedIds.has(product.id);
                        return (
                            <TouchableOpacity key={product.id} style={styles.productRow} onPress={() => handleToggleProduct(product.id)}>
                                <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={24} color={isSelected ? "#34C759" : "#C7C7CC"} />
                                <Text style={styles.productName}>{product.name}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};
export default CustomerDetailScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    section: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
    sectionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
    sectionSubtitle: { fontSize: 14, color: '#8A8A8E', marginBottom: 15 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#F5F5F7' },
    productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    productName: { fontSize: 16, marginLeft: 15, flex: 1 },
    saveButton: { backgroundColor: '#34C759', padding: 15, borderRadius: 10, alignItems: 'center', margin: 20, minHeight: 50 },
    saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});