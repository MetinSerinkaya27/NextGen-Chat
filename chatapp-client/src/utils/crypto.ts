
export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  return keyPair;
};


export const exportKeyToBase64 = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey(
    key.type === "public" ? "spki" : "pkcs8",
    key
  );
  let binary = "";
  const bytes = new Uint8Array(exported);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};


export const importPublicKey = async (base64Key: string): Promise<CryptoKey> => {
  const binaryString = window.atob(base64Key);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return await window.crypto.subtle.importKey(
    "spki",
    bytes.buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
};



export const importPrivateKey = async (base64Key: string): Promise<CryptoKey> => {
  const binaryString = window.atob(base64Key);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return await window.crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
};


export const encryptMessage = async (text: string, publicKey: CryptoKey): Promise<string> => {
  const encodedText = new TextEncoder().encode(text);
  
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    encodedText
  );

  let binary = "";
  const bytes = new Uint8Array(encryptedBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};


export const decryptMessage = async (encryptedBase64: string, privateKey: CryptoKey): Promise<string> => {
  try {
    const binaryString = window.atob(encryptedBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      bytes.buffer
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error("Şifre çözülemedi:", error);
    return "🔒 Şifreli Mesaj (Çözülemedi)";
  }
};