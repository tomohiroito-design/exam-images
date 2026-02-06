const state = {
  items: [],
  filtered: [],
  category: "all",
  tag: "all",
  q: ""
};

const $ = (id) => document.getElementById(id);

/* --------------------
   UI utility
-------------------- */
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(window.__t);
  window.__t = setTimeout(() => (el.style.display = "none"), 1400);
}

/* --------------------
   Load images.json
-------------------- */
async function load() {
  // ★ キャッシュ完全回避
  const res = await fetch(`./images.json?v=${Date.now()}`, {
    cache: "no-store"
  });

  const data = await res.json();
  state.items = Array.isArray(data) ? data : [];

  hydrateFilters();
  apply();
}

/* --------------------
   Filters
-------------------- */
function hydrateFilters() {
  const cats = Array.from(
    new Set(state.items.map(x => x.category).filter(Boolean))
  ).sort();

  const tags = Array.from(
    new Set(state.items.flatMap(x => x.tags || []))
  ).sort();

  $("category").innerHTML =
    `<option value="all">カテゴリ: 全部</option>` +
    cats.map(c =>
      `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
    ).join("");

  $("tag").innerHTML =
    `<option value="all">タグ: 全部</option>` +
    tags.map(t =>
      `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`
    ).join("");
}

/* --------------------
   Apply filter
-------------------- */
function apply() {
  const q = state.q.trim().toLowerCase();

  state.filtered = state.items.filter((x) => {
    if (state.category !== "all" && x.category !== state.category) return false;
    if (state.tag !== "all" && !(x.tags || []).includes(state.tag)) return false;
    if (!q) return true;

    const hay = [
      x.filename || "",
      x.title || "",
      x.category || "",
      ...(x.tags || [])
    ].join(" ").toLowerCase();

    return hay.includes(q);
  });

  render();
}

/* --------------------
   Render
-------------------- */
function render() {
  $("stats").textContent =
    `表示: ${state.filtered.length} / 全体: ${state.items.length}`;

  const grid = $("grid");
  grid.innerHTML = ""; // ★ 二重描画防止

  if (state.filtered.length === 0) {
    grid.innerHTML = `
      <div class="small" style="grid-column:1/-1; padding:10px; color: var(--muted);">
        まだ画像がありません。
      </div>
    `;
    return;
  }

  grid.innerHTML = state.filtered.map(cardHtml).join("");
}

/* --------------------
   Card HTML
-------------------- */
function cardHtml(x) {
  // ★ 正：images.json の url をそのまま使う
  const url = x.url;

  const title = escapeHtml(x.title || x.filename || "(no title)");
  const tags = (x.tags || [])
    .map(t => `<span class="tag">${escapeHtml(t)}</span>`)
    .join("");

  return `
    <div class="card">
      <img
        class="thumb"
        src="${url}"
        alt="${title}"
        loading="lazy"
        onclick="openModal('${encodeURIComponent(url)}')"
      >
      <div class="meta">
        <div class="title">${title}</div>
        <div class="small">${escapeHtml(url)}</div>
        <div class="tags">${tags}</div>
        <div class="actions">
          <button class="primary" onclick="copyText('${escapeJs(url)}')">直URLコピー</button>
          <button onclick="copyText('&lt;img src=&quot;${escapeJs(url)}&quot;&gt;')">HTML用</button>
          <button onclick="copyText('![](${escapeJs(url)})')">Markdown用</button>
        </div>
      </div>
    </div>
  `;
}

/* --------------------
   Copy / Modal
-------------------- */
async function copyText(text) {
  const normalized = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&");

  await navigator.clipboard.writeText(normalized);
  toast("コピーしました");
}

function openModal(encodedUrl) {
  const url = decodeURIComponent(encodedUrl);
  $("modalImg").src = url;
  $("modalUrl").textContent = url;
  $("modal").style.display = "flex";
}

function closeModal() {
  $("modal").style.display = "none";
  $("modalImg").src = "";
}

/* --------------------
   Escape helpers
-------------------- */
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJs(s) {
  return String(s)
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'");
}

/* --------------------
   Events
-------------------- */
window.addEventListener("DOMContentLoaded", () => {
  $("q").addEventListener("input", (e) => {
    state.q = e.target.value;
    apply();
  });

  $("category").addEventListener("change", (e) => {
    state.category = e.target.value;
    apply();
  });

  $("tag").addEventListener("change", (e) => {
    state.tag = e.target.value;
    apply();
  });

  $("reload").addEventListener("click", () =>
    load().then(() => toast("更新しました"))
  );

  $("modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") closeModal();
  });

  $("closeModal").addEventListener("click", closeModal);
  $("copyModal").addEventListener("click", () =>
    copyText($("modalUrl").textContent)
  );

  load();
});
