using Microsoft.EntityFrameworkCore;
using ChatApp.Api.Entities;

namespace ChatApp.Api.Data;

public class UygulamaDbContext : DbContext
{
    public UygulamaDbContext(DbContextOptions<UygulamaDbContext> options) : base(options)
    {
    }

    public DbSet<Kullanici> Kullanicilar { get; set; }
    public DbSet<Mesaj> Mesajlar { get; set; }

    // 🔥 BU AYARLAR ÇOK ÖNEMLİ (Fluent API)
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Mesaj -> Gonderen İlişkisi
        modelBuilder.Entity<Mesaj>()
            .HasOne(m => m.Gonderen)
            .WithMany() // Bir kullanıcının birden fazla gönderdiği mesaj olabilir
            .HasForeignKey(m => m.GonderenId)
            .OnDelete(DeleteBehavior.Restrict); // Kullanıcı silinirse mesajlar KALSIN (Hata vermemesi için Restrict)

        // Mesaj -> Alici İlişkisi
        modelBuilder.Entity<Mesaj>()
            .HasOne(m => m.Alici)
            .WithMany()
            .HasForeignKey(m => m.AliciId)
            .OnDelete(DeleteBehavior.Restrict); // Kullanıcı silinirse mesajlar KALSIN
    }
}