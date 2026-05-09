import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Colors from '../theme/colors';
import {
  listEncryptedFiles,
  deleteEncryptFile,
  formatFileSize,
} from '../utils/workspace';
import { hapticLight } from '../utils/haptic';
import { log } from '../utils/logger';
import { t } from '../i18n';
import type { RootStackParamList, FileInfo } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'FileList'>;

const FileListScreen: React.FC<Props> = ({ navigation }) => {
  const [files, setFiles] = useState<FileInfo[]>([]);

  useFocusEffect(
    useCallback(() => {
      listEncryptedFiles().then(setFiles);
    }, []),
  );

  const handleDelete = useCallback((f: FileInfo) => {
    log.touch('FileList', `点击删除: ${f.name}`);
    Alert.alert(
      t('filelist_delete_title'),
      t('filelist_delete_msg').replace('{name}', f.name),
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('common_delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEncryptFile(f.path);
              log.file('FileList', `已删除: ${f.name}`);
              listEncryptedFiles().then(setFiles);
            } catch (e: any) {
              log.error('FileList', `删除失败: ${e.message}`);
              Alert.alert(t('filelist_delete_fail'), e.message);
            }
          },
        },
      ],
    );
  }, []);

  const handleDecrypt = useCallback(
    (f: FileInfo) => {
      hapticLight();
      log.touch('FileList', `点击解密: ${f.name}`);
      navigation.navigate('Decrypt', { filePath: f.path });
    },
    [navigation],
  );

  const handleShare = useCallback(
    (f: FileInfo) => {
      hapticLight();
      log.touch('FileList', `点击分享: ${f.name}`);
      navigation.navigate('Share', {
        filePath: f.path,
        fileName: f.name,
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: FileInfo }) => (
      <View style={styles.fileCard}>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.originalName}
          </Text>
          <Text style={styles.fileMeta}>
            {formatFileSize(item.size)} ·{' '}
            {item.fileType.toUpperCase()}
          </Text>
        </View>
        <View style={styles.fileActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDecrypt(item)}>
            <Text style={styles.actionText}>🔓</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleShare(item)}>
            <Text style={styles.actionText}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDelete(item)}>
            <Text style={styles.actionText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [handleDecrypt, handleShare, handleDelete],
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={files}
        keyExtractor={(i) => i.path}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>{t('filelist_empty')}</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Colors.gap.lg },
  fileCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fileInfo: { marginBottom: 8 },
  fileName: {
    fontSize: Colors.font.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  fileMeta: { fontSize: Colors.font.sm, color: Colors.textHint },
  fileActions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Colors.radius.sm,
  },
  actionText: { fontSize: 18 },
  empty: {
    textAlign: 'center',
    color: Colors.textHint,
    marginTop: 40,
    fontSize: Colors.font.md,
  },
});

export default FileListScreen;
