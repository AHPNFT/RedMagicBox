import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Colors from '../theme/colors';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import EncryptScreen from '../screens/EncryptScreen';
import DecryptScreen from '../screens/DecryptScreen';
import FileListScreen from '../screens/FileListScreen';
import ShareScreen from '../screens/ShareScreen';
import WorkspaceSettingsScreen from '../screens/WorkspaceSettingsScreen';
import PermissionSettingsScreen from '../screens/PermissionSettingsScreen';
import AboutScreen from '../screens/AboutScreen';
import ActivationScreen from '../screens/ActivationScreen';
import type { RootStackParamList } from '../types';
import { getSession } from '../utils/user';
import { log } from '../utils/logger';
import { t } from '../i18n';

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: Colors.surface },
  headerTintColor: Colors.text,
  headerTitleStyle: { fontWeight: '700' as const },
  contentStyle: { backgroundColor: Colors.background },
};

interface AppNavigatorProps {
  rooted: boolean;
}

const AppNavigator: React.FC<AppNavigatorProps> = ({ rooted }) => {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    getSession().then((s) => {
      const route = s ? 'Home' : 'Login';
      log.nav('Navigator', `初始路由: ${route}${s ? ` (用户: ${s})` : ' (未登录)'}`);
      setInitialRoute(route);
    });
  }, []);

  if (!initialRoute) return null;

  return (
    <NavigationContainer
      onStateChange={(state) => {
        if (state) {
          const routes = state.routes;
          const current = routes[routes.length - 1];
          log.nav('Navigator', `导航到: ${current.name} | 栈深度: ${routes.length}`);
        }
      }}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={screenOptions}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home">
          {(props) => <HomeScreen {...props} rooted={rooted} />}
        </Stack.Screen>
        <Stack.Screen name="Encrypt" component={EncryptScreen} options={{ title: t('nav_encrypt') }} />
        <Stack.Screen name="Decrypt" component={DecryptScreen} options={{ title: t('nav_decrypt') }} />
        <Stack.Screen name="FileList" component={FileListScreen} options={{ title: t('nav_filelist') }} />
        <Stack.Screen name="Share" component={ShareScreen} options={{ title: t('nav_share') }} />
        <Stack.Screen name="WorkspaceSettings" component={WorkspaceSettingsScreen} options={{ title: t('nav_workspace') }} />
        <Stack.Screen name="PermissionSettings" component={PermissionSettingsScreen} options={{ title: t('nav_permission') }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ title: t('nav_about') }} />
        <Stack.Screen name="Activation" component={ActivationScreen} options={{ title: t('nav_activation') }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
