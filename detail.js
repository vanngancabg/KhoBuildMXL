const DetailHandler = {
  buildId: null,
  currentBuild: null,

  async init() {
    this.buildId = new URLSearchParams(window.location.search).get('id');
    if (!this.buildId) {
      alert('Không tìm thấy bài viết!');
      window.location.href = 'index.html';
      return;
    }

    await this.loadBuild();
    await this.loadComments();
    this.bindEvents();
  },

  async loadBuild() {
    const container = document.getElementById('build-detail-container');
    container.innerHTML = '<div style="text-align: center; padding: 50px; color: var(--accent-gold);">⏳ Đang tải nội dung bài viết...</div>';

    try {
      const res = await API.getBuildDetail(this.buildId);
      if (res.status === 'success' && res.data) {
        this.currentBuild = res.data;
        this.renderBuildDetail(res.data);
      } else {
        container.innerHTML = `
          <div style="text-align: center; padding: 60px 10px;">
            <p style="color: #ff8b8b; font-size: 1.1rem; margin-bottom: 12px;">Bài viết không tồn tại hoặc đã bị xóa!</p>
            <a href="index.html" class="btn btn-primary">⬅️ Trở về Trang Chủ</a>
          </div>
        `;
      }
    } catch (err) {
      container.innerHTML = '<div style="text-align: center; padding: 50px; color: #ff8b8b;">Lỗi kết nối máy chủ!</div>';
    }
  },

  renderBuildDetail(b) {
    const container = document.getElementById('build-detail-container');
    const user = Auth.getCurrentUser();

    let statsObj = { season: '', patch: '', purpose: 'Speed Farming', difficulty: 'Dễ', intro: '', pros: '', cons: '', str: '0', dex: '0', vit: '0', ene: '0', strategy: '' };
    try {
      statsObj = { ...statsObj, ...JSON.parse(b.stats_desc) };
    } catch (e) {
      statsObj.intro = b.stats_desc || '';
    }

    let gearObj = { lv0_50: '', lv50_135: '', lv135plus: '' };
    try {
      gearObj = { ...gearObj, ...JSON.parse(b.gear_desc) };
    } catch (e) {
      gearObj.lv0_50 = b.gear_desc || '';
    }

    let seasonDisplay = statsObj.season || b.patch_version || 'Mới nhất';
    if (seasonDisplay && !seasonDisplay.toLowerCase().startsWith('mùa') && !seasonDisplay.toLowerCase().startsWith('season')) {
      seasonDisplay = 'Mùa ' + seasonDisplay;
    }

    let videoEmbed = '';
    if (b.video_url && (b.video_url.includes('youtube.com') || b.video_url.includes('youtu.be'))) {
      const match = b.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (match) {
        videoEmbed = `<div class="bb-video-embed"><iframe src="https://www.youtube.com/embed/${match[1]}" allowfullscreen></iframe></div>`;
      }
    }

    const isAuthor = user && (String(user.username).toLowerCase() === String(b.author_username || b.author_id).toLowerCase() || user.role === 'Admin');
    const userVoted = user && b.votes && b.votes.split(',').map(x => x.trim().toLowerCase()).includes(user.username.toLowerCase());

    container.innerHTML = `
      <!-- HEADER BÀI VIẾT -->
      <div style="border-bottom: 2px solid var(--accent-gold); padding-bottom: 14px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
          <div>
            <h1 style="color: var(--accent-gold); font-family: var(--font-heading); font-size: 2rem; margin: 0 0 8px 0;">${this.escapeHTML(b.title)}</h1>
            <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; gap: 14px; flex-wrap: wrap;">
              <span>Tác giả: <strong style="color: var(--accent-gold);">${this.escapeHTML(b.author_name || b.author_username)}</strong></span>
              <span>Class: <strong style="color: var(--text-bright);">${b.class_name}</strong></span>
              <span>Mùa giải: <strong style="color: var(--text-bright);">${seasonDisplay}</strong></span>
              <span>Mục đích: <strong style="color: var(--text-bright);">${statsObj.purpose}</strong></span>
              <span>Độ khó: <strong style="color: var(--text-bright);">${statsObj.difficulty}</strong></span>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            ${isAuthor ? `
              <a href="create-build.html?edit=${b.build_id}" class="btn btn-sm">✏️ Sửa Bài</a>
              <button class="btn btn-sm btn-danger" onclick="DetailHandler.deleteBuild()">🗑️ Xóa Bài</button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- KHỐI 1 & 2: MỞ SẴN CỐ ĐỊNH (TỔNG QUAN, PROS & CONS) -->
      <div class="detail-card">
        <div class="detail-card-title">📖 TỔNG QUAN & LỐI CHƠI</div>
        <div class="markdown-rendered">${FormHandler.parseBBCode(statsObj.intro || 'Chưa có giới thiệu.')}</div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
          <div>
            <strong style="color: var(--accent-green); font-size: 1rem; display: block; margin-bottom: 6px;">ƯU ĐIỂM (PROS)</strong>
            <div class="markdown-rendered">${FormHandler.parseBBCode(statsObj.pros || '• Chưa cập nhật')}</div>
          </div>
          <div>
            <strong style="color: #ff6b6b; font-size: 1rem; display: block; margin-bottom: 6px;">NHƯỢC ĐIỂM (CONS)</strong>
            <div class="markdown-rendered">${FormHandler.parseBBCode(statsObj.cons || '• Chưa cập nhật')}</div>
          </div>
        </div>
      </div>

      <!-- KHỐI 3: KÉO MỞ (STATS) -->
      <details class="section-accordion">
        <summary>📊 KHỐI 3: PHÂN BỔ ĐIỂM THUỘC TÍNH (STATS)</summary>
        <div class="section-accordion-body">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
            <div class="stat-pill"><div style="font-size:0.75rem; color:var(--text-muted);">STRENGTH</div><strong style="color:var(--accent-gold);">${statsObj.str || '0'}</strong></div>
            <div class="stat-pill"><div style="font-size:0.75rem; color:var(--text-muted);">DEXTERITY</div><strong style="color:var(--accent-gold);">${statsObj.dex || '0'}</strong></div>
            <div class="stat-pill"><div style="font-size:0.75rem; color:var(--text-muted);">VITALITY</div><strong style="color:var(--accent-gold);">${statsObj.vit || '0'}</strong></div>
            <div class="stat-pill"><div style="font-size:0.75rem; color:var(--text-muted);">ENERGY</div><strong style="color:var(--accent-gold);">${statsObj.ene || '0'}</strong></div>
          </div>
        </div>
      </details>

      <!-- KHỐI 4: KÉO MỞ (SKILLS & ROTATION) -->
      <details class="section-accordion">
        <summary>⚡ KHỐI 4: KỸ NĂNG & THỨ TỰ NÂNG ĐIỂM (SKILLS & ROTATION)</summary>
        <div class="section-accordion-body">
          <div class="markdown-rendered">${FormHandler.parseBBCode(b.skills_desc || 'Chưa cập nhật kỹ năng.')}</div>
        </div>
      </details>

      <!-- KHỐI 5: KÉO MỞ (LỘ TRÌNH TRANG BỊ) -->
      <details class="section-accordion">
        <summary>🛡️ KHỐI 5: LỘ TRÌNH TRANG BỊ THEO TỪNG MỨC LEVEL (GEAR PROGRESSION)</summary>
        <div class="section-accordion-body">
          <details class="gear-accordion-item" open>
            <summary class="gear-accordion-header">🔰 Mức 1: Level 1 - 115</summary>
            <div class="gear-accordion-body">
              <div class="markdown-rendered">${FormHandler.parseBBCode(gearObj.lv0_50 || 'Chưa cập nhật')}</div>
            </div>
          </details>

          ${gearObj.lv50_135 ? `
            <details class="gear-accordion-item">
              <summary class="gear-accordion-header">⚔️ Mức 2: Level 115 - 135</summary>
              <div class="gear-accordion-body">
                <div class="markdown-rendered">${FormHandler.parseBBCode(gearObj.lv50_135)}</div>
              </div>
            </details>
          ` : ''}

          ${gearObj.lv135plus ? `
            <details class="gear-accordion-item">
              <summary class="gear-accordion-header">👑 Mức 3: Level 135+</summary>
              <div class="gear-accordion-body">
                <div class="markdown-rendered">${FormHandler.parseBBCode(gearObj.lv135plus)}</div>
              </div>
            </details>
          ` : ''}
        </div>
      </details>

      <!-- KHỐI 6: KÉO MỞ (CHIẾN THUẬT BOSS & VIDEO) -->
      ${statsObj.strategy || videoEmbed ? `
        <details class="section-accordion">
          <summary>🎬 KHỐI 6: CHIẾN THUẬT BOSS & VIDEO GAMEPLAY</summary>
          <div class="section-accordion-body">
            ${statsObj.strategy ? `<div class="markdown-rendered" style="margin-bottom: 14px;">${FormHandler.parseBBCode(statsObj.strategy)}</div>` : ''}
            ${videoEmbed}
          </div>
        </details>
      ` : ''}

      <!-- TƯƠNG TÁC LIKE & XEM -->
      <div style="display: flex; justify-content: center; gap: 16px; margin: 30px 0;">
        <button id="btn-vote" class="btn ${userVoted ? 'btn-primary' : ''}" style="padding: 10px 24px; font-size: 1rem;" onclick="DetailHandler.handleVote()">
          ❤️ <span id="vote-text">${userVoted ? 'Đã Thích' : 'Thích bài viết'}</span> (<span id="vote-count">${b.votes_count || 0}</span>)
        </button>
      </div>
    `;
  },

  async handleVote() {
    const user = Auth.getCurrentUser();
    if (!user) return Auth.openModal('login');

    const btn = document.getElementById('btn-vote');
    const countEl = document.getElementById('vote-count');
    const textEl = document.getElementById('vote-text');

    try {
      const res = await API.voteBuild(this.buildId, user.username);
      if (res.status === 'success') {
        countEl.innerText = res.votes_count;
        if (res.is_voted) {
          btn.classList.add('btn-primary');
          textEl.innerText = 'Đã Thích';
        } else {
          btn.classList.remove('btn-primary');
          textEl.innerText = 'Thích bài viết';
        }
      }
    } catch (e) {}
  },

  async deleteBuild() {
    const user = Auth.getCurrentUser();
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này? Hành động không thể hoàn tác!')) return;

    try {
      const res = await API.deleteBuild(this.buildId, user.username, user.role);
      if (res.status === 'success') {
        alert('Đã xóa bài viết thành công!');
        window.location.href = 'index.html';
      } else {
        alert(res.message || 'Lỗi khi xóa bài!');
      }
    } catch (e) {
      alert('Lỗi kết nối máy chủ!');
    }
  },

  async loadComments() {
    const box = document.getElementById('comments-list');
    if (!box) return;

    try {
      const res = await API.getComments(this.buildId);
      if (res.status === 'success' && res.data) {
        this.renderComments(res.data);
      }
    } catch (e) {}
  },

  renderComments(list) {
    const box = document.getElementById('comments-list');
    const countHeader = document.getElementById('comments-count-header');
    if (countHeader) countHeader.innerText = `BÌNH LUẬN (${list.length})`;

    if (list.length === 0) {
      box.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 12px 0;">Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ ý kiến!</div>';
      return;
    }

    const user = Auth.getCurrentUser();
    box.innerHTML = '';

    list.forEach(c => {
      const isCmtAuthor = user && (String(user.username).toLowerCase() === String(c.username).toLowerCase() || user.role === 'Admin');
      const div = document.createElement('div');
      div.style.padding = '12px 0';
      div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${c.avatar || 'https://i.imgur.com/6VBx3io.png'}" alt="Avatar" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">
            <strong style="color: var(--accent-gold); font-size: 0.85rem;">${this.escapeHTML(c.user_name || c.username)}</strong>
            <span style="font-size: 0.7rem; color: var(--text-muted);">${c.created_at || ''}</span>
          </div>
          ${isCmtAuthor ? `<button class="btn btn-sm btn-danger" style="padding: 1px 6px; font-size: 0.65rem;" onclick="DetailHandler.deleteComment('${c.comment_id}')">Xóa</button>` : ''}
        </div>
        <div style="font-size: 0.9rem; color: var(--text-bright); line-height: 1.5; padding-left: 32px;">
          ${this.escapeHTML(c.content)}
        </div>
      `;
      box.appendChild(div);
    });
  },

  async handleAddComment(e) {
    e.preventDefault();
    const user = Auth.getCurrentUser();
    if (!user) return Auth.openModal('login');

    const inp = document.getElementById('comment-input');
    const content = inp.value.trim();
    if (!content) return;

    inp.disabled = true;

    try {
      const res = await API.addComment({
        build_id: this.buildId,
        username: user.username,
        user_name: user.display_name,
        avatar: user.avatar,
        content: content
      });

      if (res.status === 'success') {
        inp.value = '';
        await this.loadComments();
      }
    } catch (e) {
      alert('Lỗi gửi bình luận!');
    } finally {
      inp.disabled = false;
      inp.focus();
    }
  },

  async deleteComment(commentId) {
    const user = Auth.getCurrentUser();
    if (!confirm('Xóa bình luận này?')) return;

    try {
      const res = await API.deleteComment(commentId, user.username, user.role);
      if (res.status === 'success') {
        await this.loadComments();
      }
    } catch (e) {
      alert('Lỗi xóa bình luận!');
    }
  },

  bindEvents() {
    const form = document.getElementById('comment-form');
    if (form) {
      form.onsubmit = (e) => this.handleAddComment(e);
    }
  },

  escapeHTML(str) { return str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; }
};

document.addEventListener('DOMContentLoaded', () => DetailHandler.init());
