import * as ImagePicker from 'expo-image-picker';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Button, RadioButton, Text, TextInput } from "react-native-paper";
import { auth, db } from "../../firebaseConfig";

// Helper to calculate age from "YYYY/MM/DD"
function getAge(birthday: string) {
  const [year, month, day] = birthday.split("/").map(Number);
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function CreateScreen() {
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("patient");
  const [gender, setGender] = useState("male");
  const [birthday, setBirthday] = useState("");
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Image picker handler
  const pickImage = async (setPhoto: (uri: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
    }
  };

  const uploadToCloudinary = async (uri: string) => {
    const data = new FormData();
    data.append("file", {
      uri,
      type: "image/jpeg",
      name: "photo.jpg",
    } as any);
    data.append("upload_preset", "senzen"); // Replace with your preset

    const res = await fetch("https://api.cloudinary.com/v1_1/dqbalvtws/image/upload", {
      method: "POST",
      body: data,
    });
    const file = await res.json();
    return file.secure_url; // This is the public URL
  };
  // Create user handler
  const handleCreate = async () => {
    setError("");
    setSuccess("");
    if (!email || !password || !name || !role) {
      setError("Please fill in all fields.");
      return;
    }
    if (role === "patient") {
      if (!birthday) {
        setError("Please enter birth date.");
        return;
      }
      const age = getAge(birthday);
      if (age < 60) {
        setError("Patient must be at least 60 years old.");
        return;
      }
    }
    try {
      // Upload images to Cloudinary if present
      let frontPhotoUrl = null;
      let backPhotoUrl = null;
      if (frontPhoto) frontPhotoUrl = await uploadToCloudinary(frontPhoto);
      if (backPhoto) backPhotoUrl = await uploadToCloudinary(backPhoto);

      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Create user profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email,
        name,
        role,
        gender,
        ...(role === "patient" && {
          birthday,
          frontPhoto: frontPhotoUrl,
          backPhoto: backPhotoUrl,
        }),
      });

      setSuccess("User created successfully!");
      setEmail("");
      setPassword("");
      setName("");
      setRole("patient");
      setGender("male");
      setBirthday("");
      setFrontPhoto(null);
      setBackPhoto(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>SELECT ROLE</Text>
        <RadioButton.Group onValueChange={setRole} value={role}>
          <View style={styles.radiobtn}>
            <RadioButton.Item label="PATIENT" value="patient" color='#000' labelStyle={{ color: "#000" }}/>
            <RadioButton.Item label="CARETAKER" value="caretaker" color='#000' labelStyle={{ color: "#000" }}/>
          </View>
        </RadioButton.Group>

        <TextInput
          label="Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          outlineColor="#000"
          activeOutlineColor="#000"
          textColor="#000"
        />
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          mode="outlined"
          style={styles.input}
          outlineColor="#000"
          activeOutlineColor="#000"
          textColor="#000"
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          mode="outlined"
          style={styles.input}
          outlineColor="#000"
          activeOutlineColor="#000"
          textColor="#000"
        />

        {/* Gender selection */}
        <RadioButton.Group onValueChange={setGender} value={gender}>
          <View style={styles.radiobtn}>
            <RadioButton.Item label="Male" value="male" color='#000' labelStyle={{ color: "#000" }}/>
            <RadioButton.Item label="Female" value="female" color='#000' labelStyle={{ color: "#000" }}/>
          </View>
        </RadioButton.Group>

        {/* Patient-specific fields */}
        {role === "patient" && (
          <>
            <TextInput
              label="Birth Date"
              value={birthday}
              mode="outlined"
              style={styles.input}
              outlineColor="#000"
              activeOutlineColor="#000"
              textColor="#000"
              placeholder="YYYY/MM/DD"
              right={
                <TextInput.Icon
                  icon="calendar"
                  onPress={() => setShowDatePicker(true)}
                  color="#000"
                />
              }
              onFocus={() => setShowDatePicker(true)}
              editable={true}
            />
            <DateTimePickerModal
              isVisible={showDatePicker}
              mode="date"
              onConfirm={(date) => {
                setShowDatePicker(false);
                setBirthday(date.toISOString().slice(0, 10).replace(/-/g, "/"));
              }}
              onCancel={() => setShowDatePicker(false)}
            />
            <Button
              mode="outlined"
              onPress={() => pickImage(setFrontPhoto)}
              style={[styles.input, { borderColor: "#000", borderWidth: 1 }]}
              textColor="#000"
            >
              {frontPhoto ? "Front Photo Selected" : "Upload Front Photo"}
            </Button>
            <Button
              mode="outlined"
              onPress={() => pickImage(setBackPhoto)}
              style={[styles.input, { borderColor: "#000", borderWidth: 1 }]}
              textColor="#000"
            >
              {backPhoto ? "Back Photo Selected" : "Upload Back Photo"}
            </Button>
          </>
        )}

        <Button mode="contained" onPress={handleCreate} style={styles.button}   buttonColor="#000" labelStyle={{ color: "#fff" }}>
          Create User
        </Button>

        {error ? <Text style={{ color: "red", marginTop: 8 }}>{error}</Text> : null}
        {success ? <Text style={{ color: "green", marginTop: 8 }}>{success}</Text> : null}
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
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 7.5,
    textAlign: "center",
    textAlignVertical: "center",
    color: "#000",
  },
  radiobtn: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
    justifyContent: "center",
    color: "#000",
  },
  input: {
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  button: {
    marginTop: 5,
    backgroundColor: "#6200ee",
  },
  text: {
    marginTop: 10,
    textAlign: "center",
  },
});