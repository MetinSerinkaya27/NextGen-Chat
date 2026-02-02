import { useState, useEffect } from 'react';
import Register from './components/Register';
import Login from './components/Login';
import Chat from './components/Chat';

// Sayfa Tiplerini Tanımlıyoruz
type Page = 'login' | 'register' | 'chat';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('register');
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    // 1. Uygulama açılınca hafızayı kontrol et
    const savedKey = localStorage.getItem('myPrivateKey');
    const savedUser = localStorage.getItem('chat_username');

    if (savedKey && savedUser) {
      // Hem anahtar hem kullanıcı adı varsa direkt sohbete al
      setCurrentUser(savedUser);
      setCurrentPage('chat');
    } else if (savedKey) {
      // Sadece anahtar varsa giriş ekranına al
      setCurrentPage('login');
    }
  }, []);

  // Login başarılı olunca çalışacak fonksiyon
  const handleLoginSuccess = (username: string) => {
    // Kullanıcı adını hafızaya kaydet (F5 için kritik!)
    localStorage.setItem('chat_username', username);
    setCurrentUser(username);
    setCurrentPage('chat');
  };

  return (
    <div>
      {/* 1. EKRAN: REGISTER (KAYIT) */}
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

      {/* 3. EKRAN: CHAT (VİTRİN GİTTİ, GERÇEK SOHBET GELDİ) */}
      {currentPage === 'chat' && currentUser && (
        <Chat 
          currentUser={currentUser}
          onLogout={() => { 
            // Çıkış yapınca kullanıcı adını sil ama ANAHTARI SİLME (yoksa geçmiş gider)
            localStorage.removeItem('chat_username'); 
            setCurrentPage('login'); 
            setCurrentUser(null);
          }} 
        />
      )}
    </div>
  );
}

export default App;