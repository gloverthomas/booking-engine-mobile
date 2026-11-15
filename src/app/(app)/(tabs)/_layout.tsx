import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/theme";

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.paper },
        headerTitleStyle: { color: t.ink, fontWeight: "800" },
        headerShadowVisible: false,
        tabBarActiveTintColor: t.ink,
        tabBarInactiveTintColor: t.inkSubtle,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.line },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color }) => (
            <SymbolView name="calendar" tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "Clients",
          tabBarIcon: ({ color }) => (
            <SymbolView name="person.2" tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => (
            <SymbolView name="person.crop.circle" tintColor={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
