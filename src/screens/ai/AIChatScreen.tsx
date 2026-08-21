import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useChatStore, useActiveMessages } from '@/store/useChatStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useProductStore } from '@/store/useProductStore';
import { useFarmStore } from '@/store/useFarmStore';
import { useTheme } from '@/theme/ThemeProvider';
import { runAgent, runVisionAgent } from '@/services/ai/agent';
import { ToolContext } from '@/services/ai/tools';
import { AREA_LABEL, fmtNum } from '@/utils/format';
import { cropAgeDays, GROWTH_STAGE_LABEL } from '@/features/farm/helpers';
import { ChatMessage } from '@/types';
import { RootStackParamList } from '@/navigation/types';

const SUGGESTIONS = [
  'Bagaimana cuaca hari ini?',
  'Kebutuhan urea untuk 2 ha dosis 200 kg/ha?',
  'Rekomendasi pestisida untuk ulat daun',
  'Ingatkan saya penyemprotan besok',
];

const DIAGNOSIS_PROMPT =
  'Mode Diagnosis Hama/Penyakit aktif. Jelaskan kondisi tanaman Anda:\n' +
  '1. Komoditas & fase pertumbuhan\n' +
  '2. Gejala (bercak, layu, menguning, lubang pada daun...)\n' +
  '3. Bagian tanaman (daun muda/tua, batang, buah)\n' +
  '4. Sebaran (menyebar cepat atau bertahap)\n' +
  'Anda juga bisa melampirkan foto bila server AI terhubung.';

const AIChatScreen: React.FC = () => {
  const { palette } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const messages = useActiveMessages();
  const sessions = useChatStore((s) => s.sessions);
  const newSession = useChatStore((s) => s.newSession);
  const setActive = useChatStore((s) => s.setActive);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const addUser = useChatStore((s) => s.addUser);
  const addAssistant = useChatStore((s) => s.addAssistant);
  const backendUrl = useSettingsStore((s) => s.backendUrl);
  const coords = useSettingsStore((s) => s.coords);
  const locationName = useSettingsStore((s) => s.locationName);
  const products = useProductStore((s) => s.products);
  const farms = useFarmStore((s) => s.farms);
  const activeFarmId = useFarmStore((s) => s.activeFarmId);

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [diagnosisMode, setDiagnosisMode] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const buildContext = (): ToolContext => {
    const farm = farms.find((f) => f.id === activeFarmId) ?? farms[0];
    return {
      coords: coords ?? undefined,
      locationName,
      products,
      farmContext: farm
        ? {
            farmName: farm.name,
            areaText: `${farm.areaValue} ${AREA_LABEL[farm.areaUnit]}`,
            cropsText: farm.crops.map((c) => {
              const age = cropAgeDays(c.plantingDate);
              return [
                `${c.cropType}${c.variety ? ` (${c.variety})` : ''}`,
                age !== null ? `umur ${age} hari` : null,
                `fase ${GROWTH_STAGE_LABEL[c.growthStage]}`,
              ]
                .filter(Boolean)
                .join(', ');
            }),
          }
        : undefined,
    };
  };

  const scrollToEnd = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if ((!text && !attachedImage) || busy) return;
    setInput('');
    if (text) addUser(text);
    setBusy(true);
    try {
      if (attachedImage) {
        const base64 = attachedImage.includes('base64,')
          ? attachedImage.split('base64,')[1]
          : attachedImage;
        setAttachedImage(null);
        const turn = await runVisionAgent(base64, buildContext(), backendUrl);
        addAssistant(turn.reply, turn.toolsUsed.join(', ') || undefined);
      } else {
        const finalText =
          diagnosisMode && text
            ? `[MODE DIAGNOSIS] ${text}`
            : text;
        const turn = await runAgent(messages, finalText, buildContext(), backendUrl);
        addAssistant(turn.reply, turn.toolsUsed.join(', ') || undefined, turn.actions);
      }
    } catch {
      addAssistant('Maaf terjadi kesalahan. Coba lagi.');
    } finally {
      setBusy(false);
      scrollToEnd();
    }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Izin Diperlukan', 'Izinkan akses galeri untuk melampirkan foto tanaman.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setAttachedImage(result.assets[0].base64);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.bubbleRow, item.role === 'user' && { justifyContent: 'flex-end' }]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: item.role === 'user' ? palette.primary : palette.surface,
            borderColor: palette.border,
          },
        ]}
      >
        {item.toolName ? (
          <View style={[styles.toolChip, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name="construct" size={11} color={palette.primary} />
            <Text style={{ color: palette.primary, fontSize: 10, fontWeight: '700' }}>
              {' '}
              Tool: {item.toolName}
            </Text>
          </View>
        ) : null}
        <Text
          style={{
            color: item.role === 'user' ? '#ffffff' : palette.text,
            fontSize: 14.5,
            lineHeight: 21,
          }}
        >
          {item.content}
        </Text>
        {item.actions?.map((a) => (
          <TouchableOpacity
            key={a.route}
            style={[styles.actionChip, { borderColor: palette.primary }]}
            onPress={() => navigation.navigate(a.route as never)}
          >
            <Text style={{ color: palette.primary, fontSize: 12.5, fontWeight: '700' }}>
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <TouchableOpacity
            style={[styles.botAvatar, { backgroundColor: palette.primarySoft }]}
            onPress={() => setSessionsOpen(true)}
          >
            <Ionicons name="sparkles" size={20} color={palette.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontWeight: '800', fontSize: 16 }}>AI Tani</Text>
            <Text style={{ color: palette.textMuted, fontSize: 11 }}>
              {backendUrl ? 'Terhubung ke server AI' : 'Mode lokal — alat bantu & kalkulasi'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setDiagnosisMode((v) => !v)}
            style={[
              styles.modeBtn,
              {
                backgroundColor: diagnosisMode ? palette.danger : palette.surfaceAlt,
                borderColor: diagnosisMode ? palette.danger : palette.border,
              },
            ]}
          >
            <Ionicons name="medkit" size={13} color={diagnosisMode ? '#fff' : palette.textMuted} />
            <Text
              style={{
                color: diagnosisMode ? '#fff' : palette.textMuted,
                fontSize: 10.5,
                fontWeight: '800',
              }}
            >
              Diagnosis
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => newSession()}>
            <Ionicons name="add-circle-outline" size={26} color={palette.primary} />
          </TouchableOpacity>
        </View>

        {diagnosisMode ? (
          <View style={[styles.diagBanner, { backgroundColor: `${palette.danger}18` }]}>
            <Text style={{ color: palette.danger, fontSize: 11.5, fontWeight: '700' }}>
              Mode Diagnosis aktif — {DIAGNOSIS_PROMPT.split('. ')[0]}.
            </Text>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 40 }}>🤖🌾</Text>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 17, marginTop: 8 }}>
                Tanya apa saja soal pertanian
              </Text>
              <Text
                style={{ color: palette.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4 }}
              >
                Cuaca, pupuk, pestisida, hama & penyakit, jadwal aktivitas. AI memanggil kalkulator
                saat diperlukan.
              </Text>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => send(s)}
                    style={[
                      styles.suggestion,
                      { borderColor: palette.border, backgroundColor: palette.surface },
                    ]}
                  >
                    <Text style={{ color: palette.primary, fontSize: 13, fontWeight: '600' }}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          renderItem={renderMessage}
        />

        {busy ? (
          <View style={styles.typing}>
            <ActivityIndicator size="small" color={palette.primary} />
            <Text style={{ color: palette.textMuted, fontSize: 12, marginLeft: 6 }}>
              AI sedang menganalisis...
            </Text>
          </View>
        ) : null}

        {attachedImage ? (
          <View style={styles.attachBar}>
            <Image source={{ uri: `data:image/jpeg;base64,${attachedImage}` }} style={styles.attachThumb} />
            <Text style={{ color: palette.textMuted, fontSize: 12, flex: 1 }}>Foto terlampir</Text>
            <TouchableOpacity onPress={() => setAttachedImage(null)}>
              <Ionicons name="close-circle" size={22} color={palette.danger} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View
          style={[styles.inputBar, { borderTopColor: palette.border, backgroundColor: palette.surface }]}
        >
          <TouchableOpacity onPress={pickImage} style={styles.cameraBtn}>
            <Ionicons name="camera-outline" size={22} color={palette.primary} />
          </TouchableOpacity>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Tulis pertanyaan..."
            placeholderTextColor={palette.textMuted}
            multiline
            style={[styles.input, { color: palette.text, backgroundColor: palette.surfaceAlt }]}
          />
          <TouchableOpacity
            onPress={() => send()}
            disabled={busy || (!input.trim() && !attachedImage)}
            style={[
              styles.sendBtn,
              {
                backgroundColor: palette.primary,
                opacity: busy || (!input.trim() && !attachedImage) ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons name="send" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <Modal visible={sessionsOpen} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { backgroundColor: palette.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={{ color: palette.text, fontWeight: '800', fontSize: 16 }}>
                  Riwayat Konsultasi
                </Text>
                <TouchableOpacity onPress={() => setSessionsOpen(false)}>
                  <Ionicons name="close" size={24} color={palette.textMuted} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.newChatBtn, { borderColor: palette.primary }]}
                onPress={() => {
                  newSession();
                  setSessionsOpen(false);
                }}
              >
                <Ionicons name="add" size={18} color={palette.primary} />
                <Text style={{ color: palette.primary, fontWeight: '700' }}>Chat Baru</Text>
              </TouchableOpacity>
              <FlatList
                data={sessions.filter((s) => s.messages.length > 0)}
                keyExtractor={(s) => s.id}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={
                  <Text style={{ color: palette.textMuted, textAlign: 'center', padding: 20 }}>
                    Belum ada riwayat konsultasi.
                  </Text>
                }
                renderItem={({ item }) => (
                  <View
                    style={[styles.sessionItem, { borderColor: palette.border }]}
                  >
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => {
                        setActive(item.id);
                        setSessionsOpen(false);
                      }}
                    >
                      <Text style={{ color: palette.text, fontWeight: '700' }} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={{ color: palette.textMuted, fontSize: 11.5 }}>
                        {fmtNum(item.messages.length, 0)} pesan
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteSession(item.id)}>
                      <Ionicons name="trash-outline" size={17} color={palette.danger} />
                    </TouchableOpacity>
                  </View>
                )}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  botAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  diagBanner: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  list: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 12,
  },
  suggestions: {
    marginTop: 20,
    gap: 8,
    width: '100%',
  },
  suggestion: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  actionChip: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 6,
  },
  attachBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  attachThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
  },
  cameraBtn: {
    width: 38,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 110,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
});

export default AIChatScreen;
