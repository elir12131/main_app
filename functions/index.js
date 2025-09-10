require('dotenv').config();
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

const gmailEmail = process.env.GMAIL_EMAIL;
const gmailPassword = process.env.GMAIL_PASSWORD;
const gmailRecipient = process.env.GMAIL_EMAIL_RECIPIENT;

if (!gmailEmail || !gmailPassword || !gmailRecipient) {
  console.error("Missing GMAIL credentials from .env file.");
}

const mailTransport = nodemailer.createTransport({
  service: "gmail",
  auth: { user: gmailEmail, pass: gmailPassword },
});

const generateInvoiceHtml = (order, username = null) => {
  const itemsHtml = (order.items || []).map(item => `
    <tr ${item.isSpecial ? 'style="background-color: #ffebe6;"' : ''}>
        <td>${item.name}${item.isSpecial ? ' <strong style="color: #D9261A;">(Special)</strong>' : ''}</td>
        <td>${item.quantity}</td>
    </tr>`).join('');
  const notesHtml = order.notes ? `<div class="notes-section"><h3>Notes:</h3><p>${order.notes}</p></div>` : '';
  const subAccountHtml = order.subAccountName ? `<p><strong>Sub-Account:</strong> ${order.subAccountName}</p>` : '';
  const orderDate = order.createdAt.toDate().toLocaleDateString();
  const afterHoursWarning = order.isAfterHours ? `<h3 style="color: #FF3030; border: 2px solid #FF3030; padding: 10px; border-radius: 5px;">*** AFTER HOURS ORDER ***</h3>` : '';
  const billedToUsername = username ? ` (${username})` : '';
  const billedToHtml = `<p><strong>Billed To:</strong> ${order.userEmail}${billedToUsername}</p>`;
  return `
    <html><head><style>body{font-family:sans-serif;padding:20px} h1,h2{color:#007AFF} table{width:100%;border-collapse:collapse;margin-bottom:20px;} th,td{border:1px solid #ddd;padding:8px;text-align:left} th{background-color:#f2f2f2} .notes-section{margin-top:20px;padding:10px;border:1px solid #eee;border-radius:5px;} .order-separator{border-bottom: 2px dashed #ccc; padding-bottom: 20px; margin-bottom: 20px;}</style></head>
    <body><h1>Invoice</h1>${afterHoursWarning}<h2>Order #${order.publicOrderId}</h2><p><strong>Date:</strong> ${orderDate}</p>${billedToHtml}${subAccountHtml}<hr/>
    <table><thead><tr><th>Item</th><th>Quantity</th></tr></thead><tbody>${itemsHtml}</tbody></table>
    ${notesHtml}</body></html>`;
};

exports.onOrderCreated = onDocumentCreated("orders/{orderId}", async (event) => {
  const orderData = event.data.data();
  if (orderData.status === 'Unsubmitted') { return; }
  if (!gmailRecipient) { return; }
  let username = null;
  try {
    const userDoc = await admin.firestore().collection('users').doc(orderData.userId).get();
    if (userDoc.exists && userDoc.data().username) { username = userDoc.data().username; }
  } catch (e) { functions.logger.warn(`Could not fetch username`); }
  const htmlInvoice = generateInvoiceHtml(orderData, username);
  const mailOptions = { from: `"Poppy's Produce Orders" <${gmailEmail}>`, to: gmailRecipient, subject: `New Order! #${orderData.publicOrderId} from ${orderData.userEmail}`, html: htmlInvoice };
  try { await mailTransport.sendMail(mailOptions); } catch (error) { functions.logger.error("CRITICAL: Error sending email:", error); }
});

exports.listAllUsers = onCall(async (request) => {
  if (request.auth.token.admin !== true) { throw new HttpsError('permission-denied', 'Only admins can list users.'); }
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    const firestoreUsersSnapshot = await admin.firestore().collection('users').get();
    const firestoreUsersMap = new Map();
    firestoreUsersSnapshot.forEach(doc => { firestoreUsersMap.set(doc.id, doc.data()); });
    const users = listUsersResult.users.map(userRecord => {
      const firestoreData = firestoreUsersMap.get(userRecord.uid) || {};
      return {
        uid: userRecord.uid, email: userRecord.email, displayName: userRecord.displayName,
        disabled: userRecord.disabled, isAdmin: userRecord.customClaims?.admin === true,
        isParentAccount: firestoreData.isParentAccount || false,
        subAccounts: firestoreData.subAccounts || [],
        truckNumber: firestoreData.truckNumber || null,
        isSuperUser: userRecord.customClaims?.isSuperUser === true,
      };
    });
    return { users };
  } catch (error) { throw new HttpsError('internal', 'Failed to list users.'); }
});

exports.setUserTruckNumber = onCall(async (request) => {
    if (request.auth.token.admin !== true) { throw new HttpsError('permission-denied', 'Only admins can assign trucks.'); }
    const { userId, truckNumber } = request.data;
    if (!userId) { throw new HttpsError('invalid-argument', 'Missing userId.'); }
    try {
        await admin.firestore().collection('users').doc(userId).set({ truckNumber: truckNumber || null }, { merge: true });
        return { success: true, message: `Truck number updated.` };
    } catch (error) { throw new HttpsError('internal', 'Failed to update truck number.'); }
});

exports.batchDeleteOrdersByDate = onCall(async (request) => {
    if (request.auth.token.admin !== true) { throw new HttpsError('permission-denied', 'Only admins can batch delete orders.'); }
    const { deleteUntilTimestamp } = request.data;
    if (!deleteUntilTimestamp) { throw new HttpsError('invalid-argument', 'Missing deleteUntilTimestamp.'); }
    try {
        const firestore = admin.firestore();
        const deleteDate = new Date(deleteUntilTimestamp);
        const ordersQuery = firestore.collection('orders').where('createdAt', '<', deleteDate);
        const snapshot = await ordersQuery.get();
        if (snapshot.empty) { return { success: true, message: "No old orders found." }; }
        const batch = firestore.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        return { success: true, message: `${snapshot.size} old orders deleted.` };
    } catch (error) { throw new HttpsError('internal', 'Failed to delete orders.'); }
});

exports.submitBatchOrders = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid || request.auth.token.isSuperUser !== true) { throw new HttpsError('permission-denied', 'Permission denied. Please log out and back in.'); }
  try {
    const firestore = admin.firestore();
    const userDoc = await firestore.collection('users').doc(uid).get();
    const ordersQuery = firestore.collection('orders').where('userId', '==', uid).where('status', '==', 'Unsubmitted');
    const querySnapshot = await ordersQuery.get();
    if (querySnapshot.empty) { throw new HttpsError('not-found', 'No unsubmitted orders found.'); }
    let allOrdersHtml = '';
    const username = userDoc.data().username || null;
    querySnapshot.docs.forEach((doc) => {
      const orderData = doc.data();
      const itemsHtml = (orderData.items || []).map(item => `<tr ${item.isSpecial ? 'style="background-color: #ffebe6;"' : ''}><td>${item.name}${item.isSpecial ? ' <strong style="color: #D9261A;">(Special)</strong>' : ''}</td><td>${item.quantity}</td></tr>`).join('');
      const notesHtml = orderData.notes ? `<div class="notes-section"><h3>Notes:</h3><p>${orderData.notes}</p></div>` : '';
      const orderDate = orderData.createdAt.toDate().toLocaleDateString();
      allOrdersHtml += `<div class="order-separator"><h2>Order #${orderData.publicOrderId}</h2><p><strong>Date:</strong> ${orderDate}</p><table><thead><tr><th>Item</th><th>Quantity</th></tr></thead><tbody>${itemsHtml}</tbody></table>${notesHtml}</div>`;
    });
    const billedToUsername = username ? ` (${username})` : '';
    const finalHtml = `<html><head><style>body{font-family:sans-serif;padding:20px} h1,h2{color:#007AFF} table{width:100%;border-collapse:collapse;margin-bottom:20px;} th,td{border:1px solid #ddd;padding:8px;text-align:left} th{background-color:#f2f2f2} .notes-section{margin-top:10px;padding:10px;border:1px solid #eee;border-radius:5px; background-color: #fafafa;} .order-separator{border-bottom: 2px dashed #ccc; padding-bottom: 20px; margin-bottom: 20px;}</style></head><body><h1>Batch Order Submission</h1><p><strong>Billed To:</strong> ${userDoc.data().email}${billedToUsername}</p><p><strong>Total Orders Submitted:</strong> ${querySnapshot.size}</p><hr/>${allOrdersHtml}</body></html>`;
    const mailOptions = { from: `"Poppy's Produce Orders" <${gmailEmail}>`, to: gmailRecipient, subject: `[BATCH SUBMISSION] ${querySnapshot.size} Orders from ${userDoc.data().email}`, html: finalHtml };
    await mailTransport.sendMail(mailOptions);
    const batch = firestore.batch();
    querySnapshot.forEach(doc => { batch.update(doc.ref, { status: 'Pending' }); });
    await batch.commit();
    return { success: true, message: `${querySnapshot.size} orders have been submitted.` };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to submit batch order.');
  }
});

exports.createSubAccount = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid || request.auth.token.isSuperUser !== true) { throw new HttpsError('permission-denied', 'Permission denied. Please log out and back in.'); }
    const { accountName } = request.data;
    if (!accountName || typeof accountName !== 'string' || accountName.trim().length === 0) { throw new HttpsError('invalid-argument', 'A valid account name is required.'); }
    try {
        const firestore = admin.firestore();
        const userDocRef = firestore.collection('users').doc(uid);
        const userDoc = await userDocRef.get();
        const currentSubAccounts = userDoc.data().subAccounts || [];
        const newAccountName = accountName.trim();
        if (currentSubAccounts.includes(newAccountName)) { throw new HttpsError('already-exists', `A customer named "${newAccountName}" already exists.`); }
        await firestore.collection('subAccounts').add({ name: newAccountName, parentId: uid, truckNumber: null, restrictedProductIds: [] });
        await userDocRef.update({ subAccounts: admin.firestore.FieldValue.arrayUnion(newAccountName) });
        return { success: true, message: `Customer "${newAccountName}" created successfully.` };
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to create new customer.');
    }
});

exports.updateSubAccountDetails = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid || request.auth.token.isSuperUser !== true) { throw new HttpsError('permission-denied', 'Permission denied. Please log out and back in.'); }
    const { subAccountId, restrictedProductIds, truckNumber } = request.data;
    if (!subAccountId) { throw new HttpsError('invalid-argument', 'Missing subAccountId.'); }
    try {
        const firestore = admin.firestore();
        const subAccountRef = firestore.collection('subAccounts').doc(subAccountId);
        const subAccountDoc = await subAccountRef.get();
        if (!subAccountDoc.exists || subAccountDoc.data().parentId !== uid) { throw new HttpsError('permission-denied', 'You do not own this sub-account.'); }
        await subAccountRef.update({ restrictedProductIds: restrictedProductIds || [], truckNumber: truckNumber || null });
        return { success: true, message: "Sub-account updated successfully." };
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to update sub-account.');
    }
});

exports.setSuperUserRole = onCall(async (request) => {
    if (request.auth.token.admin !== true) { throw new HttpsError('permission-denied', 'Only admins can perform this action.'); }
    const { email, status } = request.data;
    try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(user.uid, { isSuperUser: status });
        return { message: `Success! ${email} is now ${status ? 'a' : 'no longer a'} Super User.` };
    } catch (error) { throw new HttpsError('internal', 'Error setting role.'); }
});

exports.setAdminRole = onCall(async (request) => {
  if (request.auth.token.admin !== true) { throw new HttpsError('permission-denied', 'Only admins can set other admins.'); }
  const email = request.data.email;
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    return { message: `Success! ${email} has been made an admin.` };
  } catch (error) { throw new HttpsError('internal', 'Error setting admin role.'); }
});

exports.resendOrderEmail = onCall(async (request) => {
  if (request.auth.token.admin !== true) { throw new HttpsError('permission-denied', 'Only admins can resend emails.'); }
  const { orderId } = request.data;
  if (!orderId) { throw new HttpsError('invalid-argument', 'Missing orderId.'); }
  try {
    const orderRef = admin.firestore().collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) { throw new HttpsError('not-found', `Order ${orderId} not found.`); }
    const orderData = orderDoc.data();
    const htmlInvoice = generateInvoiceHtml(orderData);
    const mailOptions = { from: `"Poppy's Produce Orders (Manual Resend)" <${gmailEmail}>`, to: gmailRecipient, subject: `[RESEND] Order #${orderData.publicOrderId} from ${orderData.userEmail}`, html: htmlInvoice };
    await mailTransport.sendMail(mailOptions);
    return { success: true, message: "Email resent successfully." };
  } catch (error) { throw new HttpsError('internal', 'Failed to resend email.'); }
});

exports.sendOrderEmailToUser = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) { throw new HttpsError('unauthenticated', 'You must be logged in.'); }
  const { orderId } = request.data;
  if (!orderId) { throw new HttpsError('invalid-argument', 'Missing orderId.'); }
  try {
    const firestore = admin.firestore();
    const [userDoc, orderDoc] = await Promise.all([firestore.collection('users').doc(uid).get(), firestore.collection('orders').doc(orderId).get()]);
    if (!userDoc.exists || !orderDoc.exists) { throw new HttpsError('not-found', 'User or Order not found.'); }
    const userData = userDoc.data();
    const orderData = orderDoc.data();
    if (orderData.userId !== uid) { throw new HttpsError('permission-denied', 'You do not own this order.'); }
    if (userData.enableManualEmailTrigger !== true) { throw new HttpsError('permission-denied', 'This feature is not enabled.'); }
    const htmlInvoice = generateInvoiceHtml(orderData, userData.username);
    const mailOptions = { from: `"Poppy's Produce Orders" <${gmailEmail}>`, to: userData.email, subject: `Your Order Invoice: #${orderData.publicOrderId}`, html: htmlInvoice };
    await mailTransport.sendMail(mailOptions);
    return { success: true, message: "Email sent successfully." };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to send email.');
  }
});

// --- Scheduled Functions ---
exports.scheduledOrderCleanup = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    const firestore = admin.firestore();
    const now = new Date();
    const cutoffDate = new Date(now.setDate(now.getDate() - 40));
    const oldOrdersQuery = firestore.collection('orders').where('createdAt', '<', cutoffDate);
    const snapshot = await oldOrdersQuery.get();
    if (snapshot.empty) { return null; }
    const batch = firestore.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    functions.logger.info(`Successfully deleted ${snapshot.size} orders older than 40 days.`);
    return null;
});

const sendWarningNotification = async (minutesBefore) => {
    const firestore = admin.firestore();
    const messaging = admin.messaging();
    const settingsDoc = await firestore.collection('settings').doc('global').get();
    if (!settingsDoc.exists || settingsDoc.data().isAfterHoursEnabled === false) { return; }
    const cutoffHour = settingsDoc.data().afterHoursCutoff || 21;
    const usersSnapshot = await firestore.collection('users').where('fcmTokens', '!=', null).get();
    if (usersSnapshot.empty) { return; }
    const tokens = [];
    usersSnapshot.forEach(doc => {
        const userTokens = doc.data().fcmTokens;
        if (Array.isArray(userTokens) && userTokens.length > 0) {
            tokens.push(...userTokens);
        }
    });
    if (tokens.length === 0) { return; }
    const message = {
        notification: {
            title: 'Poppy\'s Produce Reminder',
            body: `Order intake will be closing in ${minutesBefore} minutes at ${cutoffHour}:00!`
        },
        tokens: tokens,
    };
    await messaging.sendMulticast(message);
};

exports.sendOneHourWarning = functions.pubsub.schedule('0 20 * * *').timeZone('UTC').onRun(context => {
    return sendWarningNotification(60);
});

exports.sendTenMinuteWarning = functions.pubsub.schedule('50 20 * * *').timeZone('UTC').onRun(context => {
    return sendWarningNotification(10);
});



// In functions/index.js, replace the entire askAI function with this:
exports.askAI = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new HttpsError("unauthenticated", "You must be logged in.");
    }

    const geminiAPIKey = process.env.GEMINI_API_KEY;
    if (!geminiAPIKey) {
        throw new HttpsError("failed-precondition", "The function is missing an API key.");
    }

    const { prompt, context } = request.data;
    if (!prompt) {
        throw new HttpsError("invalid-argument", "The function must be called with a 'prompt'.");
    }

    try {
        const firestore = admin.firestore();
        let dataContext = "No relevant data found.";

        // --- MODIFICATION: The AI is now context-aware ---
        if (context && context.type === 'order' && context.id) {
            // If the user is asking about a specific order, fetch only that order.
            const orderDoc = await firestore.collection("orders").doc(context.id).get();
            if (orderDoc.exists) {
                const orderData = orderDoc.data();
                // Format the data cleanly for the AI
                dataContext = `The user is asking about Order #${orderData.publicOrderId}. 
                Order Details:
                - Date: ${orderData.createdAt.toDate().toLocaleDateString()}
                - Status: ${orderData.status}
                - Item Count: ${orderData.items.length}
                - Items: ${orderData.items.map(item => `${item.quantity}x ${item.name}`).join(", ")}
                - Notes: ${orderData.notes || 'None'}
                `;
            }
        } else {
            // Fallback for general questions: Fetch a summary of recent orders.
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const ordersQuery = firestore.collection("orders").where("userId", "==", uid).where("createdAt", ">", thirtyDaysAgo);
            const ordersSnapshot = await ordersQuery.get();
            const orders = ordersSnapshot.docs.map(doc => doc.data());

            if (orders.length > 0) {
                dataContext = `Here is a summary of the user's sales data for the last 30 days:
                - Total Orders: ${orders.length}
                - Customers Served: [...new Set(orders.map(o => o.subAccountName || o.userEmail))].length
                `;
            }
        }

        const fullPrompt = `You are an AI assistant for a produce company called Poppy's Produce. Analyze the following data context and answer the user's question. Be friendly and provide clear, concise reports.\n\nDATA CONTEXT:\n${dataContext}\n\nUSER'S QUESTION:\n"${prompt}"`;

        const genAI = new GoogleGenerativeAI(geminiAPIKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        return { response: text };

    } catch (error) {
        console.error("Error in askAI function:", error);
        throw new HttpsError("internal", error.message);
    }
});