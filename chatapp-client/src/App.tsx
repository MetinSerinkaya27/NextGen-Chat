import { useState, useEffect } from 'react';
import Register from './components/Register';
import Login from './components/Login';

// Sayfa Tiplerini Tanımlıyoruz
type Page = 'login' | 'register' | 'chat';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('register');
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    // Uygulama açılınca: Tarayıcıda anahtar var mı?
    // Varsa direkt Login ekranını aç, yoksa Register kalsın.
    const savedKey = localStorage.getItem('myPrivateKey');
    if (savedKey) {
      setCurrentPage('login');
    }
  }, []);

  // Login başarılı olunca çalışacak fonksiyon
  const handleLoginSuccess = (username: string) => {
    setCurrentUser(username);
    setCurrentPage('chat');
  };

  return (
    <div>
      {/* 1. EKRAN: REGISTER (KAYIT) */}
      {/* switchToLogin prop'unu gönderiyoruz ki kullanıcı giriş sayfasına geçebilsin */}
      {currentPage === 'register' && (
        <Register switchToLogin={() => setCurrentPage('login')} />
      )}

      {/* 2. EKRAN: LOGIN (GİRİŞ) */}
      {currentPage === 'login' && (
        <Login 
          onLoginSuccess={handleLoginSuccess} 
          switchToRegister={() => setCurrentPage('register')} 
        />
      )}

      {/* 3. EKRAN: CHAT (VİTRİN) */}
      {currentPage === 'chat' && (
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="text-center p-10 bg-white rounded-3xl shadow-xl border border-gray-100">
            <h1 className="text-4xl font-bold text-emerald-600 mb-4">🎉 Hoş Geldin {currentUser}!</h1>
            <p className="text-gray-500 text-lg">Güvenli hat kuruldu.</p>
            <div className="mt-8 animate-bounce text-6xl">💬🔒</div>
            <p className="mt-8 text-sm text-gray-400">Mesajlaşma modülü yükleniyor...</p>
            
            <button 
              onClick={() => { 
                // Çıkış yapınca her şeyi temizle ve başa dön
                localStorage.clear(); 
                setCurrentPage('register'); 
              }} 
              className="mt-8 px-6 py-2 bg-red-50 text-red-600 rounded-full text-sm font-bold hover:bg-red-100 transition-colors"
            >
              Çıkış Yap (Reset)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;