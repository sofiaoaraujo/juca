import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../services/supabase';

type Etapa = 'email' | 'otp' | 'sucesso';

export default function RecuperarSenha() {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [novaSenhaVisivel, setNovaSenhaVisivel] = useState(false);
  const [confirmarSenhaVisivel, setConfirmarSenhaVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const novaSenhaRef = useRef<any>(null);
  const confirmarSenhaRef = useRef<any>(null);

  const handleEnviarCodigo = async () => {
    setCarregando(true);
    setErro('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setEtapa('otp');
    } catch {
      setErro('Não foi possível enviar o código. Verifique o e-mail e tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const handleRedefinirSenha = async () => {
    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não conferem.');
      return;
    }
    if (novaSenha.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setCarregando(true);
    setErro('');
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: codigo,
        type: 'recovery',
      });
      if (verifyError) {
        if (verifyError.message.toLowerCase().includes('expired')) {
          setErro('Código expirado. Solicite um novo código.');
        } else {
          setErro('Código inválido. Verifique e tente novamente.');
        }
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: novaSenha });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      setEtapa('sucesso');
    } catch {
      setErro('Ocorreu um erro. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const voltarOuBack = () => {
    if (etapa === 'otp') {
      setErro('');
      setEtapa('email');
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={voltarOuBack}
          style={styles.voltarBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#b22300" />
        </TouchableOpacity>
        <View style={{ width: 38 }} />
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.cardWrap}
      >
        <ScrollView
          contentContainerStyle={styles.cardScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── ETAPA 1: Inserir e-mail ── */}
          {etapa === 'email' && (
            <>
              <Text style={styles.titulo}>Recuperar Senha</Text>
              <Text style={styles.subtitulo}>
                Não se preocupe! Insira o e-mail cadastrado e enviaremos um código de verificação para criar uma nova senha.
              </Text>

              <Text style={styles.inputLabel}>E-MAIL</Text>
              <View style={styles.inputBox}>
                <MaterialCommunityIcons name="email-outline" size={20} color="#5e5c54" style={{ marginRight: 12 }} />
                <TextInput
                  style={styles.input}
                  placeholder="exemplo@email.com"
                  placeholderTextColor="rgba(94,92,84,0.5)"
                  value={email}
                  onChangeText={t => { setEmail(t); setErro(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                  returnKeyType="go"
                  onSubmitEditing={() => { if (email) handleEnviarCodigo(); }}
                />
              </View>

              {erro ? <ErroBox mensagem={erro} /> : null}

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.enviarBtn, (!email || carregando) && styles.btnOff]}
                onPress={handleEnviarCodigo}
                disabled={!email || carregando}
              >
                <Text style={styles.enviarBtnText}>{carregando ? 'Enviando...' : 'Enviar Código'}</Text>
                {!carregando && <MaterialCommunityIcons name="send" size={18} color="#fff" />}
              </TouchableOpacity>
            </>
          )}

          {/* ── ETAPA 2: Inserir código OTP + nova senha ── */}
          {etapa === 'otp' && (
            <>
              <Text style={styles.titulo}>Criar Nova Senha</Text>
              <Text style={styles.subtitulo}>
                Digite o código de 6 dígitos enviado para{'\n'}
                <Text style={{ fontWeight: '700', color: '#1b1c16' }}>{email}</Text>
              </Text>

              <Text style={styles.inputLabel}>CÓDIGO DE VERIFICAÇÃO</Text>
              <View style={styles.inputBox}>
                <MaterialCommunityIcons name="shield-key-outline" size={20} color="#5e5c54" style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, styles.inputCodigo]}
                  placeholder="000000"
                  placeholderTextColor="rgba(94,92,84,0.5)"
                  value={codigo}
                  onChangeText={t => { setCodigo(t); setErro(''); }}
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="next"
                  onSubmitEditing={() => novaSenhaRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <Text style={styles.inputLabel}>NOVA SENHA</Text>
              <View style={styles.inputBox}>
                <MaterialCommunityIcons name="lock-outline" size={20} color="#5e5c54" style={{ marginRight: 12 }} />
                <TextInput
                  ref={novaSenhaRef}
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(94,92,84,0.5)"
                  value={novaSenha}
                  onChangeText={t => { setNovaSenha(t); setErro(''); }}
                  secureTextEntry={!novaSenhaVisivel}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmarSenhaRef.current?.focus()}
                  blurOnSubmit={false}
                />
                <TouchableOpacity activeOpacity={0.7} onPress={() => setNovaSenhaVisivel(v => !v)}>
                  <MaterialCommunityIcons
                    name={novaSenhaVisivel ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="rgba(94,92,84,0.6)"
                  />
                </TouchableOpacity>
              </View>
              {novaSenha.length > 0 && novaSenha.length < 6 && (
                <Text style={styles.senhaAviso}>Mínimo de 6 caracteres</Text>
              )}

              <Text style={styles.inputLabel}>CONFIRMAR SENHA</Text>
              <View style={styles.inputBox}>
                <MaterialCommunityIcons name="lock-check-outline" size={20} color="#5e5c54" style={{ marginRight: 12 }} />
                <TextInput
                  ref={confirmarSenhaRef}
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(94,92,84,0.5)"
                  value={confirmarSenha}
                  onChangeText={t => { setConfirmarSenha(t); setErro(''); }}
                  secureTextEntry={!confirmarSenhaVisivel}
                  returnKeyType="go"
                  onSubmitEditing={handleRedefinirSenha}
                />
                <TouchableOpacity activeOpacity={0.7} onPress={() => setConfirmarSenhaVisivel(v => !v)}>
                  <MaterialCommunityIcons
                    name={confirmarSenhaVisivel ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="rgba(94,92,84,0.6)"
                  />
                </TouchableOpacity>
              </View>

              {erro ? <ErroBox mensagem={erro} /> : null}

              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.enviarBtn,
                  (codigo.length < 6 || !novaSenha || !confirmarSenha || carregando) && styles.btnOff,
                ]}
                onPress={handleRedefinirSenha}
                disabled={codigo.length < 6 || !novaSenha || !confirmarSenha || carregando}
              >
                <Text style={styles.enviarBtnText}>{carregando ? 'Redefinindo...' : 'Redefinir Senha'}</Text>
                {!carregando && <MaterialCommunityIcons name="check" size={18} color="#fff" />}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.reenviarWrap}
                onPress={() => { setEtapa('email'); setErro(''); setCodigo(''); }}
              >
                <Text style={styles.reenviarText}>Não recebeu o código? Reenviar</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── ETAPA 3: Sucesso ── */}
          {etapa === 'sucesso' && (
            <View style={styles.sucessoBox}>
              <View style={styles.sucessoIcone}>
                <MaterialCommunityIcons name="check-circle-outline" size={36} color="#b22300" />
              </View>
              <Text style={styles.sucessoTitulo}>Senha redefinida!</Text>
              <Text style={styles.sucessoTexto}>
                Sua nova senha foi criada com sucesso.{'\n'}Faça login para continuar.
              </Text>
            </View>
          )}

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

function ErroBox({ mensagem }: { mensagem: string }) {
  return (
    <View style={styles.erroBox}>
      <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#b22300" />
      <Text style={styles.erroText}>{mensagem}</Text>
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
  cardWrap: { flex: 1, backgroundColor: '#fcf9ef' },
  cardScroll: { paddingHorizontal: 28, paddingTop: 36, paddingBottom: 40 },

  titulo: { fontSize: 28, fontWeight: '800', color: '#b22300', textAlign: 'center', marginBottom: 16, letterSpacing: -0.5 },
  subtitulo: { fontSize: 16, color: '#5e5c54', textAlign: 'center', lineHeight: 26, marginBottom: 32 },

  inputLabel: { fontSize: 10, fontWeight: '700', color: '#5e5c54', letterSpacing: 2, marginBottom: 8, paddingLeft: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eae8de', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20 },
  input: { flex: 1, fontSize: 15, color: '#1b1c16' },
  inputCodigo: { letterSpacing: 8, fontSize: 18, fontWeight: '700' },
  senhaAviso: { fontSize: 12, color: '#b22300', marginTop: -14, marginBottom: 16, paddingLeft: 4 },

  erroBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff5f3',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  erroText: { flex: 1, fontSize: 13, color: '#b22300', lineHeight: 18 },

  enviarBtn: {
    backgroundColor: '#b22300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 100,
    marginBottom: 20,
    shadowColor: '#b22300',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  btnOff: { opacity: 0.4 },
  enviarBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  reenviarWrap: { alignItems: 'center', marginBottom: 24 },
  reenviarText: { fontSize: 14, fontWeight: '600', color: '#904c1f' },

  sucessoBox: { alignItems: 'center', paddingVertical: 24, marginBottom: 24 },
  sucessoIcone: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff5f3', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#b22300' },
  sucessoTitulo: { fontSize: 24, fontWeight: '800', color: '#1b1c16', marginBottom: 12 },
  sucessoTexto: { fontSize: 15, color: '#5e5c54', textAlign: 'center', lineHeight: 24 },

  voltarLoginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 32 },
  voltarLoginText: { fontSize: 15, fontWeight: '700', color: '#b22300' },

  rodape: { textAlign: 'center', fontSize: 10, fontWeight: '700', color: 'rgba(94,92,84,0.4)', letterSpacing: 2 },
});