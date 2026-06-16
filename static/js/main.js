/**
 * BigQuery Release Notes Explorer - Client Logic
 */

// Global State
let releaseNotesState = {
    title: 'BigQuery Release Notes',
    entries: [],          // Raw feed entries
    parsedEntries: [],    // Entries with parsed individual items
    activeEntryId: null,  // Currently selected entry (date)
    currentFilter: 'all',
    searchQuery: ''
};

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const exportCsvBtn = document.getElementById('export-csv-btn');
const lastUpdatedSpan = document.getElementById('last-updated');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const filterTags = document.querySelectorAll('.filter-tag');
const dateListContainer = document.getElementById('date-list');
const releaseCountSpan = document.getElementById('release-count');
const activeReleaseTitle = document.getElementById('active-release-title');
const activeReleaseLink = document.getElementById('active-release-link');
const releaseItemsContainer = document.getElementById('release-items-container');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountSpan = document.getElementById('char-count');
const closeModalBtn = document.getElementById('close-modal');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const tweetIntentBtn = document.getElementById('tweet-intent-btn');

// Toast Elements
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

/* ==========================================================================
   Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // Setup Event Listeners
    refreshBtn.addEventListener('click', fetchReleaseNotes);
    exportCsvBtn.addEventListener('click', exportToCSV);
    searchInput.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', clearSearch);
    
    filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            releaseNotesState.currentFilter = tag.dataset.filter;
            renderDetails();
        });
    });

    closeModalBtn.addEventListener('click', hideTweetModal);
    cancelTweetBtn.addEventListener('click', hideTweetModal);
    tweetTextarea.addEventListener('input', updateTweetCharCount);
    tweetIntentBtn.addEventListener('click', triggerTweetIntent);
    
    // Close modal on click outside content
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) hideTweetModal();
    });

    // Initial Fetch
    fetchReleaseNotes();
});

/* ==========================================================================
   API Fetching
   ========================================================================== */
async function fetchReleaseNotes() {
    // Trigger animation & disable button
    refreshBtn.disabled = true;
    refreshIcon.classList.add('spinning');
    
    try {
        const response = await fetch('/api/release-notes');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            releaseNotesState.title = data.title;
            releaseNotesState.entries = data.entries;
            
            // Parse entries
            processEntries();
            
            // Set first entry as active if none is active
            if (releaseNotesState.parsedEntries.length > 0) {
                // Keep the active entry if it still exists, otherwise set to first
                const exists = releaseNotesState.parsedEntries.some(e => e.id === releaseNotesState.activeEntryId);
                if (!exists) {
                    releaseNotesState.activeEntryId = releaseNotesState.parsedEntries[0].id;
                }
            } else {
                releaseNotesState.activeEntryId = null;
            }
            
            // Update UI
            updateLastUpdatedTime();
            renderSidebar();
            renderDetails();
            showToast('Release notes updated successfully!');
        } else {
            throw new Error(data.message || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showToast(`Error: ${error.message}`, true);
        
        // Show empty placeholder in sidebar if nothing is loaded
        if (releaseNotesState.parsedEntries.length === 0) {
            dateListContainer.innerHTML = `
                <div class="loading-placeholder">
                    <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i>
                    <p>Failed to load release notes.<br>Please try again.</p>
                </div>
            `;
        }
    } finally {
        // Reset button state
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('spinning');
    }
}

function updateLastUpdatedTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    lastUpdatedSpan.textContent = `Updated at ${timeStr}`;
}

/* ==========================================================================
   Feed Processing & HTML Parsing
   ========================================================================== */
function processEntries() {
    releaseNotesState.parsedEntries = releaseNotesState.entries.map(entry => {
        const items = parseReleaseNotesHTML(entry.content);
        
        // Compute count of different update types for badging
        const counts = {
            feature: items.filter(i => i.type === 'feature').length,
            fix: items.filter(i => i.type === 'fix').length,
            deprecated: items.filter(i => i.type === 'deprecated').length,
            other: items.filter(i => i.type === 'other').length
        };
        
        return {
            ...entry,
            items: items,
            counts: counts
        };
    });
}

function parseReleaseNotesHTML(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const items = [];
    
    let currentSection = "";
    const children = Array.from(doc.body.children);
    
    if (children.length === 0) {
        if (doc.body.textContent.trim()) {
            const text = doc.body.textContent.trim();
            items.push({
                type: determineType(text),
                content: doc.body.innerHTML,
                plainText: text
            });
        }
        return items;
    }
    
    children.forEach(child => {
        const tagName = child.tagName.toLowerCase();
        
        if (/^h[1-6]$/.test(tagName)) {
            // Heading tags define a section context
            currentSection = child.textContent.replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
        } else if (tagName === 'ul' || tagName === 'ol') {
            const lis = child.querySelectorAll('li');
            lis.forEach(li => {
                const text = li.textContent.replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
                if (text) {
                    const prefix = currentSection ? `[${currentSection}] ` : "";
                    const fullHtml = prefix ? `<strong>${currentSection}</strong>: ${li.innerHTML}` : li.innerHTML;
                    
                    items.push({
                        type: determineType(text),
                        content: fullHtml,
                        plainText: prefix + text
                    });
                }
            });
        } else if (tagName === 'p') {
            const text = child.textContent.replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
            if (text) {
                // If it's a short text ending with a colon, treat it as a subhead section
                if (text.length < 60 && text.endsWith(':')) {
                    currentSection = text.slice(0, -1);
                } else {
                    const prefix = currentSection ? `[${currentSection}] ` : "";
                    const fullHtml = prefix ? `<strong>${currentSection}</strong>: ${child.innerHTML}` : child.innerHTML;
                    
                    items.push({
                        type: determineType(text),
                        content: fullHtml,
                        plainText: prefix + text
                    });
                }
            }
        }
    });
    
    // Fallback: If nothing was split out, treat the whole thing as one other update
    if (items.length === 0) {
        const text = doc.body.textContent.trim();
        if (text) {
            items.push({
                type: determineType(text),
                content: htmlContent,
                plainText: text
            });
        }
    }
    
    return items;
}

function determineType(text) {
    const lower = text.toLowerCase();
    if (lower.includes('feature') || lower.includes('support') || lower.includes('introduce') || lower.includes('new ')) {
        return 'feature';
    } else if (lower.includes('fix') || lower.includes('resolve') || lower.includes('bug') || lower.includes('correct') || lower.includes('error')) {
        return 'fix';
    } else if (lower.includes('deprecat') || lower.includes('remove') || lower.includes('decommission') || lower.includes('obsolete')) {
        return 'deprecated';
    }
    return 'other';
}

/* ==========================================================================
   UI Rendering - Sidebar (Date List)
   ========================================================================== */
function renderSidebar() {
    const query = releaseNotesState.searchQuery.toLowerCase();
    
    // Filter dates based on search query
    const filteredEntries = releaseNotesState.parsedEntries.filter(entry => {
        if (!query) return true;
        
        // Match entry title (date)
        if (entry.title.toLowerCase().includes(query)) return true;
        
        // Match any item text inside the entry
        return entry.items.some(item => item.plainText.toLowerCase().includes(query));
    });
    
    releaseCountSpan.textContent = `${filteredEntries.length} date${filteredEntries.length === 1 ? '' : 's'}`;
    
    if (filteredEntries.length === 0) {
        dateListContainer.innerHTML = `
            <div class="loading-placeholder">
                <i class="fa-solid fa-magnifying-glass" style="color: var(--text-muted);"></i>
                <p>No releases match your search query.</p>
            </div>
        `;
        return;
    }
    
    dateListContainer.innerHTML = '';
    
    filteredEntries.forEach(entry => {
        const isActive = entry.id === releaseNotesState.activeEntryId;
        
        const dateItem = document.createElement('div');
        dateItem.className = `date-item ${isActive ? 'active' : ''}`;
        dateItem.dataset.id = entry.id;
        
        // Mini badge indicators representing categories present in this day's updates
        let badgeIndicators = '';
        if (entry.counts.feature > 0) badgeIndicators += '<span class="mini-badge feature-badge" title="Features"></span>';
        if (entry.counts.fix > 0) badgeIndicators += '<span class="mini-badge fix-badge" title="Fixes"></span>';
        if (entry.counts.deprecated > 0) badgeIndicators += '<span class="mini-badge deprecated-badge" title="Deprecations"></span>';
        if (entry.counts.other > 0) badgeIndicators += '<span class="mini-badge other-badge" title="Other updates"></span>';
        
        const totalItems = entry.items.length;
        
        dateItem.innerHTML = `
            <div class="date-item-title">${entry.title}</div>
            <div class="date-item-meta">
                <span>${totalItems} item${totalItems === 1 ? '' : 's'}</span>
                <div class="date-badge-indicators">
                    ${badgeIndicators}
                </div>
            </div>
        `;
        
        dateItem.addEventListener('click', () => {
            // Select date
            document.querySelectorAll('.date-item').forEach(item => item.classList.remove('active'));
            dateItem.classList.add('active');
            
            releaseNotesState.activeEntryId = entry.id;
            renderDetails();
            
            // On mobile, scroll to details
            if (window.innerWidth <= 900) {
                document.querySelector('.details-panel').scrollIntoView({ behavior: 'smooth' });
            }
        });
        
        dateListContainer.appendChild(dateItem);
    });
}

/* ==========================================================================
   UI Rendering - Details Panel (Release Items)
   ========================================================================== */
function renderDetails() {
    const activeEntry = releaseNotesState.parsedEntries.find(e => e.id === releaseNotesState.activeEntryId);
    
    if (!activeEntry) {
        activeReleaseTitle.textContent = "Select a release date";
        activeReleaseLink.style.display = 'none';
        releaseItemsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-arrow-left arrow-indicator"></i>
                <p>Select a release date from the sidebar to view individual update items.</p>
            </div>
        `;
        return;
    }
    
    // Set Header
    activeReleaseTitle.textContent = activeEntry.title;
    if (activeEntry.link) {
        activeReleaseLink.href = activeEntry.link;
        activeReleaseLink.style.display = 'inline-flex';
    } else {
        activeReleaseLink.style.display = 'none';
    }
    
    // Filter items based on active category filter and search query
    const filter = releaseNotesState.currentFilter;
    const query = releaseNotesState.searchQuery.toLowerCase();
    
    const filteredItems = activeEntry.items.filter(item => {
        // Category Filter match
        if (filter !== 'all' && item.type !== filter) return false;
        
        // Search Query match
        if (query && !item.plainText.toLowerCase().includes(query)) return false;
        
        return true;
    });
    
    if (filteredItems.length === 0) {
        releaseItemsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-filter" style="font-size: 2rem; color: var(--text-muted);"></i>
                <p>No updates match your filters or search query for this date.</p>
            </div>
        `;
        return;
    }
    
    releaseItemsContainer.innerHTML = '';
    
    filteredItems.forEach((item, index) => {
        const card = document.createElement('article');
        card.className = `update-card card-${item.type}`;
        
        // Capitalize type tag
        const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
        
        card.innerHTML = `
            <div class="card-header-row">
                <span class="type-tag tag-${item.type}">${typeLabel}</span>
                <div class="card-actions">
                    <button class="action-icon-btn copy-btn" title="Copy to clipboard">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                    <button class="action-icon-btn tweet-btn" title="Tweet this update" data-index="${index}">
                        <i class="fa-brands fa-x-twitter"></i>
                    </button>
                </div>
            </div>
            <div class="update-description">
                ${item.content}
            </div>
        `;
        
        // Add Event Listener to Copy Button
        card.querySelector('.copy-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            copyToClipboard(item.plainText);
        });
        
        // Add Event Listener to Tweet Button
        card.querySelector('.tweet-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openTweetComposer(activeEntry.title, item.plainText, activeEntry.link);
        });
        
        releaseItemsContainer.appendChild(card);
    });
}

/* ==========================================================================
   Search & Filter Event Handlers
   ========================================================================== */
function handleSearch(e) {
    releaseNotesState.searchQuery = e.target.value;
    
    if (releaseNotesState.searchQuery) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    
    // Re-render both views
    renderSidebar();
    
    // If search active, adjust active selection to the first matching date if current one is filtered out
    const query = releaseNotesState.searchQuery.toLowerCase();
    const activeEntry = releaseNotesState.parsedEntries.find(e => e.id === releaseNotesState.activeEntryId);
    
    const isCurrentActiveValid = activeEntry && (
        activeEntry.title.toLowerCase().includes(query) || 
        activeEntry.items.some(item => item.plainText.toLowerCase().includes(query))
    );
    
    if (!isCurrentActiveValid) {
        const firstMatching = releaseNotesState.parsedEntries.find(entry => 
            entry.title.toLowerCase().includes(query) || 
            entry.items.some(item => item.plainText.toLowerCase().includes(query))
        );
        releaseNotesState.activeEntryId = firstMatching ? firstMatching.id : null;
    }
    
    renderDetails();
}

function clearSearch() {
    searchInput.value = '';
    releaseNotesState.searchQuery = '';
    clearSearchBtn.style.display = 'none';
    renderSidebar();
    renderDetails();
}

/* ==========================================================================
   Tweet Composition & Twitter Web Intent
   ========================================================================== */
function openTweetComposer(dateStr, plainText, link) {
    // Generate starter tweet text
    // E.g., BigQuery Update (June 11, 2026): [Snippet] #BigQuery #GoogleCloud
    const hashtag = " #BigQuery #GoogleCloud";
    const prefix = `BigQuery Update (${dateStr}): `;
    
    // Compute remaining characters for snippet
    // Limit is 280. Link is counted as 23 characters on X.
    const urlPlaceholder = link ? `\n\nRead more: ${link}` : "";
    const linkLength = link ? 23 + 12 : 0; // Twitter counts all URLs as 23 characters. Newlines count as characters.
    
    const availableSnippetLength = 280 - prefix.length - hashtag.length - linkLength;
    
    let snippet = plainText;
    if (snippet.length > availableSnippetLength) {
        snippet = snippet.substring(0, availableSnippetLength - 3) + "...";
    }
    
    const tweetText = `${prefix}${snippet}${urlPlaceholder}${hashtag}`;
    
    tweetTextarea.value = tweetText;
    updateTweetCharCount();
    
    // Show Modal
    tweetModal.classList.add('open');
    tweetTextarea.focus();
}

function hideTweetModal() {
    tweetModal.classList.remove('open');
}

function updateTweetCharCount() {
    const text = tweetTextarea.value;
    
    // Simple calculation: X handles URLs by replacing them with a 23-char t.co link
    // Let's do a simple count for display, with accurate replacement for URLs if possible
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urlMatches = text.match(urlRegex) || [];
    
    let calculatedLength = text.length;
    urlMatches.forEach(url => {
        calculatedLength = calculatedLength - url.length + 23;
    });
    
    charCountSpan.textContent = calculatedLength;
    
    // Style adjustments
    charCountSpan.className = '';
    if (calculatedLength > 280) {
        charCountSpan.classList.add('danger');
        tweetIntentBtn.disabled = true;
    } else if (calculatedLength > 250) {
        charCountSpan.classList.add('warning');
        tweetIntentBtn.disabled = false;
    } else {
        tweetIntentBtn.disabled = false;
    }
}

function triggerTweetIntent() {
    const text = tweetTextarea.value;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    
    window.open(tweetUrl, '_blank', 'width=550,height=420,toolbar=0,status=0');
    hideTweetModal();
    showToast('Redirecting to X (Twitter)...');
}

/* ==========================================================================
   Clipboard and Export Utilities
   ========================================================================== */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!');
    }).catch(err => {
        console.error('Could not copy text: ', err);
        showToast('Failed to copy to clipboard', true);
    });
}

function exportToCSV() {
    if (releaseNotesState.parsedEntries.length === 0) {
        showToast('No data available to export', true);
        return;
    }
    
    let csvRows = [];
    // Header row
    csvRows.push("Date,Category,Link,Update");
    
    releaseNotesState.parsedEntries.forEach(entry => {
        const date = entry.title.replace(/"/g, '""');
        const link = (entry.link || "").replace(/"/g, '""');
        
        entry.items.forEach(item => {
            const category = item.type.toUpperCase();
            let description = item.plainText;
            description = description.replace(/"/g, '""'); // Escape double quotes
            description = description.replace(/\r?\n|\r/g, ' '); // Remove newlines
            
            csvRows.push(`"${date}","${category}","${link}","${description}"`);
        });
    });
    
    const csvString = csvRows.join("\r\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    link.setAttribute("download", `bigquery_release_notes_${dateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV export completed!');
}

/* ==========================================================================
   Toast Notification System
   ========================================================================== */
let toastTimeout;
function showToast(message, isError = false) {
    clearTimeout(toastTimeout);
    
    toastMessage.textContent = message;
    toast.className = 'toast show';
    
    if (isError) {
        toast.classList.add('error');
    }
    
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}
