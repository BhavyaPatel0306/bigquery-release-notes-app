import logging
from flask import Flask, jsonify, render_template, request
import requests
import feedparser

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/release-notes")
def get_release_notes():
    try:
        # Fetch the feed XML
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse feed using feedparser
        feed = feedparser.parse(response.text)
        
        entries = []
        for entry in feed.entries:
            # Extract content/summary
            content_value = ""
            if "content" in entry and len(entry.content) > 0:
                content_value = entry.content[0].value
            elif "summary" in entry:
                content_value = entry.summary
                
            entries.append({
                "id": entry.get("id", ""),
                "title": entry.get("title", "Release Notes"),
                "updated": entry.get("updated", entry.get("published", "")),
                "link": entry.get("link", ""),
                "content": content_value
            })
            
        return jsonify({
            "status": "success",
            "title": feed.feed.get("title", "BigQuery Release Notes"),
            "entries": entries
        })
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch feed: {e}")
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch release notes: {str(e)}"
        }), 500
    except Exception as e:
        logger.error(f"Error processing feed: {e}")
        return jsonify({
            "status": "error",
            "message": f"An error occurred: {str(e)}"
        }), 500

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
