import { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { generateKeyPair, exportKeyToBase64 } from '../utils/crypto';

export default function Register() {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

const handleRegister = async () => {
    if (!username) return;
    setLoading(true);
    setStatus(null);

    try {
      // ADIM 1: Tarayıcıda Kriptografik Anahtarları Üret 🔑
      // Bu işlem kullanıcının bilgisayarında yapılır, sunucuda değil!
      const keyPair = await generateKeyPair();

      // ADIM 2: Anahtarları Paketle 📦
      // Public Key'i sunucuya göndermek için metne çeviriyoruz
      const publicKeyBase64 = await exportKeyToBase64(keyPair.publicKey);
      
      // Private Key'i asla sunucuya göndermiyoruz! 
      // Şimdilik tarayıcının hafızasına (LocalStorage) kaydedelim.
      // (İleride bunu daha güvenli olan IndexedDB'ye taşıyacağız)
      // Private key'i de saklamak için metne çevirmemiz lazım
      const privateKeyBase64 = await exportKeyToBase64(keyPair.privateKey);
      localStorage.setItem('myPrivateKey', privateKeyBase64);
      localStorage.setItem('myUsername', username);

      // ADIM 3: Backend'e Sadece Public Key'i Yolla 🚀
      const response = await axios.post('http://localhost:5124/api/kullanici/kayit', {
        kullaniciAdi: username,
        publicKey: publicKeyBase64 // Artık gerçek anahtar gidiyor!
      });

      setStatus(`✅ Kimlik Doğrulandı! Hoş geldin, ${response.data.kullaniciAdi}`);
      
      // Konsola da basalım ki çalıştığını gör (Geliştirme aşamasında)
      console.log("Üretilen Public Key:", publicKeyBase64);
      console.log("Saklanan Private Key:", "Gizli tutuluyor...");

    } catch (error) {
      console.error(error);
      setStatus('❌ Kayıt Başarısız. Sunucu hatası.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex min-h-screen w-full font-sans bg-white overflow-hidden">
      
      {/* --- SOL TARA: YAŞAYAN VİTRİN --- */}
      <div className="hidden lg:flex w-[55%] relative bg-[#022c22] flex-col items-center justify-center overflow-hidden">
        
        {/* Hareket Eden Arka Plan Işıkları (Lava Lamp Effect) */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0], x: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-emerald-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-40"
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, -45, 0], y: [0, -50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-500 rounded-full mix-blend-multiply filter blur-[80px] opacity-30"
        />
        
        {/* Noise Texture (Kalite Hissi) */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 z-0"></div>

        {/* İçerik Kartı (Glassmorphism) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 p-10 bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl max-w-md text-center shadow-2xl"
        >
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-emerald-500/30">
            <svg className="w-8 h-8 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Uçtan Uca Şifreli</h2>
          <p className="text-emerald-100/70 font-light leading-relaxed">
            NextGen Chat, verilerinizi askeri düzeyde şifreleme ile korur. Mesajlarınızı sadece siz ve alıcı okuyabilir.
          </p>
          
          {/* İstatistik Çubuğu */}
          <div className="mt-8 pt-6 border-t border-white/10 flex justify-between text-xs font-medium text-emerald-200/50 uppercase tracking-widest">
            <span>256-BIT AES</span>
            <span>NO LOGS</span>
            <span>OPEN SOURCE</span>
          </div>
        </motion.div>
      </div>

      {/* --- SAĞ TARA: İNTERAKTİF FORM --- */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-white relative">
        <div className="w-full max-w-sm">
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-12"
          >
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">Giriş Yap</h1>
            <p className="text-gray-500">Devam etmek için kimliğinizi doğrulayın.</p>
          </motion.div>

          <div className="space-y-8">
            
            {/* FLOATING LABEL INPUT (YÜZEN ETİKET) */}
            <div className="relative group">
              <input 
                type="text" 
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`peer w-full h-14 px-4 bg-transparent border-b-2 text-gray-900 text-lg outline-none transition-colors duration-300
                  ${isFocused || username ? 'border-emerald-600' : 'border-gray-200 group-hover:border-gray-300'}`}
              />
              <label 
                htmlFor="username"
                className={`absolute left-0 transition-all duration-300 pointer-events-none
                  ${(isFocused || username) 
                    ? '-top-3 text-xs text-emerald-600 font-bold' 
                    : 'top-4 text-gray-400 text-lg'}`}
              >
                Kullanıcı Adı
              </label>
            </div>

            {/* MANYETİK BUTON */}
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRegister}
              disabled={loading}
              className={`w-full h-14 rounded-xl font-bold text-white text-lg shadow-xl shadow-emerald-200 transition-all
                ${loading 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></span>
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></span>
                </div>
              ) : (
                'Hesap Oluştur'
              )}
            </motion.button>

            {/* Başarı/Hata Mesajı */}
            {status && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg text-sm font-medium flex items-center gap-3
                  ${status.includes('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
              >
                {status.includes('✅') ? '🚀' : '⚠️'} {status}
              </motion.div>
            )}
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs text-gray-400">
              By registering via NextGen, you agree to our <a href="#" className="underline hover:text-emerald-600">Encrypted Data Policy</a>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}