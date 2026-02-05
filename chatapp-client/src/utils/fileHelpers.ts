// Bu fonksiyon: Mikrofonun verdiği sesi (Blob), şifreleyebileceğimiz bir metne (Base64 String) çevirir.
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    // Okuma bitince burası çalışır
    reader.onloadend = () => {
      // reader.result şuna benzer: "data:audio/webm;base64,GkXfo59ChoEBQve..."
      resolve(reader.result as string); 
    };
    
    reader.onerror = reject;
    
    // Blob'u okumaya başla
    reader.readAsDataURL(blob); 
  });
};

// Bu fonksiyon: Şifresi çözülen metni (Base64), tekrar tarayıcının çalabileceği sese (Blob) çevirir.
export const base64ToBlob = async (base64Data: string): Promise<Blob> => {
  // fetch API'sini kullanarak base64 string'i sanki bir internet adresiymiş gibi indirip Blob'a çeviriyoruz.
  // Bu, en pratik ve modern yöntemdir.
  const response = await fetch(base64Data);
  const blob = await response.blob();
  return blob;
};