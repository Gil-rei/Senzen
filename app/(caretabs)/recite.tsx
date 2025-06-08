import DateTimePicker from "@react-native-community/datetimepicker";
import { getAuth } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, Timestamp, updateDoc, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Button, Card, IconButton, Modal, Portal, Text, TextInput } from "react-native-paper";
import { db } from "../../firebaseConfig";


type Recite = {
  id: string;
  itemNumber: number;
  itemName: string;
  itemAmount: number;
  itemPrice: number;
  date: string; // YYYY-MM-DD
  caretakerId: string;
  patientId: string;
  timestamp: Timestamp;
};

export default function ReciteScreen() {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [recites, setRecites] = useState<Recite[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemAmount, setItemAmount] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [date, setDate] = useState(""); // YYYY-MM-DD
  const [modalVisible, setModalVisible] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingReciteId, setEditingReciteId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [showFilterDatePicker, setShowFilterDatePicker] = useState(false);

  // Fetch assigned patientId for the caretaker
  useEffect(() => {
    const fetchPatientId = async () => {
      if (!currentUser) return;
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setPatientId(data.assignedPatientId || null);
      }
    };
    fetchPatientId();
  }, [currentUser]);

  // Fetch recites for this caretaker's patient and filter date
  useEffect(() => {
    const fetchRecites = async () => {
      if (!patientId || !filterDate) {
        setRecites([]);
        return;
      }
      const q = query(
        collection(db, "recites"),
        where("patientId", "==", patientId),
        where("date", "==", filterDate),
        orderBy("itemNumber", "asc")
      );
      const querySnapshot = await getDocs(q);
      const loaded: Recite[] = [];
      querySnapshot.forEach(docSnap => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as Recite);
      });
      setRecites(loaded);
    };
    fetchRecites();
  }, [patientId, modalVisible, filterDate]);

  // Get next item number for the day
  const getNextItemNumber = () => {
    if (recites.length === 0) return 1;
    return Math.max(...recites.map(r => r.itemNumber)) + 1;
  };

  // Add or update a recite in Firestore
  const saveRecite = async () => {
    if (!itemName || !itemAmount || !itemPrice || !date || !currentUser || !patientId) {
      setError("Please fill in all fields.");
      return;
    }
    setError(null);
    const itemAmountNum = parseInt(itemAmount, 10);
    const itemPriceNum = parseFloat(itemPrice);
    if (isNaN(itemAmountNum) || isNaN(itemPriceNum)) {
      setError("Amount and Price must be numbers.");
      return;
    }
    const itemNumber = editingReciteId
      ? recites.find(r => r.id === editingReciteId)?.itemNumber || 1
      : getNextItemNumber();
    const reciteData = {
      itemNumber,
      itemName,
      itemAmount: itemAmountNum,
      itemPrice: itemPriceNum,
      date,
      caretakerId: currentUser.uid,
      patientId,
      timestamp: Timestamp.fromDate(new Date(`${date}T00:00`)),
    };
    if (editingReciteId) {
      // Update existing recite
      const reciteRef = doc(db, "recites", editingReciteId);
      await updateDoc(reciteRef, reciteData);
      setRecites(recites =>
        recites.map(r =>
          r.id === editingReciteId ? { ...r, ...reciteData } : r
        )
      );
    } else {
      // Add new recite
      const docRef = await addDoc(collection(db, "recites"), reciteData);
      setRecites([
        ...recites,
        { id: docRef.id, ...reciteData },
      ]);
    }
    clearModal();
  };

  // Delete a recite from Firestore
  const handleDeleteRecite = async (reciteId: string) => {
    await deleteDoc(doc(db, "recites", reciteId));
    setRecites(recites => recites.filter(r => r.id !== reciteId));
  };

  // Date Picker handlers
  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate.toISOString().slice(0, 10));
      if (error) setError(null);
    }
  };
  const handleFilterDateChange = (_: any, selectedDate?: Date) => {
    setShowFilterDatePicker(false);
    if (selectedDate) {
      setFilterDate(selectedDate.toISOString().slice(0, 10));
    }
  };

  // Open modal for editing
  const handleEditRecite = (recite: Recite) => {
    setEditingReciteId(recite.id);
    setItemName(recite.itemName);
    setItemAmount(recite.itemAmount.toString());
    setItemPrice(recite.itemPrice.toString());
    setDate(recite.date);
    setModalVisible(true);
  };

  // Open modal for creating
  const handleOpenCreate = () => {
    setEditingReciteId(null);
    setItemName("");
    setItemAmount("");
    setItemPrice("");
    setDate(filterDate);
    setError(null);
    setModalVisible(true);
  };

  // Clear modal fields
  const clearModal = () => {
    setEditingReciteId(null);
    setItemName("");
    setItemAmount("");
    setItemPrice("");
    setDate("");
    setModalVisible(false);
    setError(null);
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Date Filter */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Button
          mode="outlined"
          onPress={() => setShowFilterDatePicker(true)}
          style={{ borderColor: "#000", borderWidth: 1, backgroundColor: "#fff", flex: 1 }}
          textColor="#000"
        >
          {filterDate ? `Filter Date: ${filterDate}` : "Select Date"}
        </Button>
        {showFilterDatePicker && (
          <DateTimePicker
            value={filterDate ? new Date(filterDate + "T00:00") : new Date()}
            mode="date"
            display="default"
            onChange={handleFilterDateChange}
          />
        )}
      </View>

      {/* Recite List */}
      <FlatList
        contentContainerStyle={{ paddingBottom: 80 }}
        data={recites.sort((a, b) => a.itemNumber - b.itemNumber)}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Card
            mode="outlined"
            style={{
              marginBottom: 12,
              borderColor: "#000",
              borderWidth: 1,
              backgroundColor: "#fff",
            }}
          >
            <Card.Title
              title={
                <Text style={{ color: "#000", fontWeight: "bold" }}>
                  {item.itemNumber}. {item.itemName}
                </Text>
              }
              subtitle={
                <Text style={{ color: "#000", marginTop: -6 }}>
                  Amount: {item.itemAmount} | Price: ₱{item.itemPrice.toFixed(2)}
                </Text>
              }
              right={props => (
                <View style={{ flexDirection: "row" }}>
                  <IconButton
                    {...props}
                    icon="pencil"
                    onPress={() => handleEditRecite(item)}
                    theme={{ colors: { primary: "#000" } }}
                  />
                  <IconButton
                    {...props}
                    icon="delete"
                    onPress={() => handleDeleteRecite(item.id)}
                    theme={{ colors: { primary: "#b71c1c" } }}
                  />
                </View>
              )}
            />
            <Card.Content>
              <Text style={{ color: "#000" }}>Date: {item.date}</Text>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 32, color: "#000" }}>
            No recites yet.
          </Text>
        }
      />

      {/* Modal for Create/Edit */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={clearModal}
          contentContainerStyle={styles.modalContainer}
        >
          {error && (
            <Text style={{ color: "#b71c1c", marginBottom: 8, fontWeight: "bold" }}>
              {error}
            </Text>
          )}
          <TextInput
            label="Item Name"
            value={itemName}
            onChangeText={text => {
              setItemName(text);
              if (error) setError(null);
            }}
            mode="outlined"
            style={{ marginBottom: 8, backgroundColor: "#fff" }}
            outlineColor="#000"
            activeOutlineColor="#000"
            textColor="#000"
            theme={{ colors: { primary: "#000" } }}
          />
          <TextInput
            label="Amount"
            value={itemAmount}
            onChangeText={text => {
              setItemAmount(text.replace(/[^0-9]/g, ""));
              if (error) setError(null);
            }}
            keyboardType="numeric"
            mode="outlined"
            style={{ marginBottom: 8, backgroundColor: "#fff" }}
            outlineColor="#000"
            activeOutlineColor="#000"
            textColor="#000"
            theme={{ colors: { primary: "#000" } }}
          />
          <TextInput
            label="Price"
            value={itemPrice}
            onChangeText={text => {
              setItemPrice(text.replace(/[^0-9.]/g, ""));
              if (error) setError(null);
            }}
            keyboardType="decimal-pad"
            mode="outlined"
            style={{ marginBottom: 8, backgroundColor: "#fff" }}
            outlineColor="#000"
            activeOutlineColor="#000"
            textColor="#000"
            theme={{ colors: { primary: "#000" } }}
          />
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={{ marginBottom: 8, borderColor: "#000", borderWidth: 1, backgroundColor: "#fff" }}
            textColor="#000"
          >
            {date ? `Date: ${date}` : "Select Date"}
          </Button>
          {showDatePicker && (
            <DateTimePicker
              value={date ? new Date(date + "T00:00") : new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
          <Button
            mode="contained"
            onPress={saveRecite}
            style={{ marginTop: 8, backgroundColor: "#000" }}
            labelStyle={{ color: "#fff", fontWeight: "bold" }}
          >
            {editingReciteId ? "Save Changes" : "Add Recite"}
          </Button>
          <Button
            onPress={clearModal}
            style={{ marginTop: 8, backgroundColor: "#ffdddd" }}
            labelStyle={{ color: "#b71c1c", fontWeight: "bold" }}
            mode="contained"
          >
            Cancel
          </Button>
        </Modal>
      </Portal>

      {/* Add Recite Button */}
      <Button
        mode="contained"
        onPress={handleOpenCreate}
        style={styles.fab}
        contentStyle={{ height: 48, backgroundColor: "#000" }}
        labelStyle={{ color: "#fff", fontWeight: "bold" }}
      >
        Add Recite
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 24,
    elevation: 4,
    backgroundColor: "#000",
  },
  modalContainer: {
    backgroundColor: "white",
    margin: 24,
    borderRadius: 12,
    padding: 20,
  },
});