const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// --- THIS IS THE FIX ---
// We initialize the app and store the returned app instance in a variable,
// giving it a unique name to prevent conflicts with other Firebase instances.
const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
}, 'make-superuser-script-v3'); // A unique name avoids initialization errors

// --- PASTE THE UID OF THE USER YOU WANT TO BE A SUPER USER HERE ---
let uid = '25IEV7vyccOVUfJN9zTacgo1r9d2';

// --- Safety Checks ---
uid = uid.trim();

if (!uid || uid === '' || uid === 'REPLACE_WITH_YOUR_SUPER_USERS_UID') {
  console.error("\nFATAL ERROR: The UID variable has not been replaced. Please paste the user's UID and save the file.\n");
  process.exit(1);
}

// --- Visual Confirmation ---
console.log(`Attempting to set { isSuperUser: true } for the following UID:`);
console.log(`--> ${uid} <--`);
console.log("If this UID is correct, the script will now proceed.");
console.log("--------------------------------------------------");

// --- Main Logic ---
// We now explicitly use the 'app' instance we created.
app.auth().setCustomUserClaims(uid, { isSuperUser: true })
  .then(() => {
    console.log(`\nSUCCESS! Custom claim has been set for user ${uid}.`);
    console.log("You may now delete this script file.\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nERROR SETTING CUSTOM CLAIM:', error.message);
    console.error("Please ensure the UID is correct and the user exists in Firebase Authentication.\n");
    process.exit(1);
  });