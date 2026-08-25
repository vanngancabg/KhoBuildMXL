const DetailHandler = {
  buildId: null,
  currentBuild: null,
  allComments: [],
  currentCmtPage: 1,
  cmtPageSize: 10,

  async init() {
    const user = Auth.getCurrentUser();
    const loginGate = document.getElementById('detail-login-gate');
    const loading = document.getElementById('detail-loading');

    if (!user) {
      if (loading) loading.style.display = 'none';
      if (loginGate) loginGate.style.display = 'block';
      return;
    }

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

        let cleanSeason = 'Mùa mới';
        if (b.patch_version) {
          const raw = String(b.patch_version).split('-')[0].trim();
          if (raw.toLowerCase().startsWith('season') || raw.toLowerCase().startsWith('mùa')) {
            cleanSeason = raw.replace(/season/i, 'Mùa').trim();
          } else {
            cleanSeason = 'Mùa ' + raw;
          }
        }
        document.getElementById('detail-season-patch').innerText = cleanSeason;
        
        const authorLink = document.getElementById('detail-author');
        if (authorLink) {
          authorLink.innerHTML = `<a href="profile.html?user=${encodeURIComponent(b.author_id)}" style="color: var(--accent-gold); text-decoration: underline;">${this.escapeHTML(b.author_name || b.author_id)}</a>`;
        }

        document.getElementById('detail-time').innerText = b.updated_at || '';
        document.getElementById('detail-views').innerText = b.views_count || 0;
        document.getElementById('vote-count').innerText = b.votes_count || 0;

        const currentUser = Auth.getCurrentUser();
        const btnVote = document.getElementById('btn-vote');
        if (currentUser && b.votes) {
          const voteList = String(b.votes).toLowerCase().split(',');
          if (voteList.includes(currentUser.username.toLowerCase())) {
            btnVote.classList.add('btn-primary');
          } else {
            btnVote.classList.remove('btn-primary');
          }
        }

        let statsObj = {};
        try {
          statsObj = JSON.parse(b.stats_desc);
        } catch(e) {
          statsObj = { intro: b.stats_desc };
        }

        document.getElementById('detail-purpose').innerText = statsObj.purpose || 'Farming';
        document.getElementById('detail-difficulty').innerText = statsObj.difficulty || 'Bình thường';
        document.getElementById('detail-intro').innerHTML = this.parseBBCode(statsObj.intro || 'Chưa có giới thiệu.');
        document.getElementById('detail-pros').innerHTML = this.parseBBCode(statsObj.pros || '• Chưa cập nhật.');
        document.getElementById('detail-cons').innerHTML = this.parseBBCode(statsObj.cons || '• Chưa cập nhật.');

        document.getElementById('detail-str').innerText = statsObj.str || 'Đủ mặc đồ';
        document.getElementById('detail-dex').innerText = statsObj.dex || 'Max Block';
        document.getElementById('detail-vit').innerText = statsObj.vit || 'Toàn bộ điểm';
        document.getElementById('detail-ene').innerText = statsObj.ene || '0';

        document.getElementById('detail-skills').innerHTML = this.parseBBCode(b.skills_desc || 'Chưa cập nhật kỹ năng.');

        let gearObj = {};
        try {
          gearObj = JSON.parse(b.gear_desc);
        } catch(e) {
          gearObj = { lv0_50: b.gear_desc };
        }

        const g1 = gearObj.lv0_50 || gearObj.lv105;
        const g2 = gearObj.lv50_135 || gearObj.lv120;
        const g3 = gearObj.lv135plus || gearObj.lv130 || gearObj.lv150;

        if (g1) {
          document.getElementById('detail-gear-0-50').innerHTML = this.parseBBCode(g1);
        } else {
          document.getElementById('box-gear-0-50').style.display = 'none';
        }

        if (g2) {
          document.getElementById('detail-gear-50-135').innerHTML = this.parseBBCode(g2);
        } else {
          document.getElementById('box-gear-50-135').style.display = 'none';
        }

        if (g3) {
          document.getElementById('detail-gear-135plus').innerHTML = this.parseBBCode(g3);
        } else {
          document.getElementById('box-gear-135plus').style.display = 'none';
        }

        if (statsObj.strategy) {
          document.getElementById('detail-strategy').innerHTML = this.parseBBCode(statsObj.strategy);
        } else {
          document.getElementById('detail-strategy').style.display = 'none';
        }

        if (b.video_url && (b.video_url.includes('youtube.com') || b.video_url.includes('youtu.be'))) {
          const videoMatch = b.video_url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
          const videoId = videoMatch ? videoMatch[2] : null;
          if (videoId && videoId.length === 11) {
            const vContainer = document.getElementById('video-container');
            vContainer.innerHTML = `<iframe style="position: absolute; top:0; left:0; width:100%; height:100%; border:0;" src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>`;
            vContainer.style.display = 'block';
          }
        }

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

  exportBuildCode() {
    if (!this.currentBuild) return;
    const b = this.currentBuild;
    const buildCodePayload = {
      title: b.title,
      class_name: b.class_name,
      patch: b.patch_version,
      stats: b.stats_desc,
      skills: b.skills_desc,
      gear: b.gear_desc
    };

    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(buildCodePayload))));
    navigator.clipboard.writeText(encoded).then(() => {
      alert('Đã sao chép Mã Build (Build Code)!');
    }).catch(() => {
      prompt('Mã Build của bạn:', encoded);
    });
  },

  exportToDiscord() {
    if (!this.currentBuild) return;
    const b = this.currentBuild;
    const url = window.location.href;
    const discordText = `**[MEDIAN XL BUILD] ${b.title}**\n> **Class:** ${b.class_name} | **Mùa:** ${b.patch_version}\n> **Tác giả:** ${b.author_name || b.author_id}\n> **Xem bài viết:** ${url}`;

    navigator.clipboard.writeText(discordText).then(() => {
      alert('Đã copy bài viết chuẩn định dạng Discord!');
    }).catch(() => {
      alert('Không thể sao chép tự động!');
    });
  },

  async toggleVote() {
    const user = Auth.getCurrentUser();
    if (!user) return Auth.openModal('login');
    const btnVote = document.getElementById('btn-vote');
    btnVote.disabled = true;

    try {
      const res = await API.voteBuild(this.buildId, user.username);
      if (res.status === 'success') {
        document.getElementById('vote-count').innerText = res.votes_count;
        if (res.is_voted) {
          btnVote.classList.add('btn-primary');
        } else {
          btnVote.classList.remove('btn-primary');
        }
      }
    } catch (e) {
      alert('Lỗi khi thả tim!');
    } finally {
      btnVote.disabled = false;
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
    if (res.status === 'success' && res.data) {
      this.allComments = res.data;
      document.getElementById('detail-comment-count').innerText = this.allComments.length;
      this.renderCommentsPage();
    }
  },

  renderCommentsPage() {
    const list = document.getElementById('comments-list');
    const pagination = document.getElementById('comment-pagination');
    const user = Auth.getCurrentUser();
    list.innerHTML = '';

    if (this.allComments.length === 0) {
      list.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 10px;">Chưa có bình luận nào.</div>';
      pagination.style.display = 'none';
      return;
    }

    const startIndex = (this.currentCmtPage - 1) * this.cmtPageSize;
    const pagedComments = this.allComments.slice(startIndex, startIndex + this.cmtPageSize);

    pagedComments.forEach(cmt => {
      const canDelete = user && (user.role === 'Admin' || user.username === cmt.username);
      const div = document.createElement('div');
      div.style.padding = '10px 0';
      div.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <strong style="color:var(--accent-gold); font-size:0.9rem;">${this.escapeHTML(cmt.user_name || cmt.username)}</strong>
          <div>
            <span style="font-size:0.75rem; color:var(--text-muted); margin-right:8px;">${cmt.created_at || ''}</span>
            ${canDelete ? `<button class="btn btn-sm btn-danger" onclick="DetailHandler.deleteComment('${cmt.comment_id}')">Xóa</button>` : ''}
          </div>
        </div>
        <div class="markdown-rendered">${this.parseBBCode(cmt.content)}</div>
      `;
      list.appendChild(div);
    });

    const totalPages = Math.ceil(this.allComments.length / this.cmtPageSize);
    if (totalPages > 1) {
      pagination.style.display = 'flex';
      let html = '';
      if (this.currentCmtPage > 1) {
        html += `<button class="page-btn" onclick="DetailHandler.goToCmtPage(${this.currentCmtPage - 1})">« Trước</button>`;
      }
      for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === this.currentCmtPage ? 'active' : ''}" onclick="DetailHandler.goToCmtPage(${i})">${i}</button>`;
      }
      if (this.currentCmtPage < totalPages) {
        html += `<button class="page-btn" onclick="DetailHandler.goToCmtPage(${this.currentCmtPage + 1})">Sau »</button>`;
      }
      pagination.innerHTML = html;
    } else {
      pagination.style.display = 'none';
    }
  },

  goToCmtPage(page) {
    this.currentCmtPage = page;
    this.renderCommentsPage();
  },

  async postComment() {
    const user = Auth.getCurrentUser();
    if (!user) return Auth.openModal('login');
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
    this.currentCmtPage = 1;
    await this.loadComments();
  },

  async deleteComment(id) {
    if (!confirm('Xóa bình luận này?')) return;
    const user = Auth.getCurrentUser();
    await API.deleteComment(id, user.username, user.role);
    await this.loadComments();
  },

  // BBCODE PARSER BẢO TOÀN THỤT LỀ, DANH SÁCH VÀ LINK CHUẨN XÁC 100%
  parseBBCode(text) {
    if (!text) return '';
    let str = String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    let prev;
    do {
      prev = str;
      str = str
        .replace(/\[indent\]([\s\S]*?)\[\/indent\]/gi, '<span class="bb-indent">$1</span>')
        .replace(/\[quote=(.*?)\]([\s\S]*?)\[\/quote\]/gi, '<div class="bb-quote-container"><div class="bb-quote-header">💬 $1 đã viết:</div><div class="bb-quote-body">$2</div></div>')
        .replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, '<div class="bb-quote-container"><div class="bb-quote-header">💬 Trích dẫn:</div><div class="bb-quote-body">$1</div></div>')
        .replace(/\[spoiler=(.*?)\]([\s\S]*?)\[\/spoiler\]/gi, '<details class="bb-spoiler-box"><summary class="bb-spoiler-title">$1</summary><div class="bb-spoiler-content">$2</div></details>');
    } while (str !== prev);

    str = str.replace(/\[list\]([\s\S]*?)\[\/list\]/gi, (match, listBody) => {
      const items = listBody.split(/\[\*\]/).filter(item => item.trim().length > 0);
      const liHtml = items.map(it => `<li>${it.trim()}</li>`).join('');
      return `<ul class="bb-list">${liHtml}</ul>`;
    });

    str = str.replace(/\[youtube\]([\s\S]*?)\[\/youtube\]/gi, (match, urlOrId) => {
      const raw = urlOrId.trim();
      let videoId = raw;
      const yMatch = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (yMatch) videoId = yMatch[1];
      return `<div class="bb-video-embed"><iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe></div>`;
    });

    str = str
      .replace(/\[color=([#\w]+)\]([\s\S]*?)\[\/color\]/gi, '<span style="color:$1;">$2</span>')
      .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>')
      .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>')
      .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>')
      .replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<s>$1</s>')
      .replace(/\[rw\]([\s\S]*?)\[\/rw\]/gi, '<span class="item-runeword">$1</span>')
      .replace(/\[set\]([\s\S]*?)\[\/set\]/gi, '<span class="item-set">$1</span>')
      .replace(/\[img\](.*?)\[\/img\]/gi, '<img src="$1" alt="Image" style="max-width:100%; border-radius:4px; margin:6px 0;">')
      .replace(/\[url=(.*?)\]([\s\S]*?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold); text-decoration:underline;">$2</a>')
      .replace(/\[url\]([\s\S]*?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold); text-decoration:underline;">$1</a>');

    str = str.replace(/\[item\]([\s\S]*?)\[\/item\]/gi, (match, innerContent) => {
      const cleanKey = innerContent.replace(/<[^>]*>/g, '').trim().toLowerCase();
      return `<span class="item-hover-trigger" data-item-key="${cleanKey}">${innerContent}</span>`;
    });

    return str.replace(/\n/g, '<br>');
  },

  escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};

document.addEventListener('DOMContentLoaded', () => DetailHandler.init());
