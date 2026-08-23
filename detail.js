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

        // Render toàn bộ nội dung BBCode chính
        document.getElementById('detail-stats').innerHTML = this.parseBBCode(b.stats_desc || 'Chưa có nội dung.');

        // Render phân bổ điểm Skill Tree
        this.renderSkills(b.skills_desc, b.class_name);

        // Ẩn bảng gear cũ vì đã gộp vào khung BBCode
        const gearSection = document.getElementById('detail-gear');
        if (gearSection) {
          gearSection.parentElement.style.display = 'none';
        }

        // Quyền Sửa / Xóa cho Tác giả & Admin
        const user = Auth.getCurrentUser();
        if (user && (String(user.username).toLowerCase() === String(b.author_id).toLowerCase() || user.role === 'Admin')) {
          const authorActions = document.getElementById('author-actions');
          const editBtn = document.getElementById('btn-edit');
          if (authorActions && editBtn) {
            authorActions.style.display = 'flex';
            editBtn.href = `create-build.html?edit=${b.build_id}`;
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
    const skillCard = document.getElementById('detail-skills')?.parentElement;

    if (!skillsRaw) {
      if (skillCard) skillCard.style.display = 'none';
      return;
    }

    try {
      const parsed = JSON.parse(skillsRaw);
      if (parsed.tree && Object.keys(parsed.tree).length > 0) {
        const skillList = MEDIAN_SKILLS[className] || [];
        let badgesHtml = '<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">';
        let hasPoints = false;

        skillList.forEach(s => {
          const pts = parsed.tree[s.id] || 0;
          if (pts > 0) {
            hasPoints = true;
            badgesHtml += `<span style="background: #111315; border: 1px solid var(--accent-gold); color: var(--accent-gold); padding: 4px 10px; border-radius: 4px; font-size: 0.85rem;"><strong>${s.name}:</strong> ${pts}/${s.max}</span>`;
          }
        });
        badgesHtml += '</div>';

        if (hasPoints && treeContainer) {
          treeContainer.innerHTML = badgesHtml;
          if (skillCard) skillCard.style.display = 'block';
        } else if (skillCard) {
          skillCard.style.display = 'none';
        }
      } else if (skillCard) {
        skillCard.style.display = 'none';
      }
    } catch (e) {
      if (skillCard) skillCard.style.display = 'none';
    }
  },

  exportBuildCode() {
    if (!this.currentBuild) return;
    const b = this.currentBuild;

    let skillTree = {};
    try {
      const s = JSON.parse(b.skills_desc);
      skillTree = s.tree || {};
    } catch(e) {}

    const buildCodePayload = {
      title: b.title,
      class_name: b.class_name,
      patch: b.patch_version,
      content: b.stats_desc,
      skill_tree: skillTree
    };

    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(buildCodePayload))));
    navigator.clipboard.writeText(encoded).then(() => {
      alert('Đã sao chép Mã Build! Bạn có thể gửi mã này cho thành viên khác nhập vào web.');
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
          <div>${this.parseBBCode(cmt.content)}</div>
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

  parseBBCode(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\[b\](.*?)\[\/b\]/gi, '<strong>$1</strong>')
      .replace(/\[i\](.*?)\[\/i\]/gi, '<em>$1</em>')
      .replace(/\[u\](.*?)\[\/u\]/gi, '<u>$1</u>')
      .replace(/\[item_u\](.*?)\[\/item_u\]/gi, '<span class="item-unique">$1</span>')
      .replace(/\[rw\](.*?)\[\/rw\]/gi, '<span class="item-runeword">$1</span>')
      .replace(/\[set\](.*?)\[\/set\]/gi, '<span class="item-set">$1</span>')
      .replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, '<blockquote>$1</blockquote>')
      .replace(/\[color=(.*?)\]([\s\S]*?)\[\/color\]/gi, '<span style="color:$1;">$2</span>')
      .replace(/\[size=(.*?)\]([\s\S]*?)\[\/size\]/gi, '<span style="font-size:$1px;">$2</span>')
      .replace(/\[img\](.*?)\[\/img\]/gi, '<img src="$1" alt="Image">')
      .replace(/\[url=(.*?)\](.*?)\[\/url\]/gi, '<a href="$1" target="_blank" style="color:var(--accent-gold);">$2</a>')
      .replace(/\[youtube\](.*?)\[\/youtube\]/gi, (match, url) => {
        const idMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
        const id = idMatch ? idMatch[2] : url;
        return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:10px 0;"><iframe style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe></div>`;
      })
      .replace(/\[spoiler=(.*?)\]([\s\S]*?)\[\/spoiler\]/gi, '<details style="background:#111315;border:1px solid var(--border-color);padding:8px;border-radius:4px;margin:8px 0;"><summary style="cursor:pointer;color:var(--accent-gold);font-weight:bold;">$1</summary><div style="margin-top:8px;">$2</div></details>')
      .replace(/\n/g, '<br>');
  },

  escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};

document.addEventListener('DOMContentLoaded', () => DetailHandler.init());
