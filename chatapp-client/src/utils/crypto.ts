// src/utils/crypto.ts

// 1. RSA Anahtar Çifti Üretme Fonksiyonu
export const generateKeyPair = async () => {
  // Tarayıcının yerel kripto motorunu kullanıyoruz (Çok hızlı ve güvenli)
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048, // 2048-bit güvenlik (Standart)
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // Anahtarlar dışarı aktarılabilir olsun
    ["encrypt", "decrypt"] // Ne için kullanılacak?
  );

  return keyPair;
};

// 2. Anahtarı Sunucuya Göndermek İçin Metne Çevirme (ArrayBuffer -> Base64)
export const exportKeyToBase64 = async (key: CryptoKey): Promise<string> => {
  // Anahtarı ham veri (buffer) olarak dışarı al
  const exported = await window.crypto.subtle.exportKey(
    key.type === "public" ? "spki" : "pkcs8",
    key
  );
  
  // Buffer'ı String'e çevir (Base64 formatında)
  const exportedAsBase64 = arrayBufferToBase64(exported);
  return exportedAsBase64;
};

// Yardımcı Fonksiyon: Binary veriyi okunabilir String'e çevirir
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}