import * as ImagePicker from "expo-image-picker";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { FlatList, Platform, ScrollView, Text, View } from "react-native";
import { Button, Card, Dialog, IconButton, Paragraph, Portal, TextInput } from "react-native-paper";
import { db } from "../../firebaseConfig";

// Cloudinary upload function with web/native support and error logging
const uploadToCloudinary = async (uri: string) => {
  const data = new FormData();

  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    const file = new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" });
    console.log("Uploading file object:", file);
    data.append("file", file);
    console.log("Blob type:", blob.type, "Blob size:", blob.size);
  } else {
    data.append("file", {
      uri,
      type: "image/jpeg",
      name: "photo.jpg",
    } as any);
  }

  data.append("upload_preset", "senzen");

  // Log FormData keys for debugging
  if (Platform.OS === "web") {
    // @ts-ignore
    if (typeof data.entries === "function") {
      // @ts-ignore
      for (let pair of data.entries()) {
        console.log(pair[0], pair[1]);
      }
    } else {
      console.log("FormData.entries() not available on this platform.");
    }
  }

  const res = await fetch("https://api.cloudinary.com/v1_1/dqbalvtws/image/upload", {
    method: "POST",
    body: data,
  });
  const file = await res.json();
  console.log("Cloudinary upload result:", file);
  if (!file.secure_url) {
    throw new Error(file.error?.message || "Cloudinary upload failed");
  }
  return file.secure_url;
};

export default function AccountsScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFrontPhoto, setEditFrontPhoto] = useState<string | null>(null);
  const [editBackPhoto, setEditBackPhoto] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignPatient, setAssignPatient] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPatientList, setShowPatientList] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
      setFiltered(usersList);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!search) {
      setFiltered(users);
    } else {
      setFiltered(
        users.filter(u =>
          u.name?.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, users]);

  // When opening modal, set initial values
  const openEdit = (user: any) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditFrontPhoto(user.frontPhoto ?? null);
    setEditBackPhoto(user.backPhoto ?? null);
    const assigned = user.assignedPatientId
      ? users.find(u => u.id === user.assignedPatientId)
      : null;
    setAssignPatient(assigned);
    setAssignSearch(assigned ? assigned.name : "");
    setShowPatientList(false);
  };

  // Pick image handler
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

  // Save handler
  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);

    let frontPhotoUrl = editFrontPhoto;
    let backPhotoUrl = editBackPhoto;

    try {
      // Only upload if a new local photo was picked (not already a URL)
      if (
        editingUser.role === "patient" &&
        editFrontPhoto &&
        !editFrontPhoto.startsWith("http")
      ) {
        frontPhotoUrl = await uploadToCloudinary(editFrontPhoto);
      }
      if (
        editingUser.role === "patient" &&
        editBackPhoto &&
        !editBackPhoto.startsWith("http")
      ) {
        backPhotoUrl = await uploadToCloudinary(editBackPhoto);
      }

      // Debug logs
      console.log("Saving frontPhotoUrl:", frontPhotoUrl);
      console.log("Saving backPhotoUrl:", backPhotoUrl);

      // Prepare update object
      const update: any = {
        name: editName,
        email: editEmail,
      };

      if (editingUser.role === "patient") {
        update.frontPhoto = typeof frontPhotoUrl !== "undefined" ? frontPhotoUrl : null;
        update.backPhoto = typeof backPhotoUrl !== "undefined" ? backPhotoUrl : null;
      }
      if (editingUser.role === "caretaker") {
        update.assignedPatientId = assignPatient ? assignPatient.id : null;
      }

      await setDoc(doc(db, "users", editingUser.id), { ...editingUser, ...update });
      setUsers(users =>
        users.map(u => (u.id === editingUser.id ? { ...u, ...update } : u))
      );
      setEditingUser(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert("Photo upload failed: " + errorMsg);
      console.error(err);
    }
    setSaving(false);
  };

  // Filter patients for assignment
  const patientOptions = users.filter(u =>
    u.role === "patient" &&
    u.name?.toLowerCase().includes(assignSearch.toLowerCase())
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        label="Search by name"
        value={search}
        onChangeText={setSearch}
        mode="outlined"
        style={{ marginBottom: 12, backgroundColor: "#fff" }}
        outlineColor="#000"
        activeOutlineColor="#000"
        textColor="#000"
      />
      <FlatList
        data={filtered}
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
              title={<Text style={{ color: "#000", fontWeight: "bold" }}>{item.name}</Text>}
              subtitle={
                <Text style={{ color: "#000", marginTop: -6 }}>{item.role}</Text>
              }
              left={props => (
                <IconButton
                  {...props}
                  icon="account"
                  style={{ marginLeft: 0 }}
                  theme={{ colors: { primary: "#000" } }}
                />
              )}
              right={props => (
                <IconButton
                  {...props}
                  icon="pencil"
                  onPress={() => openEdit(item)}
                  theme={{ colors: { primary: "#000" } }}
                />
              )}
            />
          </Card>
        )}
        ListEmptyComponent={<Text>No users found.</Text>}
      />

      {/* Edit Modal */}
      <Portal>
        <Dialog
          visible={!!editingUser}
          onDismiss={() => setEditingUser(null)}
          style={{
            borderColor: "#000",
            borderWidth: 2,
            backgroundColor: "#fff",
          }}
        >
          <Dialog.Title>
            <Text style={{ color: "#000", fontWeight: "bold" }}>Edit User</Text>
          </Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 24,
              backgroundColor: "#fff"
            }}>
              <TextInput
                label="Name"
                value={editName}
                onChangeText={setEditName}
                mode="outlined"
                style={{ marginBottom: 8, backgroundColor: "#fff" }}
                outlineColor="#000"
                activeOutlineColor="#000"
                textColor="#000"
                theme={{ colors: { primary: "#000" } }}
              />
              <TextInput
                label="Email"
                value={editEmail}
                onChangeText={setEditEmail}
                mode="outlined"
                style={{ marginBottom: 8, backgroundColor: "#fff" }}
                outlineColor="#000"
                activeOutlineColor="#000"
                textColor="#000"
                theme={{ colors: { primary: "#000" } }}
              />
              {editingUser?.role === "patient" && (
                <>
                  <Button
                    mode="outlined"
                    onPress={() => pickImage(setEditFrontPhoto)}
                    style={{ marginBottom: 8, borderColor: "#000", borderWidth: 1, backgroundColor: "#fff" }}
                    textColor="#000"
                  >
                    {editFrontPhoto ? "Change Front Photo" : "Upload Front Photo"}
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => pickImage(setEditBackPhoto)}
                    style={{ marginBottom: 8, borderColor: "#000", borderWidth: 1, backgroundColor: "#fff" }}
                    textColor="#000"
                  >
                    {editBackPhoto ? "Change Back Photo" : "Upload Back Photo"}
                  </Button>
                </>
              )}
              {editingUser?.role === "caretaker" && (
                <>
                  <TextInput
                    label="Assign Patient"
                    value={assignSearch}
                    onChangeText={setAssignSearch}
                    mode="outlined"
                    style={{ marginBottom: 8, backgroundColor: "#fff" }}
                    outlineColor="#000"
                    activeOutlineColor="#000"
                    textColor="#000"
                    placeholder="Search patient by name"
                    theme={{ colors: { primary: "#000" } }}
                    onFocus={() => setShowPatientList(true)}
                  />
                  {showPatientList && (
                    <FlatList
                      data={patientOptions}
                      keyExtractor={item => item.id}
                      style={{ maxHeight: 120 }}
                      renderItem={({ item }) => (
                        <Button
                          mode={assignPatient?.id === item.id ? "contained" : "outlined"}
                          onPress={() => {
                            setAssignPatient(item);
                            setAssignSearch(item.name);
                            setShowPatientList(false);
                          }}
                          style={{
                            marginBottom: 4,
                            borderColor: "#000",
                            borderWidth: assignPatient?.id === item.id ? 0 : 1,
                            backgroundColor: assignPatient?.id === item.id ? "#000" : "#fff",
                          }}
                          textColor={assignPatient?.id === item.id ? "#fff" : "#000"}
                        >
                          {item.name}
                        </Button>
                      )}
                      ListEmptyComponent={<Text>No patients found.</Text>}
                    />
                  )}
                  {assignPatient && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 8,
                        backgroundColor: "#f5f5f5",
                        borderRadius: 8,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        justifyContent: "space-between",
                        borderWidth: 1,
                        borderColor: "#000",
                      }}
                    >
                      <Paragraph style={{ color: "#000", fontWeight: "bold", flexShrink: 1 }}>
                        Assigned to: {assignPatient.name}
                      </Paragraph>
                      <Button
                        mode="contained"
                        onPress={() => setAssignPatient(null)}
                        buttonColor="#ffdddd"
                        style={{
                          marginLeft: 8,
                          minWidth: 0,
                          paddingHorizontal: 8,
                          borderRadius: 6,
                          elevation: 0,
                        }}
                        labelStyle={{ color: "#b71c1c", fontWeight: "bold" }}
                        compact
                      >
                        Unassign
                      </Button>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setEditingUser(null)} textColor="#000" mode="text">
              Cancel
            </Button>
            <Button
              loading={saving}
              onPress={handleSave}
              textColor="#000"
              mode="text"
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}