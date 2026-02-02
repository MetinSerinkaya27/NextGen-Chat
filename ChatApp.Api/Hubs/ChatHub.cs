using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace ChatApp.Api.Hubs
{
    public class ChatHub : Hub
    {
        // Online Kullanıcılar Listesi (Rehber)
        // Kim (Username) -> Hangi Bağlantıda (ConnectionId)
        private static ConcurrentDictionary<string, string> OnlineKullanicilar = new ConcurrentDictionary<string, string>();

        // 1. Kullanıcı Bağlandığında
        public override Task OnConnectedAsync()
        {
            var kullaniciAdi = Context.GetHttpContext()?.Request.Query["username"];
            
            if (!string.IsNullOrEmpty(kullaniciAdi))
            {
                // Listeye ekle
                OnlineKullanicilar.TryAdd(kullaniciAdi, Context.ConnectionId);
                
                // Herkese güncel listeyi yolla
                Clients.All.SendAsync("KullaniciListesi", OnlineKullanicilar.Keys.ToList());
            }
            
            return base.OnConnectedAsync();
        }

        // 2. Kullanıcı Koptuğunda
        public override Task OnDisconnectedAsync(Exception? exception)
        {
            var kullaniciAdi = OnlineKullanicilar.FirstOrDefault(x => x.Value == Context.ConnectionId).Key;
            
            if (kullaniciAdi != null)
            {
                OnlineKullanicilar.TryRemove(kullaniciAdi, out _);
                Clients.All.SendAsync("KullaniciListesi", OnlineKullanicilar.Keys.ToList());
            }

            return base.OnDisconnectedAsync(exception);
        }

        // 3. İŞTE EKSİK OLAN FONKSİYON BU! 👇
        public async Task OzelMesajGonder(string aliciAdi, string sifreliMesaj)
        {
            var gonderenAdi = OnlineKullanicilar.FirstOrDefault(x => x.Value == Context.ConnectionId).Key;

            // Alıcının ConnectionId'sini bul
            if (OnlineKullanicilar.TryGetValue(aliciAdi, out string? aliciConnectionId))
            {
                // A. ALICIYA GÖNDER
                await Clients.Client(aliciConnectionId).SendAsync("MesajAl", gonderenAdi, sifreliMesaj);

                // B. GÖNDERENİN KENDİSİNE HATA DÖNME (Başarılı olduğunu bilsin diye opsiyonel log)
                // (Frontend'de zaten ekrana basıyoruz ama burası sessizce işi yapar)
            }
        }
    }
}