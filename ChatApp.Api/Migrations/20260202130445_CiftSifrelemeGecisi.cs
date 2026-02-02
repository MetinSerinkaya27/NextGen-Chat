using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class CiftSifrelemeGecisi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "SifreliIcerik",
                table: "Mesajlar",
                newName: "SifreliIcerikGonderen");

            migrationBuilder.AddColumn<string>(
                name: "SifreliIcerikAlici",
                table: "Mesajlar",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SifreliIcerikAlici",
                table: "Mesajlar");

            migrationBuilder.RenameColumn(
                name: "SifreliIcerikGonderen",
                table: "Mesajlar",
                newName: "SifreliIcerik");
        }
    }
}
