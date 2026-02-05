using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using ChatApp.Api.Data;
using ChatApp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Api.Hubs
{
    public class ChatHub : Hub
    {
        private readonly UygulamaDbContext _context;
        private static ConcurrentDictionary<string, string> OnlineKullanicilar = new ConcurrentDictionary<string, string>();

        public ChatHub(UygulamaDbContext context)
        {
            _context = context;
        }

        public override async Task OnConnectedAsync()
        {
            string? kullaniciAdi = Context.GetHttpContext()?.Request.Query["username"].ToString();
            
            if (!string.IsNullOrEmpty(kullaniciAdi))
            {
                OnlineKullanicilar.AddOrUpdate(kullaniciAdi, Context.ConnectionId, (key, oldValue) => Context.ConnectionId);
                
                var user = await _context.Kullanicilar.FirstOrDefaultAsync(u => u.KullaniciAdi == kullaniciAdi);
                if (user != null)
                {
                    user.SonGorulme = null;
                    await _context.SaveChangesAsync();
                }

                await Clients.All.SendAsync("KullaniciListesi", OnlineKullanicilar.Keys.ToList());
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var item = OnlineKullanicilar.FirstOrDefault(x => x.Value == Context.ConnectionId);
            string? kullaniciAdi = item.Key;
            
            if (!string.IsNullOrEmpty(kullaniciAdi))
            {
                OnlineKullanicilar.TryRemove(kullaniciAdi, out _);

                var user = await _context.Kullanicilar.FirstOrDefaultAsync(u => u.KullaniciAdi == kullaniciAdi);
                if (user != null)
                {
                    user.SonGorulme = DateTime.UtcNow; 
                    await _context.SaveChangesAsync();
                }

                await Clients.All.SendAsync("KullaniciListesi", OnlineKullanicilar.Keys.ToList());
            }
            await base.OnDisconnectedAsync(exception);
        }

        // Parametreye 'int mesajTuru' ekledik. Frontend bize bunu yollayacak.
public async Task OzelMesajGonder(string aliciAdi, string sifreliAliciIcin, string sifreliGonderenIcin, int mesajTuru = 0)
{
    var senderItem = OnlineKullanicilar.FirstOrDefault(x => x.Value == Context.ConnectionId);
    string? gonderenAdi = senderItem.Key;

    if (!string.IsNullOrEmpty(gonderenAdi) && !string.IsNullOrEmpty(aliciAdi))
    {
        // ... (Kullanıcı bulma kodları aynı, buraları elleme) ...
        var gonderenUser = await _context.Kullanicilar.FirstOrDefaultAsync(u => u.KullaniciAdi == gonderenAdi);
        var aliciUser = await _context.Kullanicilar.FirstOrDefaultAsync(u => u.KullaniciAdi == aliciAdi);

        if (gonderenUser != null && aliciUser != null)
        {
            var yeniMesaj = new Mesaj
            {
                Id = Guid.NewGuid(),
                GonderenId = gonderenUser.Id,
                AliciId = aliciUser.Id,
                SifreliIcerikAlici = sifreliAliciIcin,
                SifreliIcerikGonderen = sifreliGonderenIcin,
                
                // --- YENİ KISIM ---
                // Frontend'den gelen tür bilgisini veritabanına yazıyoruz.
                // Böylece geçmişi çekerken "Bu ses miydi yazı mıydı?" diye şaşırmayız.
                MesajTuru = mesajTuru, 
                // -----------------

                GonderilmeTarihi = DateTime.UtcNow,
                SunucuAlisTarihi = DateTime.UtcNow
            };

            _context.Mesajlar.Add(yeniMesaj);
            await _context.SaveChangesAsync();
        }

        // --- CANLI GÖNDERİM ---
        if (OnlineKullanicilar.TryGetValue(aliciAdi, out string? aliciConnectionId))
        {
            // Alıcıya da haber veriyoruz: "Sana mesaj geldi, türü de şudur"
            // (Buradaki sıralama Frontend'deki .on("MesajAl") ile AYNI olmalı!)
            await Clients.Client(aliciConnectionId).SendAsync("MesajAl", gonderenAdi, sifreliAliciIcin, mesajTuru);
        }
    }
}
    }
}