import { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

interface LoginProps {
  onLoginSuccess: (username: string) => void;
  switchToRegister: () => void;
}

export default function Login({ onLoginSuccess, switchToRegister }: LoginProps) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleLogin = async () => {
    if (!username) return;
    setLoading(true);
    setStatus(null);

    // Animasyon hissi için ufak bekleme
    await new Promise(r => setTimeout(r, 600));

    // 1. Önce cihazda anahtar var mı diye bakıyoruz
    const storedKey = localStorage.getItem('myPrivateKey');
    
    // Eğer anahtar yoksa giriş yapamaz (Çünkü eski mesajları çözemez)
    if (!storedKey) {
      setStatus('⚠️ Bu cihazda anahtarınız bulunamadı. Lütfen önce Kayıt Olun.');
      setLoading(false);
      return;
    }

    try {
      // 2. Backend'e giriş isteği at (Sadece varlığını kontrol ediyoruz)
      const response = await axios.post('http://localhost:5124/api/kullanici/giris', {
        kullaniciAdi: username,
        publicKey: "MevcutAnahtarKullaniliyor" // Backend sadece kullanıcıyı kontrol edecek
      });

      setStatus(`✅ Giriş Başarılı! Yönlendiriliyorsunuz...`);
      
      // 3. Başarılı ise App.tsx'e bildir
      setTimeout(() => {
        onLoginSuccess(response.data.kullaniciAdi);
      }, 1000);

    } catch (error) {
      console.error(error);
      setStatus('❌ Kullanıcı bulunamadı veya şifreleme hatası.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full font-sans bg-white overflow-hidden">
      
      {/* --- SOL TARA: VİTRİN (Register ile Aynı Premium Tasarım) --- */}
      <div className="hidden lg:flex w-[55%] relative bg-[#022c22] flex-col items-center justify-center overflow-hidden">
        
        {/* Hareketli Arka Plan Işıkları */}
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
        
        {/* Noise Texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 z-0"></div>

        {/* Cam Kart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 p-10 bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl max-w-md text-center shadow-2xl"
        >
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-emerald-500/30">
            <svg className="w-8 h-8 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Tekrar Hoş Geldiniz</h2>
          <p className="text-emerald-100/70 font-light leading-relaxed">
            Güvenli hattınız hazır. Kaldığınız yerden şifreli iletişime devam etmek için kimliğinizi doğrulayın.
          </p>
        </motion.div>
      </div>

      {/* --- SAĞ TARA: GİRİŞ FORMU --- */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-white relative">
        <div className="w-full max-w-sm">
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-12"
          >
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">Giriş Yap</h1>
            <p className="text-gray-500">Devam etmek için kullanıcı adınızı girin.</p>
          </motion.div>

          <div className="space-y-8">
            
            {/* FLOATING LABEL INPUT */}
            <div className="relative group">
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`peer w-full h-14 px-4 bg-transparent border-b-2 text-gray-900 text-lg outline-none transition-colors duration-300
                  ${isFocused || username ? 'border-emerald-600' : 'border-gray-200 group-hover:border-gray-300'}`}
              />
              <label 
                className={`absolute left-0 transition-all duration-300 pointer-events-none
                  ${(isFocused || username) 
                    ? '-top-3 text-xs text-emerald-600 font-bold' 
                    : 'top-4 text-gray-400 text-lg'}`}
              >
                Kullanıcı Adı
              </label>
            </div>

            {/* BUTON */}
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogin}
              disabled={loading}
              className={`w-full h-14 rounded-xl font-bold text-white text-lg shadow-xl shadow-emerald-200 transition-all
                ${loading 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {loading ? 'Kontrol Ediliyor...' : 'Giriş Yap'}
            </motion.button>

            {/* DURUM MESAJI */}
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
            <p className="text-sm text-gray-500">
              Hesabınız yok mu?{' '}
              <button onClick={switchToRegister} className="text-emerald-600 font-bold hover:underline">
                Hemen Kayıt Ol
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}