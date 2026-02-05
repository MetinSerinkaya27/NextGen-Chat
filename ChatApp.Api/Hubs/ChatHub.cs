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
        // Kullanıcı Adı -> ConnectionId Eşleşmesi
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
                OnlineKullanicilar.AddOrUpdate(kullaniciAdi, Context.ConnectionId, (key, oldValue) => Context.ConnectionId);
                
                var user = await _context.Kullanicilar.FirstOrDefaultAsync(u => u.KullaniciAdi == kullaniciAdi);
                if (user != null)
                {
                    user.SonGorulme = null; // Online
                    await _context.SaveChangesAsync();
                }

                await Clients.All.SendAsync("KullaniciListesi", OnlineKullanicilar.Keys.ToList());
            }
            await base.OnConnectedAsync();
        }

        // --- KOPMA ---
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

        // --- 📨 MESAJ GÖNDERME (GÜNCELLENDİ: ReplyId eklendi) ---
        // Artık mesajın kime cevap olduğu (replyToId) bilgisini de alıyoruz.
        public async Task OzelMesajGonder(string aliciAdi, string sifreliAliciIcin, string sifreliGonderenIcin, int mesajTuru = 0, string? replyToId = null)
        {
            var senderItem = OnlineKullanicilar.FirstOrDefault(x => x.Value == Context.ConnectionId);
            string? gonderenAdi = senderItem.Key;

            if (!string.IsNullOrEmpty(gonderenAdi) && !string.IsNullOrEmpty(aliciAdi))
            {
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
                        MesajTuru = mesajTuru,
                        GonderilmeTarihi = DateTime.UtcNow,
                        SunucuAlisTarihi = DateTime.UtcNow,
                        OkunduMu = false, // İlk başta okunmadı
                        YanitlananMesajId = replyToId != null ? Guid.Parse(replyToId) : null // Cevap ise ID'si var
                    };

                    _context.Mesajlar.Add(yeniMesaj);
                    await _context.SaveChangesAsync();

                    // Alıcı Online ise Gönder
                    if (OnlineKullanicilar.TryGetValue(aliciAdi, out string? aliciConnectionId))
                    {
                        // Frontend'e replyToId'yi de gönderiyoruz
                        await Clients.Client(aliciConnectionId).SendAsync("MesajAl", gonderenAdi, sifreliAliciIcin, mesajTuru, yeniMesaj.Id, replyToId);
                    }
                }
            }
        }

        // --- 👀 YAZIYOR SİNYALİ ---
        public async Task Yaziyor(string aliciKullanici)
        {
            var senderItem = OnlineKullanicilar.FirstOrDefault(x => x.Value == Context.ConnectionId);
            string? gonderen = senderItem.Key;

            if (!string.IsNullOrEmpty(gonderen) && OnlineKullanicilar.TryGetValue(aliciKullanici, out string? aliciConnectionId))
            {
                await Clients.Client(aliciConnectionId).SendAsync("KullaniciYaziyor", gonderen);
            }
        }

        // --- ✅ MAVİ TİK: MESAJLARI OKUDUM SİNYALİ ---
        public async Task MesajlariOkudum(string gonderenKullaniciAdi)
        {
            var okuyanItem = OnlineKullanicilar.FirstOrDefault(x => x.Value == Context.ConnectionId);
            string? okuyanAdi = okuyanItem.Key; // Ben (Okuyan)

            if (!string.IsNullOrEmpty(okuyanAdi))
            {
                // 1. Veritabanında güncelle: "Gonderen" kişi X olan ve "Alici" kişi Ben olan okunmamış mesajları bul
                var okunmamisMesajlar = await _context.Mesajlar
                    .Include(m => m.Gonderen)
                    .Include(m => m.Alici)
                    .Where(m => m.Gonderen.KullaniciAdi == gonderenKullaniciAdi && 
                                m.Alici.KullaniciAdi == okuyanAdi && 
                                !m.OkunduMu)
                    .ToListAsync();

                if (okunmamisMesajlar.Any())
                {
                    foreach (var mesaj in okunmamisMesajlar)
                    {
                        mesaj.OkunduMu = true;
                        mesaj.OkunmaTarihi = DateTime.UtcNow;
                    }
                    await _context.SaveChangesAsync();

                    // 2. Karşı tarafa (Mesajı atan kişiye) haber ver: "Mesajların okundu, mavi tik yap"
                    if (OnlineKullanicilar.TryGetValue(gonderenKullaniciAdi, out string? gonderenConnId))
                    {
                        await Clients.Client(gonderenConnId).SendAsync("MesajlarOkundu", okuyanAdi);
                    }
                }
            }
        }
    }
}