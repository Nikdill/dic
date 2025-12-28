// https://firebase.google.com/docs/web/setup#available-libraries
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { InjectionToken, isDevMode } from '@angular/core'
connectFirestoreEmulator
const firebaseConfig = {
  apiKey: "AIzaSyCUp5vHPlQFJvfXvaMpzQIhGazIfLmCpak",
  authDomain: "dictionary-ac927.firebaseapp.com",
  projectId: "dictionary-ac927",
  storageBucket: "dictionary-ac927.firebasestorage.app",
  messagingSenderId: "309858563508",
  appId: "1:309858563508:web:249753e6407771e65e2ee1"
};

const FIREBASE_APP = initializeApp(firebaseConfig);

export const FIREBASE_AUTH = new InjectionToken('FIREBASE_AUTH', {
  factory: () => {
    const auth = getAuth(FIREBASE_APP);
    if(isDevMode()) {
      import("firebase/auth")
        .then(m => m.connectAuthEmulator(auth, "http://127.0.0.1:9099"));
    }

    return auth;
  }
});



export const FIREBASE_FIRE_STORE = new InjectionToken('FIREBASE_FIRE_STORE', {
  factory: () => {
    const firestore = getFirestore(FIREBASE_APP);
    if(isDevMode()) {
      connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
    }

    return firestore;
  }
});
