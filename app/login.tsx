import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { auth, db } from "../firebaseConfig";

const logo = require("../assets/images/logo.png");

export default function Login() {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const router = useRouter();
    const [error, setError] = useState("");

    const handleLogin = async () => {
    setError("");
        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }
    try {
        // Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Get user role from Firestore (document ID should be user.uid)
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
        setError("User data not found.");
        return;
        }
        const userData = userDoc.data();
        const role = userData.role;

        // Redirect based on role
        if (role === "admin") router.replace("/(admintabs)/accounts");
        else if (role === "caretaker") router.replace("/(caretabs)/task");
        else if (role === "patient") router.replace("/(seniortabs)/task");
        else setError("Unknown user role.");
    } 
        catch (err: any) {
            if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
                setError("Invalid email or password. Please try again.");
            } else {
                setError(err.message);
            }
        }
    };

    return (
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                style={ styles.container }>

                <View style={ styles.content }>
                    <Image
                        source={logo}
                        style={ styles.logo }
                        resizeMode="contain"
                    />

                    <TextInput 
                        label="Email" 
                        autoCapitalize="none" 
                        keyboardType="email-address"
                        placeholder="example@senzen.com"
                        mode="outlined"
                        value={email}
                        onChangeText={text => setEmail(text.trim())}
                        style={ styles.input }
                        outlineColor="#000"
                        activeOutlineColor="#000"
                        textColor="#000"
                    />

                    <TextInput 
                        label="Password" 
                        autoCapitalize="none" 
                        placeholder="password..."
                        secureTextEntry
                        mode="outlined"
                        value={password}
                        onChangeText={setPassword}
                        style={ styles.input }
                        outlineColor="#000"
                        activeOutlineColor="#000"
                        textColor="#000"
                    />

                    <Button 
                        mode="contained" 
                        onPress={handleLogin}
                        style={ styles.button }
                        labelStyle={{ color: "#fff" }}
                        >Login
                    </Button>
                    {error ? <Text style={{ color: "red", textAlign: "center" }}>{error}</Text> : null}

                    <Text style={ styles.text }>Dont have an account? Inform the Admin!</Text>
                </View>
            </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    content: {
        flex: 1,
        justifyContent: "center",
        padding: 16,
    },
    logo: {
        height: 150,
        width: "100%",
        marginBottom: 20,
    },
    input: {
        marginBottom: 10,
        backgroundColor: "#fff",
        borderRadius: 5,
    },
    button: {
        marginTop: 5,
        backgroundColor: "#6200ee",
    },
    text: {
        marginTop: 10,
        textAlign: "center",
        color: "#000",
    },

})