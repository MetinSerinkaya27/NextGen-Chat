using Microsoft.EntityFrameworkCore;
using ChatApp.Api.Data;
using Npgsql.EntityFrameworkCore.PostgreSQL;

var builder = WebApplication.CreateBuilder(args);

// --- 1. CORS AYARI (DÜZELTİLDİ) ---
// SignalR için "AllowAnyOrigin" KULLANILAMAZ.
// "WithOrigins" kullanıp adresi elle vermeliyiz ve "AllowCredentials" demeliyiz.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173") // <--- DİKKAT: Sadece Frontend adresine izin ver
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // <--- KRİTİK NOKTA: SignalR için bu şart!
    });
});
// ------------------------------------

// 1. Veritabanı Servisini Ekleme
builder.Services.AddDbContext<UygulamaDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("VeritabaniBaglantisi")));

// 2. Kontrolcüleri ve SignalR'ı Ekleme
builder.Services.AddControllers();
builder.Services.AddSignalR(); // SignalR servisi burada

// OpenAPI (Swagger) Desteği
builder.Services.AddOpenApi();

var app = builder.Build();

// HTTP İstek Hattını Yapılandırma
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// --- 2. CORS'U AKTİF ET ---
// Bu satır MapHub ve MapControllers'dan ÖNCE olmalı.
app.UseCors(); 
// --------------------------

// 3. Kontrolcüleri ve Hub'ı Haritalama
app.MapControllers();
app.MapHub<ChatApp.Api.Hubs.ChatHub>("/chathub"); // Radyo kulesi adresi

app.Run();