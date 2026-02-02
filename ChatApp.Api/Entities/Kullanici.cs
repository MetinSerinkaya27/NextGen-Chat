namespace ChatApp.Api.Entities;

public class Kullanici
{
    public Guid Id { get; set; }
    public string KullaniciAdi { get; set; } = string.Empty;
    
    // E2E şifreleme için başkalarının mesaj kilitlerken kullanacağı anahtar
    public string PublicKey { get; set; } = string.Empty; // (PublicKey)
    
    public DateTime KayitTarihi { get; set; } = DateTime.UtcNow;
    public DateTime? SonGorulme { get; set; }
}