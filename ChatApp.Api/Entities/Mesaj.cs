using System;
using System.ComponentModel.DataAnnotations.Schema; // 🔥 BU EKLENDİ

namespace ChatApp.Api.Entities;

public class Mesaj
{
    public Guid Id { get; set; }

    // --- İLİŞKİLER (NAVIGATIONS) ---
    public Guid GonderenId { get; set; }
    
    // 🔥 EKSİK OLAN PARÇA BU:
    [ForeignKey("GonderenId")]
    public virtual Kullanici Gonderen { get; set; }

    public Guid AliciId { get; set; }
    
    // 🔥 EKSİK OLAN PARÇA BU:
    [ForeignKey("AliciId")]
    public virtual Kullanici Alici { get; set; }

    // --- İÇERİK ---
    public string SifreliIcerikAlici { get; set; } = string.Empty; 
    public string SifreliIcerikGonderen { get; set; } = string.Empty; 
    
    // --- METADATA ---
    public bool OkunduMu { get; set; } = false;
    public DateTime? OkunmaTarihi { get; set; }
    public int MesajTuru { get; set; } = 0; 
    
    // 🔥 EKSİK OLAN "REPLY" ÖZELLİĞİ:
    public Guid? YanitlananMesajId { get; set; }

    public DateTime GonderilmeTarihi { get; set; } 
    public DateTime SunucuAlisTarihi { get; set; } = DateTime.UtcNow;
}