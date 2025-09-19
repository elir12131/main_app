import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, FlatList, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { TextInput, Text, Card, useTheme, IconButton, ActivityIndicator, List, Divider, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import TypingIndicator from '../components/TypingIndicator';
import { getFunctions, httpsCallable } from 'firebase/functions';

const SuggestionButton = ({ text, onPress }) => (
    <TouchableOpacity onPress={onPress}>
        <MotiView
            style={styles.suggestionButton}
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 300 }}
        >
            <Text style={styles.suggestionText}>{text}</Text>
        </MotiView>
    </TouchableOpacity>
);

const SuggestedPrompts = ({ handleSend }) => (
    <View style={styles.suggestionsContainer}>
        <SuggestionButton text="Generate a sales summary" onPress={() => handleSend("Generate a sales summary for the last 30 days")} />
        <SuggestionButton text="Who were my top customers?" onPress={() => handleSend("Who were my top customers by number of orders in the last 30 days?")} />
        <SuggestionButton text="How many items have I sold?" onPress={() => handleSend("How many total items have I sold in the last 30 days?")} />
    </View>
);

const ChatScreen = () => {
    const [messages, setMessages] = useState([
        { id: '1', text: 'Hello! I am your AI assistant. How can I help you generate reports today?', sender: 'ai' }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeContext, setActiveContext] = useState(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const [modalData, setModalData] = useState([]);
    const [modalType, setModalType] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [productSearch, setProductSearch] = useState('');

    const flatListRef = useRef();
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const handleSend = useCallback(async (prompt) => {
        const textToSend = prompt || inputText;
        if (textToSend.trim().length === 0 || isLoading) return;
        const userMessage = { id: Date.now().toString(), text: textToSend, sender: 'user' };
        setMessages(prevMessages => [...prevMessages, userMessage]);
        setInputText('');
        setIsLoading(true);
        try {
            const functions = getFunctions();
            const askAIFunction = httpsCallable(functions, 'askAI');
            const result = await askAIFunction({ prompt: textToSend, context: activeContext });
            const aiResponseText = result.data.response;
            const aiResponse = { id: (Date.now() + 1).toString(), text: aiResponseText, sender: 'ai' };
            setMessages(prevMessages => [...prevMessages, aiResponse]);
            setActiveContext(null); 
        } catch (error) {
            const errorMessage = { id: (Date.now() + 1).toString(), text: `Error: ${error.message}`, sender: 'ai' };
            setMessages(prevMessages => [...prevMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [inputText, isLoading, activeContext]);

    const openDataPicker = useCallback(async (type) => {
        setModalType(type);
        setModalLoading(true);
        setProductSearch('');
        try {
            let data = [];
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("User not found");
            if (type === 'orders') {
                const q = query(collection(db, 'orders'), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"), limit(20));
                const snapshot = await getDocs(q);
                data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else if (type === 'products') {
                const q = query(collection(db, 'products'), orderBy("name"));
                const snapshot = await getDocs(q);
                data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
            setModalData(data);
        } catch (error) {
            console.error(`Error fetching ${type}:`, error);
        } finally {
            setModalLoading(false);
        }
    }, []);

    const handleDataSelect = useCallback((item) => {
        closeModal();
        if (modalType === 'orders') {
            setActiveContext({ type: 'order', id: item.id });
            const userMsg = { id: Date.now().toString(), text: `Order #${item.publicOrderId}`, sender: 'user' };
            const aiMsg = { id: (Date.now() + 1).toString(), text: 'What would you like to know about this order?', sender: 'ai' };
            setMessages(prev => [...prev, userMsg, aiMsg]);
        } else if (modalType === 'products') {
            handleSend(item.name);
        }
    }, [modalType, handleSend]);

    const renderMessage = useCallback(({ item }) => (
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing' }}>
            <Card style={[styles.messageCard, item.sender === 'ai' ? styles.aiCard : styles.userCard]}>
                <Card.Content><Text variant="bodyLarge" style={{ color: item.sender === 'ai' ? theme.colors.onSurface : 'white' }}>{item.text}</Text></Card.Content>
            </Card>
        </MotiView>
    ), [theme]);

    const filteredModalData = useMemo(() => {
        if (modalType === 'products' && productSearch) {
            return modalData.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
        }
        return modalData;
    }, [productSearch, modalData, modalType]);

    const closeModal = () => {
        setModalVisible(false);
        setTimeout(() => {
            setModalType(null);
        }, 300); // Delay to allow animation to finish
    };

    return (
        <>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={90}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.messageList}
                    ListHeaderComponent={messages.length <= 1 ? <SuggestedPrompts handleSend={handleSend} /> : null}
                    ListFooterComponent={isLoading ? <TypingIndicator /> : null}
                />
                <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
                    <View style={styles.inputRow}>
                        <IconButton icon="plus-circle-outline" size={28} onPress={() => setModalVisible(true)} />
                        <View style={styles.textInputWrapper}>
                            <TextInput
                                style={styles.textInput}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Ask anything..."
                                multiline
                                disabled={isLoading}
                                contentStyle={{ paddingTop: 0, paddingBottom: 0}}
                            />
                        </View>
                        <IconButton icon="send" mode="contained" size={24} onPress={() => handleSend()} disabled={isLoading} />
                    </View>
                </View>
            </KeyboardAvoidingView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={closeModal}
            >
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPressOut={closeModal}
                />
                <View style={styles.modalContentContainer}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHandle} />
                            <IconButton 
                                icon="close-circle" 
                                size={30} 
                                onPress={closeModal}
                                style={styles.closeButton}
                            />
                        </View>
                        
                        {modalType ? (
                            <>
                                <View style={styles.modalTitleContainer}>
                                    <IconButton icon="arrow-left" onPress={() => setModalType(null)} style={styles.backButton} />
                                    <Text variant="headlineSmall" style={styles.modalTitle}>
                                        Select {modalType === 'orders' ? 'an Order' : 'a Product'}
                                    </Text>
                                    <View style={{width: 40}} /> 
                                </View>
                                {modalType === 'products' && (
                                    <TextInput value={productSearch} onChangeText={setProductSearch} placeholder="Search products..." style={styles.modalSearchInput} mode="outlined" dense />
                                )}
                                {modalLoading ? <ActivityIndicator animating={true} size="large" style={{flex: 1}} /> : (
                                    <FlatList
                                        style={styles.modalList}
                                        data={filteredModalData}
                                        keyExtractor={item => item.id}
                                        renderItem={({ item }) => (
                                            <List.Item
                                                title={modalType === 'orders' ? `Order #${item.publicOrderId}` : item.name}
                                                description={modalType === 'orders' && item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : null}
                                                onPress={() => handleDataSelect(item)}
                                            />
                                        )}
                                        ItemSeparatorComponent={Divider}
                                        ListEmptyComponent={<Text style={styles.emptyListText}>No items found.</Text>}
                                    />
                                )}
                            </>
                        ) : (
                            <View style={styles.choiceContainer}>
                                <Button mode="contained-tonal" icon="briefcase-outline" style={styles.choiceButton} labelStyle={styles.choiceButtonLabel} onPress={() => openDataPicker('orders')}>
                                    Select an Order
                                </Button>
                                <Button mode="contained-tonal" icon="tag-outline" style={styles.choiceButton} labelStyle={styles.choiceButtonLabel} onPress={() => openDataPicker('products')}>
                                    Select a Product
                                </Button>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
};

export default ChatScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F7' },
    messageList: { paddingHorizontal: 10, paddingBottom: 10 },
    messageCard: { marginVertical: 5, maxWidth: '80%', borderRadius: 18 },
    aiCard: { alignSelf: 'flex-start', backgroundColor: 'white' },
    userCard: { alignSelf: 'flex-end', backgroundColor: '#007AFF' },
    inputContainer: { 
        paddingHorizontal: 10, 
        paddingTop: 10, 
        backgroundColor: 'white', 
        borderTopColor: '#dedede', 
        borderTopWidth: 1,
    },
    inputRow: { flexDirection: 'row', alignItems: 'center' },
    textInputWrapper: {
        flex: 1,
        backgroundColor: '#F0F0F0',
        borderRadius: 20,
        marginHorizontal: 8,
        paddingHorizontal: 15,
        justifyContent: 'center',
    },
    textInput: {
        backgroundColor: 'transparent',
        minHeight: 40,
        maxHeight: 120,
        paddingVertical: 0,
    },
    suggestionsContainer: { padding: 15, alignItems: 'center' },
    suggestionButton: {
        backgroundColor: 'white',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginVertical: 5,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    suggestionText: { textAlign: 'center', fontWeight: '500' },
    modalContentContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '100%',
        backgroundColor: 'white',
        paddingTop: 12,
        paddingHorizontal: 22,
        borderTopRightRadius: 20,
        borderTopLeftRadius: 20,
        height: Dimensions.get('window').height * 0.7,
    },
    modalHeader: {
        width: '100%',
        alignItems: 'center',
        position: 'relative',
    },
    modalHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 2.5,
        marginBottom: 10,
    },
    closeButton: {
        position: 'absolute',
        right: -15,
        top: -5,
        zIndex: 1,
    },
    modalTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    backButton: {
        // No extra styles needed, default IconButton is fine
    },
    modalTitle: { 
        flex: 1,
        textAlign: 'center'
    },
    modalSearchInput: {
        width: '100%',
        marginBottom: 10,
    },
    modalList: {
        width: '100%',
    },
    emptyListText: {
        textAlign: 'center',
        marginTop: 20,
        color: 'gray',
    },
    choiceContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    choiceButton: {
        width: '80%',
        marginVertical: 10,
        paddingVertical: 8,
    },
    choiceButtonLabel: {
        fontSize: 16,
    }
});