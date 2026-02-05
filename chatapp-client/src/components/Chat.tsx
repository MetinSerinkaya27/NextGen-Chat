import { useEffect, useState, useRef, useMemo } from 'react';
import * as signalR from '@microsoft/signalr';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react'; 
import { importPrivateKey, importPublicKey, encryptHybrid, decryptHybrid } from '../utils/crypto';
import { blobToBase64 } from '../utils/fileHelpers'; 

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
  mesajTuru: number; // 0: Metin, 1: Ses, 2: Resim
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

// --- 📊 CANLI SES DALGASI KOMPONENTİ ---
const LiveAudioVisualizer = ({ isRecording }: { isRecording: boolean }) => {
  return (
    <div className="flex items-center gap-[2px] h-6 mx-2">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ height: 4 }}
          animate={isRecording ? { height: [4, Math.random() * 24 + 4, 4] } : { height: 4 }}
          transition={{ repeat: Infinity, duration: 0.2 + Math.random() * 0.3, ease: "easeInOut" }}
          className="w-[3px] bg-gray-500 rounded-full opacity-60"
        />
      ))}
    </div>
  );
};

// --- 📷 RESİM MESAJI BİLEŞENİ ---
const ImageMessage = ({ src, isMe }: { src: string, isMe: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer overflow-hidden rounded-lg mb-1 border border-black/5">
        <img src={src} alt="Resim" className="max-w-[240px] max-h-[300px] object-cover" />
      </div>
      {/* Lightbox */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            onClick={() => setIsOpen(false)} 
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out backdrop-blur-sm"
          >
             <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} src={src} className="max-w-full max-h-full rounded-md shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// --- 🎵 SES OYNATICI ---
const AudioMessage = ({ src, isMe }: { src: string, isMe: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? "0" + sec : sec}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); } 
    else { audioRef.current.playbackRate = playbackRate; audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const changeSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(newRate);
    if (audioRef.current) audioRef.current.playbackRate = newRate;
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const total = audioRef.current.duration;
    setCurrentTime(current);
    setProgress(total ? (current / total) * 100 : 0);
    if (current === total) { setIsPlaying(false); setProgress(0); setCurrentTime(0); }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    audioRef.current.currentTime = newTime;
    setProgress(parseFloat(e.target.value));
  };

  return (
    <div className="flex items-center gap-2 min-w-[260px] select-none pr-1">
      <audio ref={audioRef} src={src} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={() => setIsPlaying(false)} />
      <button onClick={togglePlay} className="w-9 h-9 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors shrink-0">
        {isPlaying ? <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg> : <svg className="w-5 h-5 text-gray-600 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
      </button>
      <div className="flex-1 flex flex-col justify-center gap-1">
        <input type="range" min="0" max="100" value={progress} onChange={handleSeek} className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${isMe ? 'accent-[#005c4b] bg-black/10' : 'accent-[#005c4b] bg-gray-300'}`} />
        <div className="flex justify-between text-[10px] text-gray-500 font-medium"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
      </div>
      <button onClick={changeSpeed} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shrink-0 ml-1 ${isMe ? 'bg-[#005c4b]/10 text-[#005c4b] hover:bg-[#005c4b]/20' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>{playbackRate}x</button>
    </div>
  );
};

// 💬 MESAJ BALONU
const MessageBubble = ({ msg, isMe }: { msg: Message, isMe: boolean }) => (
  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
    <div className={`relative px-2 py-1.5 max-w-[80%] sm:max-w-[60%] rounded-lg shadow-sm text-[14.2px] leading-[19px] ${isMe ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'}`}>
      {isMe ? <span className="absolute -right-2 top-0 w-0 h-0 border-[8px] border-t-[#d9fdd3] border-r-transparent border-b-transparent border-l-transparent"></span> : <span className="absolute -left-2 top-0 w-0 h-0 border-[8px] border-t-white border-l-transparent border-b-transparent border-r-transparent"></span>}
      {msg.mesajTuru === 1 ? <AudioMessage src={msg.text} isMe={isMe} /> : msg.mesajTuru === 2 ? <ImageMessage src={msg.text} isMe={isMe} /> : <span className="px-1 pb-1 block break-words">{msg.text}</span>}
      <div className="flex justify-end items-center gap-1 mt-0.5 px-1 pb-0.5 opacity-60">
        <span className="text-[10px] min-w-fit">{msg.time}</span>
        {isMe && <svg viewBox="0 0 16 11" width="14" height="9" className="text-[#53bdeb]" fill="currentColor"><path d="M11.15 1.1l-6.8 6.8L1.6 5.15.5 6.25l4.9 4.9 7.9-7.9-1.1-1.1z"/><path d="M15.5 1.1l-6.8 6.8-.75-.75 1.1-1.1 5.35-5.35 1.1 1.1z"/></svg>}
      </div>
    </div>
  </div>
);

// --- ANA CHAT ---
export default function Chat({ currentUser, onLogout }: ChatProps) {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allUsers, setAllUsers] = useState<UserFromDB[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [myPrivateKeyObj, setMyPrivateKeyObj] = useState<CryptoKey | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI States
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedUserRef = useRef<string | null>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Logic
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startXRef = useRef<number>(0);
  const dragOffsetRef = useRef<number>(0);
  const isCancelledRef = useRef(false);

  useEffect(() => { selectedUserRef.current = selectedUser; setIsTyping(false); }, [selectedUser]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  useEffect(() => {
    const initKeys = async () => {
      const storedKey = localStorage.getItem('myPrivateKey');
      if (storedKey) { try { setMyPrivateKeyObj(await importPrivateKey(storedKey)); } catch (e) {} }
    };
    initKeys(); fetchUsers();
    const interval = setInterval(fetchUsers, 15000); return () => clearInterval(interval);
  }, [currentUser]);

  const fetchUsers = async () => { try { const res = await axios.get(`http://localhost:5124/api/kullanici?haricTutulan=${currentUser}`); setAllUsers(res.data); } catch {} };

  useEffect(() => {
    const newConn = new signalR.HubConnectionBuilder()
      .withUrl(`http://localhost:5124/chathub?username=${currentUser}`, { skipNegotiation: true, transport: signalR.HttpTransportType.WebSockets })
      .withAutomaticReconnect()
      .build();
    setConnection(newConn);
  }, [currentUser]);

  useEffect(() => {
    if (connection && myPrivateKeyObj) {
      connection.off("MesajAl"); connection.off("KullaniciListesi"); connection.off("KullaniciYaziyor");
      
      connection.on("MesajAl", async (gonderen: string, paket: string, tur: number) => {
        if (gonderen === selectedUserRef.current) {
          setIsTyping(false);
          try {
            const text = await decryptHybrid(paket, myPrivateKeyObj);
            setMessages(p => [...p, { id: Math.random().toString(), user: gonderen, text, time: new Date().toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}), mesajTuru: tur }]);
          } catch (e) { console.error(e); }
        }
      });

      connection.on("KullaniciYaziyor", (gonderen: string) => {
        if (gonderen === selectedUserRef.current) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
        }
      });

      connection.on("KullaniciListesi", (users: string[]) => setOnlineUsers(users));
      if (connection.state === signalR.HubConnectionState.Disconnected) connection.start().catch(console.error);
    }
  }, [connection, myPrivateKeyObj]);

  const fetchHistory = async (target: string) => {
    if (!myPrivateKeyObj) return;
    setMessages([]);
    try {
      const { data } = await axios.get<MessageFromDB[]>(`http://localhost:5124/api/mesajlar/gecmis?kullanici=${currentUser}&hedef=${target}`);
      const decrypted = await Promise.all(data.map(async (m) => {
        try {
          const text = await decryptHybrid(m.sifreliIcerik, myPrivateKeyObj);
          return { id: m.id, user: m.gonderenKullanici, text, time: new Date(m.tarih).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}), mesajTuru: m.mesajTuru };
        } catch { return { id: m.id, user: m.gonderenKullanici, text: "🔒", time: "", mesajTuru: 0 }; }
      }));
      setMessages(decrypted);
    } catch {}
  };
  useEffect(() => { if (selectedUser && myPrivateKeyObj) fetchHistory(selectedUser); }, [selectedUser, myPrivateKeyObj]);

  const handleTyping = () => {
    if (connection && selectedUser) connection.invoke("Yaziyor", selectedUser).catch(err => console.error(err));
  };

  const sendMessage = async (content: string = inputText, type: number = 0) => {
    const isValid = (type === 1 || type === 2) ? !!content : !!content.trim();
    if (!connection || !isValid || !selectedUser) return;
    try {
      const { data: { publicKey } } = await axios.get(`http://localhost:5124/api/kullanici/publickey/${selectedUser}`);
      const targetKey = await importPublicKey(publicKey);
      const myKey = await importPublicKey(localStorage.getItem('myPublicKey')!);
      const encReceiver = await encryptHybrid(content, targetKey);
      const encMe = await encryptHybrid(content, myKey);
      await connection.invoke("OzelMesajGonder", selectedUser, encReceiver, encMe, type);
      setMessages(p => [...p, { id: Math.random().toString(), user: currentUser, text: content, time: new Date().toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}), mesajTuru: type }]);
      if (type === 0) { setInputText(''); setShowEmojiPicker(false); }
    } catch (e) { alert("Mesaj gönderilemedi."); }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try { const base64 = await blobToBase64(file); await sendMessage(base64, 2); } catch { alert("Resim yüklenemedi!"); }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => { let i: any; if (isRecording) { setRecordingDuration(0); i = setInterval(() => setRecordingDuration(p => p + 1), 1000); } else { clearInterval(i); setRecordingDuration(0); } return () => clearInterval(i); }, [isRecording]);
  const handleMouseDown = async (e: React.MouseEvent) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startXRef.current = e.clientX; dragOffsetRef.current = 0; setDragOffset(0); isCancelledRef.current = false;
      window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp);
      const mr = new MediaRecorder(stream); mediaRecorderRef.current = mr; audioChunksRef.current = [];
      mr.ondataavailable = (ev) => { if(ev.data.size > 0) audioChunksRef.current.push(ev.data); };
      mr.onstop = async () => {
        if (!isCancelledRef.current && audioChunksRef.current.length > 0) { const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); await sendMessage(await blobToBase64(blob), 1); }
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); setIsRecording(true);
    } catch { alert("Mikrofon izni gerekli."); }
  };
  const handleMouseMove = (e: MouseEvent) => { const diff = e.clientX - startXRef.current; if (diff < 0 && diff > -200) { dragOffsetRef.current = diff; setDragOffset(diff); } else if (diff <= -200) { dragOffsetRef.current = -200; setDragOffset(-200); } };
  const handleMouseUp = () => {
    window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp);
    if (mediaRecorderRef.current?.state === "recording") { isCancelledRef.current = dragOffsetRef.current < -100; mediaRecorderRef.current.stop(); setIsRecording(false); setDragOffset(0); }
  };

  const filteredUsers = allUsers.filter(u => u.kullaniciAdi.toLowerCase().includes(searchQuery.toLowerCase()));
  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex h-screen bg-[#d1d7db] font-sans text-gray-900 overflow-hidden" onClick={() => setShowEmojiPicker(false)}>
      
      <div className="w-[30%] min-w-[320px] max-w-[420px] bg-white border-r border-gray-300 flex flex-col z-20">
        <div className="h-[60px] bg-[#f0f2f5] flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600">{currentUser.charAt(0).toUpperCase()}</div>
             <span className="font-semibold text-gray-700">{currentUser}</span>
          </div>
          <button onClick={onLogout} className="text-gray-500 hover:text-red-500 transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
        </div>
        <div className="p-2 border-b border-gray-100 bg-white">
          <div className="bg-[#f0f2f5] rounded-lg flex items-center px-3 py-1.5">
             <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
             <input type="text" placeholder="Aratın veya yeni sohbet başlatın" className="bg-transparent border-none outline-none w-full text-sm text-gray-700" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          {filteredUsers.map(u => (
            <div key={u.kullaniciAdi} onClick={() => setSelectedUser(u.kullaniciAdi)} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-[#f5f6f6] border-b border-gray-100 last:border-0 ${selectedUser === u.kullaniciAdi ? 'bg-[#f0f2f5]' : ''}`}>
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 shrink-0">{u.kullaniciAdi.charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                   <span className="font-medium text-gray-900 truncate">{u.kullaniciAdi}</span>
                   <span className="text-[11px] text-gray-400">{onlineUsers.includes(u.kullaniciAdi) ? 'Online' : new Date(u.sonGorulme || '').toLocaleDateString('tr-TR', {day:'numeric', month:'short'})}</span>
                </div>
                <div className="text-sm text-gray-500 truncate">{onlineUsers.includes(u.kullaniciAdi) ? 'Çevrimiçi' : 'Son görülme...'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#efeae2] relative min-w-0">
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')" }}></div>

        {selectedUser ? (
          <>
            <div className="h-[60px] px-4 flex items-center bg-[#f0f2f5] border-b border-gray-200 z-10 shrink-0">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600 mr-3">{selectedUser.charAt(0)}</div>
              <div className="flex flex-col">
                  <span className="font-semibold text-gray-800 text-sm">{selectedUser}</span>
                  <span className="text-xs text-gray-500 min-h-[16px]">{isTyping ? <span className="text-[#00a884] font-medium animate-pulse transition-all">yazıyor...</span> : (onlineUsers.includes(selectedUser) ? 'çevrimiçi' : 'çevrimdışı')}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:px-8 space-y-1 custom-scrollbar z-0">
              {messages.map(msg => <MessageBubble key={msg.id} msg={msg} isMe={msg.user === currentUser} />)}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-2 bg-[#f0f2f5] z-10 flex items-center gap-2 select-none">
              <button onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }} className="text-gray-500 hover:text-gray-700 transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
              
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
              <button onClick={() => fileInputRef.current?.click()} className="text-gray-500 hover:text-gray-700 transition transform rotate-45" title="Resim Gönder"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg></button>

              <AnimatePresence>
                 {showEmojiPicker && <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.9}} className="absolute bottom-[70px] left-4 z-50"><EmojiPicker onEmojiClick={(e) => setInputText(p => p + e.emoji)} height={350} width={300} /></motion.div>}
              </AnimatePresence>

              <div className="flex-1 bg-white rounded-lg flex items-center py-2 px-4 shadow-sm relative overflow-hidden">
                {!isRecording ? (
                  <input type="text" className="w-full bg-transparent border-none outline-none text-gray-700 text-[15px]" placeholder="Bir mesaj yazın" value={inputText} onChange={e => { setInputText(e.target.value); handleTyping(); }} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
                ) : (
                  <div className="w-full flex items-center justify-between">
                     <div className="flex items-center gap-2" style={{ opacity: Math.max(0, 1 + dragOffset / 100) }}>
                        <svg className="w-3 h-3 text-red-500 animate-pulse fill-current" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
                        <span className="font-mono text-gray-800 mr-2">{formatDuration(recordingDuration)}</span>
                        <LiveAudioVisualizer isRecording={isRecording} />
                     </div>
                     <div className="text-xs text-gray-400 flex items-center gap-1" style={{ opacity: Math.max(0, 1 + dragOffset / 100) }}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> iptal için kaydır</div>
                     {dragOffset < -100 && <div className="absolute inset-0 bg-white flex items-center justify-center text-red-500 font-bold animate-pulse gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Bırak ve İptal Et</div>}
                  </div>
                )}
              </div>

              {inputText.trim() && !isRecording ? (
                <button onClick={() => sendMessage()} className="p-2 text-[#00a884] hover:text-[#008f6f] transition"><svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg></button>
              ) : (
                <div onMouseDown={handleMouseDown} style={{ transform: `translateX(${dragOffset}px)` }} className={`p-2 cursor-pointer transition-colors ${isRecording ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'}`}>
                   {isRecording && dragOffset < -100 ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> : <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.66 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] border-b-[6px] border-[#00a884] text-center p-10">
             <h1 className="text-3xl font-light text-gray-700 mb-4">Secure Chat</h1>
             <p className="text-gray-500 text-sm">Uçtan uca şifreli (AES+RSA), resimli, sesli ve güvenli.</p>
          </div>
        )}
      </div>
    </div>
  );
}
