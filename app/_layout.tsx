import { Stack } from "expo-router";
import { Provider as PaperProvider } from "react-native-paper";

export default function RootLayout() {
  return (
    <PaperProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(admintabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(seniortabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(caretabs)" options={{ headerShown: false }} />
      </Stack>
    </PaperProvider>
  );
}