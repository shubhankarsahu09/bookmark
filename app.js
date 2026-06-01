// ==========================================================================
// Medulla // Safari-Style Personal Bookmark Manager - Core Script
// ==========================================================================

// --- State Definition ---
let state = {
    bookmarks: [],
    categories: [],
    activeFilter: 'all', // 'all', 'favorites', 'recent', or a categoryId
    activeView: 'grid',  // 'grid' or 'list'
    searchTerm: '',
    theme: 'dark'
};

// --- Custom Colors for Categories & Accents ---
const COLOR_PALETTE = [
    { hex: '#0071e3', name: 'Apple Blue' },
    { hex: '#34c759', name: 'Green' },
    { hex: '#ff9500', name: 'Orange' },
    { hex: '#ff3b30', name: 'Red' },
    { hex: '#af52de', name: 'Purple' },
    { hex: '#ff2d55', name: 'Pink' },
    { hex: '#5856d6', name: 'Indigo' },
    { hex: '#5ac8fa', name: 'Teal' },
    { hex: '#8e8e93', name: 'Gray' }
];

// --- Default Data Seeding ---
const SEED_CATEGORIES = [
    { id: 'cat-dev', name: 'Development', icon: '💻', color: '#0071e3' },
    { id: 'cat-resources', name: 'Resources', icon: '📚', color: '#34c759' },
    { id: 'cat-entertainment', name: 'Entertainment', icon: '🎬', color: '#ff9500' },
    { id: 'cat-design', name: 'Design', icon: '🎨', color: '#af52de' }
];

const SEED_BOOKMARKS = [];

// --- Initializing Application ---
function initApp() {
    // Gracefully migrate localStorage keys from ZenMark to Medulla
    const legacyKeys = ['bookmarks', 'categories', 'theme', 'view'];
    legacyKeys.forEach(k => {
        const oldVal = localStorage.getItem(`zenmark-${k}`);
        if (oldVal && !localStorage.getItem(`medulla-${k}`)) {
            localStorage.setItem(`medulla-${k}`, oldVal);
            localStorage.removeItem(`zenmark-${k}`);
        }
    });

    // 1. Sync Theme Preference
    const savedTheme = localStorage.getItem('medulla-theme') || 'dark';
    setTheme(savedTheme);

    // 2. Sync State Data
    const localCategories = localStorage.getItem('medulla-categories');
    const localBookmarks = localStorage.getItem('medulla-bookmarks');
    const localView = localStorage.getItem('medulla-view') || 'grid';

    if (localCategories && localBookmarks) {
        state.categories = JSON.parse(localCategories);
        state.bookmarks = JSON.parse(localBookmarks);
    } else {
        state.categories = [...SEED_CATEGORIES];
        state.bookmarks = [...SEED_BOOKMARKS];
        saveStateToStorage();
    }
    
    state.activeView = localView;
    updateViewBtnStates();

    // 3. Register Event Handlers
    registerEvents();

    // 4. Render Layout Elements
    renderColorPickerGrid();
    populateCategoryDropdown();
    render();
    
    showToast('Medulla ready.', 'info');
}

function saveStateToStorage() {
    localStorage.setItem('medulla-categories', JSON.stringify(state.categories));
    localStorage.setItem('medulla-bookmarks', JSON.stringify(state.bookmarks));
}

// --- Apple UI Theming ---
function setTheme(themeName) {
    state.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('medulla-theme', themeName);
    
    const themeIcon = document.getElementById('theme-icon');
    const floatIcon = document.getElementById('theme-float-icon');
    
    const iconClass = themeName === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    const iconColor = themeName === 'light' ? '#ff9500' : '';
    
    if (themeIcon) {
        themeIcon.className = iconClass;
        themeIcon.style.color = iconColor;
    }
    if (floatIcon) {
        floatIcon.className = iconClass;
        floatIcon.style.color = iconColor;
    }
}

function toggleTheme() {
    setTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// --- Render Engine ---
function render() {
    renderCategoriesSidebar();
    updateLibraryNav();
    renderBookmarks();
    updateSidebarStats();
}

// Renders macOS-style Left Sidebar Category links
function renderCategoriesSidebar() {
    const listContainer = document.getElementById('categories-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    state.categories.forEach(cat => {
        const isActive = state.activeFilter === cat.id;
        const count = state.bookmarks.filter(b => b.categoryId === cat.id).length;
        const li = document.createElement('li');
        
        li.innerHTML = `
            <a class="nav-link ${isActive ? 'active' : ''}" data-filter="${cat.id}">
                <span class="nav-item-inner">
                    <span class="category-pill-dots" style="background-color: ${cat.color};"></span>
                    <span>${cat.icon} ${cat.name}</span>
                </span>
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <span class="nav-count">${count}</span>
                    <div class="category-actions-group">
                        <button class="category-actions-btn" title="Edit Category" data-edit-cat="${cat.id}">
                            <i class="fa-solid fa-gear"></i>
                        </button>
                        <button class="category-delete-btn" title="Delete Category" data-delete-cat="${cat.id}">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            </a>
        `;
        
        // Bind Edit Click
        const btnEdit = li.querySelector('.category-actions-btn');
        if (btnEdit) {
            btnEdit.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                openCategoryModal(cat.id);
            });
        }

        // Bind Delete Click
        const btnDelete = li.querySelector('.category-delete-btn');
        if (btnDelete) {
            btnDelete.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                deleteCategory(cat.id);
            });
        }
        
        listContainer.appendChild(li);
    });
}

// Syncs Library section filters active states and bookmark counts
function updateLibraryNav() {
    const filters = ['all', 'favorites', 'recent'];
    filters.forEach(f => {
        const el = document.getElementById(`nav-${f}`);
        if (el) {
            if (state.activeFilter === f) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
            
            let count = 0;
            if (f === 'all') {
                count = state.bookmarks.length;
            } else if (f === 'favorites') {
                count = state.bookmarks.filter(b => b.starred).length;
            } else if (f === 'recent') {
                const twentyFourHrsAgo = Date.now() - 24 * 60 * 60 * 1000;
                count = state.bookmarks.filter(b => b.dateAdded >= twentyFourHrsAgo).length;
            }
            
            let countBadge = el.querySelector('.nav-count');
            if (!countBadge) {
                countBadge = document.createElement('span');
                countBadge.className = 'nav-count';
                el.appendChild(countBadge);
            }
            countBadge.textContent = count;
        }
    });
}

// Dynamically updates sidebar statistics overview numbers
function updateSidebarStats() {
    const totalEl = document.getElementById('stat-total');
    const starredEl = document.getElementById('stat-starred');
    if (totalEl) totalEl.textContent = state.bookmarks.length;
    if (starredEl) starredEl.textContent = state.bookmarks.filter(b => b.starred).length;
}

// Renders Safari-style minimalist squares
function renderBookmarks() {
    const container = document.getElementById('bookmarks-container');
    if (!container) return;
    container.innerHTML = '';

    if (state.activeView === 'list') {
        container.classList.add('list-layout');
    } else {
        container.classList.remove('list-layout');
    }

    // Step 1: Filter State Data by category
    let filtered = [...state.bookmarks];

    if (state.activeFilter === 'favorites') {
        filtered = filtered.filter(b => b.starred);
    } else if (state.activeFilter === 'recent') {
        const twentyFourHrsAgo = Date.now() - 24 * 60 * 60 * 1000;
        filtered = filtered.filter(b => b.dateAdded >= twentyFourHrsAgo);
    } else if (state.activeFilter !== 'all') {
        const selectedCat = state.categories.find(c => c.id === state.activeFilter);
        if (selectedCat) {
            filtered = filtered.filter(b => b.categoryId === selectedCat.id);
        } else {
            state.activeFilter = 'all';
            render();
        }
    }

    // Step 2: Filter by search query
    if (state.searchTerm.trim() !== '') {
        const query = state.searchTerm.toLowerCase().trim();
        filtered = filtered.filter(b => {
            const matchTitle = b.title.toLowerCase().includes(query);
            const matchUrl = b.url.toLowerCase().includes(query);
            return matchTitle || matchUrl;
        });
    }

    filtered.sort((a, b) => b.dateAdded - a.dateAdded);

    // Step 3: Render Bookmarks Grid
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-regular fa-folder-open"></i></div>
                <h4 class="empty-state-title">No Bookmarks</h4>
                <p class="empty-state-desc">Create custom links or import a list to populate your dashboard.</p>
                <button class="btn-primary" style="height:32px; margin-top:0.35rem;" id="btn-empty-add">
                    <i class="fa-solid fa-plus"></i> Add Link
                </button>
            </div>
        `;
        document.getElementById('btn-empty-add').addEventListener('click', () => openBookmarkModal());
        return;
    }

    filtered.forEach(bm => {
        const cat = state.categories.find(c => c.id === bm.categoryId);
        const catColor = cat ? cat.color : '#8e8e93';

        let domain = '';
        try {
            domain = new URL(bm.url).hostname;
        } catch (e) {
            domain = bm.url;
        }

        const card = document.createElement('div');
        card.className = 'bookmark-card';
        card.setAttribute('data-id', bm.id);
        
        const firstLetter = bm.title ? bm.title.charAt(0) : 'W';

        card.innerHTML = `
            <!-- Website Logo Centered (completely transparent and un-obscured) -->
            <div class="site-favicon-container">
                <img class="site-favicon" 
                     src="https://www.google.com/s2/favicons?sz=64&domain=${domain}" 
                     alt="" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="site-letter-avatar" style="background: ${catColor}; display: none;">
                    ${firstLetter}
                </div>
            </div>
            
            <!-- Centered Site Title -->
            <span class="site-title" title="${bm.title}">${bm.title}</span>
            
            <!-- Bottom Category Color Accent Strip -->
            <div class="category-indicator-strip" style="background-color: ${catColor};"></div>
            
            <!-- Corner Floating Overlays (visible on tile hover) -->
            <div class="card-actions">
                <button class="action-btn-small btn-favorite-small ${bm.starred ? 'starred' : ''}" title="Favorite">
                    <i class="fa-${bm.starred ? 'solid' : 'regular'} fa-star"></i>
                </button>
                <button class="action-btn-small btn-delete-small" title="Delete">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <button class="action-btn-small btn-edit-small" title="Edit">
                    <i class="fa-solid fa-pencil"></i>
                </button>
            </div>
        `;

        // Card Click Trigger
        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-actions')) return;
            window.open(bm.url, '_blank', 'noopener,noreferrer');
        });

        // Small Action Buttons Clicks
        const btnFav = card.querySelector('.btn-favorite-small');
        btnFav.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleBookmarkStar(bm.id);
        });

        const btnEdit = card.querySelector('.btn-edit-small');
        btnEdit.addEventListener('click', (e) => {
            e.stopPropagation();
            openBookmarkModal(bm.id);
        });

        const btnDelete = card.querySelector('.btn-delete-small');
        btnDelete.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteBookmark(bm.id);
        });

        container.appendChild(card);
    });
}

function updateViewBtnStates() {
    const viewGrid = document.getElementById('view-grid');
    const viewList = document.getElementById('view-list');
    if (!viewGrid || !viewList) return;

    if (state.activeView === 'list') {
        viewList.classList.add('active');
        viewGrid.classList.remove('active');
    } else {
        viewGrid.classList.add('active');
        viewList.classList.remove('active');
    }
}

function populateCategoryDropdown() {
    const dropdown = document.getElementById('bookmark-category');
    if (!dropdown) return;
    dropdown.innerHTML = '';
    
    state.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = `${cat.icon} ${cat.name}`;
        dropdown.appendChild(option);
    });
}

function renderColorPickerGrid() {
    const grid = document.getElementById('category-color-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    COLOR_PALETTE.forEach((color, idx) => {
        const div = document.createElement('div');
        div.className = `color-option ${idx === 0 ? 'selected' : ''}`;
        div.style.backgroundColor = color.hex;
        div.setAttribute('data-color', color.hex);
        
        div.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            document.getElementById('category-color').value = color.hex;
        });
        
        grid.appendChild(div);
    });
}

// --- CRUD Actions ---
function toggleBookmarkStar(id) {
    const idx = state.bookmarks.findIndex(b => b.id === id);
    if (idx !== -1) {
        state.bookmarks[idx].starred = !state.bookmarks[idx].starred;
        saveStateToStorage();
        render();
        showToast(
            state.bookmarks[idx].starred ? 'Added to Favorites.' : 'Removed from Favorites.',
            'info'
        );
    }
}

function deleteBookmark(id) {
    const bm = state.bookmarks.find(b => b.id === id);
    if (!bm) return;
    
    if (confirm(`Delete "${bm.title}"?`)) {
        state.bookmarks = state.bookmarks.filter(b => b.id !== id);
        saveStateToStorage();
        render();
        showToast('Link removed.', 'success');
    }
}

function openBookmarkModal(id = null) {
    const form = document.getElementById('form-bookmark');
    form.reset();
    
    const modalTitle = document.getElementById('bookmark-modal-title');
    const inputId = document.getElementById('bookmark-id');
    const inputStar = document.getElementById('bookmark-favorite');
    
    populateCategoryDropdown();

    if (id) {
        const bm = state.bookmarks.find(b => b.id === id);
        if (!bm) return;
        
        modalTitle.textContent = 'Edit Link';
        inputId.value = bm.id;
        document.getElementById('bookmark-url').value = bm.url;
        document.getElementById('bookmark-title').value = bm.title;
        document.getElementById('bookmark-category').value = bm.categoryId;
        inputStar.checked = bm.starred;
    } else {
        modalTitle.textContent = 'Add Bookmark';
        inputId.value = '';
        inputStar.checked = false;
        
        if (state.activeFilter !== 'all' && state.activeFilter !== 'favorites' && state.activeFilter !== 'recent') {
            document.getElementById('bookmark-category').value = state.activeFilter;
        }
    }
    
    openModal('modal-bookmark');
    setTimeout(() => document.getElementById('bookmark-url').focus(), 150);
}

function handleBookmarkSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('bookmark-id').value;
    const url = document.getElementById('bookmark-url').value.trim();
    const title = document.getElementById('bookmark-title').value.trim();
    const categoryId = document.getElementById('bookmark-category').value;
    const starred = document.getElementById('bookmark-favorite').checked;
    
    if (id) {
        const idx = state.bookmarks.findIndex(b => b.id === id);
        if (idx !== -1) {
            state.bookmarks[idx] = {
                ...state.bookmarks[idx],
                title,
                url,
                categoryId,
                starred
            };
            showToast('Link updated.', 'success');
        }
    } else {
        const newBm = {
            id: 'bm-' + Date.now(),
            title,
            url,
            categoryId,
            tags: [],
            notes: '',
            starred,
            dateAdded: Date.now()
        };
        state.bookmarks.push(newBm);
        showToast('Link saved.', 'success');
    }
    
    saveStateToStorage();
    closeModal('modal-bookmark');
    render();
}

function openCategoryModal(id = null) {
    const form = document.getElementById('form-category');
    form.reset();
    
    const modalTitle = document.getElementById('category-modal-title');
    const inputId = document.getElementById('category-id');
    const deleteBtn = document.getElementById('btn-delete-category');
    
    if (id) {
        const cat = state.categories.find(c => c.id === id);
        if (!cat) return;
        
        modalTitle.textContent = 'Edit Category';
        inputId.value = cat.id;
        document.getElementById('category-name').value = cat.name;
        document.getElementById('category-icon').value = cat.icon;
        document.getElementById('category-color').value = cat.color;
        
        document.querySelectorAll('.color-option').forEach(el => {
            if (el.getAttribute('data-color') === cat.color) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
        
        // Show prominent delete category button
        if (deleteBtn) {
            deleteBtn.style.display = 'inline-block';
            
            // Rebuild click handler to avoid duplicate triggers
            const newDeleteBtn = deleteBtn.cloneNode(true);
            deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
            newDeleteBtn.addEventListener('click', () => deleteCategory(cat.id));
        }
    } else {
        modalTitle.textContent = 'New Category';
        inputId.value = '';
        document.getElementById('category-color').value = COLOR_PALETTE[0].hex;
        document.querySelectorAll('.color-option').forEach((el, idx) => {
            if (idx === 0) el.classList.add('selected');
            else el.classList.remove('selected');
        });
        
        if (deleteBtn) deleteBtn.style.display = 'none';
    }
    
    openModal('modal-category');
    setTimeout(() => document.getElementById('category-name').focus(), 150);
}

function handleCategorySubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('category-id').value;
    const name = document.getElementById('category-name').value.trim();
    const icon = document.getElementById('category-icon').value.trim() || '📂';
    const color = document.getElementById('category-color').value;
    
    if (id) {
        const idx = state.categories.findIndex(c => c.id === id);
        if (idx !== -1) {
            state.categories[idx] = {
                ...state.categories[idx],
                name,
                icon,
                color
            };
            showToast('Category updated.', 'success');
        }
    } else {
        const newCat = {
            id: 'cat-' + Date.now(),
            name,
            icon,
            color
        };
        state.categories.push(newCat);
        showToast('Category created.', 'success');
    }
    
    saveStateToStorage();
    closeModal('modal-category');
    populateCategoryDropdown();
    render();
}

function deleteCategory(id) {
    const cat = state.categories.find(c => c.id === id);
    if (!cat) return;
    
    const linkedBms = state.bookmarks.filter(b => b.categoryId === id);
    let confirmMsg = `Delete category "${cat.name}"?`;
    if (linkedBms.length > 0) {
        confirmMsg = `Delete category "${cat.name}"? This contains ${linkedBms.length} bookmarks. Deleting will move them to uncategorized.`;
    }
    
    if (confirm(confirmMsg)) {
        let fallbackCat = state.categories.find(c => c.id !== id);
        if (!fallbackCat) {
            fallbackCat = { id: 'cat-general', name: 'General', icon: '🔗', color: '#8e8e93' };
            state.categories.push(fallbackCat);
        }
        
        state.bookmarks.forEach(bm => {
            if (bm.categoryId === id) bm.categoryId = fallbackCat.id;
        });
        
        state.categories = state.categories.filter(c => c.id !== id);
        if (state.activeFilter === id) state.activeFilter = 'all';
        
        saveStateToStorage();
        closeModal('modal-category');
        populateCategoryDropdown();
        render();
        showToast('Category removed.', 'success');
    }
}

// --- Import & Export Actions ---
function exportStateJSON() {
    const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        categories: state.categories,
        bookmarks: state.bookmarks
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medulla_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('JSON Export successful.', 'success');
}

function handleJSONImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if (data.bookmarks && data.categories) {
                if (confirm('Merge backing files with current library?')) {
                    data.categories.forEach(newCat => {
                        if (!state.categories.some(c => c.id === newCat.id)) {
                            state.categories.push(newCat);
                        }
                    });
                    
                    let added = 0;
                    data.bookmarks.forEach(newBm => {
                        if (!state.bookmarks.some(b => b.url === newBm.url)) {
                            newBm.id = 'bm-imp-' + Date.now() + '-' + Math.floor(Math.random()*1000);
                            state.bookmarks.push(newBm);
                            added++;
                        }
                    });
                    
                    saveStateToStorage();
                    populateCategoryDropdown();
                    render();
                    showToast(`Import completed. Added ${added} links.`, 'success');
                }
            } else {
                showToast('Format mismatch.', 'error');
            }
        } catch (err) {
            showToast('Parsing error.', 'error');
        }
        e.target.value = '';
    };
    reader.readAsText(file);
}

function handleHTMLBookmarkImport(htmlString) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const links = doc.querySelectorAll('a');
        
        if (links.length === 0) {
            showToast('No links found.', 'error');
            return;
        }

        let importedCount = 0;
        let createdCatsCount = 0;

        links.forEach(link => {
            const url = link.getAttribute('href');
            const title = link.textContent.trim();
            if (!url || !title || url.startsWith('placeholder:') || url.startsWith('javascript:')) return;

            let folderName = 'Imported Links';
            let current = link;
            
            while (current && current !== doc.body) {
                const parent = current.parentElement;
                if (parent && parent.tagName === 'DL') {
                    const sibling = parent.previousElementSibling;
                    if (sibling && (sibling.tagName === 'H3' || sibling.tagName === 'H2')) {
                        folderName = sibling.textContent.trim();
                        break;
                    }
                }
                current = parent;
            }

            if (folderName === 'Bookmarks Bar' || folderName === 'Other Bookmarks') {
                folderName = 'Browser Imports';
            }

            let cat = state.categories.find(c => c.name.toLowerCase() === folderName.toLowerCase());
            if (!cat) {
                const colors = COLOR_PALETTE.map(c => c.hex);
                const randomColor = colors[state.categories.length % colors.length];
                
                cat = {
                    id: 'cat-imp-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                    name: folderName,
                    icon: '📁',
                    color: randomColor
                };
                state.categories.push(cat);
                createdCatsCount++;
            }

            if (!state.bookmarks.some(b => b.url.toLowerCase() === url.toLowerCase())) {
                const newBm = {
                    id: 'bm-imp-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
                    title: title,
                    url: url,
                    categoryId: cat.id,
                    tags: [],
                    notes: '',
                    starred: false,
                    dateAdded: Date.now()
                };
                state.bookmarks.push(newBm);
                importedCount++;
            }
        });

        if (importedCount > 0) {
            saveStateToStorage();
            populateCategoryDropdown();
            render();
            closeModal('modal-import-html');
            showToast(`Imported ${importedCount} links successfully!`, 'success');
        } else {
            showToast('All links already exist.', 'info');
            closeModal('modal-import-html');
        }
    } catch (err) {
        showToast('Parsing failure.', 'error');
    }
}

// --- Modal Helper Functions ---
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
}

// --- Toast Alerts ---
function showToast(message, type = 'info') {
    const wrapper = document.getElementById('toast-wrapper');
    if (!wrapper) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <div class="toast-message">${message}</div>
    `;

    wrapper.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toast-slide-in 0.25s ease reverse forwards';
        setTimeout(() => toast.remove(), 250);
    }, 3000);
}

// --- Event Registrations ---
function registerEvents() {
    
    // 1. Sidebar Navigation Link Clicks (Delegated)
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.addEventListener('click', (e) => {
            const link = e.target.closest('.nav-link');
            
            // If clicking gear or trash inside custom category, ignore link select
            if (e.target.closest('.category-actions-btn') || e.target.closest('.category-delete-btn')) {
                return;
            }
            
            if (link) {
                e.preventDefault();
                const filterValue = link.getAttribute('data-filter');
                if (filterValue) {
                    state.activeFilter = filterValue;
                    
                    // On mobile, dismiss sidebar on navigation select
                    const sidebarEl = document.getElementById('sidebar');
                    const backdrop = document.getElementById('sidebar-backdrop');
                    if (sidebarEl) sidebarEl.classList.remove('open');
                    if (backdrop) backdrop.classList.remove('active');
                    
                    render();
                }
            }
        });
    }

    // Inline Create Category inside Sidebar click
    const btnAddCategorySidebar = document.getElementById('btn-add-category-sidebar');
    if (btnAddCategorySidebar) {
        btnAddCategorySidebar.addEventListener('click', (e) => {
            e.preventDefault();
            openCategoryModal();
        });
    }

    // Mobile Sidebar Drawer Hamburger toggles
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebarEl = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    
    if (mobileMenuToggle && sidebarEl) {
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebarEl.classList.toggle('open');
            if (backdrop) backdrop.classList.toggle('active');
        });
    }
    
    if (backdrop) {
        backdrop.addEventListener('click', () => {
            if (sidebarEl) sidebarEl.classList.remove('open');
            backdrop.classList.remove('active');
        });
    }

    // 2. Modals toggling
    document.getElementById('btn-add-bookmark').addEventListener('click', () => openBookmarkModal());
    
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-close');
            closeModal(modalId);
        });
    });

    // Submit forms
    document.getElementById('form-bookmark').addEventListener('submit', handleBookmarkSubmit);
    document.getElementById('form-category').addEventListener('submit', handleCategorySubmit);

    // 3. View mode toggles (guarded for safety)
    const viewGrid = document.getElementById('view-grid');
    if (viewGrid) {
        viewGrid.addEventListener('click', () => {
            state.activeView = 'grid';
            localStorage.setItem('medulla-view', 'grid');
            updateViewBtnStates();
            renderBookmarks();
        });
    }
    
    const viewList = document.getElementById('view-list');
    if (viewList) {
        viewList.addEventListener('click', () => {
            state.activeView = 'list';
            localStorage.setItem('medulla-view', 'list');
            updateViewBtnStates();
            renderBookmarks();
        });
    }

    // 4. Search text entry
    const searchBar = document.getElementById('search-bar');
    searchBar.addEventListener('input', (e) => {
        state.searchTerm = e.target.value;
        renderBookmarks();
    });

    // 5. Settings popover
    const btnSettings = document.getElementById('settings-toggle');
    const dropdownSettings = document.getElementById('settings-dropdown');
    
    btnSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownSettings.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        if (dropdownSettings) dropdownSettings.classList.remove('show');
    });

    // 6. Backup operations
    document.getElementById('btn-export-json').addEventListener('click', () => {
        exportStateJSON();
    });

    const jsonFileInput = document.getElementById('json-file-input');
    document.getElementById('btn-trigger-import-json').addEventListener('click', () => {
        jsonFileInput.click();
    });
    jsonFileInput.addEventListener('change', handleJSONImport);

    // HTML dragging and click imports
    document.getElementById('btn-trigger-import-html').addEventListener('click', () => {
        openModal('modal-import-html');
    });

    const dropZone = document.getElementById('html-drop-zone');
    const fileInputHtml = document.getElementById('html-file-input');

    dropZone.addEventListener('click', () => {
        fileInputHtml.click();
    });

    fileInputHtml.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => handleHTMLBookmarkImport(evt.target.result);
            reader.readAsText(file);
        }
        e.target.value = '';
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.html') || file.name.endsWith('.htm'))) {
            const reader = new FileReader();
            reader.onload = (evt) => handleHTMLBookmarkImport(evt.target.result);
            reader.readAsText(file);
        } else {
            showToast('Invalid file format.', 'error');
        }
    });

    // 7. Brand clicks (Home trigger - clear search)
    document.getElementById('brand-home').addEventListener('click', () => {
        state.searchTerm = '';
        state.activeFilter = 'all';
        document.getElementById('search-bar').value = '';
        render();
    });

    // 8. Clear all data
    document.getElementById('btn-clear-all').addEventListener('click', () => {
        if (confirm('Permanently wipe ALL categories and bookmarks? This action CANNOT be undone.')) {
            localStorage.removeItem('medulla-bookmarks');
            localStorage.removeItem('medulla-categories');
            state.bookmarks = [];
            state.categories = [];
            saveStateToStorage();
            populateCategoryDropdown();
            render();
            showToast('All library data cleared.', 'error');
        }
    });

    // 9. Theme toggler click (guarded for safety)
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    const btnFloatToggle = document.getElementById('theme-float-toggle');
    if (btnFloatToggle) {
        btnFloatToggle.addEventListener('click', toggleTheme);
    }
}

// --- Bootstrap ---
document.addEventListener('DOMContentLoaded', initApp);
