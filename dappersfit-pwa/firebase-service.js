/**
 * Dappersfit Logistics - Real-Time Firebase Firestore Synchronization Engine
 * Connects to Google Cloud Firestore database: ai-studio-dappersfit-ebbc00e7-3c16-4369-a995-efbbfdf6e3f7
 * Provides 2-way real-time data sync across PWA, mobile app, and backend with zero latency
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  initializeFirestore,
  collection,
  doc,
  onSnapshot,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  projectId: "operating-antonym-s6rpq",
  appId: "1:215371594885:web:6987d3137e16600164fdec",
  apiKey: "AIzaSyAUD2sm7cxXisGzZHCIPMZ0Rn4qYuN4kDA",
  authDomain: "operating-antonym-s6rpq.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-dappersfit-ebbc00e7-3c16-4369-a995-efbbfdf6e3f7",
  storageBucket: "operating-antonym-s6rpq.firebasestorage.app",
  messagingSenderId: "215371594885"
};

let app = null;
let db = null;
let isConnected = false;
let ordersUnsubscribe = null;
let ticketsUnsubscribe = null;
let walletUnsubscribe = null;
let productsUnsubscribe = null;

try {
  app = initializeApp(firebaseConfig);
  try {
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } catch (initErr) {
    db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId || '(default)');
  }
  console.log('[Firebase] Realtime Firestore client initialized on database:', firebaseConfig.firestoreDatabaseId);
} catch (err) {
  console.warn('[Firebase] Initialization error:', err);
}

export const FirebaseService = {
  db,
  isReady() {
    return !!db;
  },
  isConnected() {
    return isConnected;
  },

  // Setup Real-time Snapshot Listeners
  initRealtimeListeners({ onOrders, onTickets, onWallet, onConnectionChange }) {
    if (!db) {
      if (onConnectionChange) onConnectionChange(false);
      return;
    }

    try {
      // 1. Real-Time Orders Collection Listener
      const ordersCol = collection(db, 'orders');
      ordersUnsubscribe = onSnapshot(ordersCol, (snapshot) => {
        isConnected = true;
        if (onConnectionChange) onConnectionChange(true);

        const orders = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          orders.push({
            id: docSnap.id,
            ...data
          });
        });

        // Sort descending by date or numeric ID
        orders.sort((a, b) => {
          const timeA = new Date(a.date || a.createdAt || 0).getTime();
          const timeB = new Date(b.date || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        console.log(`[Firebase] Realtime Snapshot: ${orders.length} orders received`);
        if (onOrders && orders.length > 0) {
          onOrders(orders);
        }
      }, (error) => {
        console.warn('[Firebase] Orders listener warning:', error);
        isConnected = false;
        if (onConnectionChange) onConnectionChange(false);
      });

      // 2. Real-Time Replacements/Tickets Listener
      const repCol = collection(db, 'replacements');
      ticketsUnsubscribe = onSnapshot(repCol, (snapshot) => {
        const tickets = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          tickets.push({
            id: docSnap.id,
            ...data
          });
        });
        if (onTickets && tickets.length > 0) {
          onTickets(tickets);
        }
      }, (error) => {
        console.warn('[Firebase] Tickets listener warning:', error);
      });

      // 3. Real-Time Shiprocket Wallet Balance Listener
      const walletDocRef = doc(db, 'shiprocket_wallet', 'current');
      walletUnsubscribe = onSnapshot(walletDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const walData = docSnap.data();
          if (onWallet) onWallet(walData);
        }
      }, (error) => {
        console.warn('[Firebase] Wallet listener warning:', error);
      });

      // 4. Real-Time Products Catalog Listener (Full sync between iOS PWA & Android app)
      const prodCol = collection(db, 'products');
      productsUnsubscribe = onSnapshot(prodCol, (snapshot) => {
        const products = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data && (data.id || data.sku || data.name)) {
            products.push({
              id: docSnap.id,
              ...data
            });
          }
        });
        if (onProducts && products.length > 0) {
          console.log(`[Firebase] Realtime Snapshot: ${products.length} products received`);
          onProducts(products);
        }
      }, (error) => {
        console.warn('[Firebase] Products listener warning:', error);
      });

    } catch (err) {
      console.warn('[Firebase] Error setting up realtime listeners:', err);
      if (onConnectionChange) onConnectionChange(false);
    }
  },

  // Save/Create Order directly in Firestore
  async saveOrder(order) {
    if (!db || !order || !order.id) return false;
    try {
      const cleanData = JSON.parse(JSON.stringify(order));
      await setDoc(doc(db, 'orders', String(order.id)), cleanData, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firebase] saveOrder error:', err);
      return false;
    }
  },

  // Update Order Status in Firestore
  async updateOrderStatus(orderId, statusData) {
    if (!db || !orderId) return false;
    try {
      const data = typeof statusData === 'string' ? { status: statusData } : statusData;
      await updateDoc(doc(db, 'orders', String(orderId)), data);
      return true;
    } catch (err) {
      console.warn('[Firebase] updateOrderStatus error:', err);
      return false;
    }
  },

  // Delete Order from Firestore
  async deleteOrder(orderId) {
    if (!db || !orderId) return false;
    try {
      await deleteDoc(doc(db, 'orders', String(orderId)));
      return true;
    } catch (err) {
      console.warn('[Firebase] deleteOrder error:', err);
      return false;
    }
  },

  // Log Replacement Ticket directly in Firestore
  async saveTicket(ticket) {
    if (!db || !ticket || !ticket.id) return false;
    try {
      await setDoc(doc(db, 'replacements', String(ticket.id)), JSON.parse(JSON.stringify(ticket)));
      return true;
    } catch (err) {
      console.warn('[Firebase] saveTicket error:', err);
      return false;
    }
  },

  // Save/Create/Update Product directly in Firestore (Full sync with Android app)
  async saveProduct(product) {
    if (!db || !product) return false;
    try {
      const prodId = String(product.id || product.sku || 'prod-' + Date.now());
      const cleanData = JSON.parse(JSON.stringify({
        ...product,
        id: prodId
      }));
      await setDoc(doc(db, 'products', prodId), cleanData, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firebase] saveProduct error:', err);
      return false;
    }
  },

  // Delete Product directly from Firestore
  async deleteProduct(productId) {
    if (!db || !productId) return false;
    try {
      await deleteDoc(doc(db, 'products', String(productId)));
      return true;
    } catch (err) {
      console.warn('[Firebase] deleteProduct error:', err);
      return false;
    }
  }
};

// Expose globally on window for easy interoperability
if (typeof window !== 'undefined') {
  window.FirebaseService = FirebaseService;
  try {
    window.dispatchEvent(new CustomEvent('firebase-ready', { detail: FirebaseService }));
  } catch (_) {}
}
