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

        // --- GÜNCELLENEN KISIM: İKİ ŞİFRELİ METİN ALIYOR ---
        public async Task OzelMesajGonder(string aliciAdi, string sifreliAliciIcin, string sifreliGonderenIcin)
        {
            var senderItem = OnlineKullanicilar.FirstOrDefault(x => x.Value == Context.ConnectionId);
            string? gonderenAdi = senderItem.Key;

            if (!string.IsNullOrEmpty(gonderenAdi) && !string.IsNullOrEmpty(aliciAdi))
            {
                var gonderenUser = await _context.Kullanicilar.FirstOrDefaultAsync(u => u.KullaniciAdi == gonderenAdi);
                var aliciUser = await _context.Kullanicilar.FirstOrDefaultAsync(u => u.KullaniciAdi == aliciAdi);

                if (gonderenUser != null && aliciUser != null)
                {
                    // VERİTABANINA ÇİFT KOPYA KAYDET
                    var yeniMesaj = new Mesaj
                    {
                        Id = Guid.NewGuid(),
                        GonderenId = gonderenUser.Id,
                        AliciId = aliciUser.Id,
                        SifreliIcerikAlici = sifreliAliciIcin,       // Alıcı için olan
                        SifreliIcerikGonderen = sifreliGonderenIcin, // Gönderen için olan
                        GonderilmeTarihi = DateTime.UtcNow,
                        SunucuAlisTarihi = DateTime.UtcNow
                    };

                    _context.Mesajlar.Add(yeniMesaj);
                    await _context.SaveChangesAsync();
                }

                // ALICIYA SADECE ONUN AÇABİLECEĞİNİ YOLLA
                if (OnlineKullanicilar.TryGetValue(aliciAdi, out string? aliciConnectionId))
                {
                    await Clients.Client(aliciConnectionId).SendAsync("MesajAl", gonderenAdi, sifreliAliciIcin);
                }
            }
        }
    }
}