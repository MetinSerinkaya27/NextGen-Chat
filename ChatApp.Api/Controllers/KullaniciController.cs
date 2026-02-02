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

    // 3. REHBERİ GETİR (EKSİK OLAN KISIM BUYDU! 🚨)
    // Adres: GET /api/kullanici?haricTutulan=metin
    [HttpGet] 
    public async Task<IActionResult> TumKullanicilar(string haricTutulan)
    {
        var kullanicilar = await _veritabanı.Kullanicilar
            .Where(k => k.KullaniciAdi != haricTutulan) // Kendini getirme
            .Select(k => new { k.KullaniciAdi }) // Sadece isimleri al
            .ToListAsync();

        return Ok(kullanicilar);
    }

    // 4. PUBLIC KEY GETİR (Şifreleme için)
    // Adres: GET /api/kullanici/publickey/ali
    [HttpGet("publickey/{kullaniciAdi}")]
    public async Task<IActionResult> PublicKeyGetir(string kullaniciAdi)
    {
        var kullanici = await _veritabanı.Kullanicilar
            .FirstOrDefaultAsync(u => u.KullaniciAdi == kullaniciAdi);

        if (kullanici == null) return NotFound("Kullanıcı yok");

        return Ok(new { publicKey = kullanici.PublicKey });
    }
    
    [HttpGet("sifirla")] 
    public async Task<IActionResult> VeritabaniSifirla()
    {
        var herkes = await _veritabanı.Kullanicilar.ToListAsync();
        _veritabanı.Kullanicilar.RemoveRange(herkes);
        await _veritabanı.SaveChangesAsync();

        return Ok("✅ Veritabanı BAŞARIYLA SIFIRLANDI! Her şey silindi.");
    }
}           