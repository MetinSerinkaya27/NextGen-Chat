using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class MaviTikVeReplyTamam : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "YanitlananMesajId",
                table: "Mesajlar",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Mesajlar_AliciId",
                table: "Mesajlar",
                column: "AliciId");

            migrationBuilder.CreateIndex(
                name: "IX_Mesajlar_GonderenId",
                table: "Mesajlar",
                column: "GonderenId");

            migrationBuilder.AddForeignKey(
                name: "FK_Mesajlar_Kullanicilar_AliciId",
                table: "Mesajlar",
                column: "AliciId",
                principalTable: "Kullanicilar",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Mesajlar_Kullanicilar_GonderenId",
                table: "Mesajlar",
                column: "GonderenId",
                principalTable: "Kullanicilar",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Mesajlar_Kullanicilar_AliciId",
                table: "Mesajlar");

            migrationBuilder.DropForeignKey(
                name: "FK_Mesajlar_Kullanicilar_GonderenId",
                table: "Mesajlar");

            migrationBuilder.DropIndex(
                name: "IX_Mesajlar_AliciId",
                table: "Mesajlar");

            migrationBuilder.DropIndex(
                name: "IX_Mesajlar_GonderenId",
                table: "Mesajlar");

            migrationBuilder.DropColumn(
                name: "YanitlananMesajId",
                table: "Mesajlar");
        }
    }
}
