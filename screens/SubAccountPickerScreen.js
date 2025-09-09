import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, FlatList, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubAccount } from '../context/temp_context';

const SubAccountPickerScreen = ({ route, navigation }) => {
  const { subAccounts } = route.params;
  const { setActiveSubAccount } = useSubAccount();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredAccounts, setFilteredAccounts] = useState(subAccounts);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredAccounts(subAccounts);
    } else {
      setFilteredAccounts(subAccounts.filter(acc => acc.toLowerCase().includes(searchQuery.toLowerCase())));
    }
  }, [searchQuery, subAccounts]);

  const handleSelect = (accountName) => {
    setActiveSubAccount(accountName);
    navigation.navigate('Order');
  };

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
        keyExtractor={item => item}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.button} onPress={() => handleSelect(item)}>
            <Text style={styles.buttonText}>{item}</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={styles.emptyContainer}><Text>No customers found.</Text></View>}
      />
    </SafeAreaView>
  );
};
export default SubAccountPickerScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  searchBar: { height: 44, paddingHorizontal: 15, backgroundColor: '#F5F5F7', borderRadius: 10, fontSize: 16 },
  button: { backgroundColor: '#FFFFFF', padding: 20, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  buttonText: { fontSize: 18 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
});