import { useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react'; 
import { importPrivateKey, importPublicKey, encryptMessage, decryptMessage } from '../utils/crypto';

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

  // MİKROFON STATES (YENİ)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // --- MANTIK ---
  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return "Çevrimdışı";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Şimdi";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}dk önce`;
    return date.toLocaleDateString('tr-TR');
  };

  const getCurrentTime = () => new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // --- SES KAYIT MANTIKLARI ---
  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    // Basit sayaç başlat
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const cancelRecording = () => {
    setIsRecording(false);
    setRecordingTime(0);
    clearInterval(timerRef.current);
  };

  const sendRecording = () => {
    // Burada normalde ses dosyası blob olarak alınır.
    // Şimdilik sesli mesaj gitmiş gibi metin yolluyoruz.
    const durationText = formatTime(recordingTime);
    sendMessage(`🎤 Sesli Mesaj (${durationText})`);
    cancelRecording();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- GENEL FONKSİYONLAR ---
  const onEmojiClick = (emojiData: any) => {
    setInputText((prev) => prev + emojiData.emoji);
  };

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
        try {
          setMyPrivateKeyObj(await importPrivateKey(storedKey));
        } catch (e) { console.error(e); }
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
                id: generateId(), user: gonderen, text: acikMesaj, time: getCurrentTime() 
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

  const sendMessage = async (textToSend: string = inputText) => {
    if (connection && textToSend.trim() && selectedUser) {
      try {
        const response = await axios.get(`http://localhost:5124/api/kullanici/publickey/${selectedUser}`);
        const targetKeyObj = await importPublicKey(response.data.publicKey);
        const encryptedText = await encryptMessage(textToSend, targetKeyObj);
        
        await connection.invoke("OzelMesajGonder", selectedUser, encryptedText);

        setMessages(prev => [...prev, { 
          id: generateId(), user: currentUser, text: textToSend, time: getCurrentTime() 
        }]);
        setInputText('');
        setShowEmojiPicker(false);
        setShowAttachMenu(false);
      } catch (e) { alert("Mesaj gönderilemedi"); }
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.kullaniciAdi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUserData = allUsers.find(u => u.kullaniciAdi === selectedUser);
  const isSelectedUserOnline = selectedUser && onlineUsers.includes(selectedUser);

  return (
    <div className="flex h-screen bg-[#d1d7db] font-sans overflow-hidden" onClick={() => {}}>
      
      {/* SOL TARA: Sidebar */}
      <div className="w-[30%] min-w-[300px] bg-white border-r border-gray-300 flex flex-col z-10 relative">
        <div className="h-[60px] bg-[#f0f2f5] px-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden flex items-center justify-center text-gray-600 font-bold text-lg">
               {currentUser.charAt(0).toUpperCase()}
             </div>
             <span className="font-semibold text-gray-700">{currentUser}</span>
          </div>
          <button onClick={onLogout} className="text-gray-500 hover:text-red-500 transition p-2" title="Çıkış Yap">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
        <div className="p-2 border-b border-gray-100 bg-white">
          <div className="bg-[#f0f2f5] h-9 rounded-lg px-4 flex items-center gap-3 focus-within:bg-white focus-within:shadow-sm focus-within:ring-1 focus-within:ring-green-500 transition-all">
             <svg viewBox="0 0 24 24" width="20" height="20" className="text-gray-500"><path fill="currentColor" d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 0 0 1.256-3.386 5.207 5.207 0 1 0-5.207 5.208 5.183 5.183 0 0 0 3.385-1.254l.22.22v.635l4.004 3.999 1.194-1.195-3.997-4.008zm-4.808 0a3.605 3.605 0 1 1 0-7.21 3.605 3.605 0 0 1 0 7.21z"></path></svg>
             <input type="text" placeholder="Aratın veya yeni sohbet başlatın" className="bg-transparent outline-none text-sm w-full text-gray-700 placeholder-gray-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          {filteredUsers.length === 0 ? <div className="text-center text-gray-400 mt-10 text-sm">Kullanıcı bulunamadı</div> : 
            filteredUsers.map(u => {
              const isOnline = onlineUsers.includes(u.kullaniciAdi);
              const isSelected = selectedUser === u.kullaniciAdi;
              return (
                <div key={u.kullaniciAdi} onClick={() => setSelectedUser(u.kullaniciAdi)} className={`flex items-center gap-3 p-3 cursor-pointer border-b border-gray-100 hover:bg-[#f5f6f6] transition-colors h-[72px] ${isSelected ? 'bg-[#f0f2f5]' : ''}`}>
                  <div className="relative">
                    <div className="w-[49px] h-[49px] rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xl">{u.kullaniciAdi.charAt(0).toUpperCase()}</div>
                    {isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>}
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="font-normal text-gray-900 text-[17px]">{u.kullaniciAdi}</span>
                      <span className={`text-[12px] ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>{isOnline ? 'Şimdi' : formatLastSeen(u.sonGorulme)}</span>
                    </div>
                    <div className="text-[14px] text-gray-500 truncate">{isOnline ? 'Müsait' : 'Görülme yok'}</div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* SAĞ TARA: Chat Ekranı */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative border-l border-gray-300">
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundSize: '400px' }}></div>
        <div className="h-[60px] bg-[#f0f2f5] px-4 flex items-center justify-between border-b border-gray-200 z-10">
          {selectedUser ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">{selectedUser.charAt(0)}</div>
              <div className="flex flex-col justify-center">
                <span className="font-semibold text-gray-800 text-md leading-tight">{selectedUser}</span>
                <span className="text-[13px] leading-tight">{isSelectedUserOnline ? <span className="text-gray-600">çevrimiçi</span> : <span className="text-gray-500">{selectedUserData ? `son görülme ${formatLastSeen(selectedUserData.sonGorulme)}` : ''}</span>}</span>
              </div>
            </div>
          ) : <span className="text-gray-500">Sohbet seçiniz</span>}
          <div className="flex gap-5 text-[#54656f]">
             <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="cursor-pointer"><path d="M15.9 14.3H15l-.3-.3c1-1.1 1.6-2.7 1.6-4.3 0-3.7-3-6.7-6.7-6.7S3 6 3 9.7s3 6.7 6.7 6.7c1.6 0 3.2-.6 4.3-1.6l.3.3v.8l5.1 5.1 1.5-1.5-5-5.2zm-6.2 0c-2.6 0-4.6-2.1-4.6-4.6s2.1-4.6 4.6-4.6 4.6 2.1 4.6 4.6-2 4.6-4.6 4.6z"></path></svg>
             <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="cursor-pointer"><path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"></path></svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 z-0 custom-scrollbar" onClick={() => { setShowEmojiPicker(false); setShowAttachMenu(false); }}>
          {messages.map((msg, index) => {
            const isMe = msg.user === currentUser;
            return (
              <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                <div className={`px-2 py-1.5 rounded-lg shadow-sm max-w-[65%] relative text-[14.2px] leading-[19px] ${isMe ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none' : 'bg-white text-[#111b21] rounded-tl-none'}`}>
                  {!isMe && <div className="text-[12px] font-bold text-orange-700 mb-1">{msg.user}</div>}
                  <span className="pr-16 pb-1 inline-block whitespace-pre-wrap">{msg.text}</span>
                  <div className="float-right mt-1 ml-2 flex items-center gap-1 absolute bottom-1 right-2">
                    <span className="text-[11px] text-gray-500">{msg.time}</span>
                    {isMe && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-blue-500"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* --- DİNAMİK INPUT ALANI (YAZI vs KAYIT) --- */}
        <div className="min-h-[62px] bg-[#f0f2f5] px-4 py-2 flex items-center gap-3 z-10 border-t border-gray-200 relative">
           
           {/* POPUP PANELLER */}
           {showEmojiPicker && <div className="absolute bottom-[70px] left-4 shadow-2xl z-50"><EmojiPicker onEmojiClick={onEmojiClick} height={400} width={300} searchDisabled={false} /></div>}
           {showAttachMenu && (
             <motion.div initial={{opacity: 0, scale: 0.9, y: 10}} animate={{opacity: 1, scale: 1, y: 0}} className="absolute bottom-[70px] left-12 flex flex-col-reverse gap-3 z-50 mb-2 ml-1">
                <div className="flex items-center gap-3 group cursor-pointer"><div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-lg hover:scale-105 transition"><span className="text-xl">📄</span></div></div>
                <div className="flex items-center gap-3 group cursor-pointer"><div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center text-white shadow-lg hover:scale-105 transition"><span className="text-xl">📷</span></div></div>
                <div className="flex items-center gap-3 group cursor-pointer"><div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-lg hover:scale-105 transition"><span className="text-xl">🖼️</span></div></div>
             </motion.div>
           )}

           {/* --- MOD DEĞİŞİMİ: KAYIT MI YAZI MI? --- */}
           {isRecording ? (
             // --- KAYIT MODU ---
             <div className="flex-1 flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-500 animate-pulse">
                   <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="12" r="6"></circle></svg>
                   <span className="text-lg font-medium text-gray-600">{formatTime(recordingTime)}</span>
                </div>
                <div className="flex items-center gap-4">
                   <button onClick={cancelRecording} className="text-gray-500 hover:text-red-500 transition font-medium text-sm uppercase tracking-wider">İptal</button>
                   <button onClick={sendRecording} className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center text-white shadow-md hover:scale-110 transition">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 17.2l-4-4-1.4 1.3 5.4 5.4 12-12-1.4-1.3z"></path></svg>
                   </button>
                </div>
             </div>
           ) : (
             // --- YAZI MODU ---
             <>
               <button onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); setShowAttachMenu(false); }} className={`hover:text-gray-700 transition ${showEmojiPicker ? 'text-[#00a884]' : 'text-[#54656f]'}`}>
                 <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-3.204 1.362c-.026-.307-.131 5.218 6.063 5.551 6.066-.25 6.066-5.551 6.066-5.551-6.078 1.416-12.129 0-12.129 0zm11.363 1.108s-.669 1.959-5.051 1.959c-3.505 0-5.388-1.164-5.607-1.959 0 0 5.912 1.055 10.658 0zM11.804 1.011C5.609 1.011.978 6.033.978 12.228s4.826 10.761 11.021 10.761S23.02 18.423 23.02 12.228c.001-6.195-5.021-11.217-11.216-11.217zM12 21.354c-5.273 0-9.381-3.886-9.381-9.159s3.942-9.548 9.215-9.548 9.548 4.275 9.548 9.548c-.001 5.272-4.109 9.159-9.382 9.159zm3.108-9.751c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962z"></path></svg>
               </button>
               <button onClick={(e) => { e.stopPropagation(); setShowAttachMenu(!showAttachMenu); setShowEmojiPicker(false); }} className={`hover:text-gray-700 transition ${showAttachMenu ? 'text-[#00a884]' : 'text-[#54656f]'}`}>
                 <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M1.816 15.556v.002c0 1.502.584 2.912 1.646 3.972s2.472 1.647 3.974 1.647a5.58 5.58 0 0 0 3.972-1.645l9.547-9.548c.769-.768 1.147-1.767 1.058-2.817-.079-.968-.548-1.927-1.319-2.698-1.594-1.592-4.068-1.711-5.517-.262l-7.916 7.915c-.881.881-.792 2.25.214 3.261.959.958 2.423 1.053 3.263.215l5.511-5.512c.28-.28.267-.722.053-.936l-.244-.244c-.191-.191-.567-.349-.957.04l-5.506 5.506c-.18.18-.635.127-.976-.214-.098-.097-.576-.613-.213-.973l7.915-7.917c.818-.817 2.267-.699 3.23.262.5.501.802 1.1.849 1.685.051.573-.156 1.111-.589 1.543l-9.547 9.549a3.97 3.97 0 0 1-2.829 1.171 3.975 3.975 0 0 1-2.83-1.173 3.973 3.973 0 0 1-1.172-2.828c0-1.071.415-2.076 1.172-2.83l7.209-7.211c.157-.157.264-.579.028-.814L11.5 4.36a.57.57 0 0 0-.834.018l-7.205 7.207a5.577 5.577 0 0 0-1.645 3.971z"></path></svg>
               </button>
               <div className="flex-1 bg-white rounded-lg px-4 py-2 border border-white focus-within:border-white">
                 <input type="text" className="w-full outline-none text-gray-700 placeholder-gray-500 text-[15px] bg-transparent" placeholder="Bir mesaj yazın" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} disabled={!selectedUser} onClick={(e) => e.stopPropagation()} />
               </div>
               
               {/* GÖNDER VEYA MİKROFON İKONU */}
               {inputText.trim() ? (
                 <button onClick={() => sendMessage()} disabled={!selectedUser} className="text-[#00a884] transition transform hover:scale-110">
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M16.6915026,12.4744748 L3.50622396,19.7593859 C3.0844005,19.9925026 2.56942699,19.8953151 2.25707664,19.5393665 C2.12053183,19.3837941 2.06202159,19.1764654 2.0950346,18.972333 L3.06456221,12.9734107 L11.0280949,12.4744748 L3.06456221,11.9755389 L2.0950346,5.97661664 C2.02534579,5.54538806 2.32172776,5.14257556 2.75295634,5.07288674 C2.95708874,5.03987373 3.16441738,5.09838397 3.31998982,5.23492878 L16.6915026,12.4744748 Z"></path></svg>
                 </button>
               ) : (
                 <button onClick={startRecording} disabled={!selectedUser} className="text-[#54656f] hover:text-[#00a884] transition">
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.35 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H3.761c0 4.001 3.178 7.297 7.061 7.885v3.884h2.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-2z"></path></svg>
                 </button>
               )}
             </>
           )}
        </div>

      </div>
    </div>
  );
}