import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, Button, ScrollView } from 'react-native';

import AdminScreen from './screens/AdminScreen';
import ClientsScreen from './screens/ClientsScreen';
import ConfigurationScreen from './screens/ConfigurationScreen';
import CurrentAccountsScreen from './screens/CurrentAccountsScreen';
import DashboardScreen from './screens/DashboardScreen';
import DebugPriceDisplayScreen from './screens/DebugPriceDisplayScreen';
import LogisticScreen from './screens/LogisticScreen';
import PettyCashScreen from './screens/PettyCashScreen';
import ProfileScreen from './screens/ProfileScreen';
import ReportsScreen from './screens/ReportsScreen';
import RootScreen from './screens/RootScreen';
import SalesScreen from './screens/SalesScreen';
import SettingsScreen from './screens/SettingsScreen';
import StockScreen from './screens/StockScreen';
import SuppliersScreen from './screens/SuppliersScreen';
import TestAmountValidationScreen from './screens/TestAmountValidationScreen';
import TestPointMigrationScreen from './screens/TestPointMigrationScreen';
import TestPointSmartScreen from './screens/TestPointSmartScreen';

const Stack = createNativeStackNavigator();

function HomeScreen({ navigation }: any) {
  const screens = [
    'Admin',
    'Clients',
    'Configuration',
    'CurrentAccounts',
    'Dashboard',
    'DebugPriceDisplay',
    'Logistic',
    'PettyCash',
    'Profile',
    'Reports',
    'Root',
    'Sales',
    'Settings',
    'Stock',
    'Suppliers',
    'TestAmountValidation',
    'TestPointMigration',
    'TestPointSmart',
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {screens.map((name) => (
        <View key={name} style={{ marginBottom: 8 }}>
          <Button title={name} onPress={() => navigation.navigate(name)} />
        </View>
      ))}
    </ScrollView>
  );
}

function DetailsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Details Screen</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="Clients" component={ClientsScreen} />
        <Stack.Screen name="Configuration" component={ConfigurationScreen} />
        <Stack.Screen name="CurrentAccounts" component={CurrentAccountsScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="DebugPriceDisplay" component={DebugPriceDisplayScreen} />
        <Stack.Screen name="Logistic" component={LogisticScreen} />
        <Stack.Screen name="PettyCash" component={PettyCashScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="Root" component={RootScreen} />
        <Stack.Screen name="Sales" component={SalesScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Stock" component={StockScreen} />
        <Stack.Screen name="Suppliers" component={SuppliersScreen} />
        <Stack.Screen name="TestAmountValidation" component={TestAmountValidationScreen} />
        <Stack.Screen name="TestPointMigration" component={TestPointMigrationScreen} />
        <Stack.Screen name="TestPointSmart" component={TestPointSmartScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
