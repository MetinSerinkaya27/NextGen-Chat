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
            // Çıkış yapınca her şeyi temizle ve başa dön
            localStorage.clear(); 
            setCurrentPage('register'); 
          }} 
        />
      )}
    </div>
  );
}

export default App;