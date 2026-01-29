// Firebase Configuration for Ministry Fair
// This file initializes Firebase and exports the auth instance

const firebaseConfig = {
  apiKey: "AIzaSyCp6agHKcxdyW-vO2cF8UNiLh6SSU4_qBk",
  authDomain: "ministry-fair.firebaseapp.com",
  projectId: "ministry-fair",
  storageBucket: "ministry-fair.firebasestorage.app",
  messagingSenderId: "1054492643145",
  appId: "1:1054492643145:web:9fb16850a1fe3f0a65d498",
  measurementId: "G-7NFBT8V207"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = firebase.auth();

// Initialize Analytics (optional)
let analytics = null;
if (typeof firebase.analytics === 'function') {
  analytics = firebase.analytics();
}

// Auth state observer - can be used to track login state
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('User signed in:', user.email);
  } else {
    console.log('No user signed in');
  }
});

// Helper functions for authentication
const FirebaseAuth = {
  // Sign up with email and password
  async signUp(email, password) {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  },

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  },

  // Sign out
  async signOut() {
    try {
      await auth.signOut();
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get current user
  getCurrentUser() {
    return auth.currentUser;
  },

  // Send password reset email
  async sendPasswordReset(email) {
    try {
      await auth.sendPasswordResetEmail(email);
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: error.message };
    }
  },

  // Sign in with Google (requires Google provider to be enabled in Firebase Console)
  async signInWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const userCredential = await auth.signInWithPopup(provider);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { success: false, error: error.message };
    }
  }
};
