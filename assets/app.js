const state = { items: [], filtered: [], category: "all", tag: "all", q: "" };
const $ = (id) => document.getElementById(id);

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(window.__t);
  window.__t = setTimeout(() => (el.style.display = "none"), 1400);
}

function getBaseUrl() {
  const origin = window.location.origin;
  const path = window.location.pathname;
  const repoRoot = path.endsWith("/") ? path : path.replace(/\/[^/]*$/, "/");
  return origin + repoRoot;
}
function makeUrl(path) { return getBaseUrl() + path.replace(/^\//, ""); }

async function load() {
  const res = await fetch("./images.json", { cache: "no-store" });
  const data = await res.json();
  state.items = Array.isArray(data) ? data : [];
  hydrateFilters();
  apply();
}

function hydrateFilters() {
  const cats = Array.from(new Set(state.items.map(x => x.category).filter(Boolean))).sort();
  const tags = Array.from(new Set(state.items.flatMap(x => x.tags || []))).sort();

  $("category").innerHTML = [`<option value="all">カテゴリ: 全部</option>`]
    .concat(cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`))
    .join("");

  $("tag").innerHTML = [`<option value="all">タグ: 全部</option>`]
    .concat(tags.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`))
    .join("");
}

function apply() {
  const q = state.q.trim().toLowerCase();
  state.filtered = state.items.filter((x) => {
    if (state.category !== "all" && x.category !== state.category) return false;
    if (state.tag !== "all" && !(x.tags || []).includes(state.tag)) return false;
    if (!q) return true;

    const hay = [
      x.filename || "", x.title || "", x.category || "",
      ...(x.tags || []), x.path || ""
    ].join(" ").toLowerCase();

    return hay.includes(q);
  });

  render();
}

function render() {
  $("stats").textContent = `表示: ${state.filtered.length} / 全体: ${state.items.length}`;
  $("grid").innerHTML = state.filtered.map(cardHtml).join("") || `
    <div class="small" style="grid-column:1/-1; padding:10px; color: var(--muted);">
      まだ画像がありません。/images に画像を置いて images.json に追加すると一覧に出ます。
    </div>
  `;
}

function cardHtml(x) {
  const url = makeUrl(x.path);
  const tags = (x.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("");
  const title = escapeHtml(x.title || x.filename || "(no title)");
  const small = escapeHtml(url);

  return `
    <div class="card">
      <img class="thumb" src="${url}" alt="${title}" loading="lazy" onclick="openModal('${encodeURIComponent(url)}')">
      <div class="meta">
        <div class="title">${title}</div>
        <div class="small">${small}</div>
        <div class="tags">${tags}</div>
        <div class="actions">
          <button class="primary" onclick="copyText('${escapeJs(url)}')">直URLコピー</button>
          <button onclick="copyText('&lt;img src=&quot;${escapeJs(url)}&quot;&gt;')">HTML用</button>
          <button onclick="copyText('![](${escapeJs(url)})')">Markdown用</button>
          <button onclick="copyText('${escapeJs(x.path)}')">pathコピー</button>
        </div>
      </div>
    </div>
  `;
}

async function copyText(text) {
  const normalized = text
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"").replace(/&amp;/g, "&");
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

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeJs(s) { return String(s).replaceAll("\\", "\\\\").replaceAll("'", "\\'"); }

window.addEventListener("DOMContentLoaded", () => {
  $("q").addEventListener("input", (e) => { state.q = e.target.value; apply(); });
  $("category").addEventListener("change", (e) => { state.category = e.target.value; apply(); });
  $("tag").addEventListener("change", (e) => { state.tag = e.target.value; apply(); });

  $("reload").addEventListener("click", () => load().then(() => toast("更新しました")));
  $("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  $("closeModal").addEventListener("click", closeModal);
  $("copyModal").addEventListener("click", () => copyText($("modalUrl").textContent));

  load();
});
