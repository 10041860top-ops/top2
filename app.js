/**
 * Awesome Nano Banana Images Web Showcase - Core Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let casesData = [];
  let currentModelFilter = 'all';
  let currentTagFilter = 'all';
  let currentSearchQuery = '';
  let currentSortBy = 'default';
  let favorites = JSON.parse(localStorage.getItem('nano_banana_favs') || '[]');

  // DOM Elements
  const galleryGrid = document.getElementById('galleryGrid');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const resultsCount = document.getElementById('resultsCount');
  const favCountSpan = document.getElementById('favCount');
  const sortSelect = document.getElementById('sortSelect');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalBody = document.getElementById('modalBody');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const themeToggleBtn = document.getElementById('themeToggle');

  // Stats Spans
  const statTotal = document.getElementById('statTotal');
  const statPro = document.getElementById('statPro');
  const statStandard = document.getElementById('statStandard');

  // Initialize Application
  init();

  async function init() {
    loadThemePreference();
    setupEventListeners();
    updateFavCountUI();

    try {
      const response = await fetch('cases_data.json');
      if (!response.ok) throw new Error('Failed to load cases data');
      casesData = await response.json();
      
      // Update statistics
      statTotal.textContent = casesData.length;
      statPro.textContent = casesData.filter(c => c.is_pro).length;
      statStandard.textContent = casesData.filter(c => !c.is_pro).length;

      renderGallery();
    } catch (err) {
      console.error(err);
      galleryGrid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i> 載入資料失敗：${err.message}</div>`;
    }
  }

  // Theme Management
  function loadThemePreference() {
    const savedTheme = localStorage.getItem('nano_banana_theme') || 'dark';
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
  }

  function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('nano_banana_theme', 'light');
      themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.setItem('nano_banana_theme', 'dark');
      themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
  }

  // Event Listeners Setup
  function setupEventListeners() {
    // Theme toggle
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Search input
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.trim().toLowerCase();
      clearSearchBtn.style.display = currentSearchQuery ? 'block' : 'none';
      renderGallery();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      currentSearchQuery = '';
      clearSearchBtn.style.display = 'none';
      renderGallery();
    });

    // Model Tab Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        const targetBtn = e.currentTarget;
        targetBtn.classList.add('active');
        currentModelFilter = targetBtn.dataset.model;
        renderGallery();
      });
    });

    // Tag Filter Chips
    document.querySelectorAll('.tag-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
        const targetChip = e.currentTarget;
        targetChip.classList.add('active');
        currentTagFilter = targetChip.dataset.tag;
        renderGallery();
      });
    });

    // Sort Select
    sortSelect.addEventListener('change', (e) => {
      currentSortBy = e.target.value;
      renderGallery();
    });

    // Reset Filters
    resetFiltersBtn.addEventListener('click', () => {
      currentSearchQuery = '';
      currentModelFilter = 'all';
      currentTagFilter = 'all';
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';

      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.tab-btn[data-model="all"]').classList.add('active');

      document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
      document.querySelector('.tag-chip[data-tag="all"]').classList.add('active');

      renderGallery();
    });

    // Modal Close
    modalCloseBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalOverlay.style.display !== 'none') {
        closeModal();
      }
    });
  }

  // Filter & Sort Logic
  function getFilteredCases() {
    return casesData.filter(item => {
      // Model Filter
      if (currentModelFilter === 'pro' && !item.is_pro) return false;
      if (currentModelFilter === 'std' && item.is_pro) return false;
      if (currentModelFilter === 'fav' && !favorites.includes(item.id)) return false;

      // Tag Filter
      if (currentTagFilter !== 'all' && (!item.tags || !item.tags.includes(currentTagFilter))) {
        return false;
      }

      // Search Query
      if (currentSearchQuery) {
        const textToSearch = `${item.title} ${item.prompt} ${item.author} 例${item.case_num} ${item.tags.join(' ')}`.toLowerCase();
        if (!textToSearch.includes(currentSearchQuery)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (currentSortBy === 'num-asc') return a.case_num - b.case_num;
      if (currentSortBy === 'num-desc') return b.case_num - a.case_num;
      if (currentSortBy === 'title') return a.title.localeCompare(b.title, 'zh-TW');
      return 0; // Default order
    });
  }

  // Render Gallery Grid
  function renderGallery() {
    const cases = getFilteredCases();
    resultsCount.textContent = `顯示 ${cases.length} 個案例`;

    if (cases.length === 0) {
      galleryGrid.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    galleryGrid.style.display = 'grid';

    galleryGrid.innerHTML = cases.map(item => {
      const isFav = favorites.includes(item.id);
      const outputImgSrc = item.output_image || 'images/logo.jpg';
      const promptSnippet = item.prompt ? escapeHtml(item.prompt.substring(0, 140)) + (item.prompt.length > 140 ? '...' : '') : '無提示詞內容';

      return `
        <article class="case-card" data-id="${item.id}">
          <div class="card-top">
            <div class="card-badge-group">
              <span class="model-badge ${item.is_pro ? 'pro' : 'std'}">
                ${item.is_pro ? 'Pro 模型' : 'Nano Banana'}
              </span>
              <span class="case-number">例 ${item.case_num}</span>
            </div>
            <button class="fav-btn ${isFav ? 'active' : ''}" data-id="${item.id}" title="${isFav ? '取消收藏' : '加入收藏'}">
              <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
            </button>
          </div>

          <div class="card-media" onclick="openModal('${item.id}')">
            <img src="${outputImgSrc}" alt="${escapeHtml(item.title)}" class="card-img" loading="lazy" onerror="this.src='images/logo.jpg'">
            ${item.input_image ? '<span class="img-badge-overlay"><i class="fa-solid fa-clone"></i> 包含參考輸入圖</span>' : ''}
            <div class="view-overlay-hint">
              <i class="fa-solid fa-magnifying-glass-plus"></i> 查看詳情與 Prompt
            </div>
          </div>

          <div class="card-content">
            <h3 class="card-title" onclick="openModal('${item.id}')">${escapeHtml(item.title)}</h3>
            
            ${item.author ? `
              <a href="${item.author_url || '#'}" target="_blank" rel="noopener" class="author-link">
                <i class="fa-brands fa-x-twitter"></i> @${escapeHtml(item.author)}
              </a>
            ` : ''}

            <div class="prompt-snippet-box">
              ${promptSnippet}
            </div>

            <div class="card-actions">
              <button class="btn primary-btn" onclick="copyPromptDirect('${item.id}')">
                <i class="fa-regular fa-copy"></i> 複製 Prompt
              </button>
              <button class="btn secondary-btn" onclick="openModal('${item.id}')">
                <i class="fa-solid fa-sliders"></i> 自訂參數
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach Favorite button listeners
    document.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        toggleFavorite(id);
      });
    });
  }

  // Favorite Toggle Logic
  function toggleFavorite(id) {
    if (favorites.includes(id)) {
      favorites = favorites.filter(favId => favId !== id);
      showToast('已從我的收藏移除', 'info');
    } else {
      favorites.push(id);
      showToast('已加入我的收藏！', 'success');
    }
    localStorage.setItem('nano_banana_favs', JSON.stringify(favorites));
    updateFavCountUI();
    renderGallery();
  }

  function updateFavCountUI() {
    if (favCountSpan) {
      favCountSpan.textContent = `(${favorites.length})`;
    }
  }

  // Copy Prompt Directly
  window.copyPromptDirect = function(id) {
    const item = casesData.find(c => c.id === id);
    if (!item || !item.prompt) {
      showToast('無提示詞可複製', 'warning');
      return;
    }
    navigator.clipboard.writeText(item.prompt).then(() => {
      showToast('Prompt 已成功複製到剪貼簿！', 'success');
    }).catch(() => {
      showToast('複製失敗，請手動複製', 'error');
    });
  };

  // Modal Open & Parameter Customizer
  window.openModal = function(id) {
    const item = casesData.find(c => c.id === id);
    if (!item) return;

    const isFav = favorites.includes(item.id);
    const hasInputImg = !!item.input_image;

    // Detect placeholders in prompt: e.g., {角色名字}, {称号}, [阿童木], [标题], etc.
    const placeHolders = extractPlaceholders(item.prompt);

    let html = `
      <div class="modal-header-row">
        <div>
          <span class="model-badge ${item.is_pro ? 'pro' : 'std'}" style="margin-bottom: 8px; display: inline-block;">
            ${item.is_pro ? 'Nano Banana Pro 例 ' + item.case_num : 'Nano Banana 例 ' + item.case_num}
          </span>
          <h2 class="modal-title">${escapeHtml(item.title)}</h2>
          ${item.author ? `
            <a href="${item.author_url}" target="_blank" class="author-link" style="margin-top: 6px; font-size: 0.95rem;">
              <i class="fa-brands fa-x-twitter"></i> 作者：@${escapeHtml(item.author)}
            </a>
          ` : ''}
        </div>
      </div>

      <!-- Image Comparison Container -->
      <div class="modal-images-container">
        ${hasInputImg ? `
          <div class="img-box-wrapper">
            <span class="img-box-title"><i class="fa-solid fa-file-import"></i> 輸入 / 參考圖片 (Input)</span>
            <img src="${item.input_image}" alt="Input" class="modal-img" onerror="this.src='images/logo.jpg'">
          </div>
        ` : ''}
        
        <div class="img-box-wrapper">
          <span class="img-box-title"><i class="fa-solid fa-wand-magic-sparkles"></i> 最終生成成果 (Output)</span>
          <img src="${item.output_image || 'images/logo.jpg'}" alt="Output" class="modal-img" onerror="this.src='images/logo.jpg'">
        </div>
      </div>

      ${item.note ? `
        <div class="hero-badge" style="background: rgba(112, 161, 255, 0.12); color: var(--accent-blue); border-color: rgba(112, 161, 255, 0.3);">
          <i class="fa-solid fa-circle-info"></i> 備註提示：${escapeHtml(item.note)}
        </div>
      ` : ''}

      <!-- Interactive Prompt Section -->
      <div class="modal-prompt-section">
        <div class="prompt-section-header">
          <span class="prompt-section-title">
            <i class="fa-solid fa-terminal"></i> 提示詞 (Prompt)
          </span>
          <button class="btn primary-btn" id="modalCopyBtn">
            <i class="fa-regular fa-copy"></i> 複製即時 Prompt
          </button>
        </div>

        ${placeHolders.length > 0 ? `
          <div class="param-customizer-box">
            <span class="param-title">
              <i class="fa-solid fa-sliders"></i> 互動式變數填寫器 (即時替換 Prompt 內括號內容)
            </span>
            <div class="param-fields-grid">
              ${placeHolders.map((ph, idx) => `
                <div class="param-field-item">
                  <label for="param_input_${idx}">${escapeHtml(ph)}</label>
                  <input type="text" class="param-input" id="param_input_${idx}" data-ph="${escapeHtml(ph)}" placeholder="輸入內容...">
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <pre class="full-prompt-text" id="modalPromptText">${escapeHtml(item.prompt)}</pre>
      </div>
    `;

    modalBody.innerHTML = html;
    modalOverlay.style.display = 'flex';

    // Set up interactive parameter update logic
    if (placeHolders.length > 0) {
      const originalPrompt = item.prompt;
      const promptPre = document.getElementById('modalPromptText');
      const inputs = modalBody.querySelectorAll('.param-input');

      inputs.forEach(input => {
        input.addEventListener('input', () => {
          let updated = originalPrompt;
          inputs.forEach(inp => {
            const ph = inp.dataset.ph;
            const val = inp.value.trim();
            if (val) {
              updated = updated.replaceAll(ph, val);
            }
          });
          promptPre.textContent = updated;
        });
      });
    }

    // Modal Copy Button
    document.getElementById('modalCopyBtn').addEventListener('click', () => {
      const textToCopy = document.getElementById('modalPromptText').textContent;
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('即時 Prompt 已成功複製！', 'success');
      });
    });
  }

  function closeModal() {
    modalOverlay.style.display = 'none';
  }

  // Extract Placeholders like {角色名字} or [物品名稱] from prompt
  function extractPlaceholders(promptText) {
    if (!promptText) return [];
    const matches = promptText.match(/(\{[^{}]+\}|\[[^\[\]]+\])/g) || [];
    // Filter duplicates and exclude code syntax brackets if any
    const unique = [...new Set(matches)].filter(m => m.length > 2 && m.length < 30);
    return unique;
  }

  // Toast Notification Helper
  function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-circle-check';
    if (type === 'info') icon = 'fa-circle-info';
    if (type === 'warning') icon = 'fa-triangle-exclamation';
    if (type === 'error') icon = 'fa-circle-xmark';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Helper: Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }
});
