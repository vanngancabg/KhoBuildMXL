const App = {
  allBuilds: [],
  currentClass: 'All',
  sortByVotes: false,

  async init() {
    await Promise.all([this.loadBuilds(), this.loadShoutbox()]);
    setInterval(() => this.loadShoutbox(), 15000); // Tự động tải lại chat mỗi 15s
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

  renderBuilds(builds) {
    const buildsGrid = document.getElementById('builds-grid');
    const emptyState = document.getElementById('empty-state');
    buildsGrid.innerHTML = '';
    if (builds.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    builds.forEach(build => {
      const card = document.createElement('a');
      card.className = 'card';
      card.href = `build-detail.html?id=${build.build_id}`;
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="background: rgba(199, 156, 94, 0.15); color: var(--accent-gold); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; border: 1px solid var(--accent-gold);">${build.class_name || 'Class'}</span>
          <span style="color: var(--accent-gold); font-size: 0.85rem; font-weight: bold;">❤️ ${build.votes_count || 0}</span>
        </div>
        <div class="card-title">${this.escapeHTML(build.title)}</div>
        <div class="card-meta">
          <span>✍️ ${this.escapeHTML(build.author_name || 'Ẩn danh')}</span>
          <span>${build.patch_version ? 'Patch ' + build.patch_version : ''}</span>
        </div>
      `;
      buildsGrid.appendChild(card);
    });
  },

  filterByClass(className, element) {
    this.currentClass = className;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (element) element.classList.add('active');
    this.applyFilters();
  },

  toggleSortVotes() {
    this.sortByVotes = !this.sortByVotes;
    document.getElementById('sort-votes-btn').classList.toggle('btn-primary', this.sortByVotes);
    this.applyFilters();
  },

  handleSearch() { this.applyFilters(); },

  applyFilters() {
    const keyword = document.getElementById('search-input').value.trim().toLowerCase();
    let filtered = this.allBuilds.filter(b => {
      const matchClass = (this.currentClass === 'All') || (b.class_name && b.class_name.toLowerCase() === this.currentClass.toLowerCase());
      const matchKeyword = !keyword || (b.title && b.title.toLowerCase().includes(keyword)) || (b.author_name && b.author_name.toLowerCase().includes(keyword));
      return matchClass && matchKeyword;
    });

    if (this.sortByVotes) {
      filtered.sort((a, b) => (b.votes_count || 0) - (a.votes_count || 0));
    }
    this.renderBuilds(filtered);
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
