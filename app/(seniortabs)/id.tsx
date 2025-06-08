import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { db } from "../../firebaseConfig";

export default function PatientIdScreen() {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIdPhotos = async () => {
      if (!currentUser) return;
      setLoading(true);
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setFrontUrl(data.idPhotoFrontUrl || "");
        setBackUrl(data.idPhotoBackUrl || "");
      }
      setLoading(false);
    };
    fetchIdPhotos();
  }, [currentUser]);

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.heading}>
        Patient ID Photos
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#000" />
      ) : (
        <>
          <Card style={styles.card}>
            <Card.Title title="Front of ID" />
            {frontUrl ? (
              <Image source={{ uri: frontUrl }} style={styles.image} resizeMode="contain" />
            ) : (
              <Text style={styles.placeholder}>No front ID photo uploaded.</Text>
            )}
          </Card>

          <Card style={styles.card}>
            <Card.Title title="Back of ID" />
            {backUrl ? (
              <Image source={{ uri: backUrl }} style={styles.image} resizeMode="contain" />
            ) : (
              <Text style={styles.placeholder}>No back ID photo uploaded.</Text>
            )}
          </Card>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff"
  },
  heading: {
    marginBottom: 16,
    textAlign: "center",
    color: "#000"
  },
  card: {
    marginBottom: 16,
    paddingBottom: 16
  },
  image: {
    width: "100%",
    height: 200,
    backgroundColor: "#f5f5f5"
  },
  placeholder: {
    textAlign: "center",
    color: "#888",
    marginVertical: 24
  }
});