import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, FlatList, TouchableOpacity, Dimensions, Modal, TouchableWithoutFeedback } from 'react-native';
import { TextInput, Text, Card, useTheme, IconButton, ActivityIndicator, List, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import TypingIndicator from '../components/TypingIndicator';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Helper components are defined outside for stability and performance
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
    const [modalType, setModalType] = useState('');
    const [modalLoading, setModalLoading] = useState(false);

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
        setModalVisible(true);
        setModalLoading(true);
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
        setModalVisible(false);
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

    return (
        <>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 100}
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
                        <IconButton icon="briefcase-outline" size={24} onPress={() => openDataPicker('orders')} />
                        <IconButton icon="tag-outline" size={24} onPress={() => openDataPicker('products')} />
                        <TextInput
                            style={styles.textInput}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Ask anything..."
                            multiline
                            disabled={isLoading}
                        />
                        <IconButton icon="send" mode="contained" size={24} onPress={() => handleSend()} disabled={isLoading} />
                    </View>
                </View>
            </KeyboardAvoidingView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.modalOverlay} />
                </TouchableWithoutFeedback>
                <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
                    <Text variant="headlineSmall" style={styles.modalTitle}>
                        Select {modalType === 'orders' ? 'an Order' : 'a Product'}
                    </Text>
                    {modalLoading ? <ActivityIndicator animating={true} size="large" /> : (
                        <FlatList
                            data={modalData}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <List.Item
                                    title={modalType === 'orders' ? `Order #${item.publicOrderId}` : item.name}
                                    description={modalType === 'orders' && item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : null}
                                    onPress={() => handleDataSelect(item)}
                                />
                            )}
                            ItemSeparatorComponent={Divider}
                        />
                    )}
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
    inputContainer: { paddingHorizontal: 10, paddingTop: 10, backgroundColor: 'white', borderTopColor: '#dedede', borderTopWidth: 1 },
    inputRow: { flexDirection: 'row', alignItems: 'center' },
    textInput: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20, paddingHorizontal: 15, paddingTop: 8, paddingBottom: 8, borderWidth: 0, },
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
    modalOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    modalContent: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: 'white',
        paddingTop: 22,
        paddingHorizontal: 22,
        borderTopRightRadius: 20,
        borderTopLeftRadius: 20,
        height: Dimensions.get('window').height * 0.6,
    },
    modalTitle: { marginBottom: 12, textAlign: 'center' }
});