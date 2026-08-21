import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useChatStore } from '@/store/useChatStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useProductStore } from '@/store/useProductStore';
import { useFarmStore } from '@/store/useFarmStore';
import { useTheme } from '@/theme/ThemeProvider';
import { runAgent } from '@/services/ai/agent';
import { ToolContext } from '@/services/ai/tools';
import { AREA_LABEL } from '@/utils/format';

const SUGGESTIONS = [
  'Bagaimana cuaca hari ini?',
  'Kebutuhan urea untuk 2 ha dosis 200 kg/ha?',
  'Rekomendasi pestisida untuk ulat daun',
];

const AIChatScreen: React.FC = () => {
  const { palette } = useTheme();
  const messages = useChatStore((s) => s.messages);
  const addUser = useChatStore((s) => s.addUser);
  const addAssistant = useChatStore((s) => s.addAssistant);
  const backendUrl = useSettingsStore((s) => s.backendUrl);
  const coords = useSettingsStore((s) => s.coords);
  const locationName = useSettingsStore((s) => s.locationName);
  const products = useProductStore((s) => s.products);
  const farms = useFarmStore((s) => s.farms);

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList>(null);

  const buildContext = (): ToolContext => {
    const farm = farms[0];
    return {
      coords: coords ?? undefined,
      locationName,
      products,
      farmContext: farm
        ? {
            farmName: farm.name,
            areaText: `${farm.areaValue} ${AREA_LABEL[farm.areaUnit]}`,
            cropsText: farm.crops.map(
              (c) => `${c.cropType}${c.variety ? ` (${c.variety})` : ''} — ${c.growthStage}`
            ),
          }
        : undefined,
    };
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput('');
    addUser(text);
    setBusy(true);
    try {
      const turn = await runAgent(messages, text, buildContext(), backendUrl);
      addAssistant(turn.reply, turn.toolsUsed.join(', ') || undefined);
    } catch {
      addAssistant('Maaf terjadi kesalahan. Coba lagi.');
    } finally {
      setBusy(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <View style={[styles.botAvatar, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name="sparkles" size={20} color={palette.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontWeight: '800', fontSize: 16 }}>AI Tani</Text>
            <Text style={{ color: palette.textMuted, fontSize: 11 }}>
              {backendUrl ? 'Terhubung ke server AI' : 'Mode lokal — alat bantu & kalkulasi'}
            </Text>
          </View>
          <TouchableOpacity onPress={useChatStore.getState().reset}>
            <Ionicons name="refresh-outline" size={22} color={palette.textMuted} />
          </TouchableOpacity>
        </View>

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
              <Text style={{ color: palette.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4 }}>
                Cuaca, pupuk, pestisida, hama & penyakit. AI akan memanggil kalkulator saat diperlukan.
              </Text>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => send(s)}
                    style={[styles.suggestion, { borderColor: palette.border, backgroundColor: palette.surface }]}
                  >
                    <Text style={{ color: palette.primary, fontSize: 13, fontWeight: '600' }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.bubbleRow, item.role === 'user' && { justifyContent: 'flex-end' }]}>
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor:
                      item.role === 'user' ? palette.primary : palette.surface,
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
              </View>
            </View>
          )}
        />

        {busy ? (
          <View style={styles.typing}>
            <ActivityIndicator size="small" color={palette.primary} />
            <Text style={{ color: palette.textMuted, fontSize: 12, marginLeft: 6 }}>
              AI sedang menganalisis...
            </Text>
          </View>
        ) : null}

        <View style={[styles.inputBar, { borderTopColor: palette.border, backgroundColor: palette.surface }]}>
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
            disabled={busy || !input.trim()}
            style={[
              styles.sendBtn,
              { backgroundColor: palette.primary, opacity: busy || !input.trim() ? 0.5 : 1 },
            ]}
          >
            <Ionicons name="send" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
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
  list: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
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
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 6,
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
});

export default AIChatScreen;
