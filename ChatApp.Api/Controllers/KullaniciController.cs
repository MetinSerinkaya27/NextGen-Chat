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
}