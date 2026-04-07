import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'Дневник',
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name='analytics'
        options={{
          title: 'Аналитика',
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: 'Профиль',
          tabBarIcon: () => null,
        }}
      />
    </Tabs>
  )
}
