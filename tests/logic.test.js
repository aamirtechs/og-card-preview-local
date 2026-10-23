"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../src/logic.js");

const HTML = `<html><head>
<title>My Launch Page</title>
<meta name="description" content="A short and useful description of the launch page for testing.">
<meta property="og:title" content="My Launch Page">
<meta property="og:description" content="A short and useful description of the launch page for testing.">
<meta property="og:image" content="/images/card.png">
<meta property="og:url" content="https://example.com/launch">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://example.com/launch">
</head><body>Hello</body></html>`;

test("extracts title, description, og and twitter meta", () => {
  const m = L.extractMeta(HTML);
  assert.equal(m.title, "My Launch Page");
  assert.equal(m.og.title, "My Launch Page");
  assert.equal(m.og.image, "/images/card.png");
  assert.equal(m.twitter.card, "summary_large_image");
  assert.equal(m.canonical, "https://example.com/launch");
});

test("tolerant parser handles single quotes and reversed attribute order", () => {
  const m = L.extractMeta("<meta content='Reversed Title' property='og:title'><title>T</title>");
  assert.equal(m.og.title, "Reversed Title");
});

test("checks flag a relative image URL", () => {
  const m = L.extractMeta(HTML);
  const r = L.runChecks(m, null);
  assert.ok(r.checks.some((c) => c.id === "og:image-absolute" && c.level === "fail"));
});

test("checks pass a complete page with a correct image", () => {
  const html = HTML.replace("/images/card.png", "https://example.com/images/card.png");
  const m = L.extractMeta(html);
  const r = L.runChecks(m, { width: 1200, height: 630, sizeBytes: 200000 });
  assert.ok(r.checks.some((c) => c.id === "image-size" && c.level === "pass"));
  assert.ok(!r.checks.some((c) => c.level === "fail"));
});

test("checks flag missing tags and an oversized image", () => {
  const m = L.extractMeta("<html><head></head></html>");
  const r = L.runChecks(m, { width: 800, height: 400, sizeBytes: 6 * 1024 * 1024 });
  assert.ok(r.checks.some((c) => c.id === "title" && c.level === "fail"));
  assert.ok(r.checks.some((c) => c.id === "og:image" && c.level === "fail"));
  assert.ok(r.checks.some((c) => c.id === "image-weight" && c.level === "fail"));
  assert.ok(r.checks.some((c) => c.id === "image-size" && c.level === "warn"));
});

test("truncation helper reports length and cuts long text", () => {
  const short = L.truncatePreview("hello", 10);
  assert.equal(short.truncated, false);
  const long = L.truncatePreview("a".repeat(100), 20);
  assert.equal(long.truncated, true);
  assert.equal(long.length, 100);
  assert.ok(long.text.length <= 22);
});

test("resolveUrl makes a relative image absolute against the page URL", () => {
  assert.equal(L.resolveUrl("/img/card.png", "https://example.com/launch"), "https://example.com/img/card.png");
  assert.equal(L.resolveUrl("img/card.png", "https://example.com/blog/post"), "https://example.com/blog/img/card.png");
  assert.equal(L.resolveUrl("https://cdn.example.com/x.png", "https://example.com/"), "https://cdn.example.com/x.png");
  assert.equal(L.isAbsoluteUrl("/img/x.png"), false);
});

test("corrected meta block generation includes absolute image and twitter tags", () => {
  const m = L.extractMeta(HTML);
  const block = L.generateMetaBlock(m);
  assert.match(block, /og:title/);
  assert.match(block, /https:\/\/example\.com\/images\/card\.png/);
  assert.match(block, /twitter:card/);
  assert.match(block, /og:type/);
});

test("long description triggers a truncation warning", () => {
  const m = L.extractMeta('<title>T</title><meta name="description" content="' + "x".repeat(200) + '">');
  const r = L.runChecks(m, null);
  assert.ok(r.checks.some((c) => c.id === "description" && c.level === "warn"));
});

test("card previews cover six networks", () => {
  const m = L.extractMeta(HTML);
  const cards = L.cardPreviews(m);
  assert.equal(cards.length, 6);
  assert.deepEqual(cards.map((c) => c.network), ["X large card", "X small card", "Facebook", "LinkedIn", "WhatsApp", "Discord"]);
});
