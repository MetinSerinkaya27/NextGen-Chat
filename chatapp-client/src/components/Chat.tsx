import { useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react'; 
// DİKKAT: Artık encryptHybrid ve decryptHybrid kullanıyoruz
import { importPrivateKey, importPublicKey, encryptHybrid, decryptHybrid } from '../utils/crypto';
import { blobToBase64 } from '../utils/fileHelpers'; 

interface ChatProps {
  currentUser: string;
  onLogout: () => void;
}

interface Message {
  id: string;
  user: string;
  text: string;     
  time: string;
  mesajTuru: number; 
}

interface UserFromDB {
  kullaniciAdi: string;
  sonGorulme: string | null;
}

interface MessageFromDB {
  id: string;
  gonderenKullanici: string;
  aliciKullanici: string;
  sifreliIcerik: string;
  tarih: string;
  mesajTuru: number; 
}

export default function Chat({ currentUser, onLogout }: ChatProps) {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [allUsers, setAllUsers] = useState<UserFromDB[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const selectedUserRef = useRef<string | null>(null); 
  const [myPrivateKeyObj, setMyPrivateKeyObj] = useState<CryptoKey | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isRecording, setIsRecording] = useState(false); 
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); 
  const audioChunksRef = useRef<Blob[]>([]); 
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return "Çevrimdışı";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return "Çevrimiçi";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}dk önce`;
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const getCurrentTime = () => new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const formatTimeFromDB = (dateString: string) => new Date(dateString).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const onEmojiClick = (emojiData: any) => setInputText((prev) => prev + emojiData.emoji);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = []; 

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const base64Audio = await blobToBase64(audioBlob);
          // HİBRİT SİSTEME GÖNDER
          await sendMessage(base64Audio, 1);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mikrofon hatası:", err);
      alert("Mikrofona erişilemedi!");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); 
      setIsRecording(false);
    }
  };

  const fetchChatHistory = async (targetUser: string) => {
    if (!myPrivateKeyObj) return;
    setIsLoadingHistory(true);
    setMessages([]); 
    try {
      const res = await axios.get<MessageFromDB[]>(`http://localhost:5124/api/mesajlar/gecmis?kullanici=${currentUser}&hedef=${targetUser}`);
      const decryptedMessages: Message[] = [];
      for (const msg of res.data) {
        try {
          // YENİ: decryptHybrid kullanıyoruz
          const plainText = await decryptHybrid(msg.sifreliIcerik, myPrivateKeyObj);
          decryptedMessages.push({
            id: msg.id, user: msg.gonderenKullanici, text: plainText, time: formatTimeFromDB(msg.tarih), mesajTuru: msg.mesajTuru
          });
        } catch (e) {
          decryptedMessages.push({
            id: msg.id, user: msg.gonderenKullanici, text: "🔒 Format Eski/Çözülemedi", time: formatTimeFromDB(msg.tarih), mesajTuru: 0
          });
        }
      }
      setMessages(decryptedMessages);
    } catch (err) { console.error(err); } 
    finally { setIsLoadingHistory(false); }
  };

  useEffect(() => {
    if (selectedUser && myPrivateKeyObj) fetchChatHistory(selectedUser);
  }, [selectedUser, myPrivateKeyObj]);

  useEffect(() => {
    const init = async () => {
      const storedPrivateKey = localStorage.getItem('myPrivateKey');
      if (storedPrivateKey) {
        try { setMyPrivateKeyObj(await importPrivateKey(storedPrivateKey)); } catch (e) {}
      }
      fetchUsers();
    };
    init();
    const interval = setInterval(fetchUsers, 15000); 
    return () => clearInterval(interval);
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`http://localhost:5124/api/kullanici?haricTutulan=${currentUser}`);
      setAllUsers(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`http://localhost:5124/chathub?username=${currentUser}`, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();
    setConnection(newConnection);
  }, [currentUser]);

  useEffect(() => {
    if (connection && myPrivateKeyObj) {
      connection.off("MesajAl");
      connection.off("KullaniciListesi");

      connection.on("MesajAl", async (gonderen: string, sifreliPaket: string, mesajTuru: number) => {
        if (gonderen === selectedUserRef.current) {
          try {
            // YENİ: decryptHybrid
            const acikMesaj = await decryptHybrid(sifreliPaket, myPrivateKeyObj);
            setMessages(prev => [...prev, { 
              id: Math.random().toString(), user: gonderen, text: acikMesaj, time: getCurrentTime(), mesajTuru: mesajTuru 
            }]);
          } catch (err) { console.error("Çözme hatası:", err); }
        }
      });

      connection.on("KullaniciListesi", (users: string[]) => setOnlineUsers(users));

      if (connection.state === signalR.HubConnectionState.Disconnected) {
        connection.start().catch(err => console.error("SignalR hatası:", err));
      }
    }
    return () => {
      if (connection) {
        connection.off("MesajAl");
        connection.off("KullaniciListesi");
      }
    };
  }, [connection, myPrivateKeyObj]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoadingHistory]);

  const sendMessage = async (content: string = inputText, type: number = 0) => {
    const isContentValid = type === 1 ? (content && content.length > 0) : (content && content.trim().length > 0);

    if (connection && isContentValid && selectedUser) {
      try {
        const response = await axios.get(`http://localhost:5124/api/kullanici/publickey/${selectedUser}`);
        const targetPublicKey = await importPublicKey(response.data.publicKey);
        
        // --- 1. ALICI İÇİN HİBRİT ŞİFRELE ---
        const encryptedForReceiver = await encryptHybrid(content, targetPublicKey);

        const myPublicKeyStr = localStorage.getItem('myPublicKey');
        if (!myPublicKeyStr) throw new Error("Anahtar bulunamadı");
        const myPublicKey = await importPublicKey(myPublicKeyStr);
        
        // --- 2. KENDİM İÇİN HİBRİT ŞİFRELE ---
        const encryptedForMe = await encryptHybrid(content, myPublicKey);
        
        // --- 3. GÖNDER ---
        await connection.invoke("OzelMesajGonder", selectedUser, encryptedForReceiver, encryptedForMe, type);

        setMessages(prev => [...prev, { 
          id: Math.random().toString(), user: currentUser, text: content, time: getCurrentTime(), mesajTuru: type 
        }]);
        
        if (type === 0) setInputText(''); 
        setShowEmojiPicker(false);
      } catch (e: any) { 
        console.error("🔥 Gönderim Hatası:", e);
        alert("Mesaj gönderilemedi: " + e.message); 
      }
    }
  };

  // --- RETURN KISMI AYNI (GÖRSEL DEĞİŞİKLİK YOK) ---
  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden" onClick={() => { setShowEmojiPicker(false); setShowAttachMenu(false); }}>
      <div className="w-[320px] bg-white border-r border-gray-200 flex flex-col z-20 shadow-lg relative">
        <div className="h-20 px-6 flex items-center justify-between bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
             <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-md">{currentUser.charAt(0).toUpperCase()}</div>
             <div><h3 className="font-bold text-gray-800 text-base">{currentUser}</h3><span className="text-xs text-emerald-600 font-medium">● Çevrimiçi</span></div>
          </div>
          <button onClick={onLogout} className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition duration-200"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
        </div>
        <div className="px-5 py-4">
          <div className="relative group">
             <input type="text" placeholder="Sohbetlerde ara..." className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4">
          {allUsers.filter(u => u.kullaniciAdi.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
            <div key={u.kullaniciAdi} onClick={() => setSelectedUser(u.kullaniciAdi)} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${selectedUser === u.kullaniciAdi ? 'bg-emerald-50 border border-emerald-100 shadow-sm' : 'hover:bg-gray-50'}`}>
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">{u.kullaniciAdi.charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center"><span className={`font-semibold text-sm truncate ${selectedUser === u.kullaniciAdi ? 'text-emerald-900' : 'text-gray-900'}`}>{u.kullaniciAdi}</span></div>
                <div className="text-xs text-gray-500">{onlineUsers.includes(u.kullaniciAdi) ? <span className="text-emerald-600 font-medium">Çevrimiçi</span> : formatLastSeen(u.sonGorulme)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#eef2f6] relative">
        {selectedUser ? (
          <>
            <div className="h-20 px-8 flex items-center justify-between bg-white/80 backdrop-blur-md border-b">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center font-bold shadow-inner">{selectedUser.charAt(0)}</div>
                <div><h2 className="font-bold text-gray-800">{selectedUser}</h2></div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map((msg) => {
                const isMe = msg.user === currentUser;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-4 py-3 max-w-[75%] shadow-sm rounded-2xl ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                      {msg.mesajTuru === 1 ? (
                        <div className="min-w-[220px]">
                           <span className="text-[10px] uppercase font-bold opacity-70 block mb-2">🎤 Sesli Mesaj</span>
                           <audio controls src={msg.text} className={`h-8 w-full rounded-lg ${isMe ? 'invert brightness-200' : ''}`} />
                        </div>
                      ) : (
                        <span className="break-words text-[15px]">{msg.text}</span>
                      )}
                      <div className={`text-[10px] text-right mt-1.5 font-medium ${isMe ? 'text-emerald-100' : 'text-gray-400'}`}>{msg.time}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 pt-2">
               <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex items-center gap-2 relative">
                 <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-gray-400 hover:text-emerald-600 transition-colors">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                 </button>
                 <AnimatePresence>
                   {showEmojiPicker && <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:10}} className="absolute bottom-[80px] left-0 z-50 shadow-2xl"><EmojiPicker onEmojiClick={onEmojiClick} height={350} width={300} /></motion.div>}
                 </AnimatePresence>
                 <input type="text" className="flex-1 bg-transparent border-none outline-none p-3 text-gray-700" placeholder="Bir şeyler yazın..." value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
                 {inputText.trim() ? (
                   <button onClick={() => sendMessage()} className="p-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></button>
                 ) : (
                   <button 
                     onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={stopRecording}
                     className={`p-3 rounded-xl transition-all shadow-md ${isRecording ? 'bg-red-500 text-white animate-pulse scale-110' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                   >
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                   </button>
                 )}
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
             <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth={1}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>
             <p className="font-medium">Bir sohbet seçerek güvenli mesajlaşmaya başlayın.</p>
          </div>
        )}
      </div>
    </div>
  );
}