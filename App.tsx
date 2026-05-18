import React from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {navigationRef} from './src/navigation/navigationRef';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import './src/i18n';
import {AppNavigationTheme} from './src/theme/navigationTheme';
import {colors} from './src/theme/tokens';
import {UserProvider} from './src/context/UserContext';
import {RootNavigator} from './src/navigation/RootNavigator';
import {TonConnectProvider} from './src/tonconnect/provider/TonConnectProvider';
import {useCASInit} from './src/hooks/useCASInit';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {retry: 1},
  },
});

function CASInit() {
  useCASInit();
  return null;
}

function App() {
  return (
    <GestureHandlerRootView style={{flex: 1, backgroundColor: colors.bg}}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider style={{flex: 1, backgroundColor: colors.bg}}>
          <UserProvider>
            <TonConnectProvider>
              <CASInit />
              <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
              <NavigationContainer ref={navigationRef} theme={AppNavigationTheme}>
                <RootNavigator />
              </NavigationContainer>
            </TonConnectProvider>
          </UserProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default App;
