import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert
} from 'react-native';
import { supabase } from '../services/supabase';

const { height } = Dimensions.get('window');

export default function Cadastro() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const podeCadastrar = nome.trim() && email.trim() && senha.length >= 6;

  const handleCadastro = async () => {
      setCarregando(true);
      setErro('');
      
      try {
        // 1. Cria o usuário e já envia o NOME nos metadados para o Gatilho do banco usar
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            data: {
              nome: nome.trim() // <-- O Gatilho vai ler isso aqui!
            }
          }
        });

        if (error) {
          if (error.message.includes('already registered')) {
            setErro('Este e-mail já está cadastrado.');
          } else if (error.message.toLowerCase().includes('email')) {
            setErro('E-mail inválido.');
          } else if (error.message.includes('Password')) {
            setErro('A senha deve ter pelo menos 6 caracteres.');
          } else {
            setErro(error.message);
          }
          return; 
        }

        // O GATILHO JÁ FEZ O TRABALHO PESADO DE INSERIR NA TABELA 'usuarios' LÁ NO BANCO!

        // 2. Redirecionamento
        if (data.session) {
          router.replace('/');
        } else {
          Alert.alert(
            "Conta criada com sucesso! 🎉",
            "Enviamos um link de confirmação para o seu e-mail. Por favor, verifique sua caixa de entrada (e o spam) para ativar sua conta.",
            [{ text: "Entendi", onPress: () => router.replace('/login') }]
            );
        }

      } catch (err) {
        setErro('Ocorreu um erro inesperado. Tente novamente.');
        console.error(err);
      } finally {
        setCarregando(false);
      }
    };

  return (
    <View style={styles.container}>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.titulo}>Crie a sua conta</Text>
          <Text style={styles.subtitulo}>
            Comece hoje a jornada alimentar{'\n'}do seu pequeno
          </Text>

          <Text style={styles.inputLabel}>NOME</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="Seu nome completo"
              placeholderTextColor="rgba(94,92,84,0.5)"
              value={nome}
              onChangeText={t => { setNome(t); setErro(''); }}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.inputLabel}>E-MAIL</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor="rgba(94,92,84,0.5)"
              value={email}
              onChangeText={t => { setEmail(t); setErro(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.inputLabel}>SENHA</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="rgba(94,92,84,0.5)"
              value={senha}
              onChangeText={t => { setSenha(t); setErro(''); }}
              secureTextEntry={!senhaVisivel}
            />
            <TouchableOpacity activeOpacity={0.7} onPress={() => setSenhaVisivel(!senhaVisivel)}>
              <MaterialCommunityIcons
                name={senhaVisivel ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="rgba(94,92,84,0.6)"
              />
            </TouchableOpacity>
          </View>
          {senha.length > 0 && senha.length < 6 && (
            <Text style={styles.senhaAviso}>Mínimo de 6 caracteres</Text>
          )}

          {erro ? (
            <View style={styles.erroBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#b22300" />
              <Text style={styles.erroText}>{erro}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.criarBtn, (!podeCadastrar || carregando) && styles.btnOff]}
            onPress={handleCadastro}
            disabled={!podeCadastrar || carregando}
          >
            <Text style={styles.criarBtnText}>
              {carregando ? 'Criando conta...' : 'Criar conta'}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginWrap}>
            <Text style={styles.loginTexto}>Já tem uma conta? </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.replace('/login')}>
              <Text style={styles.loginLink}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <View style={styles.footerDivisor} />
        <Text style={styles.rodape}>JUCA © 2026 • NUTRIÇÃO COM AFETO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf9ef' },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: height * 0.1, paddingBottom: 40 },
  titulo: { fontSize: 34, fontWeight: '800', color: '#1b1c16', textAlign: 'center', marginBottom: 10, letterSpacing: -0.5 },
  subtitulo: { fontSize: 15, color: '#5e5c54', textAlign: 'center', lineHeight: 22, marginBottom: 36 },
  inputLabel: { fontSize: 10, fontWeight: '700', color: '#5e5c54', letterSpacing: 2, marginBottom: 8, paddingLeft: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f6f4ea', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 20 },
  input: { flex: 1, fontSize: 15, color: '#1b1c16' },
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
  criarBtn: { backgroundColor: '#b22300', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 16, marginTop: 4, marginBottom: 28, shadowColor: '#b22300', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  btnOff: { opacity: 0.4 },
  criarBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  loginWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginTexto: { fontSize: 14, color: '#5e5c54' },
  loginLink: { fontSize: 14, fontWeight: '800', color: '#b22300' },
  footer: { paddingHorizontal: 28, paddingBottom: Platform.OS === 'ios' ? 32 : 24, backgroundColor: 'transparent' },
  footerDivisor: { height: 1, backgroundColor: 'rgba(228,227,217,0.3)', marginBottom: 16 },
  rodape: { textAlign: 'center', fontSize: 10, fontWeight: '700', color: 'rgba(94,92,84,0.4)', letterSpacing: 2 },
});