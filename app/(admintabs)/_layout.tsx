import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs, useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { Image, TouchableOpacity } from "react-native";
import { auth } from "../../firebaseConfig";

const logo = require("../../assets/images/logo.png");

function LogoutButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={async () => {
        await signOut(auth);
        router.replace("/login");
      }}
      style={{ marginRight: 16 }}
    >
      <MaterialIcons name="logout" size={24} color="black" />
    </TouchableOpacity>
  );
}

export default function AdminTabs() {
  return (
    <Tabs 
      screenOptions={{ 
        tabBarActiveTintColor: "black", 
        tabBarActiveBackgroundColor: "white", 
        tabBarInactiveBackgroundColor: "lightgrey", 
        headerTitleAlign: "center"
      }}
    >
      <Tabs.Screen name="accounts" 
                  options={{
                    headerTitle: () => (<Image source={logo} style={{ width: 100, height: 40, resizeMode: "contain" }} />),
                    tabBarIcon:({ color }) => (<MaterialCommunityIcons name="account-group" size={24} color="black"/>),
                    headerRight: () => <LogoutButton />,
                  }}
      />
      <Tabs.Screen name="create" 
                  options={{
                    headerTitle: () => (<Image source={logo} style={{ width: 100, height: 40, resizeMode: "contain" }} />), 
                    tabBarIcon:({ color }) => (<MaterialIcons name="manage-accounts" size={24} color="black"/>),
                    headerRight: () => <LogoutButton />,
                  }}
      />
    </Tabs>
  );
}
