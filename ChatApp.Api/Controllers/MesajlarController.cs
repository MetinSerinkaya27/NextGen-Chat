using Microsoft.AspNetCore.Mvc;
using ChatApp.Api.Data;
using ChatApp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MesajlarController : ControllerBase
    {
        private readonly UygulamaDbContext _context;

        public MesajlarController(UygulamaDbContext context)
        {
            _context = context;
        }

        public class MesajDto
        {
            public Guid Id { get; set; }
            public string GonderenKullanici { get; set; }
            public string AliciKullanici { get; set; }
            public string SifreliIcerik { get; set; }
            public DateTime Tarih { get; set; }
        }

        [HttpGet("gecmis")]
        public async Task<IActionResult> GecmisiGetir([FromQuery] string kullanici, [FromQuery] string hedef)
        {
            var user1 = await _context.Kullanicilar.FirstOrDefaultAsync(u => u.KullaniciAdi == kullanici);
            var user2 = await _context.Kullanicilar.FirstOrDefaultAsync(u => u.KullaniciAdi == hedef);

            if (user1 == null || user2 == null) return Ok(new List<object>());

            var mesajlar = await _context.Mesajlar
                .Where(m => (m.GonderenId == user1.Id && m.AliciId == user2.Id) ||
                            (m.GonderenId == user2.Id && m.AliciId == user1.Id))
                .OrderBy(m => m.GonderilmeTarihi)
                .ToListAsync();

            var sonuc = mesajlar.Select(m => {
                // İsteyen kişi (kullanici) bu mesajın GÖNDERENİ mi?
                bool isteyenGonderenMi = (m.GonderenId == user1.Id);
                
                // Eğer gönderen ise -> Kendisi için şifrelenmişi al
                // Eğer alıcı ise -> Alıcı için şifrelenmişi al
                string dogruIcerik = isteyenGonderenMi ? m.SifreliIcerikGonderen : m.SifreliIcerikAlici;

                return new MesajDto
                {
                    Id = m.Id,
                    GonderenKullanici = m.GonderenId == user1.Id ? user1.KullaniciAdi : user2.KullaniciAdi,
                    AliciKullanici = m.AliciId == user1.Id ? user1.KullaniciAdi : user2.KullaniciAdi,
                    SifreliIcerik = dogruIcerik, 
                    Tarih = m.GonderilmeTarihi
                };
            });

            return Ok(sonuc);
        }

        [HttpGet("sifirla")]
        public async Task<IActionResult> VeritabaniSifirla()
        {
            _context.Mesajlar.RemoveRange(_context.Mesajlar);
            await _context.SaveChangesAsync();
            return Ok(new { mesaj = "🧹 Veritabanı başarıyla temizlendi!" });
        }
    }
}