const DetailHandler = {
  buildId: null,
  currentBuild: null,

  async init() {
    this.buildId = new URLSearchParams(window.location.search).get('id');
    if (!this.buildId) {
      window.location.href = 'index.html';
      return;
    }
    this.checkCommentAuth();
    await Promise.all([this.loadBuild(), this.loadComments()]);
  },

  checkCommentAuth() {
    const user = Auth.getCurrentUser();
    const commentBox = document.getElementById('comment-box');
    if (commentBox) {
      commentBox.style.display = user ? 'block' : 'none';
    }
  },

  async loadBuild() {
    const loading = document.getElementById('detail-loading');
    const wrapper = document.getElementById('detail-wrapper');

    try {
      const res = await API.getBuildDetail(this.buildId);
      if (res.status === 'success' && res.data) {
        this.currentBuild = res.data;
        const b = res.data;

        document.title = `${b.title} - Median XL Build`;
        document.getElementById('detail-title').innerText = b.title || 'Không có tiêu đề';
        document.getElementById('detail-class').innerText = b.class_name || 'Class';
        document.getElementById('detail-patch').innerText = b.patch_version ? `Patch ${b.patch_version}` : '';
        
        const authorLink = document.getElementById('detail-author');
        if (authorLink) {
          authorLink.innerHTML = `<a href="profile.html?user=${encodeURIComponent(b.author_id)}" style="color: var(--accent-gold); text-decoration: underline;">${this.escapeHTML(b.author_name || b.author_id)}</a>`;
        }

        document.getElementById('detail-time').innerText = b.updated_at || '';
        document.getElementById('vote-count').innerText = b.votes_count || 0;
        document.getElementById('detail-stats').innerHTML = this.renderMarkdown(b.stats_desc || 'Chưa cập nhật.');

        this.renderSkills(b.skills_desc, b.class_name);
        this.renderGear(b.gear_desc);

        const user = Auth.getCurrentUser();
        if (user && (String(user.username).toLowerCase() === String(b.author_id).toLowerCase() || user.role === 'Admin')) {
          const authorActions = document.getElementById('author-actions');
          const editBtn = document.getElementById('btn-edit');
          if (authorActions && editBtn) {
            authorActions.style.display = 'flex';
            editBtn.href = `create-build.html?edit=${b.build_id}`;
          }
        }

        if (b.video_url && (b.video_url.includes('youtube.com') || b.video_url.includes('youtu.be'))) {
          const videoMatch = b.video_url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
          const videoId = videoMatch ? videoMatch[2] : null;
          if (videoId && videoId.length === 11) {
            document.getElementById('video-container').innerHTML = `
              <iframe style="position: absolute; top:0; left:0; width:100%; height:100%; border:0;" 
                src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>
            `;
            document.getElementById('video-section').style.display = 'block';
          }
        }

        loading.style.display = 'none';
        wrapper.style.display = 'block';
      } else {
        loading.innerText = 'Bài viết không tồn tại hoặc đã bị xóa!';
      }
    } catch (err) {
      loading.innerText = 'Lỗi tải dữ liệu bài viết!';
    }
  },

  renderSkills(skillsRaw, className) {
    const treeContainer = document.getElementById('detail-skills-tree');
    const noteContainer = document.getElementById('detail-skills');
    if (!skillsRaw) {
      noteContainer.innerHTML = 'Chưa cập nhật kỹ năng.';
      return;
    }

    try {
      const parsed = JSON.parse(skillsRaw);
      noteContainer.innerHTML = this.renderMarkdown(parsed.notes || '');

      if (parsed.tree && Object.keys(parsed.tree).length > 0) {
        const skillList = MEDIAN_SKILLS[className] || [];
        let badgesHtml = '<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">';
        skillList.forEach(s => {
          const pts = parsed.tree[s.id] || 0;
          if (pts > 0) {
            badgesHtml += `<span style="background: #111315; border: 1px solid var(--accent-gold); color: var(--accent-gold); padding: 4px 10px; border-radius: 4px; font-size: 0.85rem;"><strong>${s.name}:</strong> ${pts}/${s.max}</span>`;
          }
        });
        badgesHtml += '</div>';
        treeContainer.innerHTML = badgesHtml;
      }
    } catch (e) {
      noteContainer.innerHTML = this.renderMarkdown(skillsRaw);
    }
  },

  renderGear(gearRaw) {
    const container = document.getElementById('detail-gear');
    if (!gearRaw) {
      container.innerHTML = '<div class="markdown-rendered">Chưa cập nhật trang bị.</div>';
      return;
    }

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

  exportBuildCode() {
    if (!this.currentBuild) return;
    const b = this.currentBuild;

    let skillTree = {};
    let skillNotes = b.skills_desc;
    try {
      const s = JSON.parse(b.skills_desc);
      skillTree = s.tree || {};
      skillNotes = s.notes || '';
    } catch(e) {}

    let gearObj = {};
    try {
      gearObj = JSON.parse(b.gear_desc);
    } catch(e) {}

    const buildCodePayload = {
      title: b.title,
      class_name: b.class_name,
      patch: b.patch_version,
      stats: b.stats_desc,
      skills_notes: skillNotes,
      skill_tree: skillTree,
      gear: gearObj
    };

    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(buildCodePayload))));
    navigator.clipboard.writeText(encoded).then(() => {
      alert('Đã sao chép Mã Build (Build Code)! Bạn có thể gửi cho bạn bè để họ nhập thẳng vào web.');
    }).catch(() => {
      prompt('Mã Build của bạn (Hãy copy dòng dưới):', encoded);
    });
  },

  exportToDiscord() {
    if (!this.currentBuild) return;
    const b = this.currentBuild;
    const url = window.location.href;

    const discordText = `**[MEDIAN XL BUILD] ${b.title}**\n> **Class:** ${b.class_name} | **Patch:** ${b.patch_version || 'Latest'}\n> **Tác giả:** ${b.author_name || b.author_id}\n> **Xem chi tiết:** ${url}`;

    navigator.clipboard.writeText(discordText).then(() => {
      alert('Đã copy cấu hình bài viết dạng chuẩn Discord!');
    }).catch(() => {
      alert('Không thể sao chép tự động!');
    });
  },

  async toggleVote() {
    const user = Auth.getCurrentUser();
    if (!user) {
      Auth.openModal('login');
      return;
    }
    try {
      const res = await API.voteBuild(this.buildId, user.username);
      if (res.status === 'success') {
        document.getElementById('vote-count').innerText = res.votes_count;
      }
    } catch (e) {
      alert('Lỗi khi thả tim!');
    }
  },

  async deleteBuild() {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này vĩnh viễn?')) return;
    const user = Auth.getCurrentUser();
    const res = await API.deleteBuild(this.buildId, user.username, user.role);
    if (res.status === 'success') {
      alert('Đã xóa thành công!');
      window.location.href = 'index.html';
    } else {
      alert(res.message || 'Không thể xóa bài viết!');
    }
  },

  async loadComments() {
    const res = await API.getComments(this.buildId);
    const list = document.getElementById('comments-list');
    if (res.status === 'success' && res.data) {
      list.innerHTML = '';
      const user = Auth.getCurrentUser();
      if (res.data.length === 0) {
        list.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 10px;">Chưa có bình luận nào.</div>';
        return;
      }
      res.data.forEach(cmt => {
        const canDelete = user && (user.role === 'Admin' || user.username === cmt.username);
        const div = document.createElement('div');
        div.style.padding = '10px 0';
        div.style.borderBottom = '1px solid var(--border-color)';
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <strong style="color:var(--accent-gold); font-size:0.9rem;">${this.escapeHTML(cmt.user_name || cmt.username)}</strong>
            <div>
              <span style="font-size:0.75rem; color:var(--text-muted); margin-right:8px;">${cmt.created_at || ''}</span>
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
    if (!user) {
      Auth.openModal('login');
      return;
    }
    const input = document.getElementById('comment-input');
    const content = input.value.trim();
    if (!content) return;

    input.value = '';
    await API.addComment({
      build_id: this.buildId,
      username: user.username,
      user_name: user.display_name,
      avatar: user.avatar,
      content: content
    });
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
  },

  escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};

document.addEventListener('DOMContentLoaded', () => DetailHandler.init());
