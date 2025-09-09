import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { httpsCallable, getFunctions } from 'firebase/functions';
import Modal from 'react-native-modal';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

const OrderHistoryScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isActionModalVisible, setActionModalVisible] = useState(false);
  const [isViewModalVisible, setViewModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const navigation = useNavigation();

  const fetchData = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) { setLoading(false); return; }

      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      setUserData(userDocSnap.exists() ? userDocSnap.data() : null);

      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const ordersQuerySnapshot = await getDocs(ordersQuery);
      const ordersList = ordersQuerySnapshot.docs.map(doc => ({
        id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      setOrders(ordersList);
    } catch (error) {
      console.error("Error fetching data: ", error);
      Alert.alert("Error", "Could not fetch order history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => { fetchData(); });
    return unsubscribe;
  }, [navigation]);

  const handleActionPress = (order) => { setSelectedOrder(order); setActionModalVisible(true); };
  const handleViewPress = (order) => { setSelectedOrder(order); setViewModalVisible(true); };

  const handleBatchSubmit = () => {
    const unsubmittedOrders = orders.filter(o => o.status === 'Unsubmitted');
    const unsubmittedCount = unsubmittedOrders.length;
    if (unsubmittedCount === 0) return Alert.alert("No Orders", "There are no unsubmitted orders to send.");

    let firstDate = new Date();
    let lastDate = new Date(1970, 0, 1);
    unsubmittedOrders.forEach(order => {
      if (order.createdAt < firstDate) firstDate = order.createdAt;
      if (order.createdAt > lastDate) lastDate = order.createdAt;
    });

    const firstTimeString = firstDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const lastTimeString = lastDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateRangeString = (firstTimeString === lastTimeString) ? `at ${firstTimeString}` : `between ${firstTimeString} and ${lastTimeString}`;
    const alertMessage = `This will finalize and send ${unsubmittedCount} order(s) placed ${dateRangeString}. Continue?`;

    Alert.alert("Submit All Orders", alertMessage, [
      { text: "Cancel", style: "cancel" },
      { text: "Submit All", onPress: async () => {
        try {
          const functionsInstance = getFunctions();
          const batchSubmitFunc = httpsCallable(functionsInstance, 'submitBatchOrders');
          const result = await batchSubmitFunc();
          Alert.alert("Success", result.data.message);
          fetchData();
        } catch (error) { Alert.alert("Error", `Could not submit orders: ${error.message}`); }
      }}
    ]);
  };

  const handleBuyAgain = () => {
    if (!selectedOrder?.items) return;
    setActionModalVisible(false);
    navigation.navigate('Order', { prefillCart: selectedOrder.items });
  };
  
  const handleEmailToMe = async () => {
    if (!selectedOrder) return;
    setActionModalVisible(false);
    try {
      const functionsInstance = getFunctions();
      const sendEmail = httpsCallable(functionsInstance, 'sendOrderEmailToUser');
      await sendEmail({ orderId: selectedOrder.id });
      Alert.alert('Success', `An email with your invoice has been sent to ${auth.currentUser.email}.`);
    } catch (error) {
      console.error("Manual email send failed:", error);
      Alert.alert('Error', `Could not send email: ${error.message}`);
    }
  };
  
  const generateInvoiceHtml = (order) => {
    const itemsHtml = (order.items || []).map(item => `<tr><td>${item.name}</td><td>${item.quantity}</td></tr>`).join('');
    const notesHtml = order.notes ? `<div class="notes-section"><h3>Notes:</h3><p>${order.notes}</p></div>` : '';
    const subAccountHtml = order.subAccountName ? `<p><strong>Sub-Account:</strong> ${order.subAccountName}</p>` : '';
    const orderDate = (order.createdAt instanceof Date) ? order.createdAt.toLocaleDateString() : 'N/A';
    const afterHoursWarning = order.isAfterHours ? `<h3 style="color: #FF3B30; border: 2px solid #FF3B30; padding: 10px; border-radius: 5px;">*** AFTER HOURS ORDER ***</h3>` : '';

    return `
      <html><head><style>body{font-family:sans-serif;padding:20px} h1,h2{color:#007AFF} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px;text-align:left} th{background-color:#f2f2f2} .notes-section{margin-top:20px;padding:10px;border:1px solid #eee;border-radius:5px;}</style></head>
      <body><h1>Invoice</h1>${afterHoursWarning}<h2>Order #${order.publicOrderId}</h2><p><strong>Date:</strong> ${orderDate}</p><p><strong>Billed To:</strong> ${order.userEmail}</p>${subAccountHtml}<hr/>
      <table><thead><tr><th>Item</th><th>Quantity</th></tr></thead><tbody>${itemsHtml}</tbody></table>
      ${notesHtml}</body></html>`;
  };

  const handleSaveInvoice = async () => {
    if (!selectedOrder) return;
    setActionModalVisible(false);
    const html = generateInvoiceHtml(selectedOrder);
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS === "ios" || Platform.OS === "web") {
        await Sharing.shareAsync(uri, { dialogTitle: 'Save your invoice' });
      } else if (Platform.OS === "android") {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) return;
        const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, `Invoice-${selectedOrder.publicOrderId}.pdf`, 'application/pdf');
        const pdfContent = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        await FileSystem.writeAsStringAsync(newFileUri, pdfContent, { encoding: FileSystem.EncodingType.Base64 });
        Alert.alert("Invoice Saved", "The invoice PDF has been saved to your chosen folder.");
      }
    } catch (error) { Alert.alert("Error", "Could not generate invoice."); }
  };

  const handleDeleteOrder = () => {
    if (!selectedOrder) return;
    Alert.alert("Delete Order", "Are you sure you want to permanently delete this order?", [
      { text: "Cancel", style: "cancel", onPress: () => setActionModalVisible(false) },
      { text: "Delete", style: "destructive",
        onPress: async () => {
          try { 
            setActionModalVisible(false); 
            await deleteDoc(doc(db, "orders", selectedOrder.id)); 
            fetchData(); 
          }
          catch (error) { Alert.alert("Error", "Could not delete order."); }
        },
      },
    ]);
  };

  const renderOrderItem = ({ item }) => (
    <View style={[styles.orderCard, item.status === 'Unsubmitted' && styles.unsubmittedOrderCard]}>
      <View style={styles.cardHeader}>
        <TouchableOpacity style={styles.headerInfo} onPress={() => handleActionPress(item)}>
          <Text style={styles.orderId}>Order #{item.publicOrderId || item.id.substring(0, 6)}</Text>
          {item.subAccountName && <Text style={styles.subAccountText}>{item.subAccountName}</Text>}
        </TouchableOpacity>
        
        {item.status === 'Unsubmitted' && userData?.canBatchSubmitOrders ? (
          <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('Order', { editingOrder: item })}>
            <Ionicons name="pencil" size={24} color="#007AFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.viewButton} onPress={() => handleViewPress(item)}>
            <Ionicons name="eye-outline" size={26} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity onPress={() => handleActionPress(item)}>
        <View style={styles.itemsContainer}>
          {(item.items || []).slice(0, 7).map((orderItem, index) => (
            <View key={index} style={styles.itemRow}><Text style={styles.itemName} numberOfLines={1}>{orderItem.name}</Text><Text style={styles.itemQuantity}>Qty: {orderItem.quantity}</Text></View>
          ))}
          {(item.items || []).length > 7 && (<Text style={styles.moreItemsText}>... and {(item.items || []).length - 7} more</Text>)}
        </View>
        <View style={styles.cardFooter}>
          {item.isAfterHours && (<View style={styles.afterHoursTag}><Text style={styles.afterHoursText}>After Hours Order</Text></View>)}
          <View style={item.status === 'Unsubmitted' ? styles.unsubmittedTag : {}}>
            <Text style={item.status === 'Unsubmitted' ? styles.unsubmittedText : styles.statusText}>
              Status: {item.status || 'N/A'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <View style={{flex: 1}}>
      {userData?.canBatchSubmitOrders && (
        <View style={styles.batchSubmitContainer}>
          <TouchableOpacity style={styles.batchSubmitButton} onPress={handleBatchSubmit}>
            <Ionicons name="cloud-upload-outline" size={24} color="white" />
            <Text style={styles.batchSubmitButtonText}>SUBMIT ALL UNSUBMITTED ORDERS</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && orders.length === 0 ? (
        <View style={styles.centered}><Text style={styles.emptyText}>No orders found.</Text></View>
      ) : (
        <FlatList data={orders} renderItem={renderOrderItem} keyExtractor={item => item.id} contentContainerStyle={styles.container} />
      )}
      
      {selectedOrder && (
        <Modal isVisible={isActionModalVisible} onBackdropPress={() => setActionModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Actions for #{selectedOrder.publicOrderId}</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => { setActionModalVisible(false); handleViewPress(selectedOrder); }}><Text style={styles.modalButtonText}>View Details</Text></TouchableOpacity>
            {selectedOrder.status !== 'Unsubmitted' && (
              <>
                {userData?.enableManualEmailTrigger && <TouchableOpacity style={[styles.modalButton, {backgroundColor: '#34C759'}]} onPress={handleEmailToMe}><Text style={styles.modalButtonText}>Email Invoice to Me</Text></TouchableOpacity>}
                <TouchableOpacity style={styles.modalButton} onPress={handleBuyAgain}><Text style={styles.modalButtonText}>Buy Again</Text></TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={handleSaveInvoice}><Text style={styles.modalButtonText}>Save Invoice</Text></TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={[styles.modalButton, styles.deleteButton]} onPress={handleDeleteOrder}><Text style={styles.modalButtonText}>Delete Order</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setActionModalVisible(false)}><Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancel</Text></TouchableOpacity>
          </View>
        </Modal>
      )}
      
      {selectedOrder && (
        <Modal isVisible={isViewModalVisible} onBackdropPress={() => setViewModalVisible(false)}>
          <View style={styles.viewModalContent}>
            <Text style={styles.modalTitle}>Order Details</Text>
            <Text style={styles.detailText}>Order ID: #{selectedOrder.publicOrderId}</Text>
            {selectedOrder.subAccountName && <Text style={styles.detailText}>Sub-Account: {selectedOrder.subAccountName}</Text>}
            <View style={styles.divider} />
            <ScrollView style={styles.viewModalScrollView}>
              {(selectedOrder.items || []).map((orderItem, index) => (
                <View key={orderItem.id || index} style={styles.viewModalItemRow}>
                    <Text style={styles.viewModalItemName}>{orderItem.name}</Text>
                    <Text style={styles.viewModalItemQty}>x {orderItem.quantity}</Text>
                </View>
              ))}
            </ScrollView>
            {selectedOrder.notes && (
              <>
                <View style={styles.divider} />
                <Text style={styles.notesTitle}>Notes:</Text>
                <Text style={styles.notesText}>{selectedOrder.notes}</Text>
              </>
            )}
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton, {marginTop: 20}]} onPress={() => setViewModalVisible(false)}>
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
};
export default OrderHistoryScreen;

const styles = StyleSheet.create({
    container: { backgroundColor: '#F5F5F7', paddingBottom: 15 },
    centered: { flex: 1, backgroundColor: '#F5F5F7', justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 18, color: '#8A8A8E' },
    orderCard: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 15, paddingTop: 15, marginHorizontal: 15, marginTop: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 1, }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
    unsubmittedOrderCard: { backgroundColor: '#F5F5F7', borderColor: '#D1D1D6', borderStyle: 'dashed', borderWidth: 1.5 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#E5E5EA', paddingBottom: 10, },
    headerInfo: { flex: 1, marginRight: 10 },
    orderId: { fontSize: 16, fontWeight: 'bold', color: '#1D1D1F' },
    subAccountText: { fontSize: 14, fontWeight: '600', color: '#5856D6', fontStyle: 'italic', marginTop: 4 },
    viewButton: { padding: 5 },
    editButton: { padding: 5 },
    itemsContainer: { marginVertical: 10 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    itemName: { fontSize: 14, color: '#3C3C43', flex: 1 },
    itemQuantity: { fontSize: 14, color: '#3C3C43', fontWeight: '500' },
    moreItemsText: { fontStyle: 'italic', color: '#8A8A8E', textAlign: 'center', marginTop: 5 },
    cardFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E5EA', paddingTop: 10, paddingBottom: 15, marginTop: 5, },
    afterHoursTag: { backgroundColor: '#FF3B30', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 4, marginRight: 10 },
    afterHoursText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
    statusText: { fontSize: 16, color: '#3C3C43' },
    unsubmittedTag: { backgroundColor: '#8A8A8E', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 4 },
    unsubmittedText: { fontSize: 16, color: 'white', fontWeight: 'bold' },
    batchSubmitContainer: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#E5E5EA', backgroundColor: 'white' },
    batchSubmitButton: { backgroundColor: '#34C759', padding: 15, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { height: 2, width: 0 } },
    batchSubmitButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
    modalContent: { backgroundColor: 'white', padding: 22, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    modalButton: { flexDirection: 'row', width: '100%', backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    modalButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    deleteButton: { backgroundColor: '#FF3B30' },
    cancelButton: { backgroundColor: '#F5F5F7' },
    cancelButtonText: { color: '#007AFF' },
    viewModalContent: { backgroundColor: 'white', padding: 22, borderRadius: 10, maxHeight: '80%' },
    detailText: { fontSize: 16, color: '#8A8A8E', marginBottom: 5 },
    divider: { height: 1, backgroundColor: '#E5E5EA', marginVertical: 15 },
    viewModalScrollView: { maxHeight: 300 },
    viewModalItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
    viewModalItemName: { fontSize: 16, color: '#1D1D1F', flex: 1, marginRight: 10 },
    viewModalItemQty: { fontSize: 16, fontWeight: 'bold', color: '#1D1D1F' },
    notesTitle: { fontSize: 16, fontWeight: 'bold', color: '#1D1D1F', marginBottom: 5 },
    notesText: { fontSize: 16, color: '#3C3C43', fontStyle: 'italic' },
});