// Xử lý hiển thị danh sách, tìm kiếm và lọc cho Trang Chủ
const App = {
  allBuilds: [],
  currentClass: 'All',

  async init() {
    await this.loadBuilds();
  },

  async loadBuilds() {
    const loadingState = document.getElementById('loading-state');
    const buildsGrid = document.getElementById('builds-grid');
    const emptyState = document.getElementById('empty-state');

    try {
      const res = await API.getBuilds();
      loadingState.style.display = 'none';

      if (res.status === 'success' && res.data && res.data.length > 0) {
        this.allBuilds = res.data;
        this.renderBuilds(this.allBuilds);
        buildsGrid.style.display = 'grid';
      } else {
        emptyState.style.display = 'block';
      }
    } catch (err) {
      loadingState.innerText = 'Lỗi khi tải dữ liệu! Vui lòng làm mới trang.';
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
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
          <span style="background: rgba(199, 156, 94, 0.15); color: var(--accent-gold); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; border: 1px solid var(--accent-gold);">
            ${build.class_name || 'Class'}
          </span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${build.patch_version ? 'Patch ' + build.patch_version : ''}</span>
        </div>
        <div class="card-title">${this.escapeHTML(build.title)}</div>
        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${this.escapeHTML(build.skills_desc || build.gear_desc || 'Bấm vào để xem toàn bộ hướng dẫn build nhân vật...')}
        </p>
        <div class="card-meta">
          <span>✍️ ${this.escapeHTML(build.author_name || 'Ẩn danh')}</span>
          <span>${build.updated_at ? build.updated_at.split(' ')[0] : ''}</span>
        </div>
      `;
      buildsGrid.appendChild(card);
    });
  },

  filterByClass(className, element) {
    this.currentClass = className;
    
    // Đổi trạng thái active nút lọc
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (element) element.classList.add('active');

    this.applyFilters();
  },

  handleSearch() {
    this.applyFilters();
  },

  applyFilters() {
    const keyword = document.getElementById('search-input').value.trim().toLowerCase();
    
    let filtered = this.allBuilds.filter(b => {
      const matchClass = (this.currentClass === 'All') || (b.class_name && b.class_name.toLowerCase() === this.currentClass.toLowerCase());
      const matchKeyword = !keyword || 
        (b.title && b.title.toLowerCase().includes(keyword)) ||
        (b.author_name && b.author_name.toLowerCase().includes(keyword)) ||
        (b.skills_desc && b.skills_desc.toLowerCase().includes(keyword)) ||
        (b.gear_desc && b.gear_desc.toLowerCase().includes(keyword));

      return matchClass && matchKeyword;
    });

    this.renderBuilds(filtered);
  },

  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
