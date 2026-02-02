namespace ChatApp.Api.Entities;

public class Mesaj
{
    public Guid Id { get; set; }
    
    // Kimden - Kime (ID'ler)
    public Guid GonderenId { get; set; }
    public Guid AliciId { get; set; }
    
    // --- DEĞİŞEN KISIM BAŞLANGIÇ ---
    
    // 1. Alıcı (Karşı Taraf) okusun diye onun anahtarıyla şifrelenmiş metin
    public string SifreliIcerikAlici { get; set; } = string.Empty; 

    // 2. Gönderen (Sen) geçmişte okuyabil diye SENİN anahtarınla şifrelenmiş metin
    public string SifreliIcerikGonderen { get; set; } = string.Empty; 
    
    // --- DEĞİŞEN KISIM BİTİŞ ---
    
    // İnternet yokken yazılmış olabilir, gerçek yazılma anı
    public DateTime GonderilmeTarihi { get; set; } 
    
    // Sunucumuza ulaştığı an
    public DateTime SunucuAlisTarihi { get; set; } = DateTime.UtcNow;
}