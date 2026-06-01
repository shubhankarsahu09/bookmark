# 🌌 Medulla

Medulla is a **premium, ultra-minimalist, and lightweight personal Bookmark Manager** inspired directly by **Safari's elegant Start Page**. It features a spacious layout with a dynamic left sidebar listing all your categories, library filters, real-time counters, and backups, paired with a distraction-free portals canvas.

---

## ✨ Features & Visual Highlights

- **Safari Start Page Left Sidebar**: An elegant sidebar navigation workspace (`width: 260px`) featuring macOS-style active indicators, HSL category dots, and clean typographic listings.
- **Dynamic Link Counts**: Dynamic badge counters embedded directly in list links (e.g. `All (5)`, `Favorites (2)`, `Development (1)`) indicating exactly how many bookmarks reside inside.
- **Favicon-Centric Grid**: Bookmarks are rendered as a clean grid of rounded icons, displaying only a large centered favicon and the site title underneath.
- **Quiet Actions on Hover**: Action buttons (edit, delete/bin) are completely invisible by default, only fading in as tiny circular overlays on card hover.
- **Snappy Theme Toggling**: Swaps instantly between default **Pro Dark** mode and a clean **System Light** mode.
- **Portability Ingestions**:
  - **Export JSON**: Save all bookmarks and category data as a single backup file.
  - **Import JSON**: Restore a backup and merge items cleanly.
  - **Chrome HTML Importer**: Drag and drop your browser bookmarks bar to automatically build matching category pills!

---

## 🚀 Quick Start Guide

### 1. Launch the App
Open the directory and double-click **`index.html`** to load your dashboard instantly in any browser. There are no server steps or Node configurations required.

### 2. Add Links
- Click the **"Add Link"** button on the top right.
- Input the URL and Name, assign a Category from the dropdown, and hit save!

### 3. Sync Browser Bookmarks
1. In Chrome/Brave/Firefox, export bookmarks as an HTML file.
2. Inside Medulla, click the **Settings & backups** button inside the sidebar footer, select **"Import Chrome HTML"**, and drop the file. Medulla will parse the directory tree and compile matching category folders dynamically!
