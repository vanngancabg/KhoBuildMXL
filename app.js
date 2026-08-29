const App = {
  allBuilds: [],
  filteredBuilds: [],
  currentClass: 'All',
  sortByVotes: false,
  currentPage: 1,
  pageSize: 12,
  totalMessagesCount: 0,

  async init() {
    await this.loadBuilds();
    
    setTimeout(() => {
      this.trackVisit();
      this.loadShoutbox();
    }, 300);

    setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.loadShoutbox();
      }
    }, 30000);
  },

  async trackVisit() {
    try {
      const res = await API.trackSiteVisit();
      if (res && res.status === 'success') {
        const el = document.getElementById('site-total-visits');
        if (el) el.innerText = (res.total_visits || 1).toLocaleString('vi-VN');
      }
    } catch (e) {}
  },

  async loadBuilds() {
    const loadingState = document.getElementById('loading-state');
    const buildsGrid = document.getElementById('builds-grid');
    const emptyState = document.getElementById('empty-state');

    try {
      const res = await API.getBuilds();
      if (loadingState) loadingState.style.display = 'none';

      if (res && res.status === 'success' && Array.isArray(res.data)) {
        this.allBuilds = res.data;
        this.applyFilters();
        if (buildsGrid) buildsGrid.style.display = 'grid';
      } else {
        if (emptyState) emptyState.style.display = 'block';
      }
    } catch (err) {
      if (loadingState) {
        loadingState.style.display = 'block';
        loadingState.innerText = 'Không thể tải dữ liệu! Vui lòng bấm F5 để thử lại.';
      }
    }
  },

  handleCardClick(event, buildId) {
    event.preventDefault();
    const user = Auth.getCurrentUser();
    if (!user) {
      alert('Bạn cần đăng nhập để xem chi tiết hướng dẫn Build này!');
      Auth.openModal('login');
      return;
    }
    window.location.href = `build-detail.html?id=${encodeURIComponent(buildId)}`;
  },

  renderBuilds() {
    const buildsGrid = document.getElementById('builds-grid');
    const emptyState = document.getElementById('empty-state');
    const pagination = document.getElementById('pagination-container');
    if (!buildsGrid) return;
    buildsGrid.innerHTML = '';

    if (this.filteredBuilds.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      if (pagination) pagination.style.display = 'none';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const pagedBuilds = this.filteredBuilds.slice(startIndex, startIndex + this.pageSize);

    pagedBuilds.forEach(build => {
      const card = document.createElement('a');
      card.className = 'card';
      card.href = `build-detail.html?id=${encodeURIComponent(build.build_id)}`;
      card.onclick = (e) => this.handleCardClick(e, build.build_id);
      
      const isNew = this.checkIsNew(build.updated_at);
      
      let seasonBadgeText = '';
      if (build.patch_version) {
        let rawSeason = String(build.patch_version).split('-')[0].trim();
        if (rawSeason.toLowerCase().startsWith('season') || rawSeason.toLowerCase().startsWith('mùa')) {
          seasonBadgeText = rawSeason.replace(/season/i, 'Mùa').trim();
        } else {
          seasonBadgeText = 'Mùa ' + rawSeason;
        }
      }

      let formattedDate = '';
      if (build.updated_at) {
        const rawDate = String(build.updated_at).trim();
        if (rawDate.includes(' ')) {
          const parts = rawDate.split(' ');
          const datePart = parts.find(p => p.includes('/') || p.includes('-'));
          formattedDate = datePart || parts[0];
        } else {
          formattedDate = rawDate;
        }
      }

      card.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 4px;">
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              <span style="background: rgba(199, 156, 94, 0.15); color: var(--accent-gold); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; border: 1px solid var(--accent-gold);">${this.escapeHTML(build.class_name || 'Class')}</span>
              ${seasonBadgeText ? `<span style="background: #1c1f24; color: #cfd8dc; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; border: 1px solid var(--border-color);">${this.escapeHTML(seasonBadgeText)}</span>` : ''}
              ${isNew ? '<span class="badge-new">✨ MỚI</span>' : ''}
            </div>
            <span style="color: #ff6b6b; font-size: 0.85rem; font-weight: bold;">❤️ ${build.votes_count || 0}</span>
          </div>
          <div class="card-title">${this.escapeHTML(build.title)}</div>
        </div>
        <div class="card-meta">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 0.78rem;">
            <span>Tác giả: <strong style="color: var(--text-bright);">${this.escapeHTML(build.author_name || build.author_username || 'Ẩn danh')}</strong></span>
            ${formattedDate ? `<span style="color: var(--text-muted);">Ngày: <strong style="color: var(--text-bright);">${formattedDate}</strong></span>` : ''}
          </div>
          <div style="display: flex; gap: 8px; font-size: 0.75rem;">
            <span>👁️ ${build.views_count || 0}</span>
            <span>💬 ${build.comments_count || 0}</span>
          </div>
        </div>
      `;
      buildsGrid.appendChild(card);
    });

    this.renderPagination();
  },

  checkIsNew(dateStr) {
    if (!dateStr) return false;
    try {
      let postDate;
      if (dateStr.includes('/')) {
        const parts = dateStr.split(' ')[0].split('/');
        postDate = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
      } else {
        postDate = new Date(dateStr);
      }
      const diffTime = Math.abs(new Date() - postDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    } catch(e) {
      return false;
    }
  },

  renderPagination() {
    const container = document.getElementById('pagination-container');
    if (!container) return;
    const totalPages = Math.ceil(this.filteredBuilds.length / this.pageSize);
    if (totalPages <= 1) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    let html = '';

    if (this.currentPage > 1) {
      html += `<button class="page-btn" onclick="App.goToPage(${this.currentPage - 1})">« Trước</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" onclick="App.goToPage(${i})">${i}</button>`;
    }

    if (this.currentPage < totalPages) {
      html += `<button class="page-btn" onclick="App.goToPage(${this.currentPage + 1})">Sau »</button>`;
    }

    container.innerHTML = html;
  },

  goToPage(page) {
    this.currentPage = page;
    this.renderBuilds();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  filterByClass(className, element) {
    this.currentClass = className;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (element) element.classList.add('active');
    this.currentPage = 1;
    this.applyFilters();
  },

  toggleSortVotes() {
    this.sortByVotes = !this.sortByVotes;
    const btn = document.getElementById('sort-votes-btn');
    if (btn) btn.classList.toggle('btn-primary', this.sortByVotes);
    this.currentPage = 1;
    this.applyFilters();
  },

  handleSearch() {
    this.currentPage = 1;
    this.applyFilters();
  },

  applyFilters() {
    const input = document.getElementById('search-input');
    const keyword = input ? input.value.trim().toLowerCase() : '';
    this.filteredBuilds = this.allBuilds.filter(b => {
      const matchClass = (this.currentClass === 'All') || (b.class_name && b.class_name.toLowerCase() === this.currentClass.toLowerCase());
      const authorName = String(b.author_name || b.author_username || '').toLowerCase();
      const titleName = String(b.title || '').toLowerCase();
      const matchKeyword = !keyword || titleName.includes(keyword) || authorName.includes(keyword);
      return matchClass && matchKeyword;
    });

    if (this.sortByVotes) {
      this.filteredBuilds.sort((a, b) => (Number(b.votes_count) || 0) - (Number(a.votes_count) || 0));
    }
    this.renderBuilds();
  },

  toggleChatWidget() {
    const widget = document.getElementById('chat-floating-widget');
    if (widget) {
      const willBeActive = !widget.classList.contains('active');
      widget.classList.toggle('active', willBeActive);
      
      if (willBeActive) {
        localStorage.setItem('d2_last_read_chat_count', String(this.totalMessagesCount));
        const badge = document.getElementById('chat-unread-badge');
        if (badge) badge.style.display = 'none';

        const list = document.getElementById('shoutbox-list');
        if (list) list.scrollTop = list.scrollHeight;
        const inp = document.getElementById('shoutbox-text');
        if (inp) inp.focus();
      }
    }
  },

  async loadShoutbox() {
    try {
      const res = await API.getShoutbox();
      const list = document.getElementById('shoutbox-list');
      const widget = document.getElementById('chat-floating-widget');
      const badge = document.getElementById('chat-unread-badge');

      if (res && res.status === 'success' && Array.isArray(res.data) && list) {
        this.totalMessagesCount = res.data.length;
        list.innerHTML = '';
        res.data.forEach(msg => {
          const div = document.createElement('div');
          div.className = 'shoutbox-item';
          div.innerHTML = `
            <div style="display: flex; justify-content: space-between; color: var(--accent-gold); font-size: 0.75rem; margin-bottom: 2px;">
              <strong>${this.escapeHTML(msg.user_name || msg.username)}</strong>
              <span style="color: var(--text-muted); font-size: 0.68rem;">${(msg.created_at || '').split(' ')[0]}</span>
            </div>
            <div style="font-size: 0.82rem; color: var(--text-bright);">${this.escapeHTML(msg.message)}</div>
          `;
          list.appendChild(div);
        });

        const isChatOpen = widget && widget.classList.contains('active');
        if (isChatOpen) {
          list.scrollTop = list.scrollHeight;
          localStorage.setItem('d2_last_read_chat_count', String(this.totalMessagesCount));
          if (badge) badge.style.display = 'none';
        } else {
          // Fix lỗi đếm số ảo khi chuyển thiết bị
          let lastReadStr = localStorage.getItem('d2_last_read_chat_count');
          if (lastReadStr === null) {
            lastReadStr = String(this.totalMessagesCount);
            localStorage.setItem('d2_last_read_chat_count', lastReadStr);
          }

          const lastRead = Number(lastReadStr);
          const unread = this.totalMessagesCount - lastRead;

          if (unread > 0 && badge) {
            badge.innerText = unread > 9 ? '9+' : unread;
            badge.style.display = 'flex';
          } else if (badge) {
            badge.style.display = 'none';
          }
        }
      }
    } catch (e) {}
  },

  async sendChat() {
    const user = Auth.getCurrentUser();
    if (!user) return Auth.openModal('login');
    const input = document.getElementById('shoutbox-text');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    await API.sendShoutbox({ username: user.username, user_name: user.display_name, avatar: user.avatar, message: text });
    await this.loadShoutbox();
  },

  escapeHTML(str) { return str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; }
};

document.addEventListener('DOMContentLoaded', () => App.init());
