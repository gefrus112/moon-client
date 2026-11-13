/* ============================================================
   github.js — pulls the latest Moon Client release from the
   GitHub API and wires up every download button + version stat.
   ============================================================ */

const REPO = "gefrus112/moon-client";
const RELEASES_PAGE = `https://github.com/${REPO}/releases`;
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

function fmtBytes(bytes) {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1).replace(/\.0$/, "")} MB` : `${Math.round(bytes / 1024)} KB`;
}

function fmtCount(n) {
  if (n == null) return "—";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function setAll(selector, text) {
  document.querySelectorAll(selector).forEach((el) => {
    el.textContent = text;
  });
}

export async function initReleaseInfo() {
  // Always point buttons at the releases page until we know better.
  document.querySelectorAll(".js-download").forEach((a) => {
    a.href = RELEASES_PAGE;
  });

  try {
    const res = await fetch(API_URL, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) return; // rate-limited or no releases yet — keep fallbacks
    const release = await res.json();

    const asset =
      (release.assets || []).find((a) => /MoonClient.*\.exe$/i.test(a.name)) ||
      (release.assets || [])[0];

    const version = release.tag_name || "Latest";
    setAll("[data-release-version]", version);

    if (asset) {
      setAll("[data-release-size]", fmtBytes(asset.size));
      setAll("[data-release-downloads]", fmtCount(asset.download_count));
      document.querySelectorAll(".js-download").forEach((a) => {
        a.href = asset.browser_download_url;
        a.removeAttribute("target");
        a.removeAttribute("rel");
      });
    }

    if (release.published_at) {
      const d = new Date(release.published_at);
      setAll(
        "[data-release-date]",
        `Released ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · Windows 10 / 11 · 64-bit`
      );
    }
  } catch {
    /* offline — fallbacks already in place */
  }
}
