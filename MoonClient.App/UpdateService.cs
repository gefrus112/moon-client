using System.Net.Http.Headers;
using System.Text.Json;

namespace MoonClient.App;

/// <summary>Latest release info from GitHub Releases.</summary>
internal sealed record LatestRelease(
    string Tag,
    string? DownloadUrl,
    long Downloads,
    long SizeBytes);

/// <summary>Checks GitHub Releases for newer Moon Client builds.</summary>
internal static class UpdateService
{
    private const string Repo = "gefrus112/moon-client";
    private const string LatestUrl = $"https://api.github.com/repos/{Repo}/releases/latest";

    public static async Task<LatestRelease?> GetLatestAsync(CancellationToken ct = default)
    {
        using var http = new HttpClient();
        http.DefaultRequestHeaders.UserAgent.ParseAdd("MoonClient/1.0");
        http.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");

        using var res = await http.GetAsync(LatestUrl, ct);
        if (!res.IsSuccessStatusCode)
            return null;

        await using var stream = await res.Content.ReadAsStreamAsync(ct);
        using var json = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        var root = json.RootElement;

        var tag = root.TryGetProperty("tag_name", out var tagEl)
            ? tagEl.GetString() ?? "unknown"
            : "unknown";

        string? downloadUrl = null;
        long downloads = 0;
        long size = 0;

        if (root.TryGetProperty("assets", out var assets))
        {
            foreach (var asset in assets.EnumerateArray())
            {
                var name = asset.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                if (name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                {
                    downloadUrl = asset.TryGetProperty("browser_download_url", out var u)
                        ? u.GetString()
                        : null;
                    downloads = asset.TryGetProperty("download_count", out var d) ? d.GetInt64() : 0;
                    size = asset.TryGetProperty("size", out var s) ? s.GetInt64() : 0;
                    break;
                }
            }
        }

        return new LatestRelease(tag, downloadUrl, downloads, size);
    }

    /// <summary>True when the remote tag is newer than the running assembly version.</summary>
    public static bool IsNewer(string remoteTag)
    {
        var current = typeof(UpdateService).Assembly.GetName().Version;
        if (current is null)
            return false;

        var clean = remoteTag.TrimStart('v', 'V');
        if (!Version.TryParse(clean, out var remote))
            return false;

        return remote > current;
    }
}
