using System.Diagnostics;

namespace MoonClient.App;

/// <summary>
/// Moon Client main window — dark, lightweight launcher UI built in code
/// (no designer files) so the project stays simple and easy to audit.
/// </summary>
internal sealed class MainForm : Form
{
    private static readonly Color Bg = Color.FromArgb(10, 13, 32);
    private static readonly Color Panel = Color.FromArgb(16, 19, 42);
    private static readonly Color Accent = Color.FromArgb(124, 92, 255);
    private static readonly Color AccentHover = Color.FromArgb(143, 110, 255);
    private static readonly Color Cyan = Color.FromArgb(34, 211, 238);
    private static readonly Color Text = Color.FromArgb(238, 240, 255);
    private static readonly Color Muted = Color.FromArgb(154, 163, 199);

    private readonly Label _statusLabel;
    private readonly TextBox _logBox;
    private readonly Button _launchButton;
    private readonly Button _optimizeButton;
    private readonly Button _updateButton;

    public MainForm()
    {
        Text = "Moon Client";
        Width = 540;
        Height = 600;
        MinimumSize = new Size(480, 540);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Bg;
        ForeColor = Text;
        Font = new Font("Segoe UI", 10F);

        // ---------- header ----------
        var header = new Panel
        {
            Dock = DockStyle.Top,
            Height = 118,
            BackColor = Panel,
        };

        var title = new Label
        {
            Text = "🌙  Moon Client",
            Font = new Font("Segoe UI", 20F, FontStyle.Bold),
            ForeColor = Text,
            AutoSize = true,
            Location = new Point(24, 18),
        };

        var version = typeof(MainForm).Assembly.GetName().Version;
        var subtitle = new Label
        {
            Text = $"A better client for Roblox optimization   ·   v{version}",
            ForeColor = Muted,
            AutoSize = true,
            Location = new Point(26, 62),
        };

        _statusLabel = new Label
        {
            Text = "Ready.",
            ForeColor = Cyan,
            AutoSize = true,
            Location = new Point(26, 88),
        };

        header.Controls.Add(title);
        header.Controls.Add(subtitle);
        header.Controls.Add(_statusLabel);
        Controls.Add(header);

        // ---------- buttons ----------
        var buttonPanel = new Panel
        {
            Dock = DockStyle.Top,
            Height = 212,
            BackColor = Bg,
            Padding = new Padding(24, 20, 24, 8),
        };

        _launchButton = MakeButton("▶  Launch Roblox", Accent, AccentHover);
        _optimizeButton = MakeButton("⚡  Optimize Roblox", Color.FromArgb(38, 44, 74), Color.FromArgb(52, 60, 98));
        _updateButton = MakeButton("🔄  Check for Updates", Color.FromArgb(38, 44, 74), Color.FromArgb(52, 60, 98));

        _launchButton.Click += OnLaunch;
        _optimizeButton.Click += OnOptimize;
        _updateButton.Click += OnCheckUpdates;

        buttonPanel.Controls.Add(_launchButton);
        buttonPanel.Controls.Add(_optimizeButton);
        buttonPanel.Controls.Add(_updateButton);
        Controls.Add(buttonPanel);

        // ---------- log ----------
        _logBox = new TextBox
        {
            Dock = DockStyle.Fill,
            Multiline = true,
            ReadOnly = true,
            ScrollBars = ScrollBars.Vertical,
            BackColor = Panel,
            ForeColor = Muted,
            BorderStyle = BorderStyle.None,
            Font = new Font("Consolas", 9F),
            Padding = new Padding(12),
        };
        Controls.Add(_logBox);

        // ---------- footer ----------
        var footer = new Label
        {
            Dock = DockStyle.Bottom,
            Height = 34,
            Text = "Free & open source (MIT)  ·  Not affiliated with Roblox Corporation",
            ForeColor = Muted,
            Font = new Font("Segoe UI", 8F),
            TextAlign = ContentAlignment.MiddleCenter,
            BackColor = Bg,
        };
        Controls.Add(footer);

        Load += OnLoad;
    }

    private static Button MakeButton(string text, Color back, Color hover)
    {
        var button = new Button
        {
            Text = text,
            Dock = DockStyle.Top,
            Height = 46,
            Margin = new Padding(0, 0, 0, 10),
            BackColor = back,
            ForeColor = Text,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI", 11F, FontStyle.Bold),
            Cursor = Cursors.Hand,
        };
        button.FlatAppearance.BorderSize = 0;
        button.FlatAppearance.MouseOverBackColor = hover;
        button.FlatAppearance.MouseDownBackColor = hover;
        return button;
    }

    private void Log(string message)
    {
        _logBox.AppendText($"[{DateTime.Now:HH:mm:ss}] {message}{Environment.NewLine}");
    }

    private void SetStatus(string message) => _statusLabel.Text = message;

    private async void OnLoad(object? sender, EventArgs e)
    {
        Log("Moon Client started.");
        Log($"Roblox Player: {(RobloxService.FindPlayerExe() is null ? "not found" : "found")}");
        await CheckUpdatesAsync();
    }

    private void OnLaunch(object? sender, EventArgs e)
    {
        try
        {
            SetStatus("Launching Roblox…");
            Log("Launching Roblox…");
            RobloxService.LaunchRoblox();
            SetStatus("Roblox is launching. Have fun! 🎮");
            Log("Roblox launched.");
        }
        catch (Exception ex)
        {
            SetStatus("Launch failed.");
            Log($"Launch failed: {ex.Message}");
        }
    }

    private void OnOptimize(object? sender, EventArgs e)
    {
        try
        {
            SetStatus("Applying optimizations…");
            Log("Applying optimizations (manual graphics mode, 240 FPS cap)…");
            RobloxService.Optimize();
            SetStatus("Optimizations applied. Restart Roblox to see the effect.");
            Log("Optimizations applied successfully.");
        }
        catch (Exception ex)
        {
            SetStatus("Optimization failed.");
            Log($"Optimization failed: {ex.Message}");
        }
    }

    private async void OnCheckUpdates(object? sender, EventArgs e)
    {
        _updateButton.Enabled = false;
        try
        {
            await CheckUpdatesAsync();
        }
        finally
        {
            _updateButton.Enabled = true;
        }
    }

    private async Task CheckUpdatesAsync()
    {
        try
        {
            SetStatus("Checking for updates…");
            Log("Checking GitHub Releases for updates…");
            var latest = await UpdateService.GetLatestAsync();
            if (latest is null)
            {
                Log("No releases found yet (or offline).");
                SetStatus("You're on the latest available build.");
                return;
            }

            Log($"Latest release: {latest.Tag} ({latest.Downloads:N0} downloads)");

            if (UpdateService.IsNewer(latest.Tag))
            {
                SetStatus($"Update available: {latest.Tag}");
                Log("A newer version is available.");
                var result = MessageBox.Show(
                    this,
                    $"Moon Client {latest.Tag} is available.\n\nOpen the download page?",
                    "Update available",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Information);
                if (result == DialogResult.Yes && latest.DownloadUrl is not null)
                {
                    Process.Start(new ProcessStartInfo(latest.DownloadUrl) { UseShellExecute = true });
                }
            }
            else
            {
                SetStatus("You're up to date. ✅");
                Log("You're already on the latest version.");
            }
        }
        catch (Exception ex)
        {
            SetStatus("Update check failed.");
            Log($"Update check failed: {ex.Message}");
        }
    }
}
