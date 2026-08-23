const DetailHandler = {
  buildId: null,
  currentBuild: null,

  async init() {
    this.buildId = new URLSearchParams(window.location.search).get('id');
    if (!this.buildId) return window.location.href = 'index.html';
    await Promise.all([this.loadBuild(), this.loadComments()]);
  },

  async loadBuild() {
    const res = await API.getBuildDetail(this.buildId);
    if (res.status === 'success' && res.data) {
      this.currentBuild = res.data;
      const b = res.data;
      document.getElementById('detail-title').innerText = b.title || '';
      document.getElementById('detail-class').innerText = b.class_name || 'Class';
      document.getElementById('detail-patch').innerText = b.patch_version ? 'Patch ' + b.patch_version : '';
      document.getElementById('detail-author').innerText = b.author_name || b.author_id;
      document.getElementById('detail-time').innerText = b.updated_at || '';
      document.getElementById('vote-count').innerText = b.votes_count || 0;

      document.getElementById('detail-stats').innerHTML = this.renderMarkdown(b.stats_desc);
      document.getElementById('detail-skills').innerHTML = this.renderMarkdown(b.skills_desc);
      this.renderGear(b.gear_desc);

      const user = Auth.getCurrentUser();
      if (user && (String(user.username).toLowerCase() === String(b.author_id).toLowerCase() || user.role === 'Admin')) {
        document.getElementById('author-actions').style.display = 'flex';
        document.getElementById('btn-edit').href = `create-build.html?edit=${b.build_id}`;
      }

      if (b.video_url && (b.video_url.includes('youtube.com') || b.video_url.includes('youtu.be'))) {
        const id = (b.video_url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/) || [])[2];
        if (id) {
          document.getElementById('video-container').innerHTML = `<iframe style="position: absolute; top:0; left:0; width:100%; height:100%; border:0;" src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
          document.getElementById('video-section').style.display = 'block';
        }
      }

      document.getElementById('detail-loading').style.display = 'none';
      document.getElementById('detail-wrapper').style.display = 'block';
    }
  },

  renderGear(gearRaw) {
    const container = document.getElementById('detail-gear');
    try {
      const g = JSON.parse(gearRaw);
      container.innerHTML = `
        <table class="gear-table">
          <tr><td class="gear-label">🗡️ Vũ Khí:</td><td>${this.renderMarkdown(g.weapon || 'Chưa rõ')}</td></tr>
          <tr><td class="gear-label">👑 Nón:</td><td>${this.renderMarkdown(g.helm || 'Chưa rõ')}</td></tr>
          <tr><td class="gear-label">🥋 Áo Giáp:</td><td>${this.renderMarkdown(g.armor || 'Chưa rõ')}</td></tr>
          <tr><td class="gear-label">🧤 Găng Tay:</td><td>${this.renderMarkdown(g.gloves || 'Chưa rõ')}</td></tr>
          <tr><td class="gear-label">👢 Giày:</td><td>${this.renderMarkdown(g.boots || 'Chưa rõ')}</td></tr>
          <tr><td class="gear-label">💍 Trang Sức:</td><td>${this.renderMarkdown(g.jewelry || 'Chưa rõ')}</td></tr>
          <tr><td class="gear-label">🔮 Charms & MOs:</td><td>${this.renderMarkdown(g.charms || 'Chưa rõ')}</td></tr>
        </table>
      `;
    } catch (e) {
      container.innerHTML = `<div class="markdown-rendered">${this.renderMarkdown(gearRaw)}</div>`;
    }
  },

  async toggleVote() {
    const user = Auth.getCurrentUser();
    if (!user) return Auth.openModal('login');
    const res = await API.voteBuild(this.buildId, user.username);
    if (res.status === 'success') {
      document.getElementById('vote-count').innerText = res.votes_count;
    }
  },

  async deleteBuild() {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này vĩnh viễn?')) return;
    const user = Auth.getCurrentUser();
    const res = await API.deleteBuild(this.buildId, user.username, user.role);
    if (res.status === 'success') {
      alert('Đã xóa thành công!');
      window.location.href = 'index.html';
    }
  },

  async loadComments() {
    const res = await API.getComments(this.buildId);
    const list = document.getElementById('comments-list');
    if (res.status === 'success' && res.data) {
      list.innerHTML = '';
      const user = Auth.getCurrentUser();
      res.data.forEach(cmt => {
        const canDelete = user && (user.role === 'Admin' || user.username === cmt.user_id);
        const div = document.createElement('div');
        div.style.padding = '10px 0';
        div.style.borderBottom = '1px solid var(--border-color)';
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <strong style="color:var(--accent-gold); font-size:0.9rem;">${cmt.user_name}</strong>
            <div>
              <span style="font-size:0.75rem; color:var(--text-muted); margin-right:8px;">${cmt.created_at}</span>
              ${canDelete ? `<button class="btn btn-sm btn-danger" onclick="DetailHandler.deleteComment('${cmt.comment_id}')">Xóa</button>` : ''}
            </div>
          </div>
          <div>${this.renderMarkdown(cmt.content)}</div>
        `;
        list.appendChild(div);
      });
    }
  },

  async postComment() {
    const user = Auth.getCurrentUser();
    if (!user) return Auth.openModal('login');
    const input = document.getElementById('comment-input');
    if (!input.value.trim()) return;
    await API.addComment({ build_id: this.buildId, username: user.username, user_name: user.display_name, avatar: user.avatar, content: input.value.trim() });
    input.value = '';
    await this.loadComments();
  },

  async deleteComment(id) {
    if (!confirm('Xóa bình luận này?')) return;
    const user = Auth.getCurrentUser();
    await API.deleteComment(id, user.username, user.role);
    await this.loadComments();
  },

  renderMarkdown(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\[u\](.*?)\[\/u\]/gi, '<span class="item-unique">$1</span>')
      .replace(/\[rw\](.*?)\[\/rw\]/gi, '<span class="item-runeword">$1</span>')
      .replace(/\[set\](.*?)\[\/set\]/gi, '<span class="item-set">$1</span>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }
};

document.addEventListener('DOMContentLoaded', () => DetailHandler.init());
