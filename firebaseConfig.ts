// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCMEvsKApXYjPbN1xM-nZi_MHo8H-ap20M",
  authDomain: "senzen-capstone.firebaseapp.com",
  projectId: "senzen-capstone",
  //storageBucket: "senzen-capstone.firebasestorage.app",
  storageBucket: "senzen-capstone.appspot.com",
  messagingSenderId: "544451998111",
  appId: "1:544451998111:web:d4a0f11287839f7b154daa"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;