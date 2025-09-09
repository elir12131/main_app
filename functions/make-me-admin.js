// File: functions/make-me-admin.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const uid = 'DXheevi0M6XUsbJtpp0J3bSsDo63'; // <--- IMPORTANT: REPLACE THIS

admin.auth().setCustomUserClaims(uid, { admin: true })
    .then(() => {
        console.log(`Success! User ${uid} is now an admin.`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error setting custom claims:', error);
        process.exit(1);
    });