using Microsoft.EntityFrameworkCore;
using ChatApp.Api.Data;
using Npgsql.EntityFrameworkCore.PostgreSQL;

var builder = WebApplication.CreateBuilder(args);

// --- 1. CORS AYARI ---
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173") 
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); 
    });
});

// 2. Veritabanı Servisi
builder.Services.AddDbContext<UygulamaDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("VeritabaniBaglantisi")));

// 3. Kontrolcüler
builder.Services.AddControllers();

// --- 4. SIGNALR AYARLARI (GÜNCELLENDİ) ---
// Ses dosyaları büyük olduğu için (Base64), varsayılan sınır yetmez.
// Kapıyı sonuna kadar açıyoruz (10 MB).
builder.Services.AddSignalR(options => {
    options.EnableDetailedErrors = true; // Hata olursa detaylı görelim
    options.MaximumReceiveMessageSize = 10 * 1024 * 1024; // 10 MB Sınırı
});
// ------------------------------------------

// OpenAPI (Swagger)
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// CORS Aktif Et
app.UseCors(); 

app.MapControllers();
app.MapHub<ChatApp.Api.Hubs.ChatHub>("/chathub"); 

app.Run();