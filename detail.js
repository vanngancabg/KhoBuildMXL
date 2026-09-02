const DetailHandler = {
  buildId: null,
  currentBuild: null,
  activeEditor: null,
  savedRange: null,
  markerId: 'comment-item-cursor-marker',

  async init() {
    this.buildId = new URLSearchParams(window.location.search).get('id');
    if (!this.buildId) {
      alert('Không tìm thấy bài viết!');
      window.location.href = 'index.html';
      return;
    }

    await this.loadBuild();
    
    setTimeout(() => {
      this.trackView();
      this.loadComments();
      this.setupCommentEditor();
    }, 400);
  },

  setupCommentEditor() {
    const ed = document.getElementById('comment-wysiwyg');
    if (!ed) return;
    this.activeEditor = ed;

    const updateSelection = () => {
      this.activeEditor = ed;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        this.savedRange = sel.getRangeAt(0);
      }
    };

    ed.addEventListener('focus', updateSelection);
    ed.addEventListener('mouseup', updateSelection);
    ed.addEventListener('keyup', updateSelection);
  },

  toggleCommentBox() {
    const user = Auth.getCurrentUser();
    if (!user) return Auth.openModal('login');

    const box = document.getElementById('comment-editor-container');
    const btn = document.getElementById('btn-toggle-comment-box');
    if (!box) return;

    if (box.style.display === 'none' || !box.style.display) {
      box.style.display = 'block';
      if (btn) btn.innerText = '✖ Đóng Khung Viết';
      setTimeout(() => document.getElementById('comment-wysiwyg')?.focus(), 100);
    } else {
      box.style.display = 'none';
      document.getElementById('comment-preview-box').style.display = 'none';
      if (btn) btn.innerText = '💬 Viết Bình Luận';
    }
  },

  toggleCommentPreview() {
    const box = document.getElementById('comment-preview-box');
    const contentBox = document.getElementById('comment-preview-content');
    const ed = document.getElementById('comment-wysiwyg');
    if (!box || !contentBox || !ed) return;

    if (box.style.display === 'none' || !box.style.display) {
      const bbcode = this.htmlToBBCode(ed.innerHTML);
      contentBox.innerHTML = this.parseBBCode(bbcode) || '<span style="color:var(--text-muted)">Chưa có nội dung để xem trước</span>';
      box.style.display = 'block';
    } else {
      box.style.display = 'none';
    }
  },

  async trackView() {
    if (!this.buildId) return;
    const viewKey = `d2_viewed_${this.buildId}`;
    if (sessionStorage.getItem(viewKey)) return; 

    try {
      const res = await API.trackBuildView(this.buildId);
      if (res && res.status === 'success') {
        const vEl = document.getElementById('detail-views');
        if (vEl) vEl.innerText = res.views_count;
        sessionStorage.setItem(viewKey, 'true'); 
      }
    } catch(e) {}
  },

  async loadBuild() {
    const loading = document.getElementById('detail-loading');
    const wrapper = document.getElementById('detail-wrapper');

    try {
      const res = await API.getBuildDetail(this.buildId);
      if (res && res.status === 'success' && res.data) {
        this.currentBuild = res.data;
        this.renderBuildData(res.data);
        if (loading) loading.style.display = 'none';
        if (wrapper) wrapper.style.display = 'block';
      } else {
        if (loading) {
          loading.innerHTML = `
            <div style="padding: 40px 10px;">
              <p style="color: #ff8b8b; font-size: 1.1rem; margin-bottom: 12px;">Bài viết không tồn tại hoặc đã bị xóa!</p>
              <a href="index.html" class="btn btn-primary">⬅️ Trở về Trang Chủ</a>
            </div>
          `;
        }
      }
    } catch (err) {
      if (loading) loading.innerHTML = '<div style="color: #ff8b8b;">Lỗi kết nối máy chủ! Vui lòng tải lại trang.</div>';
    }
  },

  renderBuildData(b) {
    const saved = localStorage.getItem('d2_current_user');
    let user = null;
    if (saved) {
      try { user = JSON.parse(saved); } catch (e) {}
    }

    let statsObj = { season: '', patch: '', purpose: 'Speed Farming', difficulty: 'Dễ', intro: '', pros: '', cons: '', str: '0', dex: '0', vit: '0', ene: '0', strategy: '' };
    try {
      if (b.stats_desc && typeof b.stats_desc === 'string' && b.stats_desc.startsWith('{')) {
        statsObj = { ...statsObj, ...JSON.parse(b.stats_desc) };
      } else {
        statsObj.intro = b.stats_desc || '';
      }
    } catch (e) {
      statsObj.intro = b.stats_desc || '';
    }

    let gearObj = { lv0_50: '', lv50_135: '', lv135plus: '' };
    try {
      if (b.gear_desc && typeof b.gear_desc === 'string' && b.gear_desc.startsWith('{')) {
        gearObj = { ...gearObj, ...JSON.parse(b.gear_desc) };
      } else {
        gearObj.lv0_50 = b.gear_desc || '';
      }
    } catch (e) {
      gearObj.lv0_50 = b.gear_desc || '';
    }

    let seasonDisplay = statsObj.season || b.patch_version || 'Mới nhất';
    if (seasonDisplay && !seasonDisplay.toLowerCase().startsWith('mùa') && !seasonDisplay.toLowerCase().startsWith('season')) {
      seasonDisplay = 'Mùa ' + seasonDisplay;
    }

    document.getElementById('detail-title').innerText = b.title || '';
    document.getElementById('detail-class').innerText = b.class_name || 'Class';
    document.getElementById('detail-season-patch').innerText = seasonDisplay;
    document.getElementById('detail-purpose').innerText = statsObj.purpose || 'Speed Farming';
    document.getElementById('detail-difficulty').innerText = statsObj.difficulty || 'Dễ';
    document.getElementById('detail-author').innerText = b.author_name || b.author_username || 'Ẩn danh';
    document.getElementById('detail-time').innerText = b.updated_at ? String(b.updated_at).split(' ')[0] : '';
    document.getElementById('detail-views').innerText = b.views_count || 0;

    const userVoted = user && b.votes && String(b.votes).split(',').map(x => x.trim().toLowerCase()).includes(user.username.toLowerCase());
    const btnVote = document.getElementById('btn-vote');
    const voteText = document.getElementById('vote-text');
    const voteCount = document.getElementById('vote-count');
    if (voteCount) voteCount.innerText = b.votes_count || 0;
    if (userVoted && btnVote) {
      btnVote.classList.add('btn-primary');
      if (voteText) voteText.innerText = 'Đã Thích';
    }

    const isAuthor = user && (String(user.username).toLowerCase() === String(b.author_username || b.author_id).toLowerCase() || user.role === 'Admin');
    const authorActions = document.getElementById('author-actions');
    const btnEdit = document.getElementById('btn-edit');
    if (isAuthor && authorActions) {
      authorActions.style.display = 'inline-flex';
      if (btnEdit) btnEdit.href = `create-build.html?edit=${encodeURIComponent(b.build_id)}`;
    }

    document.getElementById('detail-intro').innerHTML = this.parseBBCode(statsObj.intro || 'Chưa có giới thiệu.');
    document.getElementById('detail-pros').innerHTML = this.parseBBCode(statsObj.pros || '• Chưa cập nhật');
    document.getElementById('detail-cons').innerHTML = this.parseBBCode(statsObj.cons || '• Chưa cập nhật');

    document.getElementById('detail-str').innerText = statsObj.str || '0';
    document.getElementById('detail-dex').innerText = statsObj.dex || '0';
    document.getElementById('detail-vit').innerText = statsObj.vit || '0';
    document.getElementById('detail-ene').innerText = statsObj.ene || '0';

    document.getElementById('detail-skills').innerHTML = this.parseBBCode(b.skills_desc || 'Chưa cập nhật kỹ năng.');

    document.getElementById('detail-gear-0-50').innerHTML = this.parseBBCode(gearObj.lv0_50 || 'Chưa cập nhật');
    if (gearObj.lv50_135) {
      document.getElementById('detail-gear-50-135').innerHTML = this.parseBBCode(gearObj.lv50_135);
      document.getElementById('box-gear-50-135').style.display = 'block';
    } else {
      document.getElementById('box-gear-50-135').style.display = 'none';
    }
    if (gearObj.lv135plus) {
      document.getElementById('detail-gear-135plus').innerHTML = this.parseBBCode(gearObj.lv135plus);
      document.getElementById('box-gear-135plus').style.display = 'block';
    } else {
      document.getElementById('box-gear-135plus').style.display = 'none';
    }

    let hasStrategy = Boolean(statsObj.strategy && statsObj.strategy.trim());
    let hasVideo = Boolean(b.video_url && (b.video_url.includes('youtube.com') || b.video_url.includes('youtu.be')));

    if (hasStrategy || hasVideo) {
      document.getElementById('box-strategy-card').style.display = 'block';
      if (hasStrategy) {
        document.getElementById('detail-strategy').innerHTML = this.parseBBCode(statsObj.strategy);
      }
      if (hasVideo) {
        const match = b.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
        if (match) {
          const vContainer = document.getElementById('video-container');
          vContainer.style.display = 'block';
          vContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${match[1]}" allowfullscreen></iframe>`;
        }
      }
    } else {
      document.getElementById('box-strategy-card').style.display = 'none';
    }
  },

  async handleVote() {
    const user = Auth.getCurrentUser();
    if (!user) return Auth.openModal('login');

    const btn = document.getElementById('btn-vote');
    const countEl = document.getElementById('vote-count');
    const textEl = document.getElementById('vote-text');

    try {
      const res = await API.voteBuild(this.buildId, user.username);
      if (res && res.status === 'success') {
        if (countEl) countEl.innerText = res.votes_count;
        if (res.is_voted) {
          if (btn) btn.classList.add('btn-primary');
          if (textEl) textEl.innerText = 'Đã Thích';
        } else {
          if (btn) btn.classList.remove('btn-primary');
          if (textEl) textEl.innerText = 'Thích bài viết';
        }
      }
    } catch (e) {}
  },

  async deleteBuild() {
    const user = Auth.getCurrentUser();
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này? Hành động không thể hoàn tác!')) return;

    try {
      const res = await API.deleteBuild(this.buildId, user.username, user.role);
      if (res && res.status === 'success') {
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
      if (res && res.status === 'success' && Array.isArray(res.data)) {
        this.renderCommentsList(res.data);
      }
    } catch (e) {}
  },

  renderCommentsList(list) {
    const box = document.getElementById('comments-list');
    const countHeader = document.getElementById('detail-comment-count');
    if (countHeader) countHeader.innerText = list.length;
    if (!box) return;

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
          ${this.parseBBCode(c.content)}
        </div>
      `;
      box.appendChild(div);
    });
  },

  async handleAddComment() {
    const user = Auth.getCurrentUser();
    if (!user) return Auth.openModal('login');

    const ed = document.getElementById('comment-wysiwyg');
    if (!ed) return;
    const bbcodeContent = this.htmlToBBCode(ed.innerHTML).trim();
    if (!bbcodeContent) return alert('Vui lòng nhập nội dung bình luận!');

    const btn = document.getElementById('btn-submit-comment');
    btn.disabled = true;
    btn.innerText = 'Đang gửi...';

    try {
      const res = await API.addComment({
        build_id: this.buildId,
        username: user.username,
        user_name: user.display_name,
        avatar: user.avatar,
        content: bbcodeContent
      });

      if (res && res.status === 'success') {
        ed.innerHTML = '';
        this.toggleCommentBox();
        await this.loadComments();
      }
    } catch (e) {
      alert('Lỗi gửi bình luận!');
    } finally {
      btn.disabled = false;
      btn.innerText = '🚀 Gửi Bình Luận';
    }
  },

  async deleteComment(commentId) {
    const user = Auth.getCurrentUser();
    if (!confirm('Xóa bình luận này?')) return;

    try {
      const res = await API.deleteComment(commentId, user.username, user.role);
      if (res && res.status === 'success') {
        await this.loadComments();
      }
    } catch (e) {
      alert('Lỗi xóa bình luận!');
    }
  },

  // Hỗ trợ công cụ soạn thảo cho bình luận
  execCmd(command, value = null) {
    this.restoreSelection();
    document.execCommand(command, false, value);
    this.saveSelection();
  },

  applyTextColor(colorHex) {
    this.restoreSelection();
    document.execCommand('foreColor', false, colorHex);
    this.saveSelection();
  },

  insertTextAtCursor(text) {
    this.restoreSelection();
    document.execCommand('insertText', false, text);
    this.saveSelection();
  },

  insertLink() {
    this.restoreSelection();
    let url = prompt('Nhập đường link liên kết (URL):', 'https://');
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    const sel = window.getSelection();
    let linkText = sel.toString().trim() || url;
    const linkHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold); text-decoration:underline;">${linkText}</a>&nbsp;`;
    document.execCommand('insertHTML', false, linkHTML);
  },

  handleTriggerItemTag() {
    this.saveSelection();
    this.insertCursorMarker();
    if(typeof ItemTooltipManager !== 'undefined'){
      ItemTooltipManager.openPickerModal((selectedItemName) => {
        this.insertItemAtMarker(selectedItemName);
      });
    }
  },

  insertItemAtMarker(selectedItemName) {
    const marker = document.getElementById(this.markerId);
    const cleanKey = selectedItemName.replace(/"/g, '').trim().toLowerCase();
    const itemSpan = document.createElement('span');
    itemSpan.className = 'item-hover-trigger';
    itemSpan.setAttribute('data-item-key', cleanKey);
    itemSpan.innerText = selectedItemName;
    const space = document.createTextNode('\u00A0');

    if (marker && marker.parentNode) {
      marker.parentNode.insertBefore(itemSpan, marker);
      marker.parentNode.insertBefore(space, marker);
      marker.remove();
    } else if (this.activeEditor) {
      this.activeEditor.appendChild(itemSpan);
      this.activeEditor.appendChild(space);
    }
    this.saveSelection();
  },

  insertCursorMarker() {
    this.removeCursorMarker();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const marker = document.createElement('span');
      marker.id = this.markerId;
      marker.style.display = 'none';
      range.insertNode(marker);
    }
  },

  removeCursorMarker() {
    const m = document.getElementById(this.markerId);
    if (m) m.remove();
  },

  async handleCommentImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const statusEl = document.getElementById('comment-upload-status');
      if (statusEl) { statusEl.style.display = 'inline'; statusEl.innerText = '⏳ Đang tải ảnh...'; }
      
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];
        try {
          const res = await API.uploadImage(base64Data, file.name, file.type);
          if (res && res.status === 'success' && res.url) {
            this.restoreSelection();
            const imgHTML = `<img src="${res.url}" alt="Image" style="max-width:100%; border-radius:4px; margin:6px 0;"><p><br></p>`;
            document.execCommand('insertHTML', false, imgHTML);
            if (statusEl) statusEl.style.display = 'none';
          } else {
            alert('Lỗi tải ảnh!');
            if (statusEl) statusEl.style.display = 'none';
          }
        } catch(err) {
          alert('Lỗi mạng!');
          if (statusEl) statusEl.style.display = 'none';
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  },

  saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) this.savedRange = sel.getRangeAt(0);
  },

  restoreSelection() {
    if (this.activeEditor) this.activeEditor.focus();
    if (this.savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(this.savedRange);
    }
  },

  rgbToHex(color) {
    if (!color) return '';
    if (color.startsWith('#')) return color;
    const rgb = color.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
      return '#' + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1);
    }
    return color;
  },

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
        .replace(/\[spoiler=(.*?)\]([\s\S]*?)\[\/spoiler\]/gi, '<details class="bb-spoiler-box"><summary class="bb-spoiler-title">$1</summary><div class="bb-spoiler-content">$2</div></details>')
        .replace(/\[size=(\d+)(?:px)?\]([\s\S]*?)\[\/size\]/gi, '<span style="font-size:$1px;">$2</span>')
        .replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/gi, '<span style="color:$1;">$2</span>')
        .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>')
        .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>')
        .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>')
        .replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<s>$1</s>');
    } while (str !== prev);

    str = str.replace(/\[list\]([\s\S]*?)\[\/list\]/gi, (match, listBody) => {
      const items = listBody.split(/\[\*\]/).filter(item => item.trim().length > 0);
      return `<ul class="bb-list">${items.map(it => `<li>${it.trim()}</li>`).join('')}</ul>`;
    });

    str = str.replace(/\[youtube\]([\s\S]*?)\[\/youtube\]/gi, (match, urlOrId) => {
      const raw = urlOrId.trim();
      let videoId = raw;
      const yMatch = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
      if (yMatch) videoId = yMatch[1];
      return `<div class="bb-video-embed"><iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe></div>`;
    });

    str = str
      .replace(/\[img\](.*?)\[\/img\]/gi, '<img src="$1" alt="Image" style="max-width:100%; border-radius:4px; margin:6px 0;">')
      .replace(/\[url=(.*?)\]([\s\S]*?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold); text-decoration:underline;">$2</a>')
      .replace(/\[url\]([\s\S]*?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold); text-decoration:underline;">$1</a>');

    str = str.replace(/\[item\]([\s\S]*?)\[\/item\]/gi, (match, innerContent) => {
      const cleanKey = innerContent
        .replace(/<[^>]*>/g, '')
        .replace(/\[\/?[^\]]+\]/g, '')
        .replace(/"/g, '')
        .trim()
        .toLowerCase();
      return `<span class="item-hover-trigger" data-item-key="${cleanKey}">${innerContent}</span>`;
    });

    let finalHtml = str.replace(/\n/g, '<br>');
    finalHtml = finalHtml.replace(/(?:<br\s*\/?>\s*)+(<\/?(?:div|ul|li|details|summary|p)[^>]*>)/gi, '$1');
    finalHtml = finalHtml.replace(/(<\/?(?:div|ul|li|details|summary|p)[^>]*>)\s*(?:<br\s*\/?>\s*)+/gi, '$1');
    
    return finalHtml;
  },

  htmlToBBCode(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const serializeNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const tag = node.tagName.toLowerCase();
      let inner = '';
      node.childNodes.forEach(child => { inner += serializeNode(child); });

      if (node.classList.contains('item-hover-trigger')) {
        let resItem = `[item]${inner.trim()}[/item]`;
        if (node.style && node.style.color) {
          const hex = this.rgbToHex(node.style.color);
          if (hex) resItem = `[color=${hex}]${resItem}[/color]`;
        }
        return resItem;
      }

      let res = inner;
      if (node.style) {
        if (node.style.fontWeight === 'bold' || parseInt(node.style.fontWeight, 10) >= 700) res = `[b]${res}[/b]`;
        if (node.style.fontStyle === 'italic') res = `[i]${res}[/i]`;
        if (node.style.textDecoration && node.style.textDecoration.includes('underline')) res = `[u]${res}[/u]`;
        if (node.style.textDecoration && node.style.textDecoration.includes('line-through')) res = `[s]${res}[/s]`;
        if (node.style.color) {
          const hex = this.rgbToHex(node.style.color);
          if (hex) res = `[color=${hex}]${res}[/color]`;
        }
      }

      switch (tag) {
        case 'strong': case 'b': return `[b]${res}[/b]`;
        case 'em': case 'i': return `[i]${res}[/i]`;
        case 'u': return `[u]${res}[/u]`;
        case 's': case 'strike': return `[s]${res}[/s]`;
        case 'a': return `[url=${node.getAttribute('href') || ''}]${res}[/url]`;
        case 'img': return `[img]${node.getAttribute('src') || ''}[/img]`;
        case 'br': return '\n';
        case 'p': case 'div': return '\n' + res;
        default: return res;
      }
    };

    let result = '';
    temp.childNodes.forEach(child => { result += serializeNode(child); });
    return result.replace(/\n{3,}/g, '\n\n').trim();
  },

  escapeHTML(str) { return str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; }
};

document.addEventListener('DOMContentLoaded', () => DetailHandler.init());
