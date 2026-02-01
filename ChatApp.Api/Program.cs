using Microsoft.EntityFrameworkCore;
using ChatApp.Api.Data;
using Npgsql.EntityFrameworkCore.PostgreSQL;

var builder = WebApplication.CreateBuilder(args);

// --- 1. CORS AYARI (YENİ EKLENDİ) ---
// React projesinin (Frontend) Backend'e erişmesine izin veriyoruz.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()  // Kim gelirse gelsin (localhost:5173 vb.) kabul et
              .AllowAnyMethod()  // GET, POST, PUT hepsine izin ver
              .AllowAnyHeader(); // Tüm başlıklara izin ver
    });
});
// ------------------------------------

// 1. Veritabanı Servisini Ekleme
builder.Services.AddDbContext<UygulamaDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("VeritabaniBaglantisi")));

// 2. Kontrolcüleri (Controllers) Sisteme Ekleme
builder.Services.AddControllers();

// OpenAPI (Swagger) Desteği
builder.Services.AddOpenApi();

var app = builder.Build();

// HTTP İstek Hattını Yapılandırma
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// --- 2. CORS'U AKTİF ET (YENİ EKLENDİ) ---
// Bu satır çok önemlidir, MapControllers'dan önce gelmelidir.
app.UseCors();
// -----------------------------------------

// 3. Kontrolcüleri Haritalama (Yönlendirme)
app.MapControllers();

app.Run();