import { useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr'; // SignalR kütüphanesini içeri aldık
import { motion } from 'framer-motion'; // Animasyonlar için

// Bu bileşenin alacağı özellikler (Props)
interface ChatProps {
  currentUser: string; // Kim giriş yaptı?
  onLogout: () => void; // Çıkış yapınca ne olsun?
}

// Bir mesajın yapısı nasıldır?
interface Message {
  user: string; // Mesajı kim attı?
  text: string; // Ne yazdı?
}

export default function Chat({ currentUser, onLogout }: ChatProps) {
  
  // --- DEĞİŞKENLER (STATE) ---
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null); // Bağlantı nesnesi
  const [messages, setMessages] = useState<Message[]>([]); // Mesajların tutulduğu liste
  const [inputText, setInputText] = useState(''); // O an yazılan yazı
  
  // Mesaj gelince otomatik en alta kaydırmak için referans
  const messagesEndRef = useRef<HTMLDivElement| null>(null);

  // --- 1. BAĞLANTIYI KURMA (Sayfa İlk Açıldığında) ---
  useEffect(() => {
    // Yeni bir bağlantı inşa ediyoruz
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5124/chathub") // Backend'deki kapı adresi
      .withAutomaticReconnect() // Bağlantı koparsa (internet giderse) tekrar dene
      .build();

    // Bağlantıyı state'e kaydet
    setConnection(newConnection);
  }, []);

  // --- 2. SİNYALLERİ DİNLEME VE BAŞLATMA ---
  useEffect(() => {
    if (connection) {
      connection.start()
        .then(() => {
          console.log("✅ Sunucuyla bağlantı kuruldu!");

          // DİNLEME MODU: Backend bize "MesajAl" derse ne yapalım?
          connection.on("MesajAl", (user: string, text: string) => {
            // Gelen yeni mesajı, eski listeye ekle
            setMessages(eskiMesajlar => [...eskiMesajlar, { user, text }]);
          });
        })
        .catch(hata => console.error("❌ Bağlantı hatası:", hata));
    }
  }, [connection]);

  // --- 3. OTOMATİK KAYDIRMA ---
  // Her yeni mesaj geldiğinde (messages değişince) ekranı en alta kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- 4. MESAJ GÖNDERME FONKSİYONU ---
  const sendMessage = async () => {
    // Eğer bağlantı varsa ve yazı kutusu boş değilse
    if (connection && inputText.trim()) {
      try {
        // KONUŞMA MODU: Backend'deki "MesajGonder" fonksiyonunu çalıştır
        await connection.invoke("MesajGonder", currentUser, inputText);
        
        // Kutuyu temizle
        setInputText('');
      } catch (e) {
        console.error("Mesaj gitmedi:", e);
      }
    }
  };

  // --- 5. EKRAN TASARIMI (UI) ---
  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      
      {/* ÜST BAR (HEADER) */}
      <div className="bg-white shadow-sm p-4 flex justify-between items-center border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
          <h1 className="text-xl font-bold text-gray-800">NextGen Chat 💬</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full text-sm font-bold">
            👤 {currentUser}
          </span>
          <button onClick={onLogout} className="text-red-500 font-medium text-sm hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded transition-colors">
            Çıkış Yap
          </button>
        </div>
      </div>

      {/* MESAJ ALANI (ORTA KISIM) */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#e5ddd5]"> {/* WhatsApp arka plan rengine benzer */}
        
        {messages.map((msg, index) => {
          // Bu mesajı ben mi attım? (Kontrolü)
          const isMe = msg.user === currentUser;
          
          return (
            <motion.div 
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {/* Baloncuk Tasarımı */}
              <div className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-md relative
                ${isMe 
                  ? 'bg-emerald-600 text-white rounded-tr-none' // Benim mesajım (Yeşil)
                  : 'bg-white text-gray-800 rounded-tl-none'} // Başkasının mesajı (Beyaz)
              `}>
                {/* Eğer mesaj başkasınınsa ismini ufakça göster */}
                {!isMe && <div className="text-xs text-orange-600 font-bold mb-1">{msg.user}</div>}
                
                <p className="text-md">{msg.text}</p>
                
                {/* Saat (Temsili) */}
                <span className={`text-[10px] block text-right mt-1 opacity-70 ${isMe ? 'text-emerald-100' : 'text-gray-400'}`}>
                  {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </motion.div>
          );
        })}
        {/* Otomatik kaydırma için görünmez nokta */}
        <div ref={messagesEndRef} />
      </div>

      {/* YAZMA ALANI (ALT KISIM) */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex gap-3 max-w-5xl mx-auto items-center">
          <input 
            type="text" 
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()} // Enter'a basınca gönder
            placeholder="Bir mesaj yazın..."
            className="flex-1 border border-gray-300 rounded-full px-5 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all shadow-sm"
          />
          <button 
            onClick={sendMessage}
            className="bg-emerald-600 text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-emerald-700 shadow-lg transform active:scale-95 transition-all"
          >
            {/* Gönder İkonu (SVG) */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 ml-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  );
}