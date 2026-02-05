// --- 1. ANAHTAR ÇİFTİ OLUŞTURMA (AYNI KALDI) ---
export const generateKeyPair = async (): Promise<CryptoKeyPair> => {
  return window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
};

// --- YARDIMCI DÖNÜŞTÜRÜCÜLER (EN BAŞA ALDIM) ---
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// --- 2. ANAHTARLARI DIŞARI AKTARMA (EXPORT) (AYNI KALDI) ---
export const exportPublicKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
};

export const exportPrivateKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(exported);
};

// Eski kodlarla uyumluluk için alias
export const exportKeyToBase64 = exportPublicKey; 

// --- 3. ANAHTARLARI İÇERİ ALMA (IMPORT) (AYNI KALDI) ---
export const importPublicKey = async (base64Key: string): Promise<CryptoKey> => {
  const binaryDer = base64ToArrayBuffer(base64Key);
  return window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
};

export const importPrivateKey = async (base64Key: string): Promise<CryptoKey> => {
  const binaryDer = base64ToArrayBuffer(base64Key);
  return window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
};

// --- 4. 🚀 YENİ HİBRİT ŞİFRELEME (AES + RSA) ---
// Not: Chat.tsx dosyasında encryptMessage yerine encryptHybrid kullanacağız.
// İsim karışıklığı olmasın diye yeni isim verdik.

export const encryptHybrid = async (message: string, targetPublicKey: CryptoKey): Promise<string> => {
  try {
    // A. Rastgele bir AES anahtarı üret (256 bit - Çok güçlü ve hızlı)
    const aesKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    // B. Mesajı (Sesi/Metni) bu AES anahtarıyla şifrele
    const encoder = new TextEncoder();
    // IV (Başlangıç Vektörü): Şifrenin her seferinde farklı görünmesini sağlar
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); 
    
    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      encoder.encode(message)
    );

    // C. Kullandığımız AES anahtarını dışarı çıkar (Export)
    const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

    // D. Bu AES anahtarını, alıcının RSA Public Key'i ile şifrele (Paketle)
    // Böylece anahtarı sadece alıcı (Private Key sahibi) açabilir.
    const encryptedAesKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      targetPublicKey,
      exportedAesKey
    );

    // E. Hepsini bir paket (JSON) yap ve String olarak döndür
    // IV + Şifreli Anahtar + Şifreli Veri
    const packet = {
      iv: arrayBufferToBase64(iv.buffer),
      key: arrayBufferToBase64(encryptedAesKey),
      data: arrayBufferToBase64(encryptedContent)
    };

    return JSON.stringify(packet);

  } catch (error) {
    console.error("Hybrid Encryption Hatası:", error);
    throw error;
  }
};

// --- 5. 🔓 YENİ HİBRİT ÇÖZME ---
export const decryptHybrid = async (packetString: string, myPrivateKey: CryptoKey): Promise<string> => {
  try {
    // A. Gelen paketi (JSON String) parçalarına ayır
    const packet = JSON.parse(packetString);
    
    // B. Önce RSA Anahtarını kullanarak "Şifreli AES Anahtarını" çöz
    const encryptedKeyBuffer = base64ToArrayBuffer(packet.key);
    const aesKeyBuffer = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      myPrivateKey,
      encryptedKeyBuffer
    );

    // C. Çıkan ham veriden tekrar AES Anahtarı nesnesi oluştur
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      aesKeyBuffer,
      "AES-GCM",
      true,
      ["decrypt"]
    );

    // D. Şimdi asıl veriyi (Sesi/Metni) AES ile çöz
    const iv = base64ToArrayBuffer(packet.iv);
    const data = base64ToArrayBuffer(packet.data);
    
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      data
    );

    // E. Sonucu yazıya çevir
    return new TextDecoder().decode(decryptedContent);

  } catch (error) {
    console.error("Hybrid Decryption Hatası:", error);
    // Eski formatta bir mesaj gelirse (sadece string), JSON.parse patlayabilir.
    // O yüzden kullanıcıya net hata dönüyoruz.
    throw new Error("Mesaj çözülemedi veya formatı eski.");
  }
};

// --- ESKİ FONKSİYONLAR İÇİN UYUMLULUK (OPSİYONEL) ---
// Eğer projenin başka yerinde hala encryptMessage kullanılıyorsa hata vermesin diye
// onları hibrit fonksiyonlara yönlendiriyoruz.
export const encryptMessage = encryptHybrid;
export const decryptMessage = decryptHybrid;