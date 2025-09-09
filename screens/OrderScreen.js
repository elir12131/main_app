import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, TextInput, ScrollView, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, serverTimestamp, orderBy, query, doc, getDoc, updateDoc, where } from 'firebase/firestore';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import { useSubAccount } from '../context/temp_context';

const OrderScreen = ({ navigation, route }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { activeSubAccount } = useSubAccount();
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [isAddItemModalVisible, setAddItemModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => { setKeyboardVisible(false); setFocusedInput(null); });
    return () => { keyboardDidHideListener.remove(); keyboardDidShowListener.remove(); };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const currentUserData = userDoc.exists() ? userDoc.data() : null;
      setUserData(currentUserData);
      let productsQuery;
      if (activeSubAccount && currentUserData?.isSuperUser) {
        const subAccountsRef = collection(db, 'subAccounts');
        const q = query(subAccountsRef, where("parentId", "==", auth.currentUser.uid), where("name", "==", activeSubAccount));
        const subAccountSnap = await getDocs(q);
        if (!subAccountSnap.empty) {
          const subAccountData = subAccountSnap.docs[0].data();
          if (subAccountData.restrictedProductIds && subAccountData.restrictedProductIds.length > 0) {
            productsQuery = query(collection(db, 'products'), where("__name__", "in", subAccountData.restrictedProductIds), orderBy('name'));
          }
        }
      }
      if (!productsQuery) { productsQuery = query(collection(db, 'products'), orderBy('name')); }
      const querySnapshot = await getDocs(productsQuery);
      const productsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsList);
      setFilteredProducts(productsList);
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Could not load products.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (route.params?.editingOrder) {
      const order = route.params.editingOrder;
      setIsEditing(true);
      setEditingOrderId(order.id);
      setCart(order.items);
      setNotes(order.notes || '');
    } else if (route.params?.prefillCart) {
      setCart(route.params.prefillCart);
    }
    fetchData();
  }, [route.params, activeSubAccount]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const searchTerms = searchQuery.toLowerCase().split(' ').filter(term => term);
      const filtered = products.filter(product => {
        const productName = (product.name || '').toLowerCase();
        return searchTerms.every(term => productName.includes(term));
      });
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);
  
  const addToCart = (product) => {
    setCart(prevCart => {
      const existingProduct = prevCart.find(item => item.id === product.id);
      if (existingProduct) {
        return prevCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (product, change) => {
    setCart(currentCart => {
      const existingProduct = currentCart.find(item => item.id === product.id);
      if (!existingProduct) return currentCart;
      const newQuantity = existingProduct.quantity + change;
      if (newQuantity <= 0) {
        return currentCart.filter(item => item.id !== product.id);
      } else {
        return currentCart.map(item => item.id === product.id ? { ...item, quantity: newQuantity } : item);
      }
    });
  };

  const removeFromCart = (product) => setCart(currentCart => currentCart.filter(item => item.id !== product.id));
  
  const handleSaveOrSubmit = async () => {
    if (cart.length === 0) return Alert.alert("Empty Cart", "Please add items.");
    const isSpecialCustomer = userData?.canBatchSubmitOrders === true;
    const navigateHome = () => navigation.navigate('MainApp', { screen: 'Orders' });
    if (isEditing && editingOrderId) {
      if (!isSpecialCustomer) return Alert.alert("Permission Denied", "You cannot edit orders.");
      try {
        await updateDoc(doc(db, 'orders', editingOrderId), { items: cart, notes: notes });
        Alert.alert("Success", "Unsubmitted order updated!", [{ text: 'OK', onPress: navigateHome }]);
      } catch (error) { Alert.alert("Error", "Could not update order."); }
      return;
    }
    const orderStatus = isSpecialCustomer ? "Unsubmitted" : "Pending";
    const successMessage = isSpecialCustomer ? "Order saved!" : "Order placed successfully!";
    let afterHoursCutoff = 21;
    let isAfterHoursEnabled = true;
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        afterHoursCutoff = data.afterHoursCutoff || 21;
        isAfterHoursEnabled = data.isAfterHoursEnabled !== false;
      }
    } catch (e) { console.log("Could not fetch settings.")}
    const isAfterHoursOrder = isAfterHoursEnabled && (new Date().getHours() >= afterHoursCutoff);
    const saveOrderToFirebase = async () => {
      try {
        await addDoc(collection(db, "orders"), {
          userId: auth.currentUser.uid, userEmail: auth.currentUser.email,
          items: cart, status: orderStatus, createdAt: serverTimestamp(), notes: notes,
          publicOrderId: Math.floor(100000 + Math.random() * 900000).toString(),
          subAccountName: activeSubAccount || null,
          isAfterHours: isAfterHoursOrder,
        });
        Alert.alert("Success", successMessage, [{ text: 'OK', onPress: navigateHome }]);
      } catch (error) { Alert.alert("Error", "Could not place order."); }
    };
    if (isAfterHoursOrder && !isSpecialCustomer) {
      Alert.alert("Order Intake Closed", `Our intake closes at ${afterHoursCutoff}:00.`, [{ text: "OK", onPress: saveOrderToFirebase }]);
    } else {
      await saveOrderToFirebase();
    }
  };
  
  const handleAddSpecialItem = () => {
    if (newItemName.trim() === '') return Alert.alert("Error", "Item name cannot be blank.");
    const specialItem = {
        id: `special_${Date.now()}`,
        name: newItemName.trim(),
        quantity: 1,
        isSpecial: true,
    };
    setCart(currentCart => [...currentCart, specialItem]);
    setNewItemName('');
    setAddItemModalVisible(false);
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity style={styles.productItem} onPress={() => addToCart(item)}>
      <Text style={[styles.productName, item.isNew && styles.newProductText]}>{item.name}</Text>
      {item.isNew && <Ionicons name="star" size={16} color="#FF9500" style={{marginLeft: 10}} />}
    </TouchableOpacity>
  );

  const renderCartItem = (item) => (
    <View key={item.id} style={styles.cartItemRow}>
      <View style={styles.itemNameContainer}>
        <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
        {item.isSpecial && <Text style={styles.specialItemLabel}>(Special)</Text>}
      </View>
      <View style={styles.quantityControls}>
        <TouchableOpacity onPress={() => updateCartQuantity(item, -1)}><Ionicons name="remove-circle-outline" size={28} color="#FF3B30" /></TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity onPress={() => updateCartQuantity(item, 1)}><Ionicons name="add-circle" size={28} color="#34C759" /></TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => removeFromCart(item)}><Ionicons name="trash-outline" size={26} color="#8A8A8E" /></TouchableOpacity>
    </View>
  );

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF"/></View>;
  
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.header}>
        {userData?.isSuperUser && (
          <TouchableOpacity style={styles.addButton} onPress={() => setAddItemModalVisible(true)}>
            <Ionicons name="add" size={28} color="#007AFF" />
          </TouchableOpacity>
        )}
        <TextInput style={[styles.searchBar, userData?.isSuperUser && {marginLeft: 10}]} placeholder="Search products..." value={searchQuery} onChangeText={setSearchQuery} onFocus={() => setFocusedInput('search')}/>
      </View>
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        style={styles.listContainer}
        contentContainerStyle={{ paddingBottom: 20 }}
        onScrollBeginDrag={() => Keyboard.dismiss()}
        ListEmptyComponent={<View style={styles.centered}><Text>No products available.</Text></View>}
      />
      {(!isKeyboardVisible || focusedInput === 'notes') && (
        <View style={styles.cartSummary}>
          <Text style={styles.cartTitle}>Cart</Text>
          <ScrollView style={styles.cartItemsContainer}>
            {cart.length > 0 ? cart.map(renderCartItem) : <Text style={styles.emptyCartText}>Your cart is empty.</Text>}
          </ScrollView>
          <TextInput style={styles.notesInput} placeholder="Add order notes..." value={notes} onChangeText={setNotes} onFocus={() => setFocusedInput('notes')}/>
          <TouchableOpacity style={styles.submitButton} onPress={handleSaveOrSubmit}>
            <Text style={styles.submitButtonText}>
              {isEditing ? 'UPDATE SAVED ORDER' : (userData?.canBatchSubmitOrders ? 'SAVE ORDER' : 'SUBMIT ORDER')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <Modal isVisible={isAddItemModalVisible} onBackdropPress={() => setAddItemModalVisible(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Special Item</Text>
          <TextInput placeholder="Item Name" style={styles.input} value={newItemName} onChangeText={setNewItemName} />
          <TouchableOpacity style={styles.createButton} onPress={handleAddSpecialItem}>
            <Text style={styles.createButtonText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default OrderScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { backgroundColor: '#F5F5F7', padding: 15, borderBottomWidth: 1, borderBottomColor: '#E5E5EA', flexDirection: 'row', alignItems: 'center' },
  addButton: { padding: 8 },
  searchBar: { height: 44, paddingHorizontal: 15, backgroundColor: '#FFFFFF', borderRadius: 10, fontSize: 16, flex: 1 },
  listContainer: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  productItem: { backgroundColor: '#FFFFFF', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F7', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  productName: { color: '#1D1D1F', fontSize: 18, fontWeight: '500' },
  newProductText: { color: '#D68900' },
  cartSummary: { padding: 15, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#E5E5EA' },
  cartTitle: { fontSize: 22, color: '#1D1D1F', fontWeight: 'bold', marginBottom: 10 },
  cartItemsContainer: { maxHeight: 150 },
  emptyCartText: { textAlign: 'center', color: '#8A8A8E', paddingVertical: 20 },
  cartItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F7' },
  itemNameContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  cartItemName: { fontSize: 16, color: '#1D1D1F' },
  specialItemLabel: { fontSize: 14, color: '#D9261A', fontStyle: 'italic', marginLeft: 8 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 15 },
  quantityText: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 15, minWidth: 25, textAlign: 'center' },
  notesInput: { height: 50, backgroundColor: '#F5F5F7', borderRadius: 10, paddingHorizontal: 15, marginTop: 15, fontSize: 16 },
  submitButton: { backgroundColor: '#34C759', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  submitButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  modalContent: { backgroundColor: 'white', padding: 22, borderRadius: 14 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 15, fontSize: 16 },
  createButton: { backgroundColor: '#34C759', padding: 15, borderRadius: 8, alignItems: 'center' },
  createButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});