// --- 1. ANAHTAR ÇİFTİ OLUŞTURMA ---
export const generateKeyPair = async (): Promise<CryptoKeyPair> => {
  return window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // Anahtarlar dışarı aktarılabilir (exportable) olmalı
    ["encrypt", "decrypt"]
  );
};

// --- 2. ANAHTARLARI DIŞARI AKTARMA (EXPORT) ---
// Register.tsx bu fonksiyonları arıyor!

// Public Key'i Base64 String'e çevirir
export const exportPublicKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
};

// Private Key'i Base64 String'e çevirir
export const exportPrivateKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(exported);
};

// (Eski kodlarla uyumluluk için alias)
export const exportKeyToBase64 = exportPublicKey; 

// --- 3. ANAHTARLARI İÇERİ ALMA (IMPORT) ---
// Chat.tsx ve Login.tsx bunları kullanıyor

// Base64 String'den Public Key oluşturur
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

// Base64 String'den Private Key oluşturur
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

// --- 4. ŞİFRELEME VE ÇÖZME ---

export const encryptMessage = async (message: string, publicKey: CryptoKey): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    data
  );
  return arrayBufferToBase64(encrypted);
};

export const decryptMessage = async (encryptedBase64: string, privateKey: CryptoKey): Promise<string> => {
  try {
    const data = base64ToArrayBuffer(encryptedBase64);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      data
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("Şifre çözme hatası:", error);
    throw new Error("Mesaj çözülemedi. Anahtar uyumsuz olabilir.");
  }
};

// --- YARDIMCI FONKSİYONLAR (ArrayBuffer <-> Base64) ---

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
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