# Changelog

## 1.0.0 - 2026-10-23

- Initial release.
- Drop an .html file or paste the head markup. No fetching happens, so staging and localhost pages work.
- Drop the og:image locally to check its real pixel size against 1200x630 and its file size against the 5 MB limit.
- Previews for X large and small cards, Facebook, LinkedIn, WhatsApp and Discord use the actual title and description truncation lengths.
- Checks flag missing or empty og tags, relative image URLs crawlers cannot resolve, and title or description truncation.
- Generate a corrected meta tag block with absolute image URLs, ready to copy into your head.
