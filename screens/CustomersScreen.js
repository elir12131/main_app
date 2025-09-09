import React, { useState, useCallback, useEffect } from 'react'; // <-- THE FIX IS HERE
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, SafeAreaView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';

const CustomersScreen = ({ navigation }) => {
    const [subAccounts, setSubAccounts] = useState([]);
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    const [isModalVisible, setModalVisible] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const fetchSubAccounts = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'subAccounts'), where("parentId", "==", auth.currentUser.uid), orderBy("name"));
            const snapshot = await getDocs(q);
            const accountsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSubAccounts(accountsList);
            setFilteredAccounts(accountsList);
        } catch (error) { 
            console.error("Error fetching sub-accounts: ", error);
            Alert.alert("Error", "Could not load your customers."); 
        }
        finally { setLoading(false); }
    };

    useFocusEffect(useCallback(() => {
        fetchSubAccounts();
    }, []));

    useEffect(() => {
        if(searchQuery.trim() === '') {
            setFilteredAccounts(subAccounts);
        } else {
            setFilteredAccounts(
                subAccounts.filter(acc => 
                    acc.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }
    }, [searchQuery, subAccounts]);

    const handleCreateCustomer = async () => {
        if (newCustomerName.trim() === '') {
            return Alert.alert("Invalid Name", "Customer name cannot be empty.");
        }
        setIsCreating(true);
        try {
            const createFunc = httpsCallable(getFunctions(), 'createSubAccount');
            const result = await createFunc({ accountName: newCustomerName });
            Alert.alert("Success", result.data.message);
            setModalVisible(false);
            setNewCustomerName('');
            fetchSubAccounts();
        } catch (error) {
            Alert.alert("Creation Failed", error.message);
        } finally {
            setIsCreating(false);
        }
    };

    if (loading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TextInput
                    style={styles.searchBar}
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>
            <FlatList
                data={filteredAccounts}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.card} 
                        onPress={() => navigation.navigate('CustomerDetail', { subAccount: item })}
                    >
                        <View>
                            <Text style={styles.cardTitle}>{item.name}</Text>
                            <Text style={styles.cardSubtitle}>Truck: {item.truckNumber || 'Not Assigned'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <Text style={styles.emptyText}>No customers found.</Text>
                        <Text style={styles.emptySubtitle}>Tap the '+' button to add one.</Text>
                    </View>
                }
                contentContainerStyle={styles.listContent}
            />
            <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>

            <Modal isVisible={isModalVisible} onBackdropPress={() => setModalVisible(false)}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Add New Customer</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Customer Name (e.g., Main Office)"
                        value={newCustomerName}
                        onChangeText={setNewCustomerName}
                    />
                    <TouchableOpacity style={styles.createButton} onPress={handleCreateCustomer} disabled={isCreating}>
                        {isCreating ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.createButtonText}>Create Customer</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </Modal>
        </SafeAreaView>
    );
};
export default CustomersScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F7' },
    header: { padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
    searchBar: { height: 44, paddingHorizontal: 15, backgroundColor: '#F5F5F7', borderRadius: 10, fontSize: 16 },
    listContent: { paddingBottom: 100 },
    card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F7' },
    cardTitle: { fontSize: 18, fontWeight: '500' },
    cardSubtitle: { fontSize: 14, color: '#8A8A8E', marginTop: 4 },
    centered: { justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
    emptyText: { fontSize: 16, color: '#8A8A8E' },
    emptySubtitle: { fontSize: 14, color: '#C7C7CC', marginTop: 5 },
    addButton: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        backgroundColor: '#007AFF',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalContent: { backgroundColor: 'white', padding: 22, borderRadius: 14 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 15, fontSize: 16 },
    createButton: { backgroundColor: '#34C759', padding: 15, borderRadius: 8, alignItems: 'center', minHeight: 50 },
    createButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});