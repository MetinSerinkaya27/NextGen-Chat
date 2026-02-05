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
        // Kullanıcı Adı -> ConnectionId eşleşmesi
        private static ConcurrentDictionary<string, string> OnlineKullanicilar = new ConcurrentDictionary<string, string>();

        public ChatHub(UygulamaDbContext context)
        {
            _context = context;
        }

        // --- BAĞLANTI ---
        public override async Task OnConnectedAsync()
        {
            string? kullaniciAdi = Context.GetHttpContext()?.Request.Query["username"].ToString();
            
            if (!string.IsNullOrEmpty(kullaniciAdi))
            {
                // Listeye ekle veya güncelle
                OnlineKullanicilar.AddOrUpdate(kullaniciAdi, Context.ConnectionId, (key, oldValue) => Context.ConnectionId);
                
                // DB'de 'Online' yap (SonGorulme = null)
                var user = await _context.Kullanicilar.FirstOrDefaultAsync(u => u.KullaniciAdi == kullaniciAdi);
                if (user != null)
                {
                    user.SonGorulme = null;
                    await _context.SaveChangesAsync();
                }

                // Herkese online listesini gönder
                await Clients.All.SendAsync("KullaniciListesi", OnlineKullanicilar.Keys.ToList());
            }
            await base.OnConnectedAsync();
        }

        // --- KOPMA ---
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            // ConnectionId'den kullanıcı adını bul
            var item = OnlineKullanicilar.FirstOrDefault(x => x.Value == Context.ConnectionId);
            string? kullaniciAdi = item.Key;
            
            if (!string.IsNullOrEmpty(kullaniciAdi))
            {
                OnlineKullanicilar.TryRemove(kullaniciAdi, out _);

                // DB'ye son görülme tarihini yaz
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

        // --- MESAJ GÖNDERME ---
        public async Task OzelMesajGonder(string aliciAdi, string sifreliAliciIcin, string sifreliGonderenIcin, int mesajTuru = 0)
        {
            // Göndereni ConnectionId'den bul (EN GÜVENLİ YÖNTEM)
            var senderItem = OnlineKullanicilar.FirstOrDefault(x => x.Value == Context.ConnectionId);
            string? gonderenAdi = senderItem.Key;

            if (!string.IsNullOrEmpty(gonderenAdi) && !string.IsNullOrEmpty(aliciAdi))
            {
                // 1. Veritabanına Kaydet
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
                        MesajTuru = mesajTuru, // 0:Metin, 1:Ses, 2:Resim
                        GonderilmeTarihi = DateTime.UtcNow,
                        SunucuAlisTarihi = DateTime.UtcNow
                    };

                    _context.Mesajlar.Add(yeniMesaj);
                    await _context.SaveChangesAsync();
                }

                // 2. Canlı Olarak Alıcıya İlet
                if (OnlineKullanicilar.TryGetValue(aliciAdi, out string? aliciConnectionId))
                {
                    await Clients.Client(aliciConnectionId).SendAsync("MesajAl", gonderenAdi, sifreliAliciIcin, mesajTuru);
                }
            }
        }

        // --- 🔥 DÜZELTİLEN YAZIYOR METODU ---
        public async Task Yaziyor(string aliciKullanici)
        {
            // Göndereni Dictionary'den buluyoruz (Context.UserIdentifier yerine)
            var senderItem = OnlineKullanicilar.FirstOrDefault(x => x.Value == Context.ConnectionId);
            string? gonderen = senderItem.Key;

            // Eğer gönderen biliniyorsa ve alıcı online ise sinyali gönder
            if (!string.IsNullOrEmpty(gonderen) && OnlineKullanicilar.TryGetValue(aliciKullanici, out string? aliciConnectionId))
            {
                await Clients.Client(aliciConnectionId).SendAsync("KullaniciYaziyor", gonderen);
            }
        }
    }
}