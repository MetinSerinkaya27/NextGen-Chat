import { useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import axios from 'axios';
import { motion } from 'framer-motion';
// Kripto fonksiyonlarımızı çağırıyoruz (Yolun doğru olduğundan emin ol)
import { importPrivateKey, importPublicKey, encryptMessage, decryptMessage } from '../utils/crypto';

interface ChatProps {
  currentUser: string;
  onLogout: () => void;
}

interface Message {
  user: string;
  text: string;
}

// Veritabanından gelen kullanıcı yapısı
interface UserFromDB {
  kullaniciAdi: string;
}

export default function Chat({ currentUser, onLogout }: ChatProps) {
  // --- STATE'LER ---
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  
  // Rehber (Tüm kullanıcılar) ve Online Durumu
  const [allUsers, setAllUsers] = useState<UserFromDB[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Kendi Gizli Anahtarımız (Matematiksel obje)
  const [myPrivateKeyObj, setMyPrivateKeyObj] = useState<CryptoKey | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // --- 1. BAŞLANGIÇ: Anahtarı Yükle ve Rehberi Çek ---
  useEffect(() => {
    // A. Kendi Gizli Anahtarımızı Hafızaya Al
    const loadKeys = async () => {
      const storedKey = localStorage.getItem('myPrivateKey');
      if (storedKey) {
        try {
          const keyObj = await importPrivateKey(storedKey);
          setMyPrivateKeyObj(keyObj);
          console.log("🔐 Gizli anahtar başarıyla yüklendi.");
        } catch (e) {
          console.error("Anahtar yükleme hatası:", e);
        }
      }
    };
    loadKeys();

    // B. Veritabanından Diğer Kullanıcıları Çek (REHBER)
    const kullanicilariGetir = async () => {
      try {
        // DİKKAT: Backend "KullaniciController" olduğu için adres "/api/kullanici"
        const res = await axios.get(`http://localhost:5124/api/kullanici?haricTutulan=${currentUser}`);
        setAllUsers(res.data);
      } catch (err) {
        console.error("❌ Kullanıcı listesi çekilemedi (404 alıyorsan Backend'i kontrol et):", err);
      }
    };
    kullanicilariGetir();
  }, [currentUser]);

  // --- 2. SIGNALR BAĞLANTISINI KUR ---
  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`http://localhost:5124/chathub?username=${currentUser}`) // Hub adresi
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);
  }, [currentUser]);

  // --- 3. SIGNALR DİNLEME MODU ---
  useEffect(() => {
    if (connection && myPrivateKeyObj) { // Anahtar ve Bağlantı hazırsa başla
      connection.start()
        .then(() => {
          console.log("✅ Socket Bağlantısı Kuruldu!");

          // A. Mesaj Geldiğinde
          connection.on("MesajAl", async (gonderen: string, sifreliMesaj: string) => {
            // Sadece başkasından gelen mesajları çözüyoruz
            if (gonderen !== currentUser) {
              try {
                // Şifreyi Çöz 🔓
                const acikMesaj = await decryptMessage(sifreliMesaj, myPrivateKeyObj);
                setMessages(prev => [...prev, { user: gonderen, text: acikMesaj }]);
              } catch (err) {
                console.error("Şifre çözme hatası:", err);
                setMessages(prev => [...prev, { user: gonderen, text: "🔒 Mesaj Çözülemedi" }]);
              }
            }
          });

          // B. Online Listesi Güncellemesi
          connection.on("KullaniciListesi", (users: string[]) => {
            setOnlineUsers(users);
          });
        })
        .catch(err => console.error("Socket Bağlantı Hatası:", err));
    }
  }, [connection, myPrivateKeyObj]);

  // --- 4. EKRAN KAYDIRMA ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- 5. MESAJ GÖNDERME (ŞİFRELEME) ---
  const sendMessage = async () => {
    if (connection && inputText.trim() && selectedUser) {
      try {
        // A. Karşı tarafın Public Key'ini al
        const response = await axios.get(`http://localhost:5124/api/kullanici/publickey/${selectedUser}`);
        const targetPublicKeyString = response.data.publicKey;
        
        // B. String anahtarı objeye çevir
        const targetKeyObj = await importPublicKey(targetPublicKeyString);

        // C. Mesajı KİLİTLE 🔒
        const encryptedText = await encryptMessage(inputText, targetKeyObj);
        
        console.log(`📤 Gönderiliyor (${selectedUser}):`, inputText);
        console.log(`🔐 Şifreli Veri:`, encryptedText);

        // D. Sunucuya gönder
        await connection.invoke("OzelMesajGonder", selectedUser, encryptedText);

        // E. Ekranımıza kendi yazdığımızı ekle
        setMessages(prev => [...prev, { user: currentUser, text: inputText }]);
        
        setInputText('');
      } catch (e) {
        console.error("Mesaj gönderme hatası:", e);
        alert("Mesaj gönderilemedi! Kullanıcı bulunamadı veya anahtar hatası.");
      }
    } else if (!selectedUser) {
      alert("Lütfen sol taraftan bir kişi seçin!");
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      
      {/* --- SOL TARA: REHBER --- */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-700">Kişiler 👥</h2>
          <div className="text-xs text-gray-400 mt-1">Ben: {currentUser}</div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {allUsers.length === 0 ? (
            <div className="p-4 text-gray-400 text-sm text-center">
              Rehber boş veya yükleniyor...<br/>(Veritabanında başka kullanıcı var mı?)
            </div>
          ) : (
            allUsers.map(u => {
              const isOnline = onlineUsers.includes(u.kullaniciAdi);
              return (
                <div 
                  key={u.kullaniciAdi}
                  onClick={() => setSelectedUser(u.kullaniciAdi)}
                  className={`p-4 cursor-pointer flex items-center gap-3 border-b border-gray-50 transition-colors
                    ${selectedUser === u.kullaniciAdi ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : 'hover:bg-gray-50'}`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold">
                      {u.kullaniciAdi.charAt(0).toUpperCase()}
                    </div>
                    {/* Online Işığı */}
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white 
                      ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{u.kullaniciAdi}</div>
                    <div className="text-xs text-gray-400">{isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <div className="p-4 border-t">
          <button onClick={onLogout} className="w-full text-red-500 border border-red-100 py-2 rounded hover:bg-red-50 text-sm font-medium">
            Çıkış Yap
          </button>
        </div>
      </div>

      {/* --- SAĞ TARA: SOHBET PENCERESİ --- */}
      <div className="w-2/3 flex flex-col bg-[#e5ddd5]">
        {/* Başlık */}
        <div className="p-4 bg-white shadow-sm flex items-center gap-3 z-10">
          {selectedUser ? (
            <>
              <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
                {selectedUser.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-800">{selectedUser}</span>
                <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 rounded-full w-fit">
                  🔒 Uçtan Uca Şifreli
                </span>
              </div>
            </>
          ) : (
            <span className="text-gray-400 italic">Mesajlaşmak için bir kişi seçin...</span>
          )}
        </div>

        {/* Mesajlar */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          {messages.map((msg, index) => {
            const isMe = msg.user === currentUser;
            return (
               <motion.div 
                 key={index}
                 initial={{ opacity: 0, y: 5 }}
                 animate={{ opacity: 1, y: 0 }}
                 className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
               >
                 <div className={`max-w-[70%] px-4 py-2 rounded-xl shadow-sm text-sm relative
                   ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}
                 `}>
                   {!isMe && <div className="text-[10px] text-orange-600 font-bold mb-1">{msg.user}</div>}
                   <p>{msg.text}</p>
                 </div>
               </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Yazma Alanı */}
        <div className="p-3 bg-gray-100">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <input 
              type="text" 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              disabled={!selectedUser}
              placeholder={selectedUser ? "Şifreli mesaj yaz..." : "Kişi seçiniz 👈"}
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 outline-none focus:border-emerald-500 disabled:bg-gray-200 transition-colors"
            />
            <button 
              onClick={sendMessage} 
              disabled={!selectedUser} 
              className="bg-emerald-600 text-white w-10 h-10 rounded-full hover:bg-emerald-700 disabled:bg-gray-400 shadow-md flex items-center justify-center transition-all active:scale-95"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}