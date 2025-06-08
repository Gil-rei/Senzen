import { getAuth } from "firebase/auth";
import { collection, doc, getDocs, query, Timestamp, updateDoc, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { AppState, FlatList, StyleSheet, View } from "react-native";
import { Card, Checkbox, Text } from "react-native-paper";
import { db } from "../../firebaseConfig";

type Task = {
  id: string;
  name: string;
  description: string;
  caretakerId: string;
  patientId: string;
  timestamp: Timestamp;
  done?: boolean;
};

export default function PatientTasksScreen() {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all tasks assigned to this patient
  const fetchTasks = async () => {
    if (!currentUser) return;
    const q = query(collection(db, "tasks"), where("patientId", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);
    const loadedTasks: Task[] = [];
    querySnapshot.forEach(docSnap => {
      loadedTasks.push({ id: docSnap.id, ...docSnap.data() } as Task);
    });
    setTasks(loadedTasks.sort(
      (a, b) => a.timestamp.toMillis() - b.timestamp.toMillis()
    ));
  };

  useEffect(() => {
    fetchTasks();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchTasks();
    });
    return () => subscription?.remove();
  }, [currentUser]);

  // Mark a task as done
  const handleToggleDone = async (task: Task) => {
    // Prevent marking as done if current time is before the scheduled timestamp
    const now = new Date();
    const taskDate = task.timestamp.toDate();
    if (now < taskDate) {
      // Optionally, show a message here (e.g. Toast/Snackbar)
      return;
    }
    const newDone = !task.done;
    await updateDoc(doc(db, "tasks", task.id), { done: newDone });
    setTasks(tasks =>
      tasks.map(t => (t.id === task.id ? { ...t, done: newDone } : t))
    );
    // Optionally: show confirmation, trigger reward, etc.
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        contentContainerStyle={{ paddingBottom: 80 }}
        data={tasks}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={fetchTasks}
        renderItem={({ item }) => {
          const now = new Date();
          const taskTime = item.timestamp.toDate();
          const isBefore = now < taskTime;
          return (
            <Card
              mode="outlined"
              style={{
                marginBottom: 12,
                borderColor: "#000",
                borderWidth: 1,
                backgroundColor: item.done ? "#e0e0e0" : "#fff",
                opacity: item.done ? 0.6 : 1,
              }}
            >
              <Card.Title
                title={
                  <Text style={{ color: "#000", fontWeight: "bold" }}>
                    {item.name}
                  </Text>
                }
                subtitle={
                  <Text style={{ color: "#000", marginTop: -6 }}>
                    {item.timestamp.toDate().toLocaleString()}
                  </Text>
                }
                right={props => (
                  <Checkbox
                    {...props}
                    status={item.done ? "checked" : "unchecked"}
                    onPress={() => !isBefore && handleToggleDone(item)}
                    disabled={isBefore}
                    color={isBefore ? "#888" : "#388e3c"}
                  />
                )}
              />
              <Card.Content>
                <Text style={{ color: "#000" }}>{item.description}</Text>
                {isBefore && !item.done && (
                  <Text style={{ color: "#b71c1c", marginTop: 8, fontWeight: "bold" }}>
                    You can mark this as done after: {taskTime.toLocaleString()}
                  </Text>
                )}
              </Card.Content>
            </Card>
          );
        }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 32, color: "#000" }}>
            No tasks yet.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Add custom styles if needed
});