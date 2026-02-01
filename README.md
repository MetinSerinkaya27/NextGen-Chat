
```markdown
# 🛡️ NextGen Chat - Uçtan Uca Şifreli Mesajlaşma (v0.1)

> **"Güvenlik bir seçenek değil, standarttır."**

![Status](https://img.shields.io/badge/Status-Geliştirme_Aşamasında-orange?style=for-the-badge&logo=git)
![Security](https://img.shields.io/badge/Security-End_to_End_Encryption-emerald?style=for-the-badge&logo=lock)
![Tech](https://img.shields.io/badge/Stack-.NET_8_&_React-blue?style=for-the-badge)

**NextGen Chat**, kullanıcı gizliliğini merkeze alan, **Askeri Düzeyde (RSA-2048)** asimetrik şifreleme teknolojisine sahip modern bir mesajlaşma uygulamasıdır. Backend tarafında **.NET 8**'in performansı, Frontend tarafında **React** ve **Tailwind**'in modern estetiği ile harmanlanmıştır.

> ⚠️ **Not:** Bu proje şu anda aktif geliştirme aşamasındadır (Work in Progress). Temel şifreleme ve mimari kurulmuş olup, yapay zeka ve mesajlaşma özellikleri eklenmeye devam etmektedir.

---

## 🔮 Gelecek Vizyonu ve Yapay Zeka (AI Roadmap)

NextGen Chat, sadece güvenli değil aynı zamanda "Akıllı" bir iletişim platformu olmayı hedefler. Gelecek sürümlerde eklenecek özellikler:

* 🤖 **AI Destekli Tehdit Algılama:** Mesaj içeriklerini okumadan, meta veriler üzerinden spam ve phishing (oltalama) saldırılarını tespit eden yerel yapay zeka modelleri.
* 🌍 **Anlık Akıllı Çeviri:** Farklı dilleri konuşan kullanıcılar için cihaz üzerinde çalışan (On-Device) anlık çeviri sistemi.
* 📊 **Duygu Analizi (Sentiment Analysis):** Konuşmanın genel tonunu analiz eden ve kullanıcıya geri bildirim veren asistan.
* 🧠 **Smart Reply:** Gelen mesajlara hızlı yanıt önerileri sunan dil modelleri.

---

## 🚀 Güvenlik Mimarisi: Nasıl Çalışır?

Bu proje, standart mesajlaşma uygulamalarının aksine, mesajları sunucuda **asla düz metin (plain-text) olarak saklamaz.**

1.  **Anahtar Üretimi:** Kullanıcı kayıt olurken tarayıcıda (Client-side) `Web Crypto API` kullanılarak bir **RSA Anahtar Çifti** üretilir.
2.  **Public Key (Kilit):** Sunucuya gönderilir ve veritabanında saklanır. Diğer kullanıcılar size mesaj atarken bu anahtarı kullanır.
3.  **Private Key (Anahtar):** Kullanıcının cihazından **asla çıkmaz** ve sunucuya gönderilmez. Tarayıcı hafızasında saklanır.
4.  **Sonuç:** Veritabanı ele geçirilse bile mesajlar çözülemez. Sadece ilgili kullanıcının tarayıcısı mesajı çözebilir.

---

## 🛠️ Teknolojiler

Bu proje, modern yazılım mimarisi standartlarına uygun olarak geliştirilmiştir.

### 🔙 Backend (API)
- **Framework:** .NET 8 Web API
- **Dil:** C#
- **Veritabanı:** PostgreSQL
- **ORM:** Entity Framework Core (Code-First)
- **Prensipler:** RESTful Architecture, SOLID

### 🎨 Frontend (Client)
- **Core:** React (Vite + TypeScript)
- **Stil:** Tailwind CSS
- **Animasyon:** Framer Motion (Premium UI/UX)
- **Kriptografi:** Web Crypto API (RSA-OAEP)
- **İletişim:** Axios

---

## ⚙️ Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin.

### Gereksinimler
- Node.js (v18+)
- .NET 8 SDK
- PostgreSQL

### 1. Projeyi Klonlayın

```bash
git clone [https://github.com/metinserinkayya/NextGen-Chat.git](https://github.com/metinserinkayya/NextGen-Chat.git)
cd NextGen-Chat

```

### 2. Backend Kurulumu (API)

Veritabanını oluşturmak ve sunucuyu ayağa kaldırmak için:

```bash
cd ChatApp.Api
# appsettings.json dosyasındaki ConnectionString ayarını kendi PostgreSQL şifrenize göre düzenleyin.
dotnet restore
dotnet ef database update
dotnet run

```

*API şu adreste çalışacak:* `http://localhost:5124`

### 3. Frontend Kurulumu (Arayüz)

Yeni bir terminal açın ve client klasörüne gidin:

```bash
cd chatapp-client
npm install
npm run dev

```

*Uygulama şu adreste çalışacak:* `http://localhost:5173`

---

## 📸 Ekran Görüntüleri

| Modern Giriş Ekranı | Şifreli Veritabanı Yapısı |
| --- | --- |
| *Split Screen Tasarım, Framer Motion Animasyonları* | *RSA Public Key Saklama Mantığı* |

---

## 🗺️ Geliştirme Durumu

* [x] .NET 8 ve React Kurulumu
* [x] PostgreSQL Veritabanı Bağlantısı
* [x] Modern UI Tasarımı (Tailwind & Framer Motion)
* [x] RSA Anahtar Çifti Üretimi (Client-Side)
* [x] Kullanıcı Kayıt İşlemleri (Public Key Transferi)
* [ ] Giriş Yapma (Login) ve JWT Entegrasyonu
* [ ] Anlık Mesajlaşma (SignalR)
* [ ] **Yapay Zeka Modüllerinin Entegrasyonu** ⏳

---

**Geliştirici:** [Metin Serinkaya](https://www.google.com/search?q=https://github.com/27MetinSerinkaya)

```



