import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import ErrorBoundary from './src/components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/components/SplashScreen';
import { initLogger, shutdownLogger, log } from './src/utils/logger';
import { checkNetworkStatus, monitorNetwork } from './src/utils/network';
import { initWorkspace } from './src/utils/workspace';
import { initLang } from './src/i18n';

function App(): React.JSX.Element {
  const [showSplash, setShowSplash] = useState(true);
  const [rooted, setRooted] = useState(false);
  const [ready, setReady] = useState(false);
  const [langReady, setLangReady] = useState(false);

  useEffect(() => {
    initLang().then(() => {
      setLangReady(true);
    });
  }, []);

  const handleSplashFinish = (isRooted: boolean) => {
    setRooted(isRooted);
    setShowSplash(false);

    (async () => {
      try {
        const ws = await initWorkspace();
        await initLogger(ws.initialized ? ws.path : undefined);

        log.start('App', '========== 应用启动 ==========');
        log.info('App', `版本: 3.9.22 | 平台: Android | 语言: ${await initLang()}`);

        const netStatus = await checkNetworkStatus();
        log.net('App', `初始网络状态: ${netStatus}`);
        log.info('App', `工作区初始化: ${ws.initialized ? '成功' : '失败'} | 路径: ${ws.path} | 文件数: ${ws.fileCount}`);
        log.start('App', '========== 启动完成 ==========');

        setReady(true);
      } catch (e) {
        console.error('App init error:', e);
        setReady(true);
      }
    })();
  };

  useEffect(() => {
    const unsub = monitorNetwork((s) => {
      log.net('App', `网络状态变更: ${s}`);
    });

    return () => {
      unsub();
      shutdownLogger();
    };
  }, []);

  if (showSplash) {
    if (!langReady) return null;
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <ErrorBoundary>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      {ready ? <AppNavigator rooted={rooted} /> : null}
    </ErrorBoundary>
  );
}

export default App;
