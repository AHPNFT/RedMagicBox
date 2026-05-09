import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '../theme/colors';
import { log } from '../utils/logger';
import { t } from '../i18n';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: string;
  stack: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: '', stack: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error: error.message || String(error),
      stack: error.stack || '',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    log.error('ErrorBoundary', `应用崩溃: ${error.message}`);
    log.error('ErrorBoundary', `组件栈: ${info.componentStack}`);
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.root}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{t('error_crash_title')}</Text>
            <Text style={styles.label}>{t('error_crash_msg_label')}</Text>
            <Text style={styles.error}>{this.state.error}</Text>
            <Text style={styles.label}>{t('error_crash_stack_label')}</Text>
            <Text style={styles.stack}>{this.state.stack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 60 },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.error,
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 6,
  },
  error: {
    fontSize: 14,
    color: Colors.error,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  stack: {
    fontSize: 11,
    color: Colors.textHint,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
