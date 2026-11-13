/* ============================================================
   main.js — UI logic: starfield, nav, reveal animations, FAQ,
   Roblox profile lookup, game search + detail modal, toasts.
   ============================================================ */

import {
  searchUsers, getUser, getUserAvatar, getUserGames, getSocialCounts,
  searchGames, getGameDetails, getGameIcons, getGameVotes,
  fmtNumber, fmtDate, likePercent, esc, playUrl, profileUrl,
} from "./roblox.js";
import { initReleaseInfo } from "./github.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ================= toasts ================= */
function toast(message, type = "info") {
  const el = document.createElement("div");
  el.className = `toast ${type === "error" ? "error" : ""}`;
  el.textContent = message;
  $("#toasts").appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.4s";
    setTimeout(() => el.remove(), 420);
  }, 4200);
}

/* ================= starfield background ================= */
(() => {
  const canvas = $("#stars");
  const ctx = canvas.getContext("2d");
  let stars = [];
  let w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const count = Math.min(220, Math.floor((w * h) / 9000));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.3,
      p: Math.random() * Math.PI * 2,
      s: 0.4 + Math.random() * 1.2,
    }));
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const tw = reducedMotion ? 0.7 : 0.45 + 0.55 * Math.abs(Math.sin(t * 0.001 * s.s + s.p));
      ctx.globalAlpha = tw;
      ctx.fillStyle = "#cdd8ff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  resize();
  window.addEventListener("resize", resize);
  if (reducedMotion) {
    draw(0);
  } else {
    (function loop(t) {
      draw(t);
      requestAnimationFrame(loop);
    })(0);
  }
})();

/* ================= nav ================= */
const nav = $("#topnav");
const navToggle = $("#navToggle");
const navLinks = $("#navLinks");

window.addEventListener("scroll", () => {
  nav.classList.toggle("scrolled", window.scrollY > 24);
}, { passive: true });

navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", String(open));
});
navLinks.addEventListener("click", (e) => {
  if (e.target.closest("a")) {
    navLinks.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

/* ================= reveal on scroll ================= */
const revealIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        revealIO.unobserve(e.target);
      }
    }
  },
  { threshold: 0.12 }
);
$$(".reveal").forEach((el) => revealIO.observe(el));

/* ================= FAQ accordion ================= */
$$(".faq-item").forEach((item) => {
  const btn = $(".faq-q", item);
  const panel = $(".faq-a", item);
  btn.addEventListener("click", () => {
    const open = item.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
    panel.style.maxHeight = open ? `${panel.scrollHeight}px` : "0px";
  });
});

/* ================= shared game card renderer ================= */
function gameCard(game, iconUrl, votes) {
  const likes = votes ? likePercent(votes.upVotes, votes.downVotes) : null;
  const playing = game.playing != null ? fmtNumber(game.playing) : null;
  const visits = game.visits != null ? fmtNumber(game.visits) : null;
  const creator = game.creator?.name || game.creator?.displayName || "";
  const card = document.createElement("button");
  card.type = "button";
  card.className = "game-card";
  card.dataset.universe = game.id;
  card.innerHTML = `
    <div class="game-thumb">
      ${iconUrl ? `<img src="${esc(iconUrl)}" alt="${esc(game.name)} thumbnail" loading="lazy" />` : ""}
      ${playing ? `<span class="game-players">▶ ${esc(playing)} playing</span>` : ""}
    </div>
    <div class="game-body">
      <h3>${esc(game.name)}</h3>
      ${creator ? `<p class="game-creator">by ${esc(creator)}</p>` : ""}
      <div class="game-stats">
        ${visits ? `<span>👁 ${esc(visits)} visits</span>` : ""}
        ${likes ? `<span>👍 ${esc(likes)}</span>` : ""}
      </div>
    </div>`;
  card.addEventListener("click", () => openGameModal(game.id));
  return card;
}

async function renderGameCards(container, games) {
  container.innerHTML = "";
  if (!games.length) return;
  const ids = games.map((g) => g.id);
  let icons = new Map();
  let votes = new Map();
  try { icons = await getGameIcons(ids); } catch { /* icons optional */ }
  try { votes = await getGameVotes(ids); } catch { /* votes optional */ }
  for (const game of games) {
    container.appendChild(gameCard(game, icons.get(game.id), votes.get(game.id)));
  }
}

/* ================= profile lookup ================= */
const profileForm = $("#profileForm");
const profileInput = $("#profileInput");
const profileResult = $("#profileResult");

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = profileInput.value.trim();
  if (!username) {
    toast("Enter your Roblox username first.", "error");
    return;
  }

  const btn = $("button", profileForm);
  btn.disabled = true;
  btn.textContent = "Looking up…";
  profileResult.innerHTML = `<div class="skeleton" style="min-height:220px"></div>`;

  try {
    const matches = await searchUsers(username);
    if (!matches.length) {
      profileResult.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No user found for “${esc(username)}”</h3>
          <p>Check the spelling and try again.</p>
        </div>`;
      return;
    }
    // Prefer an exact username match, then display-name match, else first result.
    const lower = username.toLowerCase();
    const user =
      matches.find((u) => u.name.toLowerCase() === lower) ||
      matches.find((u) => u.displayName.toLowerCase() === lower) ||
      matches[0];

    const [details, avatar, counts, userGames] = await Promise.all([
      getUser(user.id),
      getUserAvatar(user.id).catch(() => ""),
      getSocialCounts(user.id),
      getUserGames(user.id).catch(() => []),
    ]);

    const stat = (label, value) =>
      value == null ? "" : `<div><strong>${esc(fmtNumber(value))}</strong>${label}</div>`;

    profileResult.innerHTML = `
      <div class="profile-card">
        ${avatar ? `<img class="profile-avatar" src="${esc(avatar)}" alt="${esc(details.displayName)} avatar" />` : ""}
        <div class="profile-info">
          <h3>${esc(details.displayName)}
            ${details.hasVerifiedBadge ? `<span class="verified-badge">✓ Verified</span>` : ""}
          </h3>
          <p class="profile-handle">@${esc(details.name)} · User ID ${esc(details.id)}</p>
          ${details.description ? `<p class="profile-desc">${esc(details.description)}</p>` : ""}
          <div class="profile-meta">
            <div><strong>${esc(fmtDate(details.created))}</strong>Joined</div>
            ${stat("Followers", counts.followers)}
            ${stat("Following", counts.followings)}
            ${stat("Friends", counts.friends)}
          </div>
          <div class="profile-actions">
            <a class="btn btn-primary btn-sm" href="${profileUrl(details.id)}" target="_blank" rel="noopener">View on Roblox</a>
          </div>
        </div>
      </div>
      <h3 class="profile-games-title">Games created <span>(${userGames.length})</span></h3>
      <div class="games-grid" id="profileGames"></div>`;

    const grid = $("#profileGames");
    if (userGames.length) {
      await renderGameCards(grid, userGames);
    } else {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>No public games found for this user.</p></div>`;
    }
  } catch (err) {
    profileResult.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Couldn't load that profile</h3>
        <p>Roblox's API may be rate-limiting right now. Wait a few seconds and try again.</p>
      </div>`;
    toast("Profile lookup failed. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Look up";
  }
});

/* ================= game search ================= */
const gamesForm = $("#gamesForm");
const gamesInput = $("#gamesInput");
const gamesSort = $("#gamesSort");
const gamesGrid = $("#gamesGrid");
const gamesStatus = $("#gamesStatus");
const gamesLoadMore = $("#gamesLoadMore");

const gamesState = { keyword: "", sort: "Trending", cursor: null, loading: false };

async function runGameSearch(reset = true) {
  if (gamesState.loading) return;
  gamesState.loading = true;
  const btn = $("button[type=submit]", gamesForm);
  btn.disabled = true;
  btn.textContent = "Searching…";

  if (reset) {
    gamesState.keyword = gamesInput.value.trim();
    gamesState.sort = gamesSort.value;
    gamesState.cursor = null;
    gamesGrid.innerHTML = `<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>`;
    gamesStatus.textContent = "";
  }

  try {
    const { games, nextCursor } = await searchGames(
      gamesState.keyword, gamesState.sort, 30, gamesState.cursor || ""
    );
    if (reset) gamesGrid.innerHTML = "";

    if (!games.length && reset) {
      gamesGrid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🎮</div>
          <h3>No games found</h3>
          <p>Try a different search term or sort option.</p>
        </div>`;
      gamesStatus.textContent = "";
    } else {
      const ids = games.map((g) => g.id);
      let icons = new Map();
      let votes = new Map();
      try { icons = await getGameIcons(ids); } catch { /* optional */ }
      try { votes = await getGameVotes(ids); } catch { /* optional */ }
      const frag = document.createDocumentFragment();
      for (const game of games) frag.appendChild(gameCard(game, icons.get(game.id), votes.get(game.id)));
      gamesGrid.appendChild(frag);
      gamesStatus.textContent = gamesState.keyword
        ? `Results for “${gamesState.keyword}”`
        : "Trending now on Roblox";
    }

    gamesState.cursor = nextCursor;
    gamesLoadMore.hidden = !nextCursor;
  } catch {
    if (reset) gamesGrid.innerHTML = "";
    toast("Game search failed. Roblox's API may be rate-limiting — try again.", "error");
  } finally {
    gamesState.loading = false;
    btn.disabled = false;
    btn.textContent = "Search";
  }
}

gamesForm.addEventListener("submit", (e) => {
  e.preventDefault();
  runGameSearch(true);
});
gamesSort.addEventListener("change", () => runGameSearch(true));
gamesLoadMore.addEventListener("click", () => runGameSearch(false));

/* ================= game detail modal ================= */
const modal = $("#gameModal");
const modalContent = $("#modalContent");
const modalClose = $("#modalClose");

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}
modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) closeModal();
});

async function openGameModal(universeId) {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  modalContent.innerHTML = `<div style="padding:3rem"><div class="skeleton" style="min-height:260px"></div></div>`;

  try {
    const [detailsArr, icons, votes] = await Promise.all([
      getGameDetails(universeId),
      getGameIcons(universeId).catch(() => new Map()),
      getGameVotes(universeId).catch(() => new Map()),
    ]);
    const game = detailsArr[0];
    if (!game) throw new Error("not found");

    const icon = icons.get(game.id) || "";
    const v = votes.get(game.id);
    const likes = v ? likePercent(v.upVotes, v.downVotes) : "—";
    const creator = game.creator?.name || game.creator?.displayName || "Unknown";
    const creatorType = game.creator?.type === "Group" ? "Group" : "User";

    const stat = (label, value) => `
      <div class="modal-stat"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;

    modalContent.innerHTML = `
      ${icon ? `<div class="modal-hero"><img src="${esc(icon)}" alt="${esc(game.name)}" /></div>` : ""}
      <div class="modal-body">
        <h3 id="modalTitle">${esc(game.name)}</h3>
        <p class="modal-creator">by ${esc(creator)} (${esc(creatorType)}) · ${esc(game.genre || "Misc")}</p>
        <div class="modal-stats">
          ${stat("Playing now", fmtNumber(game.playing))}
          ${stat("Visits", fmtNumber(game.visits))}
          ${stat("Likes", likes)}
          ${stat("Max players", fmtNumber(game.maxPlayers))}
          ${stat("Created", fmtDate(game.created))}
          ${stat("Updated", fmtDate(game.updated))}
        </div>
        <p class="modal-desc">${esc(game.description || "No description provided by the creator.")}</p>
        <div class="modal-actions">
          <a class="btn btn-primary" href="${playUrl(game.rootPlaceId)}" target="_blank" rel="noopener">▶ Play on Roblox</a>
          <a class="btn btn-ghost" href="${playUrl(game.rootPlaceId)}" target="_blank" rel="noopener">Game page</a>
        </div>
      </div>`;
  } catch {
    modalContent.innerHTML = `
      <div class="modal-body" style="padding-top:3rem">
        <h3>Couldn't load game details</h3>
        <p class="modal-desc">Please close this and try again in a few seconds.</p>
      </div>`;
  }
}

/* ================= boot ================= */
$("#year").textContent = new Date().getFullYear();
initReleaseInfo();
runGameSearch(true); // load trending games on arrival
