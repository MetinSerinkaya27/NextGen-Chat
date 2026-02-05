using Microsoft.AspNetCore.Mvc;
using ChatApp.Api.Data;
using ChatApp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")] // Adres: /api/kullanici
public class KullaniciController : ControllerBase
{
    private readonly UygulamaDbContext _veritabanı;

    public KullaniciController(UygulamaDbContext veritabanı)
    {
        _veritabanı = veritabanı;
    }

    // 1. KAYIT OL
    [HttpPost("kayit")]
    public async Task<IActionResult> KayitOl(Kullanici yeniKullanici)
    {
        _veritabanı.Kullanicilar.Add(yeniKullanici);
        await _veritabanı.SaveChangesAsync();
        return Ok(yeniKullanici);
    }

    // 2. GİRİŞ YAP
    [HttpPost("giris")]
    public async Task<IActionResult> GirisYap([FromBody] Kullanici istek)
    {
        var kullanici = await _veritabanı.Kullanicilar
            .FirstOrDefaultAsync(u => u.KullaniciAdi == istek.KullaniciAdi);

        if (kullanici == null)
            return NotFound(new { mesaj = "Kullanıcı bulunamadı!" });

        return Ok(new { 
            id = kullanici.Id, 
            kullaniciAdi = kullanici.KullaniciAdi, 
            publicKey = kullanici.PublicKey,
            mesaj = "Giriş başarılı!" 
        });
    }

    // 3. REHBERİ GETİR
    [HttpGet] 
    public async Task<IActionResult> TumKullanicilar(string haricTutulan)
    {
        var kullanicilar = await _veritabanı.Kullanicilar
            .Where(k => k.KullaniciAdi != haricTutulan) // Kendini getirme
            .Select(k => new { k.KullaniciAdi, k.SonGorulme }) // SonGorulme'yi de ekledim, lazım olabilir
            .ToListAsync();

        return Ok(kullanicilar);
    }

    // 4. PUBLIC KEY GETİR
    [HttpGet("publickey/{kullaniciAdi}")]
    public async Task<IActionResult> PublicKeyGetir(string kullaniciAdi)
    {
        var kullanici = await _veritabanı.Kullanicilar
            .FirstOrDefaultAsync(u => u.KullaniciAdi == kullaniciAdi);

        if (kullanici == null) return NotFound("Kullanıcı yok");

        return Ok(new { publicKey = kullanici.PublicKey });
    }
    
    // 5. ☢️ TAM SIFIRLAMA (GÜNCELLENDİ)
    // Adres: /api/kullanici/sifirla
    [HttpGet("sifirla")] 
    public async Task<IActionResult> VeritabaniSifirla()
    {
        // Önce MESAJLARI sil (Çocuk tablo)
        // Eğer bunu yapmazsan "Kullanıcı silinemez çünkü mesajları var" hatası alırsın.
        var tumMesajlar = await _veritabanı.Mesajlar.ToListAsync();
        _veritabanı.Mesajlar.RemoveRange(tumMesajlar);

        // Sonra KULLANICILARI sil (Ana tablo)
        var tumKullanicilar = await _veritabanı.Kullanicilar.ToListAsync();
        _veritabanı.Kullanicilar.RemoveRange(tumKullanicilar);
        
        await _veritabanı.SaveChangesAsync();

        return Ok(new { mesaj = "☢️ SİSTEM SIFIRLANDI: Tüm Mesajlar ve Kullanıcılar silindi. Yeni anahtarlarla başlayabilirsiniz." });
    }
}