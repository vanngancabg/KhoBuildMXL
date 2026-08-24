const App = {
  allBuilds: [],
  filteredBuilds: [],
  currentClass: 'All',
  sortByVotes: false,
  currentPage: 1,
  pageSize: 20, // 20 bài viết trên 1 trang

  async init() {
    await Promise.all([this.loadBuilds(), this.loadShoutbox()]);
    setInterval(() => this.loadShoutbox(), 15000);
  },

  async loadBuilds() {
    const loadingState = document.getElementById('loading-state');
    const buildsGrid = document.getElementById('builds-grid');
    try {
      const res = await API.getBuilds();
      loadingState.style.display = 'none';
      if (res.status === 'success' && res.data) {
        this.allBuilds = res.data;
        this.applyFilters();
        buildsGrid.style.display = 'grid';
      }
    } catch (err) {
      loadingState.innerText = 'Lỗi kết nối!';
    }
  },

  renderBuilds() {
    const buildsGrid = document.getElementById('builds-grid');
    const emptyState = document.getElementById('empty-state');
    const pagination = document.getElementById('pagination-container');
    buildsGrid.innerHTML = '';

    if (this.filteredBuilds.length === 0) {
      emptyState.style.display = 'block';
      pagination.style.display = 'none';
      return;
    }
    emptyState.style.display = 'none';

    // Cắt mảng theo trang hiện tại (20 bài/trang)
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const pagedBuilds = this.filteredBuilds.slice(startIndex, startIndex + this.pageSize);

    pagedBuilds.forEach(build => {
      const card = document.createElement('a');
      card.className = 'card';
      card.href = `build-detail.html?id=${build.build_id}`;
      
      // Kiểm tra xem bài có mới đăng trong vòng 3 ngày không
      const isNew = this.checkIsNew(build.updated_at);

      card.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; gap: 6px; align-items: center;">
              <span style="background: rgba(199, 156, 94, 0.15); color: var(--accent-gold); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; border: 1px solid var(--accent-gold);">${build.class_name || 'Class'}</span>
              ${isNew ? '<span class="badge-new">✨ MỚI</span>' : ''}
            </div>
            <span style="color: #ff6b6b; font-size: 0.85rem; font-weight: bold;">❤️ ${build.votes_count || 0}</span>
          </div>
          <div class="card-title">${this.escapeHTML(build.title)}</div>
        </div>
        <div class="card-meta">
          <span>✍️ ${this.escapeHTML(build.author_name || 'Ẩn danh')}</span>
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
      // Phân tích định dạng dd/mm/yyyy hoặc ISO
      let postDate;
      if (dateStr.includes('/')) {
        const parts = dateStr.split(' ')[0].split('/');
        postDate = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
      } else {
        postDate = new Date(dateStr);
      }
      const diffTime = Math.abs(new Date() - postDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3; // Bài đăng <= 3 ngày được tính là MỚI
    } catch(e) {
      return false;
    }
  },

  renderPagination() {
    const container = document.getElementById('pagination-container');
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
    document.getElementById('sort-votes-btn').classList.toggle('btn-primary', this.sortByVotes);
    this.currentPage = 1;
    this.applyFilters();
  },

  handleSearch() {
    this.currentPage = 1;
    this.applyFilters();
  },

  applyFilters() {
    const keyword = document.getElementById('search-input').value.trim().toLowerCase();
    this.filteredBuilds = this.allBuilds.filter(b => {
      const matchClass = (this.currentClass === 'All') || (b.class_name && b.class_name.toLowerCase() === this.currentClass.toLowerCase());
      const matchKeyword = !keyword || (b.title && b.title.toLowerCase().includes(keyword)) || (b.author_name && b.author_name.toLowerCase().includes(keyword));
      return matchClass && matchKeyword;
    });

    if (this.sortByVotes) {
      this.filteredBuilds.sort((a, b) => (b.votes_count || 0) - (a.votes_count || 0));
    }
    this.renderBuilds();
  },

  async loadShoutbox() {
    try {
      const res = await API.getShoutbox();
      const list = document.getElementById('shoutbox-list');
      if (res.status === 'success' && res.data) {
        list.innerHTML = '';
        res.data.forEach(msg => {
          const div = document.createElement('div');
          div.className = 'shoutbox-item';
          div.innerHTML = `
            <div style="display: flex; justify-content: space-between; color: var(--accent-gold); font-size: 0.75rem; margin-bottom: 2px;">
              <strong>${this.escapeHTML(msg.user_name)}</strong>
              <span style="color: var(--text-muted);">${(msg.created_at || '').split(' ')[0]}</span>
            </div>
            <div>${this.escapeHTML(msg.message)}</div>
          `;
          list.appendChild(div);
        });
        list.scrollTop = list.scrollHeight;
      }
    } catch (e) {}
  },

  async sendChat() {
    const user = Auth.getCurrentUser();
    if (!user) return Auth.openModal('login');
    const input = document.getElementById('shoutbox-text');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    await API.sendShoutbox({ username: user.username, user_name: user.display_name, avatar: user.avatar, message: text });
    await this.loadShoutbox();
  },

  escapeHTML(str) { return str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; }
};

document.addEventListener('DOMContentLoaded', () => App.init());
