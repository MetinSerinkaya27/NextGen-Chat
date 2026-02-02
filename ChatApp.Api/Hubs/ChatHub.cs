using Microsoft.AspNetCore.SignalR;

namespace ChatApp.Api.Hubs
{
    // Hub sınıfından miras alıyoruz, böylece burası bir "Sinyal Kulesi" oluyor.
    public class ChatHub : Hub
    {
        // 1. Frontend'den biri "MesajGonder" fonksiyonunu tetiklerse burası çalışır.
        public async Task MesajGonder(string kullaniciAdi, string sifreliMesaj)
        {
            // 2. Gelen mesajı, bağlı olan HERKESE (Clients.All) ilet.
            // Onların ekranındaki "MesajAl" fonksiyonunu çalıştır.
            await Clients.All.SendAsync("MesajAl", kullaniciAdi, sifreliMesaj);
        }
    }
}