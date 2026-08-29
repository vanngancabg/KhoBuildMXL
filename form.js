const FormHandler = {
  editBuildId: null,
  activeEditor: null,
  savedRange: null,
  pendingItemName: '',
  isUpdatingItem: false,
  autoSaveTimer: null,
  markerId: 'item-insert-cursor-marker',
  sessionUploadedImages: [], // Biến theo dõi các ảnh rác sinh ra trong phiên gõ

  defaultGearTemplate: 
`1. VŨ KHÍ CHÍNH: 

- VŨ KHÍ PHỤ: 

2. MŨ: 

3. ÁO GIÁP: 

4. GĂNG TAY: 

5. THẮT LƯNG: 

6. GIẦY: 

7. AMULET: 

8. NHẪN: 

9. JEWEL, GEM ...: 

10. MO, UMO ...: `,

  async init() {
    const user = Auth.getCurrentUser();
    if (!user) {
      document.getElementById('login-warning').style.display = 'block';
      document.getElementById('build-form').style.opacity = '0.4';
      document.getElementById('build-form').style.pointerEvents = 'none';
      return;
    }

    this.setupWysiwygEditors();
    this.setupGlobalPasteAndEvents();
    this.setupModalOutsideClick();

    const editId = new URLSearchParams(window.location.search).get('edit');
    if (editId) {
      this.editBuildId = editId;
      document.getElementById('form-heading').innerText = 'EDIT TOPIC / SỬA HƯỚNG DẪN BUILD';
      await this.loadData(editId, user);
    } else {
      this.populateDefaultGearTemplates();
      await this.loadCloudDraft(user);
      this.startAutoSave(user);
    }
  },

  populateDefaultGearTemplates() {
    const g1 = document.getElementById('gear-lv0-50');
    const g2 = document.getElementById('gear-lv50-135');
    const g3 = document.getElementById('gear-lv135plus');

    if (g1 && !g1.innerText.trim()) g1.innerText = this.defaultGearTemplate;
    if (g2 && !g2.innerText.trim()) g2.innerText = this.defaultGearTemplate;
    if (g3 && !g3.innerText.trim()) g3.innerText = this.defaultGearTemplate;
  },

  setupWysiwygEditors() {
    const editors = document.querySelectorAll('.wysiwyg-editor');
    editors.forEach(ed => {
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

      ed.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          this.execIndent();
        }
      });
    });

    this.activeEditor = document.getElementById('build-intro');
  },

  setupGlobalPasteAndEvents() {
    window.addEventListener('paste', async (e) => {
      const itemModal = document.getElementById('modal-item-upload');
      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
      if (!items) return;

      let imageFile = null;
      for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
          imageFile = item.getAsFile();
          break;
        }
      }

      if (!imageFile) return;

      if (itemModal && itemModal.classList.contains('active')) {
        e.preventDefault();
        await this.uploadItemToDatabase(imageFile);
        return;
      }

      const activeEl = document.activeElement;
      if (activeEl && activeEl.classList.contains('wysiwyg-editor')) {
        e.preventDefault();
        await this.processImageFile(imageFile);
        return;
      }
    });
  },

  setupModalOutsideClick() {
    const previewModal = document.getElementById('modal-preview-full');
    if (previewModal) {
      previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) this.closePreviewModal();
      });
    }

    const itemModal = document.getElementById('modal-item-upload');
    if (itemModal) {
      itemModal.addEventListener('click', (e) => {
        if (e.target === itemModal) this.closeItemModal();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closePreviewModal();
        this.closeItemModal();
        ItemTooltipManager.closePickerModal(true);
      }
    });
  },

  startAutoSave(user) {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    this.autoSaveTimer = setInterval(async () => {
      if (!this.editBuildId) {
        await this.silentSaveCloudDraft(user);
      }
    }, 30000);
  },

  async silentSaveCloudDraft(user) {
    const draft = this.collectFormData();
    if (!draft.title && !draft.intro) return;

    try {
      const res = await API.saveCloudDraft(user.username, draft);
      if (res && res.status === 'success') {
        const statusEl = document.getElementById('upload-status');
        if (statusEl) {
          statusEl.style.display = 'inline';
          statusEl.innerText = `☁️ Đã tự động lưu nháp lúc ${res.updated_at.split(' ')[0]}`;
          setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
        }
      }
    } catch(e) {}
  },

  async saveDraft() {
    const user = Auth.getCurrentUser();
    if (!user) return Auth.openModal('login');

    const draft = this.collectFormData();
    localStorage.setItem('d2_build_draft_wysiwyg', JSON.stringify(draft));

    const statusEl = document.getElementById('upload-status');
    if (statusEl) {
      statusEl.style.display = 'inline';
      statusEl.innerText = '⏳ Đang lưu bản nháp lên đám mây...';
    }

    try {
      const res = await API.saveCloudDraft(user.username, draft);
      if (res && res.status === 'success') {
        alert('✅ Đã lưu bản nháp thành công vào tài khoản của bạn! Bạn có thể mở bất kỳ máy tính nào để viết tiếp.');
      } else {
        alert('Đã lưu nháp vào máy hiện tại.');
      }
    } catch(e) {
      alert('Đã lưu nháp vào máy tính hiện tại!');
    } finally {
      if (statusEl) statusEl.style.display = 'none';
    }
  },

  async deleteDraft() {
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn bản nháp này? Nội dung đang viết dở sẽ bị xóa sạch.')) return;
    const user = Auth.getCurrentUser();

    localStorage.removeItem('d2_build_draft_wysiwyg');
    if (user) {
      try {
        await API.deleteCloudDraft(user.username);
      } catch(e) {}
    }

    document.getElementById('build-title').value = '';
    document.getElementById('build-class').value = 'Amazon';
    document.getElementById('build-season').value = '';
    document.getElementById('build-patch').value = '2.9.1';
    document.getElementById('build-intro').innerHTML = '';
    document.getElementById('build-pros').innerHTML = '';
    document.getElementById('build-cons').innerHTML = '';
    document.getElementById('stat-str').value = '';
    document.getElementById('stat-dex').value = '';
    document.getElementById('stat-vit').value = '';
    document.getElementById('stat-ene').value = '';
    document.getElementById('build-skills-text').innerHTML = '';
    document.getElementById('gear-lv0-50').innerText = this.defaultGearTemplate;
    document.getElementById('gear-lv50-135').innerText = this.defaultGearTemplate;
    document.getElementById('gear-lv135plus').innerText = this.defaultGearTemplate;
    document.getElementById('build-strategy').innerHTML = '';
    document.getElementById('build-video').value = '';

    alert('✅ Đã xóa bản nháp thành công!');
  },

  async loadCloudDraft(user) {
    let cloudData = null;
    try {
      const res = await API.getCloudDraft(user.username);
      if (res && res.status === 'success' && res.data) {
        cloudData = res.data;
      }
    } catch(e) {}

    const localSaved = localStorage.getItem('d2_build_draft_wysiwyg');
    let localData = null;
    if (localSaved) {
      try { localData = JSON.parse(localSaved); } catch(e) {}
    }

    const d = cloudData || localData;
    if (d && (d.title || d.intro || d.skills)) {
      if (confirm('Tìm thấy bản nháp đang viết dở trong tài khoản của bạn. Bạn có muốn khôi phục lại để viết tiếp không?')) {
        if (d.title) document.getElementById('build-title').value = d.title;
        if (d.class_name) document.getElementById('build-class').value = d.class_name;
        if (d.season) document.getElementById('build-season').value = d.season;
        if (d.patch) document.getElementById('build-patch').value = d.patch;
        if (d.purpose) document.getElementById('build-purpose').value = d.purpose;
        if (d.difficulty) document.getElementById('build-difficulty').value = d.difficulty;
        if (d.intro) document.getElementById('build-intro').innerHTML = this.bbcodeToHTML(d.intro);
        if (d.pros) document.getElementById('build-pros').innerHTML = this.bbcodeToHTML(d.pros);
        if (d.cons) document.getElementById('build-cons').innerHTML = this.bbcodeToHTML(d.cons);
        if (d.str) document.getElementById('stat-str').value = d.str;
        if (d.dex) document.getElementById('stat-dex').value = d.dex;
        if (d.vit) document.getElementById('stat-vit').value = d.vit;
        if (d.ene) document.getElementById('stat-ene').value = d.ene;
        if (d.skills) document.getElementById('build-skills-text').innerHTML = this.bbcodeToHTML(d.skills);
        if (d.gear_lv0_50) document.getElementById('gear-lv0-50').innerHTML = this.bbcodeToHTML(d.gear_lv0_50);
        if (d.gear_lv50_135) document.getElementById('gear-lv50-135').innerHTML = this.bbcodeToHTML(d.gear_lv50_135);
        if (d.gear_lv135plus) document.getElementById('gear-lv135plus').innerHTML = this.bbcodeToHTML(d.gear_lv135plus);
        if (d.strategy) document.getElementById('build-strategy').innerHTML = this.bbcodeToHTML(d.strategy);
        if (d.video) document.getElementById('build-video').value = d.video;
      } else {
        if (confirm('Bạn có muốn xóa luôn bản nháp cũ này để không hỏi lại ở những lần sau không?')) {
          localStorage.removeItem('d2_build_draft_wysiwyg');
          if (user) {
            try { await API.deleteCloudDraft(user.username); } catch(e) {}
          }
        }
      }
    }
  },

  execCmd(command, value = null) {
    this.restoreSelection();
    document.execCommand(command, false, value);
    this.saveSelection();
  },

  applyFontSize(fontSize) {
    this.restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

    const fragment = range.extractContents();
    const span = document.createElement('span');
    span.style.fontSize = fontSize;
    span.appendChild(fragment);
    range.insertNode(span);

    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.addRange(newRange);
    this.saveSelection();
  },

  execIndent() {
    this.restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (!range.collapsed) {
      const span = document.createElement('span');
      span.className = 'bb-indent';
      span.appendChild(range.extractContents());
      range.insertNode(span);

      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.addRange(newRange);
    } else {
      document.execCommand('insertText', false, '    ');
    }
    this.saveSelection();
  },

  execOutdent() {
    this.restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let node = sel.anchorNode;
    while (node && node !== this.activeEditor) {
      if (node.nodeType === 1 && (node.classList.contains('bb-indent') || node.tagName === 'BLOCKQUOTE')) {
        const parent = node.parentNode;
        while (node.firstChild) {
          parent.insertBefore(node.firstChild, node);
        }
        parent.removeChild(node);
        break;
      }
      node = node.parentNode;
    }
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

  insertQuoteBlock() {
    this.restoreSelection();
    const selText = window.getSelection().toString() || 'Nội dung trích dẫn...';
    const quoteHTML = `<div class="bb-quote-container"><div class="bb-quote-header">💬 Trích dẫn:</div><div class="bb-quote-body">${selText}</div></div><p><br></p>`;
    document.execCommand('insertHTML', false, quoteHTML);
  },

  insertSpoilerBlock() {
    this.restoreSelection();
    const title = prompt('Nhập tiêu đề khối Spoiler:', 'Chi tiết');
    if (!title) return;
    const spoilerHTML = `<details class="bb-spoiler-box"><summary class="bb-spoiler-title">${title}</summary><div class="bb-spoiler-content">Nội dung ẩn...</div></details><p><br></p>`;
    document.execCommand('insertHTML', false, spoilerHTML);
  },

  insertLink() {
    this.restoreSelection();
    let url = prompt('Nhập đường link liên kết (URL):', 'https://');
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const sel = window.getSelection();
    let linkText = sel.toString().trim() || url;
    const linkHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold); text-decoration:underline;">${linkText}</a>&nbsp;`;
    document.execCommand('insertHTML', false, linkHTML);
  },

  insertYoutubeVideo() {
    this.restoreSelection();
    const url = prompt('Dán link video YouTube:');
    if (!url) return;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    const videoId = match ? match[1] : null;
    if (videoId) {
      const vHTML = `<div class="bb-video-embed"><iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe></div><p><br></p>`;
      document.execCommand('insertHTML', false, vHTML);
    } else {
      alert('Link YouTube không hợp lệ!');
    }
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

  handleTriggerItemTag() {
    this.saveSelection();
    this.insertCursorMarker();
    
    ItemTooltipManager.openPickerModal((selectedItemName) => {
      this.insertItemAtMarker(selectedItemName);
    });
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

  openDirectUploadModal(itemName = '', isUpdate = false) {
    this.pendingItemName = itemName;
    this.isUpdatingItem = isUpdate;
    const modal = document.getElementById('modal-item-upload');
    const title = document.getElementById('modal-item-upload-title');
    const namePreview = document.getElementById('modal-item-name-preview');

    if (namePreview) namePreview.innerText = itemName ? `"${itemName}"` : '';
    if (title) title.innerText = isUpdate ? '🔄 Đề Xuất Ảnh Mới Cho Món Đồ' : '🗡️ Đóng Góp Ảnh Trang Bị Mới';

    if (modal) modal.classList.add('active');
  },

  closeItemModal() {
    const modal = document.getElementById('modal-item-upload');
    if (modal) modal.classList.remove('active');
    this.pendingItemName = '';
    this.isUpdatingItem = false;
  },

  async handleItemDbFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
      await this.uploadItemToDatabase(file);
      e.target.value = '';
    }
  },

  async uploadItemToDatabase(file) {
    const user = Auth.getCurrentUser();
    let itemName = this.pendingItemName;
    if (!itemName) {
      itemName = prompt('Nhập chính xác tên món đồ trong game (VD: Iceflayer):');
      if (!itemName) return;
    }
    itemName = itemName.trim();
    if (!user) return;

    const patch = document.getElementById('item-upload-patch')?.value || '2.13';
    const statusEl = document.getElementById('upload-status');
    if (statusEl) {
      statusEl.style.display = 'inline';
      statusEl.innerText = `⏳ Đang tải ảnh cho "${itemName}" lên kho...`;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result.split(',')[1];
      try {
        const res = await API.uploadItemDatabase({
          itemName: itemName,
          category: 'Sacred Unique',
          patch: patch,
          base64Data: base64Data,
          mimeType: file.type,
          username: user.username,
          role: user.role || 'Member'
        });

        if (res && res.status === 'success') {
          ItemTooltipManager.itemsDb[itemName.toLowerCase()] = {
            name: itemName,
            category: 'Sacred Unique',
            url: res.url,
            patch: patch,
            by: user.username
          };

          this.closeItemModal();
          if (statusEl) {
            statusEl.innerText = `✅ Đã cập nhật ảnh món "${itemName}" thành công!`;
            setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
          }

          ItemTooltipManager.openPickerModal((name) => {
            this.insertItemAtMarker(name);
          }, itemName, itemName);

        } else if (res && res.status === 'pending') {
          this.closeItemModal();
          alert('Đề xuất của bạn đã được gửi và đang chờ duyệt. Trong lúc này bạn vẫn có thể dùng ảnh hiện tại của món đồ.');
          if (statusEl) statusEl.style.display = 'none';

          ItemTooltipManager.openPickerModal((name) => {
            this.insertItemAtMarker(name);
          }, itemName, itemName);
        } else {
          alert('Lỗi: ' + (res?.message || 'Không thể lưu ảnh'));
          if (statusEl) statusEl.style.display = 'none';
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ khi lưu ảnh!');
        if (statusEl) statusEl.style.display = 'none';
      }
    };
    reader.readAsDataURL(file);
  },

  // XỬ LÝ LƯU TẠM ẢNH ĐỂ TRÁNH RÁC TRÊN DRIVE
  async handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
      await this.processImageFile(file);
      e.target.value = '';
    }
  },

  async processImageFile(file) {
    const statusEl = document.getElementById('upload-status');
    if (statusEl) {
      statusEl.style.display = 'inline';
      statusEl.innerText = '⏳ Đang tải ảnh lên Google Drive...';
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result.split(',')[1];
      try {
        const res = await API.uploadImage(base64Data, file.name, file.type);
        if (res && res.status === 'success' && res.url) {
          this.sessionUploadedImages.push(res.url); // Đưa vào mảng theo dõi rác
          this.restoreSelection();
          const imgHTML = `<img src="${res.url}" alt="Image" style="max-width:100%; border-radius:4px; margin:6px 0;"><p><br></p>`;
          document.execCommand('insertHTML', false, imgHTML);
          if (statusEl) {
            statusEl.innerText = '✅ Đã tải ảnh lên Drive thành công!';
            setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
          }
        } else {
          alert('Lỗi tải ảnh: ' + (res?.message || 'Không xác định'));
          if (statusEl) statusEl.style.display = 'none';
        }
      } catch (err) {
        alert('Lỗi kết nối khi tải ảnh lên Google Drive!');
        if (statusEl) statusEl.style.display = 'none';
      }
    };
    reader.readAsDataURL(file);
  },

  cancelEdit() {
    // Dọn rác các ảnh đã tải lên nhưng người dùng bấm Hủy bỏ
    if (this.sessionUploadedImages.length > 0) {
      this.sessionUploadedImages.forEach(url => API.deleteDriveImage(url));
    }
    window.location.href = 'index.html';
  },

  saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      this.savedRange = sel.getRangeAt(0);
    }
  },

  restoreSelection() {
    if (this.activeEditor) {
      this.activeEditor.focus();
    }
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

  bbcodeToHTML(text) {
    if (!text) return '';
    let str = String(text);

    let prev;
    do {
      prev = str;
      str = str.replace(/\[indent\]([\s\S]*?)\[\/indent\]/gi, '<span class="bb-indent">$1</span>');
    } while (str !== prev);

    str = str
      .replace(/\[size=(\d+)(?:px)?\]([\s\S]*?)\[\/size\]/gi, '<span style="font-size:$1px;">$2</span>')
      .replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/gi, '<span style="color:$1;">$2</span>')
      .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>')
      .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>')
      .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>')
      .replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<s>$1</s>')
      .replace(/\[quote=(.*?)\]([\s\S]*?)\[\/quote\]/gi, '<div class="bb-quote-container"><div class="bb-quote-header">💬 $1 đã viết:</div><div class="bb-quote-body">$2</div></div>')
      .replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, '<div class="bb-quote-container"><div class="bb-quote-header">💬 Trích dẫn:</div><div class="bb-quote-body">$1</div></div>')
      .replace(/\[spoiler=(.*?)\]([\s\S]*?)\[\/spoiler\]/gi, '<details class="bb-spoiler-box"><summary class="bb-spoiler-title">$1</summary><div class="bb-spoiler-content">$2</div></details>')
      .replace(/\[img\](.*?)\[\/img\]/gi, '<img src="$1" alt="Image" style="max-width:100%; border-radius:4px; margin:6px 0;">')
      .replace(/\[url=(.*?)\]([\s\S]*?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold); text-decoration:underline;">$2</a>')
      .replace(/\[url\]([\s\S]*?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold); text-decoration:underline;">$1</a>');

    str = str.replace(/\[item\]([\s\S]*?)\[\/item\]/gi, (m, innerContent) => {
      const cleanKey = innerContent
        .replace(/<[^>]*>/g, '')
        .replace(/\[\/?[^\]]+\]/g, '')
        .replace(/"/g, '')
        .trim()
        .toLowerCase();
      return `<span class="item-hover-trigger" data-item-key="${cleanKey}">${innerContent}</span>`;
    });

    str = str.replace(/\[list\]([\s\S]*?)\[\/list\]/gi, (m, body) => {
      const items = body.split(/\[\*\]/).filter(x => x.trim().length > 0);
      return `<ul class="bb-list">${items.map(it => `<li>${it.trim()}</li>`).join('')}</ul>`;
    });

    return str.replace(/\n/g, '<br>');
  },

  htmlToBBCode(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const serializeNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const tag = node.tagName.toLowerCase();
      let inner = '';
      node.childNodes.forEach(child => {
        inner += serializeNode(child);
      });

      if (node.classList.contains('item-hover-trigger')) {
        let resItem = `[item]${inner.trim()}[/item]`;
        if (node.style && node.style.color) {
          const hex = this.rgbToHex(node.style.color);
          if (hex) resItem = `[color=${hex}]${resItem}[/color]`;
        }
        return resItem;
      }

      if (node.classList.contains('bb-indent') || tag === 'blockquote') {
        return `[indent]${inner}[/indent]`;
      }
      if (node.classList.contains('bb-quote-container')) {
        const body = node.querySelector('.bb-quote-body');
        const quoteText = body ? serializeNode(body) : inner;
        return `[quote]${quoteText}[/quote]`;
      }
      if (node.classList.contains('bb-spoiler-box') || tag === 'details') {
        const titleEl = node.querySelector('.bb-spoiler-title') || node.querySelector('summary');
        const title = titleEl ? titleEl.textContent.trim() : 'Chi tiết';
        const contentEl = node.querySelector('.bb-spoiler-content') || node.querySelector('div');
        const content = contentEl ? serializeNode(contentEl) : inner;
        return `[spoiler=${title}]${content}[/spoiler]`;
      }
      if (node.classList.contains('bb-video-embed')) {
        const iframe = node.querySelector('iframe');
        const src = iframe ? iframe.getAttribute('src') : '';
        return `[youtube]${src}[/youtube]`;
      }

      let res = inner;

      if (node.style) {
        if (node.style.fontWeight === 'bold' || parseInt(node.style.fontWeight, 10) >= 700) {
          res = `[b]${res}[/b]`;
        }
        if (node.style.fontStyle === 'italic') {
          res = `[i]${res}[/i]`;
        }
        if (node.style.textDecoration && node.style.textDecoration.includes('underline')) {
          res = `[u]${res}[/u]`;
        }
        if (node.style.textDecoration && node.style.textDecoration.includes('line-through')) {
          res = `[s]${res}[/s]`;
        }
        if (node.style.fontSize) {
          const numSize = parseInt(node.style.fontSize, 10);
          if (numSize && !res.startsWith(`[size=${numSize}]`)) {
            res = `[size=${numSize}]${res}[/size]`;
          }
        }
        if (node.style.color) {
          const hex = this.rgbToHex(node.style.color);
          if (hex && !res.startsWith(`[color=${hex}]`)) {
            res = `[color=${hex}]${res}[/color]`;
          }
        }
      }

      switch (tag) {
        case 'strong':
        case 'b':
          return `[b]${res}[/b]`;
        case 'em':
        case 'i':
          return `[i]${res}[/i]`;
        case 'u':
          return `[u]${res}[/u]`;
        case 's':
        case 'strike':
          return `[s]${res}[/s]`;
        case 'a':
          return `[url=${node.getAttribute('href') || ''}]${res}[/url]`;
        case 'img':
          return `[img]${node.getAttribute('src') || ''}[/img]`;
        case 'font': {
          let fontRes = res;
          if (node.hasAttribute('color')) {
            fontRes = `[color=${this.rgbToHex(node.getAttribute('color'))}]${fontRes}[/color]`;
          }
          if (node.hasAttribute('size')) {
            const sizeMap = { '1': '10', '2': '12', '3': '15', '4': '18', '5': '22', '6': '26', '7': '32' };
            const sizeVal = sizeMap[node.getAttribute('size')] || '15';
            fontRes = `[size=${sizeVal}]${fontRes}[/size]`;
          }
          return fontRes;
        }
        case 'ul':
        case 'ol': {
          let listItems = '';
          node.querySelectorAll(':scope > li').forEach(li => {
            listItems += `[*] ${serializeNode(li).trim()}\n`;
          });
          return `[list]\n${listItems}[/list]`;
        }
        case 'li':
          return res;
        case 'br':
          return '\n';
        case 'p':
        case 'div':
          return res + '\n';
        default:
          return res;
      }
    };

    let result = '';
    temp.childNodes.forEach(child => {
      result += serializeNode(child);
    });

    return result.replace(/\n{3,}/g, '\n\n').trim();
  },

  async handleSubmit(e) {
    e.preventDefault();
    const user = Auth.getCurrentUser();
    if (!user) return Auth.openModal('login');

    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.innerText = 'Đang lưu bài viết...';

    const d = this.collectFormData();

    // Dọn rác các ảnh đã tải lên nhưng người dùng cố tình xóa khỏi khung văn bản trước khi Đăng
    const allEditorText = [d.intro, d.pros, d.cons, d.skills, d.gear_lv0_50, d.gear_lv50_135, d.gear_lv135plus, d.strategy].join(' ');
    const unusedImages = this.sessionUploadedImages.filter(url => !allEditorText.includes(url));
    if (unusedImages.length > 0) {
      unusedImages.forEach(url => API.deleteDriveImage(url));
    }

    const statsPayload = {
      season: d.season,
      patch: d.patch,
      purpose: d.purpose,
      difficulty: d.difficulty,
      intro: d.intro,
      pros: d.pros,
      cons: d.cons,
      str: d.str,
      dex: d.dex,
      vit: d.vit,
      ene: d.ene,
      strategy: d.strategy
    };

    const gearPayload = {
      lv0_50: d.gear_lv0_50,
      lv50_135: d.gear_lv50_135,
      lv135plus: d.gear_lv135plus
    };

    const cleanSeason = d.season || 'Mùa mới';

    const payload = {
      build_id: this.editBuildId,
      title: d.title,
      class_name: d.class_name,
      patch_version: cleanSeason,
      author_username: user.username,
      author_name: user.display_name,
      role: user.role || 'Member',
      stats_desc: JSON.stringify(statsPayload),
      skills_desc: d.skills,
      gear_desc: JSON.stringify(gearPayload),
      video_url: d.video
    };

    try {
      const res = await API.saveBuild(payload);
      if (res && res.status === 'success') {
        localStorage.removeItem('d2_build_draft_wysiwyg');
        await API.deleteCloudDraft(user.username);
        window.location.href = `build-detail.html?id=${res.build_id}`;
      } else {
        alert(res?.message || 'Lưu thất bại!');
        btn.disabled = false;
        btn.innerText = '🚀 Submit / Đăng Bài Viết';
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ Google!');
      btn.disabled = false;
      btn.innerText = '🚀 Submit / Đăng Bài Viết';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => FormHandler.init());
