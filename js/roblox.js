/* ============================================================
   roblox.js — Roblox public API layer (CORS-enabled endpoints)
   Docs: https://create.roblox.com/docs/reference/public-api
   ============================================================ */

const USERS_API = "https://users.roblox.com/v1";
const GAMES_API = "https://games.roblox.com/v1";
const GAMES_V2_API = "https://games.roblox.com/v2";
const FRIENDS_API = "https://friends.roblox.com/v1";
const THUMB_API = "https://thumbnails.roblox.com/v1";

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const err = new Error(`Roblox API ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/* ---------- formatting helpers ---------- */

export function fmtNumber(n) {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  const trim = (v) => v.toFixed(1).replace(/\.0$/, "");
  if (abs >= 1e9) return trim(n / 1e9) + "B";
  if (abs >= 1e6) return trim(n / 1e6) + "M";
  if (abs >= 1e3) return trim(n / 1e3) + "K";
  return String(n);
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function likePercent(up, down) {
  const total = (up || 0) + (down || 0);
  if (!total) return "—";
  return Math.round(((up || 0) / total) * 100) + "%";
}

export function esc(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* ---------- users / profile ---------- */

export async function searchUsers(keyword) {
  const url = `${USERS_API}/users/search?keyword=${encodeURIComponent(keyword)}&excludeBannedUsers=true`;
  const json = await fetchJSON(url);
  return json.data || [];
}

export async function getUser(userId) {
  return fetchJSON(`${USERS_API}/users/${userId}`);
}

export async function getUserAvatar(userId) {
  const url = `${THUMB_API}/users/avatar-bust?userIds=${userId}&size=150x150&format=Png&isCircular=true`;
  const json = await fetchJSON(url);
  return json.data?.[0]?.imageUrl || "";
}

export async function getUserGames(userId) {
  const url = `${GAMES_V2_API}/users/${userId}/games?sortOrder=Asc&limit=50`;
  const json = await fetchJSON(url);
  return json.data || [];
}

export async function getSocialCounts(userId) {
  const safe = async (path) => {
    try {
      const json = await fetchJSON(`${FRIENDS_API}/users/${userId}/${path}`);
      return json.count ?? null;
    } catch {
      return null;
    }
  };
  const [followers, followings, friends] = await Promise.all([
    safe("followers/count"),
    safe("followings/count"),
    safe("friends/count"),
  ]);
  return { followers, followings, friends };
}

/* ---------- games ---------- */

export async function searchGames(keyword, sortSelection = "Relevance", limit = 30, cursor = "") {
  const params = new URLSearchParams({
    modelType: "All",
    sortSelection,
    limit: String(limit),
  });
  if (keyword) params.set("searchKeyword", keyword);
  if (cursor) params.set("cursor", cursor);
  const json = await fetchJSON(`${GAMES_API}/games/list?${params}`);
  return { games: json.data || [], nextCursor: json.nextPageCursor || null };
}

export async function getGameDetails(universeIds) {
  const ids = (Array.isArray(universeIds) ? universeIds : [universeIds]).join(",");
  const json = await fetchJSON(`${GAMES_API}/games?universeIds=${ids}`);
  return json.data || [];
}

export async function getGameIcons(universeIds) {
  const ids = (Array.isArray(universeIds) ? universeIds : [universeIds]).join(",");
  const url = `${THUMB_API}/games/icons?universeIds=${ids}&size=150x150&format=Png`;
  const json = await fetchJSON(url);
  const map = new Map();
  for (const item of json.data || []) map.set(item.targetId, item.imageUrl);
  return map;
}

export async function getGameVotes(universeIds) {
  const ids = (Array.isArray(universeIds) ? universeIds : [universeIds]).join(",");
  const json = await fetchJSON(`${GAMES_API}/games/votes?universeIds=${ids}`);
  const map = new Map();
  for (const item of json.data || []) map.set(item.universeId, item);
  return map;
}

/* ---------- links ---------- */

export const playUrl = (rootPlaceId) => `https://www.roblox.com/games/${rootPlaceId}`;
export const profileUrl = (userId) => `https://www.roblox.com/users/${userId}/profile`;
