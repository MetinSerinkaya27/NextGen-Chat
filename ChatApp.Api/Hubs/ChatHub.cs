using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using ChatApp.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Api.Hubs
{
    public class ChatHub : Hub
    {
        private readonly UygulamaDbContext _context;

        // Online Listesi: ConcurrentDictionary Thread-Safe'dir.
        private static ConcurrentDictionary<string, string> OnlineKullanicilar = new ConcurrentDictionary<string, string>();

        public ChatHub(UygulamaDbContext context)
        {
            _context = context;
        }

        // 1. BAĞLANINCA
        public override async Task OnConnectedAsync()
        {
            // DÜZELTME: Query'den gelen veriyi açıkça string'e çeviriyoruz (.ToString())
            string? kullaniciAdi = Context.GetHttpContext()?.Request.Query["username"].ToString();
            
            // Null veya Boş değilse işlem yap
            if (!string.IsNullOrEmpty(kullaniciAdi))
            {
                // Listeye ekle (Varsa güncelle, yoksa ekle)
                OnlineKullanicilar.AddOrUpdate(kullaniciAdi, Context.ConnectionId, (key, oldValue) => Context.ConnectionId);
                
                // Veritabanında "Son Görülme"yi temizle (Online oldu)
                var user = await _context.Kullanicilar.FirstOrDefaultAsync(u => u.KullaniciAdi == kullaniciAdi);
                if (user != null)
                {
                    user.SonGorulme = null;
                    await _context.SaveChangesAsync();
                }

                // Herkese güncel listeyi yolla
                await Clients.All.SendAsync("KullaniciListesi", OnlineKullanicilar.Keys.ToList());
            }
            
            await base.OnConnectedAsync();
        }

        // 2. ÇIKIŞ YAPINCA
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            // ConnectionId'ye sahip kullanıcıyı bul
            // (Burada LINQ kullanırken tip hatası olmaması için Key'i string olarak alıyoruz)
            var item = OnlineKullanicilar.FirstOrDefault(x => x.Value == Context.ConnectionId);
            string? kullaniciAdi = item.Key;
            
            if (!string.IsNullOrEmpty(kullaniciAdi))
            {
                // Listeden çıkar
                OnlineKullanicilar.TryRemove(kullaniciAdi, out _);

                // Veritabanına çıkış saatini yaz
                var user = await _context.Kullanicilar.FirstOrDefaultAsync(u => u.KullaniciAdi == kullaniciAdi);
                if (user != null)
                {
                    // Evrensel saat (UTC) kullanmak her zaman daha iyidir
                    user.SonGorulme = DateTime.UtcNow; 
                    await _context.SaveChangesAsync();
                }

                // Herkese güncel listeyi yolla
                await Clients.All.SendAsync("KullaniciListesi", OnlineKullanicilar.Keys.ToList());
            }

            await base.OnDisconnectedAsync(exception);
        }

        // 3. MESAJ GÖNDERME
        public async Task OzelMesajGonder(string aliciAdi, string sifreliMesaj)
        {
            // Göndereni bul
            var item = OnlineKullanicilar.FirstOrDefault(x => x.Value == Context.ConnectionId);
            string? gonderenAdi = item.Key;

            if (!string.IsNullOrEmpty(gonderenAdi) && OnlineKullanicilar.TryGetValue(aliciAdi, out string? aliciConnectionId))
            {
                // Alıcıya gönder
                await Clients.Client(aliciConnectionId).SendAsync("MesajAl", gonderenAdi, sifreliMesaj);
            }
        }
    }
}