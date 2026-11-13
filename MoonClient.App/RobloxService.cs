using System.Diagnostics;
using System.Xml.Linq;

namespace MoonClient.App;

/// <summary>
/// Launches Roblox and applies safe, user-level optimizations
/// (graphics mode + frame-rate cap in Roblox's own settings file).
/// Never touches game files, injects code, or asks for credentials.
/// </summary>
internal static class RobloxService
{
    private static string SettingsPath =>
        Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Roblox",
            "GlobalBasicSettings_13.xml");

    /// <summary>Finds the installed RobloxPlayerBeta.exe, if any.</summary>
    public static string? FindPlayerExe()
    {
        var versionsDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Roblox",
            "Versions");
        if (!Directory.Exists(versionsDir))
            return null;

        return Directory.GetDirectories(versionsDir)
            .Select(d => Path.Combine(d, "RobloxPlayerBeta.exe"))
            .Where(File.Exists)
            .OrderByDescending(File.GetCreationTime)
            .FirstOrDefault();
    }

    /// <summary>Launches Roblox via the roblox:// protocol, falling back to the player EXE.</summary>
    public static void LaunchRoblox()
    {
        try
        {
            Process.Start(new ProcessStartInfo("roblox://") { UseShellExecute = true });
            return;
        }
        catch
        {
            // fall through to direct EXE launch
        }

        var exe = FindPlayerExe()
            ?? throw new InvalidOperationException(
                "Roblox Player was not found. Install Roblox from roblox.com first.");

        Process.Start(new ProcessStartInfo(exe) { UseShellExecute = true });
    }

    /// <summary>
    /// Applies optimization settings to Roblox's GlobalBasicSettings file:
    /// manual graphics mode and a 240 FPS cap. Existing settings are preserved.
    /// </summary>
    public static void Optimize()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(SettingsPath)!);

        XDocument doc;
        if (File.Exists(SettingsPath))
        {
            doc = XDocument.Load(SettingsPath);
            doc.Root ??= new XElement("Settings");
        }
        else
        {
            doc = new XDocument(
                new XDeclaration("1.0", "UTF-8", null),
                new XElement("Settings"));
        }

        SetItem(doc, "GraphicsMode", "1");   // 1 = Manual
        SetItem(doc, "FrameRateCap", "240"); // raise the default 60 FPS cap

        doc.Save(SettingsPath);
    }

    private static void SetItem(XDocument doc, string property, string value)
    {
        var root = doc.Root!;
        var item = root.Elements("Item")
            .FirstOrDefault(e => (string?)e.Attribute("property") == property);
        if (item is null)
        {
            root.Add(new XElement("Item",
                new XAttribute("property", property),
                value));
        }
        else
        {
            item.Value = value;
        }
    }
}
