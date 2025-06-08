import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { db } from "../../firebaseConfig";

export default function CaretakerIdTab() {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatientIdPhotos = async () => {
      if (!currentUser) return;
      setLoading(true);

      // Fetch caretaker's user doc to get assignedPatientId
      const caretakerDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (caretakerDoc.exists()) {
        const caretakerData = caretakerDoc.data();
        const patientId = caretakerData.assignedPatientId;
        if (patientId) {
          // Fetch patient user doc
          const patientDoc = await getDoc(doc(db, "users", patientId));
          if (patientDoc.exists()) {
            const patientData = patientDoc.data();
            setFrontUrl(patientData.idPhotoFrontUrl || "");
            setBackUrl(patientData.idPhotoBackUrl || "");
            setPatientName(patientData.name || "");
          } else {
            setFrontUrl("");
            setBackUrl("");
            setPatientName("");
          }
        } else {
          setFrontUrl("");
          setBackUrl("");
          setPatientName("");
        }
      }
      setLoading(false);
    };
    fetchPatientIdPhotos();
  }, [currentUser]);

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.heading}>
        Assigned Patient ID Photos
      </Text>
      {patientName ? (
        <Text style={styles.patientName}>{patientName}</Text>
      ) : (
        <Text style={styles.patientName}>No patient assigned.</Text>
      )}

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
    marginBottom: 8,
    textAlign: "center",
    color: "#000"
  },
  patientName: {
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
    fontWeight: "bold"
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