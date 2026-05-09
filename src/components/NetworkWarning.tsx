import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../theme/colors';
import { checkNetworkStatus, monitorNetwork } from '../utils/network';
import { log } from '../utils/logger';
import { t } from '../i18n';

const NetworkWarning: React.FC = () => {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    checkNetworkStatus().then((s) => {
      const isOnline = s === 'online';
      setOnline(isOnline);
      log.net('NetworkWarning', `初始网络: ${isOnline ? '联网' : '离线'}`);
    });
    return monitorNetwork((s) => {
      const isOnline = s === 'online';
      setOnline(isOnline);
      log.net('NetworkWarning', `网络变化: ${isOnline ? '联网' : '离线'}`);
    });
  }, []);

  if (!online) return null;

  return (
    <View style={styles.bar}>
      <Text style={styles.text}>{t('network_warning')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.warning,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  text: {
    color: '#000',
    fontSize: Colors.font.sm,
    fontWeight: '600',
  },
});

export default NetworkWarning;
