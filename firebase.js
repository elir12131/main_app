import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'; // <-- Import new functions
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'; // <-- Import storage
import { getFirestore } from 'firebase/firestore';


// IMPORTANT: Paste your firebaseConfig object here!
const firebaseConfig = {
    apiKey: "AIzaSyATcrR1R8hQvdmEscsO3CNTVZZKbBtUypU",
    authDomain: "auroordermatrix.firebaseapp.com",
    projectId: "auroordermatrix",
    storageBucket: "auroordermatrix.firebasestorage.app",
    messagingSenderId: "387069266421",
    appId: "1:387069266421:web:8e8cafb9f841f9e055f8bc",
    measurementId: "G-62WHSGXQ8T"
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firestore
export const db = getFirestore(app);