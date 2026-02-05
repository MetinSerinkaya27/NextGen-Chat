namespace ChatApp.Api.Entities;

public class Mesaj
{
    public Guid Id { get; set; }
    public Guid GonderenId { get; set; }
    public Guid AliciId { get; set; }
    

    public string SifreliIcerikAlici { get; set; } = string.Empty; 
    public string SifreliIcerikGonderen { get; set; } = string.Empty; 

    public int MesajTuru { get; set; } = 0; 
  
    public DateTime GonderilmeTarihi { get; set; } 
    public DateTime SunucuAlisTarihi { get; set; } = DateTime.UtcNow;
}