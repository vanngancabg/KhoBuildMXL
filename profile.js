const ProfileHandler = {
  authorUsername: null,

  async init() {
    this.authorUsername = new URLSearchParams(window.location.search).get('user');
    if (!this.authorUsername) return window.location.href = 'index.html';
    await this.loadProfileData();
  },

  async loadProfileData() {
    const loading = document.getElementById('profile-loading');
    const wrapper = document.getElementById('profile-wrapper');
    const targetUser = this.authorUsername.toLowerCase();

    try {
      const res = await API.getBuilds();
      if (res.status === 'success' && res.data) {
        const userBuilds = res.data.filter(b => String(b.author_id).toLowerCase() === targetUser);
        const displayName = userBuilds[0]?.author_name || this.authorUsername;
        let totalVotes = 0;

        userBuilds.forEach(b => { totalVotes += Number(b.votes_count || 0); });

        document.getElementById('p-name').innerText = displayName;
        document.getElementById('p-username').innerText = `@${this.authorUsername}`;
        document.getElementById('p-total-builds').innerText = userBuilds.length;
        document.getElementById('p-total-votes').innerText = totalVotes;

        // Tính danh hiệu cộng đồng
        const badgeEl = document.getElementById('p-badge');
        if (totalVotes >= 50 || userBuilds.length >= 10) {
          badgeEl.innerHTML = '👑 Median Legend';
        } else if (totalVotes >= 15 || userBuilds.length >= 3) {
          badgeEl.innerHTML = '⚔️ Uber Master';
        } else {
          badgeEl.innerHTML = '⭐ Veteran Writer';
        }

        this.renderUserBuilds(userBuilds);
        loading.style.display = 'none';
        wrapper.style.display = 'block';
      }
    } catch (e) {
      loading.innerText = 'Lỗi khi tải dữ liệu tác giả!';
    }
  },

  renderUserBuilds(builds) {
    const grid = document.getElementById('profile-builds-grid');
    const empty = document.getElementById('profile-empty');
    grid.innerHTML = '';

    if (builds.length === 0) {
      empty.style.display = 'block';
      return;
    }

    builds.forEach(b => {
      const card = document.createElement('a');
      card.className = 'card';
      card.href = `build-detail.html?id=${b.build_id}`;
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="background: rgba(199, 156, 94, 0.15); color: var(--accent-gold); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; border: 1px solid var(--accent-gold);">${b.class_name}</span>
          <span style="color: var(--accent-gold); font-size: 0.85rem; font-weight: bold;">❤️ ${b.votes_count || 0}</span>
        </div>
        <div class="card-title">${b.title}</div>
        <div class="card-meta">
          <span>${b.patch_version ? 'Patch ' + b.patch_version : ''}</span>
          <span>${(b.updated_at || '').split(' ')[0]}</span>
        </div>
      `;
      grid.appendChild(card);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => ProfileHandler.init());
