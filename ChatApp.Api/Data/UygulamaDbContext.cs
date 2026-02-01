using Microsoft.EntityFrameworkCore;
using ChatApp.Api.Entities;

namespace ChatApp.Api.Data;

// DbContext: Veritabanı yönetim merkezimiz
public class UygulamaDbContext : DbContext
{
    public UygulamaDbContext(DbContextOptions<UygulamaDbContext> options) : base(options)
    {
    }

    // Veritabanında oluşacak tablolarımız
    public DbSet<Kullanici> Kullanicilar { get; set; }
    public DbSet<Mesaj> Mesajlar { get; set; }
}