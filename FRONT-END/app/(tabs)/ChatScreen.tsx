import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

interface Message {
  role: Role;
  content: string;
}

interface FoodProgress {
  name: string;
  sosStep: "cheirar" | "tocar" | "beijar" | "provar" | "comer";
}

interface ChildProfile {
  name: string;
  age: number; // meses
  foods: FoodProgress[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://ipv4:8000";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Paleta — creme/off-white do Stitch + navy bold + terracota como acento
const C = {
  cream:       "#F9F5EC",
  creamShade:  "#F0EAD6",
  navy:        "#1A2756",
  accent:      "#E07A5F",
  white:       "#FFFFFF",
  inputBorder: "#DDD5C4",
  placeholder: "#A89880",
  muted:       "#8A7A6A",
};

// ─── Mock — substituir pelo contexto real do app ──────────────────────────────

const MOCK_CHILD: ChildProfile = {
  name: "Miguel",
  age: 18,
  foods: [
    { name: "Banana",   sosStep: "provar"  },
    { name: "Cenoura",  sosStep: "tocar"   },
    { name: "Brócolis", sosStep: "cheirar" },
    { name: "Maçã",     sosStep: "comer"   },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Onda orgânica decorativa (identidade visual do app) ─────────────────────

const WaveDecor: React.FC = () => (
  <View style={styles.waveWrap} pointerEvents="none">
    <Svg width={SCREEN_WIDTH} height={64} viewBox={`0 0 ${SCREEN_WIDTH} 64`} preserveAspectRatio="none">
      <Path
        d={`M0,32 C${SCREEN_WIDTH*0.15},4 ${SCREEN_WIDTH*0.3},60 ${SCREEN_WIDTH*0.5},28 C${SCREEN_WIDTH*0.7},0 ${SCREEN_WIDTH*0.85},52 ${SCREEN_WIDTH},24 L${SCREEN_WIDTH},64 L0,64 Z`}
        fill={C.creamShade}
        opacity={0.55}
      />
    </Svg>
  </View>
);

// ─── Bolha de mensagem ────────────────────────────────────────────────────────

const Bubble: React.FC<{ msg: Message; ts: Date }> = ({ msg, ts }) => {
  const isUser = msg.role === "user";
  return (
    <View style={[styles.bubbleRow, isUser ? styles.rowRight : styles.rowLeft]}>
      {!isUser && <View style={styles.botDot} />}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={[styles.bubbleText, isUser ? styles.textUser : styles.textBot]}>
          {msg.content}
        </Text>
        <Text style={[styles.tsText, isUser ? styles.tsUser : styles.tsBot]}>
          {formatTime(ts)}
        </Text>
      </View>
    </View>
  );
};

// ─── Chips de sugestão ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Como funciona o Método SOS?",
  "Como apresentar um alimento novo?",
  "O que é Food Chaining?",
  "Dicas para reduzir recusa alimentar",
  "Como usar reforço positivo?",
];

// ─── Tela ─────────────────────────────────────────────────────────────────────

interface Props {
  childProfile?: ChildProfile;
}

export default function ChatScreen({ childProfile = MOCK_CHILD }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [timestamps, setTs]     = useState<Date[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showChips, setShowChips] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  // Mensagem de boas-vindas
  useEffect(() => {
    setMessages([{
      role: "assistant",
      content: `Olá! Sou o Assistente Juca.\n\nAcompanho o progresso do ${childProfile.name} e estou aqui para tirar suas dúvidas sobre o Método SOS, ABA e Food Chaining — e como tornar cada refeição mais agradável.\n\nComo posso ajudar?`,
    }]);
    setTs([new Date()]);
  }, [childProfile.name]);

  const scrollToBottom = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;
    setShowChips(false);
    setInput("");

    const userMsg: Message = { role: "user", content: t };
    const nextMsgs = [...messages, userMsg];
    const nextTs   = [...timestamps, new Date()];
    setMessages(nextMsgs);
    setTs(nextTs);
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ messages: nextMsgs, child_profile: childProfile }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages((p) => [...p, { role: "assistant", content: data.reply }]);
      setTs((p)       => [...p, new Date()]);
    } catch {
      setMessages((p) => [...p, {
        role: "assistant",
        content: "Não consegui me conectar agora. Verifique sua conexão e tente novamente.",
      }]);
      setTs((p) => [...p, new Date()]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Assistente Juca</Text>
        <Text style={styles.headerSub}>Introdução alimentar · SOS · ABA · Food Chaining</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* ── Mensagens ── */}
        <ScrollView
          ref={scrollRef}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        >
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} ts={timestamps[i] ?? new Date()} />
          ))}

          {loading && (
            <View style={[styles.bubbleRow, styles.rowLeft]}>
              <View style={styles.botDot} />
              <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                <ActivityIndicator size="small" color={C.accent} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Onda orgânica ── */}
        <WaveDecor />

        {/* ── Chips de sugestão ── */}
        {showChips && messages.length <= 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContent}
          >
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.chip}
                onPress={() => send(s)}
                activeOpacity={0.75}
              >
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Barra de input ── */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Pergunte ao Assistente Juca…"
            placeholderTextColor={C.placeholder}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendOff]}
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
            activeOpacity={0.8}
          >
            <Text style={styles.sendArrow}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: C.cream },
  flex:  { flex: 1 },

  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 14,
    backgroundColor: C.cream,
    borderBottomWidth: 1,
    borderBottomColor: C.inputBorder,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1b1c16",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 3,
    letterSpacing: 0.1,
  },

  list:        { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 10,
  },

  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 2,
  },
  rowRight: { justifyContent: "flex-end" },
  rowLeft:  { justifyContent: "flex-start" },

  botDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
    marginBottom: 22,
  },

  bubble: {
    maxWidth: "80%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  bubbleUser: {
    backgroundColor: C.navy,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: C.creamShade,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: C.inputBorder,
  },
  typingBubble: { paddingVertical: 14, paddingHorizontal: 20 },

  bubbleText: { fontSize: 15, lineHeight: 23 },
  textUser:   { color: C.white },
  textBot:    { color: C.navy },

  tsText: { fontSize: 11, marginTop: 5, alignSelf: "flex-end" },
  tsUser: { color: "rgba(255,255,255,0.5)" },
  tsBot:  { color: C.muted },

  waveWrap: {
    position: "absolute",
    bottom: 124,
    left: 0,
    right: 0,
    zIndex: 0,
  },

  chipsScroll:  { flexGrow: 0, zIndex: 1 },
  chipsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.navy,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    color: C.navy,
    fontWeight: "600",
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.cream,
    borderTopWidth: 1,
    borderTopColor: C.inputBorder,
    gap: 8,
    zIndex: 2,
  },
  input: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.inputBorder,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
    color: C.navy,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  sendOff:   { backgroundColor: C.inputBorder },
  sendArrow: { color: C.white, fontSize: 20, fontWeight: "700", lineHeight: 24 },
});
