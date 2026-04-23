import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const PATTERN_HEIGHT = height * 0.42;
const TILE_SIZE = 200;

// Padrão de cajus repetido como tiles
function CajuPattern({ tileHeight }: { tileHeight: number }) {
  const cols = Math.ceil(width / TILE_SIZE) + 1;
  const rows = Math.ceil(tileHeight / TILE_SIZE) + 1;
  return (
    <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }]}>
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols }).map((_, col) => (
          <Image
            key={`${row}-${col}`}
            source={require('../assets/images/cashew-pattern.png')}
            style={{
              position: 'absolute',
              width: TILE_SIZE,
              height: TILE_SIZE,
              top: row * TILE_SIZE,
              left: col * TILE_SIZE,
              opacity: 1,
            }}
            resizeMode="cover"
          />
        ))
      )}
    </View>
  );
}

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async () => {
    setCarregando(true);
    try {
      // ✅ Conectar à API de autenticação aqui
      // const response = await fetch('https://sua-api.com/auth/login', { ... });
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Erro ao fazer login:', error);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Seção superior — padrão de cajus + logo */}
      <View style={styles.topSection}>
        <CajuPattern tileHeight={PATTERN_HEIGHT} />
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Card inferior — formulário */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formWrap}
      >
        <ScrollView
          contentContainerStyle={styles.formScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.titulo}>Bem vindo ao Juca!</Text>
          <Text style={styles.subtitulo}>
            Estamos felizes em ver você. Vamos trilhar a jornada alimentar juntos!
          </Text>

          <Text style={styles.inputLabel}>E-mail</Text>
          <View style={styles.inputBox}>
            <MaterialCommunityIcons name="email-outline" size={20} color="#5e5c54" style={{ marginRight: 12 }} />
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor="rgba(94,92,84,0.4)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.inputLabel}>Senha</Text>
          <View style={styles.inputBox}>
            <MaterialCommunityIcons name="lock-outline" size={20} color="#5e5c54" style={{ marginRight: 12 }} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="rgba(94,92,84,0.4)"
              value={senha}
              onChangeText={setSenha}
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

          <TouchableOpacity activeOpacity={0.7} style={styles.esqueciWrap} onPress={() => router.push('/recuperar-senha' as any)}>
            <Text style={styles.esqueciText}>ESQUECI MINHA SENHA</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.entrarBtn, (!email || !senha || carregando) && styles.btnOff]}
            onPress={handleLogin}
            disabled={!email || !senha || carregando}
          >
            <Text style={styles.entrarBtnText}>{carregando ? 'Entrando...' : 'Entrar'}</Text>
            {!carregando && <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />}
          </TouchableOpacity>

          <View style={styles.cadastroWrap}>
            <Text style={styles.cadastroTexto}>Não tem uma conta?</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push({ pathname: '/cadastro' } as any)}>
              <Text style={styles.cadastroLink}>Cadastre-se</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.rodape}>JUCA © 2026 • NUTRIÇÃO COM AFETO</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf9ef' },
  topSection: {
    height: PATTERN_HEIGHT,
    backgroundColor: '#f5f3e9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: 120, height: 120, zIndex: 2 },
  formWrap: {
    flex: 1,
    backgroundColor: '#f6f4ea',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    zIndex: 10,
  },
  formScroll: { paddingHorizontal: 32, paddingTop: 36, paddingBottom: 32 },
  titulo: { fontSize: 32, fontWeight: '800', color: '#1b1c16', marginBottom: 12, letterSpacing: -0.5 },
  subtitulo: { fontSize: 16, color: '#5e5c54', lineHeight: 24, marginBottom: 32 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#5e5c54', marginBottom: 8, paddingLeft: 4 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eae8de',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  input: { flex: 1, fontSize: 15, color: '#1b1c16' },
  esqueciWrap: { alignSelf: 'flex-end', marginBottom: 28, marginTop: -8 },
  esqueciText: { fontSize: 11, fontWeight: '600', color: '#904c1f', letterSpacing: 0.8 },
  entrarBtn: {
    backgroundColor: '#b22300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 100,
    marginBottom: 32,
    shadowColor: '#b22300',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  btnOff: { opacity: 0.4 },
  entrarBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  cadastroWrap: { alignItems: 'center', marginBottom: 8 },
  cadastroTexto: { fontSize: 15, color: '#5e5c54', marginBottom: 6 },
  cadastroLink: { fontSize: 18, fontWeight: '800', color: '#b22300' },
  rodape: { textAlign: 'center', fontSize: 10, fontWeight: '700', color: 'rgba(94,92,84,0.4)', letterSpacing: 2, marginTop: 24 },
});