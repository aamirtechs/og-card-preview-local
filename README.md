# OG Card Preview Local
Live page: https://aamirtechs.github.io/og-card-preview-local/

Preview how a page will look on X, LinkedIn, Facebook and WhatsApp by dropping in its HTML file and image, before it is live, even on localhost. It solves a recurring, specific job for the people who hit it every week, in one local page with no account and no upload.

## Features
- Drop an .html file or paste the head markup. No fetching happens, so staging and localhost pages work.
- Drop the og:image locally to check its real pixel size against 1200x630 and its file size against the 5 MB limit.
- Previews for X large and small cards, Facebook, LinkedIn, WhatsApp and Discord use the actual title and description truncation lengths.
- Checks flag missing or empty og tags, relative image URLs crawlers cannot resolve, and title or description truncation.
- Generate a corrected meta tag block with absolute image URLs, ready to copy into your head.

## How it works
Load or paste your input in the tool card, set the options, and run it. All parsing, checking and file generation happens locally in the page, and you download the result (a report, a converted file, or a corrected snippet) straight from the browser. It runs entirely in the browser.

## Privacy
Runs 100% in your browser. Your files never leave this device, nothing is uploaded,
and there is no tracking.

## Development
Core logic lives in `src/logic.js` and is shared by the page and the tests.
Run the tests with `npm test`.

## License
MIT, Copyright 2026 Amir Hussain.
