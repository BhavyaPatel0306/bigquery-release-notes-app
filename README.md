# BigQuery Release Notes Explorer

**Python · Flask · JavaScript · HTML/CSS**

A web app that turns Google Cloud's BigQuery release-notes feed into searchable, categorized update cards. A Flask backend proxies the official feed; the frontend splits each day's notes into individual updates, tags them, and lets you search, filter, export, and draft a post to share on X.

## Features

- **Live feed:** Flask fetches the official BigQuery release-notes XML feed and normalizes it for the browser.
- **Per-update cards:** each day's combined release entry is split into individual updates.
- **Automatic tagging:** keyword rules label updates as *Feature*, *Fix*, *Deprecated*, or *Other*.
- **Search and filter:** filter instantly by keyword or category.
- **Share drafts:** generate an editable post for X with a live character count (URLs counted as 23 characters), then open X's share dialog to review and post.
- **Copy and export:** copy an update to the clipboard or export every loaded update to CSV.
- **Light and dark themes** with a toggle in the header.

## Tech stack

| Layer | Tools |
| --- | --- |
| Backend | Python 3, Flask, Requests, feedparser |
| Frontend | HTML, CSS (custom properties, Flexbox, Grid), vanilla JavaScript (DOMParser) |
| Assets | Font Awesome, Google Fonts |

## Run locally

Requires Python 3.8 or later.

```sh
git clone https://github.com/BhavyaPatel0306/bigquery-release-notes-app.git
cd bigquery-release-notes-app
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000.

## How it works

```text
Browser ──GET /api/release-notes──▶ Flask (app.py) ──▶ Google Cloud BigQuery feed
   │                                   │ 15 s timeout, normalized JSON
   ▼                                   ▼
main.js: split entries → tag → search/filter → share draft / copy / CSV export
```

| Path | Responsibility |
| --- | --- |
| `app.py` | Serves the page and the `/api/release-notes` feed proxy |
| `templates/index.html` | Page layout |
| `static/js/main.js` | Parsing, tagging, search, filters, share composer, export |
| `static/css/style.css` | Styles and light/dark theme variables |

## Future work

- Add unit tests for the parsing and tagging logic, plus a CI workflow.
- Replace keyword tagging with a more robust classifier.
- Add a production server configuration (the bundled server runs in Flask debug mode for local development).
