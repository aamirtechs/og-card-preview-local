"use strict";
// OG Card Preview Local core logic: pure functions, no DOM, no fetch.

function decodeEntities(s) {
  return String(s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#x27;/gi, "'");
}

function extractMeta(html) {
  const src = String(html || "");
  const meta = { title: "", description: "", og: {}, twitter: {}, canonical: "" };
  const tm = src.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (tm) meta.title = decodeEntities(tm[1].trim().replace(/\s+/g, " "));
  const metaTags = src.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const attrs = {};
    const attrRe = /([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let a;
    while ((a = attrRe.exec(tag)) !== null) attrs[a[1].toLowerCase()] = decodeEntities(a[2] != null ? a[2] : (a[3] != null ? a[3] : a[4]));
    const key = (attrs.property || attrs.name || "").toLowerCase();
    const content = attrs.content || "";
    if (!key) continue;
    if (key.startsWith("og:")) meta.og[key.slice(3)] = content;
    else if (key.startsWith("twitter:")) meta.twitter[key.slice(8)] = content;
    else if (key === "description") meta.description = content;
  }
  const lm = src.match(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/i);
  if (lm) { const hm = lm[0].match(/href\s*=\s*["']([^"']+)["']/i); if (hm) meta.canonical = decodeEntities(hm[1]); }
  if (!meta.description && meta.og.description) meta.description = meta.og.description;
  return meta;
}

function isAbsoluteUrl(u) { return /^https?:\/\//i.test(String(u || "")); }

function resolveUrl(url, base) {
  const u = String(url || "");
  if (!u || isAbsoluteUrl(u)) return u;
  const b = String(base || "");
  if (!b) return u;
  try { return new URL(u, b).href; } catch (e) {
    if (u.startsWith("/")) { const m = b.match(/^(https?:\/\/[^/]+)/i); return m ? m[1] + u : u; }
    return b.replace(/\/?$/, "/") + u;
  }
}

function truncatePreview(text, limit) {
  const s = String(text || "");
  if (s.length <= limit) return { text: s, truncated: false, length: s.length };
  return { text: s.slice(0, Math.max(0, limit - 1)).trimEnd() + "...", truncated: true, length: s.length };
}

function runChecks(meta, imageInfo) {
  const info = imageInfo || {};
  const checks = [];
  const add = (id, level, message) => checks.push({ id, level, message });
  const title = meta.og.title || meta.title || "";
  const desc = meta.og.description || meta.description || "";
  const img = meta.og.image || meta.twitter.image || info.url || "";
  if (!meta.title) add("title", "fail", "Missing page title tag.");
  else add("title", "pass", "Title tag found: " + truncatePreview(meta.title, 60).text);
  if (!meta.og.title) add("og:title", "warn", "No og:title, networks will fall back to the page title.");
  else add("og:title", "pass", "og:title is present.");
  if (!desc) add("description", "fail", "Missing description (meta description and og:description are both empty).");
  else if (desc.length > 160) add("description", "warn", "Description is " + desc.length + " chars and will likely be truncated past about 160.");
  else add("description", "pass", "Description is " + desc.length + " chars.");
  if (title.length > 60) add("title-length", "warn", "Title is " + title.length + " chars and may be truncated past about 60 in cards and search.");
  if (!img) add("og:image", "fail", "No og:image found. Cards will show without an image.");
  else {
    add("og:image", "pass", "An og:image value is present.");
    if (!isAbsoluteUrl(img)) add("og:image-absolute", "fail", "og:image is a relative URL. Social crawlers need a full https URL, they cannot resolve relative paths.");
    else add("og:image-absolute", "pass", "og:image is an absolute URL.");
  }
  if (!meta.og.type) add("og:type", "warn", "No og:type, add website for pages or article for posts.");
  if (!meta.og.url) add("og:url", "warn", "No og:url, add the canonical URL of the page.");
  if (!meta.twitter.card) add("twitter:card", "warn", "No twitter:card, X will use a small summary card by default.");
  if (info.width != null && info.height != null) {
    if (info.width === 1200 && info.height === 630) add("image-size", "pass", "Image is exactly 1200x630, the recommended OG size.");
    else add("image-size", "warn", "Image is " + info.width + "x" + info.height + ", not the recommended 1200x630. It may be cropped differently per network.");
    if (info.width < 600 || info.height < 315) add("image-min", "warn", "Image is small. Use at least 600x315 for large cards.");
  }
  if (info.sizeBytes != null) {
    if (info.sizeBytes > 5 * 1024 * 1024) add("image-weight", "fail", "Image is over 5 MB. Several networks will refuse or ignore it.");
    else add("image-weight", "pass", "Image file size is under 5 MB.");
  }
  const score = checks.filter((c) => c.level === "pass").length;
  return { checks, passCount: score, total: checks.length };
}

function escapeAttr(s) { return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }

function generateMetaBlock(meta, baseUrl) {
  const title = meta.og.title || meta.title || "";
  const desc = meta.og.description || meta.description || "";
  const type = meta.og.type || "website";
  const url = meta.og.url || meta.canonical || baseUrl || "";
  const imgRaw = meta.og.image || meta.twitter.image || "";
  const img = resolveUrl(imgRaw, url || baseUrl || "");
  const card = meta.twitter.card || "summary_large_image";
  const lines = [];
  if (title) lines.push('<meta property="og:title" content="' + escapeAttr(title) + '">');
  if (desc) lines.push('<meta property="og:description" content="' + escapeAttr(desc) + '">');
  lines.push('<meta property="og:type" content="' + escapeAttr(type) + '">');
  if (url) lines.push('<meta property="og:url" content="' + escapeAttr(url) + '">');
  if (img) lines.push('<meta property="og:image" content="' + escapeAttr(img) + '">');
  lines.push('<meta name="twitter:card" content="' + escapeAttr(card) + '">');
  if (title) lines.push('<meta name="twitter:title" content="' + escapeAttr(title) + '">');
  if (desc) lines.push('<meta name="twitter:description" content="' + escapeAttr(desc) + '">');
  if (img) lines.push('<meta name="twitter:image" content="' + escapeAttr(img) + '">');
  return lines.join("\n") + "\n";
}

function cardPreviews(meta) {
  const title = meta.og.title || meta.title || "(no title)";
  const desc = meta.og.description || meta.description || "";
  const site = meta.og.site_name || "";
  return [
    { network: "X large card", title: truncatePreview(title, 70).text, description: truncatePreview(desc, 200).text, footer: site || "your-site" },
    { network: "X small card", title: truncatePreview(title, 70).text, description: truncatePreview(desc, 120).text, footer: site || "your-site" },
    { network: "Facebook", title: truncatePreview(title, 88).text, description: truncatePreview(desc, 200).text, footer: (site || "YOUR-SITE").toUpperCase() },
    { network: "LinkedIn", title: truncatePreview(title, 120).text, description: truncatePreview(desc, 150).text, footer: site || "your-site" },
    { network: "WhatsApp", title: truncatePreview(title, 65).text, description: truncatePreview(desc, 100).text, footer: site || "your-site" },
    { network: "Discord", title: truncatePreview(title, 256).text, description: truncatePreview(desc, 300).text, footer: site || "your-site" }
  ];
}

const api = { extractMeta, isAbsoluteUrl, resolveUrl, truncatePreview, runChecks, generateMetaBlock, cardPreviews, escapeAttr };
if (typeof module !== "undefined" && module.exports) { module.exports = api; }
if (typeof window !== "undefined") { window.OgCardPreviewLocal = api; }
