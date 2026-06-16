# BigQuery Release Notes Explorer & Tweeter

A sleek, responsive, single-page web application that fetches Google Cloud's BigQuery Release Notes feed, splits it into digestible, searchable updates, and provides a quick interface to tweet them directly on X (formerly Twitter).

---

## 🚀 Key Features

- **Live Feed Parsing**: Fetches the official Google Cloud BigQuery RSS/Atom XML feed live using a Flask proxy server.
- **Micro-parsing on Client-Side**: Automatically dissects composite daily release lists into individual, atomic update items.
- **Smart Update Classification**: Scans notes and tags them dynamically with category badges:
  - 🟢 **Feature**: New features and support capabilities.
  - 🔵 **Fix**: Bug resolutions and fixes.
  - 🔴 **Deprecated**: Deprecated or decommissioned functions.
  - 🟣 **Other**: Standard updates, general announcements, and enhancements.
- **Search & Category Filtering**: Instantly search updates by keywords or filter by tag category.
- **Draft Composer & X Web Intent Integration**: Automatically drafts a custom tweet for any update card, manages the 280-character limit (calculating URL shortener weight), and opens a secure X sharing window.
- **Premium Sleek Dark Theme**: Built using clean, custom glassmorphism styling, responsive dual-pane layout, custom scrollbars, and modern typography (Outfit).

---

## 🛠️ Technology Stack

- **Backend**: Python 3, Flask, Requests, Feedparser
- **Frontend**: Plain HTML5, Vanilla CSS3 (Custom Variables, Flexbox, Grid), Vanilla JavaScript (ES6+, DOMParser, Web Intents)
- **Icons**: Font Awesome 6 CDN
- **Fonts**: Google Fonts (Outfit)

---

## 📁 Project Structure

```
bigquery-release-notes-app/
├── app.py                  # Main Flask backend application & API proxy
├── requirements.txt        # Backend dependencies
├── .gitignore              # Git ignore configuration
├── README.md               # Project documentation
├── templates/
│   └── index.html          # Core HTML interface template
└── static/
    ├── css/
    │   └── style.css       # Premium CSS styles and variables
    └── js/
        └── main.js         # Frontend controller, parsing, search, and tweet logic
```

---

## ⚙️ Getting Started & Installation

### Prerequisites
- Python 3.8 or higher installed on your machine.

### Setup Instructions

1. **Clone or navigate to the project directory**:
   ```bash
   cd bigquery-release-notes-app
   ```

2. **Create a Python Virtual Environment**:
   ```bash
   python -m venv .venv
   ```

3. **Activate the Virtual Environment**:
   - **On Windows (PowerShell)**:
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   - **On macOS/Linux (Bash/Zsh)**:
     ```bash
     source .venv/bin/activate
     ```

4. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the Application**:
   ```bash
   python app.py
   ```

6. **Access the App**:
   Open your browser and navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 📝 Usage Guide

### 1. Refreshing Data
Click the **Refresh** button with the circular arrow icon in the header. The app will fetch the latest feed. The spinner animates during the fetch and stops once rendering is complete.

### 2. Searching and Filtering
- **Keyword Search**: Type terms (e.g. "JSON", "pricing", "materialized views") in the search input to instantly filter the active release dates and cards.
- **Category Badges**: Click any category button (e.g. *Features*, *Fixes*) to view only updates matching that classification type.

### 3. Tweeting Updates
- Click the **Twitter / X** icon on any update card.
- A customized tweet draft will generate, e.g.:
  > `BigQuery Update (June 16, 2026): [Update Snippet]... Read more: https://docs.cloud.google.com/feeds/... #BigQuery #GoogleCloud`
- The built-in composer modal lets you edit the text and monitors character usage (URLs are correctly weighted at 23 characters per X policies).
- Click **Tweet on X** to open a secure Twitter share dialog.
