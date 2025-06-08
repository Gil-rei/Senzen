import DateTimePicker from "@react-native-community/datetimepicker";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  IconButton,
  Modal,
  Portal,
  Snackbar,
  Text,
  TextInput,
} from "react-native-paper";
import { db } from "../../firebaseConfig";

type Task = {
  id: string;
  name: string;
  description: string;
  caretakerId: string;
  patientId: string;
  timestamp: Timestamp;
  done: boolean;
};

export default function TaskScreen() {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  // Track previous done state for notification
  const previousTasksRef = useRef<Record<string, boolean>>({});

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

  // Real-time fetch tasks for this caretaker's patient
  useEffect(() => {
    if (!patientId) {
      setTasks([]);
      return;
    }
    const q = query(collection(db, "tasks"), where("patientId", "==", patientId));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const loadedTasks: Task[] = [];
      const prev = previousTasksRef.current;
      const current: Record<string, boolean> = {};
      let notificationShown = false;

      querySnapshot.forEach((docSnap) => {
        const task = { id: docSnap.id, ...docSnap.data() } as Task;
        loadedTasks.push(task);

        // Check done transitions for notification
        if (
          prev[task.id] === false &&
          task.done === true &&
          !notificationShown
        ) {
          setSnackbarMsg(`Task "${task.name}" was marked as done by the patient.`);
          setSnackbarVisible(true);
          notificationShown = true; // Only show for first found, avoid spamming
        }
        current[task.id] = task.done;
      });
      previousTasksRef.current = current;
      setTasks(loadedTasks);
    });
    return unsubscribe;
  }, [patientId]);

  // Add or update a task in Firestore
  const saveTask = async () => {
    if (!name || !description || !time || !date || !currentUser || !patientId) {
      setError("Please fill in all fields.");
      return;
    }
    setError(null);
    const combinedDateTime = new Date(`${date}T${time}`);
    if (editingTaskId) {
      // Update existing task (don't overwrite done status)
      const taskRef = doc(db, "tasks", editingTaskId);
      await updateDoc(taskRef, {
        name,
        description,
        timestamp: Timestamp.fromDate(combinedDateTime),
      });
      setTasks((tasks) =>
        tasks.map((t) =>
          t.id === editingTaskId
            ? { ...t, name, description, timestamp: Timestamp.fromDate(combinedDateTime) }
            : t
        )
      );
    } else {
      // Add new task with done: false
      const docRef = await addDoc(collection(db, "tasks"), {
        name,
        description,
        caretakerId: currentUser.uid,
        patientId,
        timestamp: Timestamp.fromDate(combinedDateTime),
        done: false, // <--- Added
      });
      setTasks([
        ...tasks,
        {
          id: docRef.id,
          name,
          description,
          caretakerId: currentUser.uid,
          patientId,
          timestamp: Timestamp.fromDate(combinedDateTime),
          done: false,
        },
      ]);
    }
    clearModal();
  };

  // Delete a task from Firestore
  const handleDeleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, "tasks", taskId));
    setTasks((tasks) => tasks.filter((t) => t.id !== taskId));
  };

  // Date and Time Picker handlers
  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate.toISOString().slice(0, 10));
      if (error) setError(null);
    }
  };

  const handleTimeChange = (_: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, "0");
      const minutes = selectedTime.getMinutes().toString().padStart(2, "0");
      setTime(`${hours}:${minutes}`);
      if (error) setError(null);
    }
  };

  // Open modal for editing
  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setName(task.name);
    setDescription(task.description);
    setDate(task.timestamp.toDate().toISOString().slice(0, 10));
    setTime(
      task.timestamp
        .toDate()
        .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
    );
    setModalVisible(true);
  };

  // Open modal for creating
  const handleOpenCreate = () => {
    setEditingTaskId(null);
    setName("");
    setDescription("");
    setDate("");
    setTime("");
    setError(null);
    setModalVisible(true);
  };

  // Clear modal fields
  const clearModal = () => {
    setEditingTaskId(null);
    setName("");
    setDescription("");
    setDate("");
    setTime("");
    setModalVisible(false);
    setError(null);
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        contentContainerStyle={{ paddingBottom: 80 }}
        data={tasks}
        keyExtractor={(item) => item.id}
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
              title={<Text style={{ color: "#000", fontWeight: "bold" }}>{item.name}</Text>}
              subtitle={
                <Text style={{ color: "#000", marginTop: -6 }}>
                  {item.timestamp.toDate().toLocaleString()}
                </Text>
              }
              right={(props) => (
                <View style={{ flexDirection: "row" }}>
                  <IconButton
                    {...props}
                    icon="pencil"
                    onPress={() => handleEditTask(item)}
                    theme={{ colors: { primary: "#000" } }}
                  />
                  <IconButton
                    {...props}
                    icon="delete"
                    onPress={() => handleDeleteTask(item.id)}
                    theme={{ colors: { primary: "#b71c1c" } }}
                  />
                </View>
              )}
            />
            <Card.Content>
              <Text style={{ color: "#000" }}>{item.description}</Text>
              {item.done && (
                <Text style={{ color: "#43a047", marginTop: 4, fontWeight: "bold" }}>
                  Marked as done
                </Text>
              )}
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 32, color: "#000" }}>
            No tasks yet.
          </Text>
        }
      />

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
            label="Task Name"
            value={name}
            onChangeText={(text) => {
              setName(text);
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
            label="Description"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (error) setError(null);
            }}
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
            style={{
              marginBottom: 8,
              borderColor: "#000",
              borderWidth: 1,
              backgroundColor: "#fff",
            }}
            textColor="#000"
          >
            {date ? `Date: ${date}` : "Select Date"}
          </Button>
          <Button
            mode="outlined"
            onPress={() => setShowTimePicker(true)}
            style={{
              marginBottom: 8,
              borderColor: "#000",
              borderWidth: 1,
              backgroundColor: "#fff",
            }}
            textColor="#000"
          >
            {time ? `Time: ${time}` : "Select Time"}
          </Button>
          {showDatePicker && (
            <DateTimePicker
              value={date ? new Date(date + "T00:00") : new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={time ? new Date(`1970-01-01T${time}`) : new Date()}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
          <Button
            mode="contained"
            onPress={saveTask}
            style={{ marginTop: 8, backgroundColor: "#000" }}
            labelStyle={{ color: "#fff", fontWeight: "bold" }}
          >
            {editingTaskId ? "Save Changes" : "Add Task"}
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

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={{ backgroundColor: "#43a047" }}
      >
        {snackbarMsg}
      </Snackbar>

      <Button
        mode="contained"
        onPress={handleOpenCreate}
        style={styles.fab}
        contentStyle={{ height: 48, backgroundColor: "#000" }}
        labelStyle={{ color: "#fff", fontWeight: "bold" }}
      >
        Add Task
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