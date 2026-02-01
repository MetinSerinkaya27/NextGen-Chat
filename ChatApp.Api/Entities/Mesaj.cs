namespace ChatApp.Api.Entities;

public class Mesaj
{
    public Guid Id { get; set; }
    
    // Kimden - Kime (ID'ler)
    public Guid GonderenId { get; set; }
    public Guid AliciId { get; set; }
    
    // Şifreli içerik (Backend bunu okuyamaz, sadece taşır)
    public string SifreliIcerik { get; set; } = string.Empty;
    
    // İnternet yokken yazılmış olabilir, gerçek yazılma anı
    public DateTime GonderilmeTarihi { get; set; } 
    
    // Sunucumuza ulaştığı an
    public DateTime SunucuAlisTarihi { get; set; } = DateTime.UtcNow;
}