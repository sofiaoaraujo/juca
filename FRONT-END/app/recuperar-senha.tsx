import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { height } = Dimensions.get('window');

export default function RecuperarSenha() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleEnviar = async () => {
    if (!email) return;
    setEnviando(true);
    try {
      // ✅ Conectar à API de recuperação de senha aqui
      // const response = await fetch('https://sua-api.com/auth/recuperar-senha', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email }),
      // });

      setEnviado(true);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar o e-mail. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header com botão voltar */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.voltarBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#b22300" />
        </TouchableOpacity>
        <View style={{ width: 38 }} />
        <View style={{ width: 38 }} />
      </View>

      {/* Formulário */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.cardWrap}
      >
        <ScrollView
          contentContainerStyle={styles.cardScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!enviado ? (
            <>
              <Text style={styles.titulo}>Recuperar Senha</Text>
              <Text style={styles.subtitulo}>
                Não se preocupe! Insira o e-mail cadastrado e enviaremos as instruções para você criar uma nova senha.
              </Text>

              <Text style={styles.inputLabel}>E-MAIL</Text>
              <View style={styles.inputBox}>
                <MaterialCommunityIcons name="email-outline" size={20} color="#5e5c54" style={{ marginRight: 12 }} />
                <TextInput
                  style={styles.input}
                  placeholder="exemplo@email.com"
                  placeholderTextColor="rgba(94,92,84,0.5)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.enviarBtn, (!email || enviando) && styles.btnOff]}
                onPress={handleEnviar}
                disabled={!email || enviando}
              >
                <Text style={styles.enviarBtnText}>{enviando ? 'Enviando...' : 'Enviar Link'}</Text>
                {!enviando && <MaterialCommunityIcons name="send" size={18} color="#fff" />}
              </TouchableOpacity>
            </>
          ) : (
            /* Estado de sucesso */
            <View style={styles.sucessoBox}>
              <View style={styles.sucessoIcone}>
                <MaterialCommunityIcons name="email-check-outline" size={36} color="#b22300" />
              </View>
              <Text style={styles.sucessoTitulo}>E-mail enviado!</Text>
              <Text style={styles.sucessoTexto}>
                Verifique sua caixa de entrada em{'\n'}
                <Text style={{ fontWeight: '700', color: '#1b1c16' }}>{email}</Text>
                {'\n'}e siga as instruções para criar uma nova senha.
              </Text>
            </View>
          )}

          {/* Voltar para o login */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.voltarLoginBtn}
            onPress={() => router.replace('/login')}
          >
            <MaterialCommunityIcons name="arrow-left" size={16} color="#b22300" />
            <Text style={styles.voltarLoginText}>Voltar para o Login</Text>
          </TouchableOpacity>

          <Text style={styles.rodape}>JUCA © 2026 • NUTRIÇÃO COM AFETO</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf9ef' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
    backgroundColor: '#fcf9ef',
    zIndex: 10,
  },
  voltarBtn: { width: 38, height: 38, justifyContent: 'center' },

  cardWrap: {
    flex: 1,
    backgroundColor: '#fcf9ef',
    zIndex: 10,
  },
  cardScroll: { paddingHorizontal: 28, paddingTop: 36, paddingBottom: 40 },

  titulo: { fontSize: 28, fontWeight: '800', color: '#b22300', textAlign: 'center', marginBottom: 16, letterSpacing: -0.5 },
  subtitulo: { fontSize: 16, color: '#5e5c54', textAlign: 'center', lineHeight: 26, marginBottom: 32 },

  inputLabel: { fontSize: 10, fontWeight: '700', color: '#5e5c54', letterSpacing: 2, marginBottom: 8, paddingLeft: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eae8de', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 28 },
  input: { flex: 1, fontSize: 15, color: '#1b1c16' },

  enviarBtn: {
    backgroundColor: '#b22300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 100,
    marginBottom: 32,
    shadowColor: '#b22300',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  btnOff: { opacity: 0.4 },
  enviarBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  sucessoBox: { alignItems: 'center', paddingVertical: 16, marginBottom: 24 },
  sucessoIcone: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff5f3', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#b22300' },
  sucessoTitulo: { fontSize: 24, fontWeight: '800', color: '#1b1c16', marginBottom: 12 },
  sucessoTexto: { fontSize: 15, color: '#5e5c54', textAlign: 'center', lineHeight: 24 },

  voltarLoginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 32 },
  voltarLoginText: { fontSize: 15, fontWeight: '700', color: '#b22300' },

  rodape: { textAlign: 'center', fontSize: 10, fontWeight: '700', color: 'rgba(94,92,84,0.4)', letterSpacing: 2 },
});