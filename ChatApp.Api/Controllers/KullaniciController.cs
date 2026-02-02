using Microsoft.AspNetCore.Mvc;
using ChatApp.Api.Data;
using ChatApp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Api.Controllers;

[ApiController] // Bu sınıfın bir API olduğunu belirtir
[Route("api/[controller]")] // Adresimiz: api/Kullanici olacak
public class KullaniciController : ControllerBase
{
    private readonly UygulamaDbContext _veritabanı;

    public KullaniciController(UygulamaDbContext veritabanı)
    {
        _veritabanı = veritabanı;
    }

    // YENİ KULLANICI KAYDI
    [HttpPost("kayit")]
    public async Task<IActionResult> KayitOl(Kullanici yeniKullanici)
    {
        // Kullanıcıyı veritabanına ekle
        _veritabanı.Kullanicilar.Add(yeniKullanici);
        
        // Değişiklikleri kaydet
        await _veritabanı.SaveChangesAsync();

        return Ok(yeniKullanici);
    }
    // ... (KayitOl fonksiyonu burada bitiyor)

        [HttpPost("giris")]
        public async Task<IActionResult> GirisYap([FromBody] Kullanici istek)
        {
            // 1. Veritabanında bu isimde biri var mı?
            var kullanici = await _veritabanı.Kullanicilar
                                          .FirstOrDefaultAsync(u => u.KullaniciAdi == istek.KullaniciAdi);

            if (kullanici == null)
            {
                return NotFound(new { mesaj = "Böyle bir kullanıcı bulunamadı!" });
            }

            // 2. Kullanıcı bulundu, bilgilerini geri dön
            return Ok(new { 
                id = kullanici.Id, 
                kullaniciAdi = kullanici.KullaniciAdi, 
                publicKey = kullanici.PublicKey,
                mesaj = "Giriş başarılı!" 
            });
        }
        
        // ... (Class burada bitiyor)
}