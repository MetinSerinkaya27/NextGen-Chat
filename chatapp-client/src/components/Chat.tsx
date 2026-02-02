import { useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react'; 
import { importPrivateKey, importPublicKey, encryptMessage, decryptMessage } from '../utils/crypto';

// --- TİPLER ---
interface ChatProps {
  currentUser: string;
  onLogout: () => void;
}

interface Message {
  id: string;
  user: string;
  text: string;
  time: string;
}

interface UserFromDB {
  kullaniciAdi: string;
  sonGorulme: string | null;
}

export default function Chat({ currentUser, onLogout }: ChatProps) {
  // --- STATE ---
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [allUsers, setAllUsers] = useState<UserFromDB[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [myPrivateKeyObj, setMyPrivateKeyObj] = useState<CryptoKey | null>(null);
  
  // UI STATES
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // --- MANTIK ---
  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return "Çevrimdışı";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Çevrimiçi";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}dk önce`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}sa önce`;
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const getCurrentTime = () => new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const onEmojiClick = (emojiData: any) => setInputText((prev) => prev + emojiData.emoji);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`http://localhost:5124/api/kullanici?haricTutulan=${currentUser}`);
      setAllUsers(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const init = async () => {
      const storedKey = localStorage.getItem('myPrivateKey');
      if (storedKey) {
        try { setMyPrivateKeyObj(await importPrivateKey(storedKey)); } catch (e) {}
      }
      await fetchUsers();
    };
    init();
    const interval = setInterval(fetchUsers, 15000); 
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`http://localhost:5124/chathub?username=${currentUser}`)
      .withAutomaticReconnect()
      .build();
    setConnection(newConnection);
  }, [currentUser]);

  useEffect(() => {
    if (connection && myPrivateKeyObj) {
      connection.start().then(() => {
        connection.on("MesajAl", async (gonderen: string, sifreliMesaj: string) => {
          if (gonderen !== currentUser) {
            try {
              const acikMesaj = await decryptMessage(sifreliMesaj, myPrivateKeyObj);
              setMessages(prev => [...prev, { 
                id: Math.random().toString(), user: gonderen, text: acikMesaj, time: getCurrentTime() 
              }]);
            } catch (err) {}
          }
        });
        connection.on("KullaniciListesi", (users: string[]) => setOnlineUsers(users));
      });
    }
  }, [connection, myPrivateKeyObj]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (connection && inputText.trim() && selectedUser) {
      try {
        const response = await axios.get(`http://localhost:5124/api/kullanici/publickey/${selectedUser}`);
        const targetKeyObj = await importPublicKey(response.data.publicKey);
        const encryptedText = await encryptMessage(inputText, targetKeyObj);
        
        await connection.invoke("OzelMesajGonder", selectedUser, encryptedText);

        setMessages(prev => [...prev, { 
          id: Math.random().toString(), user: currentUser, text: inputText, time: getCurrentTime() 
        }]);
        setInputText('');
        setShowEmojiPicker(false);
        setShowAttachMenu(false);
      } catch (e) { alert("Mesaj iletilemedi"); }
    }
  };

  const filteredUsers = allUsers.filter(u => u.kullaniciAdi.toLowerCase().includes(searchQuery.toLowerCase()));
  const selectedUserData = allUsers.find(u => u.kullaniciAdi === selectedUser);
  const isSelectedUserOnline = selectedUser && onlineUsers.includes(selectedUser);

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden" onClick={() => { setShowEmojiPicker(false); setShowAttachMenu(false); }}>
      
      {/* SOL TARA: Sidebar (Modern & Temiz) */}
      <div className="w-[320px] bg-white border-r border-gray-200 flex flex-col z-20 shadow-lg relative">
        
        {/* Header */}
        <div className="h-20 px-6 flex items-center justify-between bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
             <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
               {currentUser.charAt(0).toUpperCase()}
             </div>
             <div>
               <h3 className="font-bold text-gray-800 text-base">{currentUser}</h3>
               <span className="text-xs text-emerald-600 font-medium">● Çevrimiçi</span>
             </div>
          </div>
          <button onClick={onLogout} className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition duration-200" title="Çıkış Yap">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
        
        {/* Arama Barı */}
        <div className="px-5 py-4">
          <div className="relative group">
             <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-emerald-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             <input 
               type="text" 
               placeholder="Sohbetlerde ara..." 
               className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder-gray-400"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
        </div>

        {/* Kullanıcı Listesi */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4 space-y-1">
          {filteredUsers.length === 0 ? (
             <div className="text-center text-gray-400 mt-10 text-sm font-medium">Kullanıcı bulunamadı</div>
          ) : (
            filteredUsers.map(u => {
              const isOnline = onlineUsers.includes(u.kullaniciAdi);
              const isSelected = selectedUser === u.kullaniciAdi;
              return (
                <motion.div 
                  key={u.kullaniciAdi}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => { e.stopPropagation(); setSelectedUser(u.kullaniciAdi); }}
                  className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200
                    ${isSelected ? 'bg-emerald-50 border border-emerald-100 shadow-sm' : 'hover:bg-gray-50 border border-transparent'}`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-colors
                      ${isSelected ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                      {u.kullaniciAdi.charAt(0).toUpperCase()}
                    </div>
                    {isOnline && <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className={`font-semibold text-sm truncate ${isSelected ? 'text-emerald-900' : 'text-gray-900'}`}>{u.kullaniciAdi}</span>
                      <span className="text-[11px] text-gray-400 font-medium">
                        {isOnline ? 'Şimdi' : formatLastSeen(u.sonGorulme)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                      {isOnline ? <span className="text-emerald-600 font-medium">Müsait</span> : 'Görülme yok'}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* SAĞ TARA: Chat Ekranı */}
      <div className="flex-1 flex flex-col bg-[#eef2f6] relative">
        
        {/* Arka Plan Deseni (Çok Hafif) */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
            backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')"
        }}></div>

        {selectedUser ? (
          <>
            {/* Chat Header (Glassmorphism) */}
            <div className="h-20 px-8 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-bold shadow-inner">
                  {selectedUser.charAt(0)}
                </div>
                <div>
                  <h2 className="font-bold text-gray-800 text-lg leading-tight">{selectedUser}</h2>
                  <span className="text-xs font-medium flex items-center gap-1.5">
                    {isSelectedUserOnline 
                      ? <><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> <span className="text-green-600">Çevrimiçi</span></>
                      : <span className="text-gray-500">Son görülme: {selectedUserData ? formatLastSeen(selectedUserData.sonGorulme) : '-'}</span>}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-gray-400">
                 <button className="hover:text-emerald-600 transition p-2 hover:bg-emerald-50 rounded-full"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M15.9 14.3H15l-.3-.3c1-1.1 1.6-2.7 1.6-4.3 0-3.7-3-6.7-6.7-6.7S3 6 3 9.7s3 6.7 6.7 6.7c1.6 0 3.2-.6 4.3-1.6l.3.3v.8l5.1 5.1 1.5-1.5-5-5.2zm-6.2 0c-2.6 0-4.6-2.1-4.6-4.6s2.1-4.6 4.6-4.6 4.6 2.1 4.6 4.6-2 4.6-4.6 4.6z"></path></svg></button>
                 <button className="hover:text-emerald-600 transition p-2 hover:bg-emerald-50 rounded-full"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"></path></svg></button>
              </div>
            </div>

            {/* Mesaj Alanı */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 z-0 custom-scrollbar">
              {messages.map((msg) => {
                const isMe = msg.user === currentUser;
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`px-4 py-3 max-w-[65%] shadow-sm relative text-[15px] leading-relaxed
                       ${isMe 
                         ? 'bg-emerald-600 text-white rounded-2xl rounded-tr-none' 
                         : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-none'}
                    `}>
                      {!isMe && <div className="text-[11px] font-bold text-emerald-600 mb-1 tracking-wide">{msg.user}</div>}
                      
                      <span className="break-words">{msg.text}</span>
                      
                      <div className={`text-[10px] text-right mt-1.5 font-medium opacity-80 ${isMe ? 'text-emerald-100' : 'text-gray-400'}`}>
                        {msg.time}
                        {isMe && <span className="ml-1 inline-block">✓</span>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Alanı (Floating Bar) */}
            <div className="p-6 pt-2 z-20">
               <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex items-center gap-2 relative">
                 
                 {/* Popup Paneller */}
                 <AnimatePresence>
                   {showEmojiPicker && (
                     <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:10}} className="absolute bottom-[80px] left-0 shadow-2xl rounded-2xl overflow-hidden z-50">
                       <EmojiPicker onEmojiClick={onEmojiClick} height={350} width={300} searchDisabled={false} />
                     </motion.div>
                   )}
                   {showAttachMenu && (
                     <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.9}} className="absolute bottom-[80px] left-12 flex flex-col gap-2 z-50 bg-white p-2 rounded-xl shadow-lg border border-gray-100">
                        <button className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg text-gray-700 text-sm font-medium transition"><span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">📄</span> Belge</button>
                        <button className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg text-gray-700 text-sm font-medium transition"><span className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">📷</span> Fotoğraf</button>
                     </motion.div>
                   )}
                 </AnimatePresence>

                 {/* Sol Butonlar */}
                 <div className="flex items-center gap-1 pl-1">
                   <button onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); setShowAttachMenu(false); }} className={`p-2 rounded-full transition-all duration-200 ${showEmojiPicker ? 'bg-yellow-100 text-yellow-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}>
                     <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); setShowAttachMenu(!showAttachMenu); setShowEmojiPicker(false); }} className={`p-2 rounded-full transition-all duration-200 ${showAttachMenu ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}>
                     <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                   </button>
                 </div>

                 {/* Input */}
                 <input 
                   type="text" 
                   className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 px-2 py-3 font-medium" 
                   placeholder="Bir şeyler yazın..." 
                   value={inputText} 
                   onChange={e => setInputText(e.target.value)} 
                   onKeyDown={e => e.key === 'Enter' && sendMessage()} 
                   onClick={(e) => e.stopPropagation()} 
                 />
                 
                 {/* Gönder Butonu */}
                 <button 
                    onClick={sendMessage} 
                    disabled={!inputText.trim()}
                    className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center shadow-md mr-1
                      ${inputText.trim() 
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 cursor-pointer' 
                        : 'bg-gray-100 text-gray-400 cursor-default'}`}
                 >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                 </button>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-[#eef2f6]">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
               <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth={1} className="text-gray-300"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
             </div>
             <h3 className="text-lg font-semibold text-gray-600 mb-2">Hoş Geldiniz, {currentUser}!</h3>
             <p className="text-sm opacity-70">Görüşmeye başlamak için sol menüden bir kişi seçin.</p>
             <div className="mt-8 text-xs flex items-center gap-2 text-emerald-600/70 bg-emerald-50 px-4 py-2 rounded-full">
               <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
               Uçtan Uca Şifreli Bağlantı
             </div>
          </div>
        )}
      </div>
    </div>
  );
}