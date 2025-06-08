import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
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

export default function CareTabs() {
  return (
    <Tabs 
      screenOptions={{ 
        tabBarActiveTintColor: "black", 
        tabBarActiveBackgroundColor: "white", 
        tabBarInactiveBackgroundColor: "lightgrey", 
        headerTitleAlign: "center"
      }}
    >
      <Tabs.Screen name="task" 
                  options={{
                    headerTitle: () => (<Image source={logo} style={{ width: 100, height: 40, resizeMode: "contain" }} />), 
                    tabBarIcon:({ color }) => (<FontAwesome5 name="tasks" size={24} color={color}/>),
                    headerRight: () => <LogoutButton />,
                  }}
      />
      <Tabs.Screen name="recite" 
                  options={{
                    headerTitle: () => (<Image source={logo} style={{ width: 100, height: 40, resizeMode: "contain" }} />),
                    tabBarIcon:({ color }) => (<AntDesign name="message1" size={24} color="black"/>),
                    headerRight: () => <LogoutButton />,
                  }}
      />
      <Tabs.Screen name="id" 
                  options={{
                    headerTitle: () => (<Image source={logo} style={{ width: 100, height: 40, resizeMode: "contain" }} />), 
                    tabBarIcon:({ color }) => (<AntDesign name="idcard" size={24} color={color}/>),
                    headerRight: () => <LogoutButton />,
                  }}
      />
    </Tabs>
  );
}
