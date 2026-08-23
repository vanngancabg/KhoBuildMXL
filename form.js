const FormHandler = {
  editBuildId: null,
  activeTextarea: null,
  pendingItemName: '',

  async init() {
    const user = Auth.getCurrentUser();
    if (!user) {
      document.getElementById('login-warning').style.display = 'block';
      document.getElementById('build-form').style.opacity = '0.4';
      document.getElementById('build-form').style.pointerEvents = 'none';
      return;
    }

    this.setupActiveFocusAndPaste();

    const editId = new URLSearchParams(window.location.search).get('edit');
    if (editId) {
      this.editBuildId = editId;
      document.getElementById('form-heading').innerText = 'EDIT TOPIC / SỬA HƯỚNG DẪN BUILD';
      await this.loadData(editId, user);
    } else {
      this.loadDraft();
    }
  },

  setupActiveFocusAndPaste() {
    const textareas = document.querySelectorAll('textarea, input[type="text"]');
    textareas.forEach(el => {
      el.addEventListener('focus', () => { this.activeTextarea = el; });
      
      el.addEventListener('paste', async (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
          if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            const file = item.getAsFile();
            await this.processImageFile(file, el);
            break;
          }
        }
      });
    });

    // Lắng nghe dán ảnh vào Modal đóng góp Item
    window.addEventListener('paste', async (e) => {
      const modal = document.getElementById('modal-item-upload');
      if (modal && modal.classList.contains('active')) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
          if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            const file = item.getAsFile();
            await this.uploadItemToDatabase(file);
            break;
          }
        }
      }
    });

    this.activeTextarea = document.getElementById('build-intro');
  },

  // Xử lý nút [Hover Item] thông minh
  async handleTriggerItemTag() {
    const el = this.activeTextarea || document.getElementById('build-intro');
    if (!el) return;

    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    let selected = el.value.substring(start, end).trim();

    if (!selected) {
      selected = prompt('Nhập tên món đồ muốn gắn ảnh khi rê chuột (VD: Royal Circlet):');
      if (!selected) return;
      selected = selected.trim();
    }

    const normalizedKey = selected.toLowerCase();

    // 1. Kiểm tra xem món đồ đã có ảnh trong kho dữ liệu chưa
    if (ItemTooltipManager.itemsDb && ItemTooltipManager.itemsDb[normalizedKey]) {
      // Đã có -> Tự động chèn thẻ luôn, không cho tải trùng
      this.insertBBIntoEl(`[item]${selected}[/item]`, '', el);
    } else {
      // 2. Chưa có -> Mở Popup yêu cầu đóng góp ảnh
      this.pendingItemName = selected;
      document.getElementById('modal-item-name-preview').innerText = `"${selected}"`;
      document.getElementById('modal-item-upload').classList.add('active');
    }
  },

  closeItemModal() {
    document.getElementById('modal-item-upload').classList.remove('active');
    this.pendingItemName = '';
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
    const itemName = this.pendingItemName;
    if (!itemName || !user) return;

    const statusEl = document.getElementById('upload-status');
    statusEl.style.display = 'inline';
    statusEl.innerText = `⏳ Đang tải ảnh cho "${itemName}" lên kho dữ liệu...`;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result.split(',')[1];
      try {
        const res = await API.uploadItemDatabase({
          itemName: itemName,
          base64Data: base64Data,
          mimeType: file.type,
          username: user.username,
          role: user.role || 'Member'
        });

        if (res.status === 'success' || res.status === 'exists') {
          // Cập nhật bộ nhớ đệm Tooltip
          ItemTooltipManager.itemsDb[itemName.toLowerCase()] = {
            name: itemName,
            url: res.url,
            by: user.username
          };

          const el = this.activeTextarea || document.getElementById('build-intro');
          this.insertBBIntoEl(`[item]${itemName}[/item]`, '', el);
          this.closeItemModal();

          statusEl.innerText = `✅ Đã lưu ảnh món "${itemName}" thành công!`;
          setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
        } else {
          alert('Lỗi: ' + res.message);
          statusEl.style.display = 'none';
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ khi lưu ảnh món đồ!');
        statusEl.style.display = 'none';
      }
    };
    reader.readAsDataURL(file);
  },

  async handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
      await this.processImageFile(file, this.activeTextarea || document.getElementById('build-intro'));
      e.target.value = '';
    }
  },

  async processImageFile(file, targetEl) {
    const statusEl = document.getElementById('upload-status');
    statusEl.style.display = 'inline';
    statusEl.innerText = '⏳ Đang tải ảnh lên Google Drive...';

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result.split(',')[1];
      try {
        const res = await API.uploadImage(base64Data, file.name, file.type);
        if (res.status === 'success' && res.url) {
          this.insertBBIntoEl(`[img]${res.url}[/img]`, '', targetEl);
          statusEl.innerText = '✅ Đã tải ảnh lên Drive thành công!';
          setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
        } else {
          alert('Lỗi tải ảnh: ' + (res.message || 'Không xác định'));
          statusEl.style.display = 'none';
        }
      } catch (err) {
        alert('Lỗi kết nối khi tải ảnh lên Google Drive!');
        statusEl.style.display = 'none';
      }
    };
    reader.readAsDataURL(file);
  },

  insertBB(startTag, endTag) {
    const el = this.activeTextarea || document.getElementById('build-intro');
    this.insertBBIntoEl(startTag, endTag, el);
  },

  insertSmiley(icon) {
    const el = this.activeTextarea || document.getElementById('build-intro');
    if (!el) return;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    el.value = el.value.substring(0, start) + ' ' + icon + ' ' + el.value.substring(end);
    el.focus();
  },

  insertBBIntoEl(startTag, endTag, el) {
    if (!el) return;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const selected = el.value.substring(start, end);
    el.value = el.value.substring(0, start) + startTag + selected + endTag + el.value.substring(end);
    el.focus();
    el.setSelectionRange(start + startTag.length, start + startTag.length + selected.length);
  },

  async loadData(id, user) {
    try {
      const res = await API.getBuildDetail(id);
      if (res.status === 'success' && res.data) {
        const b = res.data;
        if (String(b.author_id).toLowerCase() !== String(user.username).toLowerCase() && user.role !== 'Admin') {
          alert('Bạn không có quyền sửa bài viết này!');
          window.location.href = 'index.html';
          return;
        }

        document.getElementById('build-title').value = b.title || '';
        document.getElementById('build-class').value = b.class_name || 'Amazon';
        document.getElementById('build-patch').value = b.patch_version || '';
        document.getElementById('build-video').value = b.video_url || '';

        try {
          const statsObj = JSON.parse(b.stats_desc);
          document.getElementById('build-season').value = statsObj.season || '';
          document.getElementById('build-purpose').value = statsObj.purpose || 'Speed Farming';
          document.getElementById('build-difficulty').value = statsObj.difficulty || 'Dễ';
          document.getElementById('build-intro').value = statsObj.intro || '';
          document.getElementById('build-pros').value = statsObj.pros || '';
          document.getElementById('build-cons').value = statsObj.cons || '';
          document.getElementById('stat-str').value = statsObj.str || '';
          document.getElementById('stat-dex').value = statsObj.dex || '';
          document.getElementById('stat-vit').value = statsObj.vit || '';
          document.getElementById('stat-ene').value = statsObj.ene || '';
          document.getElementById('build-strategy').value = statsObj.strategy || '';
        } catch(e) {
          document.getElementById('build-intro').value = b.stats_desc || '';
        }

        document.getElementById('build-skills-text').value = b.skills_desc || '';

        try {
          const gearObj = JSON.parse(b.gear_desc);
          document.getElementById('gear-lv105').value = gearObj.lv105 || '';
          document.getElementById('gear-lv120').value = gearObj.lv120 || '';
          document.getElementById('gear-lv130').value = gearObj.lv130 || '';
          document.getElementById('gear-lv150').value = gearObj.lv150 || '';
        } catch(e) {
          document.getElementById('gear-lv105').value = b.gear_desc || '';
        }
      }
    } catch (e) {
      alert('Không thể tải bài viết để sửa!');
    }
  },

  saveDraft() {
    const draft = this.collectFormData();
    localStorage.setItem('d2_build_draft_v2', JSON.stringify(draft));
    alert('Đã lưu bản nháp vào trình duyệt!');
  },

  loadDraft() {
    const saved = localStorage.getItem('d2_build_draft_v2');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (confirm('Tìm thấy một bản nháp chưa hoàn thành. Bạn có muốn khôi phục không?')) {
          if (d.title) document.getElementById('build-title').value = d.title;
          if (d.class_name) document.getElementById('build-class').value = d.class_name;
          if (d.season) document.getElementById('build-season').value = d.season;
          if (d.patch) document.getElementById('build-patch').value = d.patch;
          if (d.purpose) document.getElementById('build-purpose').value = d.purpose;
          if (d.difficulty) document.getElementById('build-difficulty').value = d.difficulty;
          if (d.intro) document.getElementById('build-intro').value = d.intro;
          if (d.pros) document.getElementById('build-pros').value = d.pros;
          if (d.cons) document.getElementById('build-cons').value = d.cons;
          if (d.str) document.getElementById('stat-str').value = d.str;
          if (d.dex) document.getElementById('stat-dex').value = d.dex;
          if (d.vit) document.getElementById('stat-vit').value = d.vit;
          if (d.ene) document.getElementById('stat-ene').value = d.ene;
          if (d.skills) document.getElementById('build-skills-text').value = d.skills;
          if (d.gear_lv105) document.getElementById('gear-lv105').value = d.gear_lv105;
          if (d.gear_lv120) document.getElementById('gear-lv120').value = d.gear_lv120;
          if (d.gear_lv130) document.getElementById('gear-lv130').value = d.gear_lv130;
          if (d.gear_lv150) document.getElementById('gear-lv150').value = d.gear_lv150;
          if (d.strategy) document.getElementById('build-strategy').value = d.strategy;
          if (d.video) document.getElementById('build-video').value = d.video;
        }
      } catch (e) {}
    }
  },

  importBuildCode() {
    const rawCode = prompt('Dán chuỗi Mã Build vào đây:');
    if (!rawCode) return;
    try {
      const jsonStr = decodeURIComponent(escape(atob(rawCode.trim())));
      const d = JSON.parse(jsonStr);
      if (d.title) document.getElementById('build-title').value = d.title;
      if (d.class_name) document.getElementById('build-class').value = d.class_name;
      if (d.season) document.getElementById('build-season').value = d.season;
      if (d.patch) document.getElementById('build-patch').value = d.patch;
      if (d.skills) document.getElementById('build-skills-text').value = d.skills;
      if (d.gear_lv105) document.getElementById('gear-lv105').value = d.gear_lv105;
      alert('Đã nhập mã build thành công!');
    } catch (err) {
      alert('Mã Build không hợp lệ!');
    }
  },

  collectFormData() {
    return {
      title: document.getElementById('build-title').value.trim(),
      class_name: document.getElementById('build-class').value,
      season: document.getElementById('build-season').value.trim(),
      patch: document.getElementById('build-patch').value.trim(),
      purpose: document.getElementById('build-purpose').value,
      difficulty: document.getElementById('build-difficulty').value,
      intro: document.getElementById('build-intro').value.trim(),
      pros: document.getElementById('build-pros').value.trim(),
      cons: document.getElementById('build-cons').value.trim(),
      str: document.getElementById('stat-str').value.trim(),
      dex: document.getElementById('stat-dex').value.trim(),
      vit: document.getElementById('stat-vit').value.trim(),
      ene: document.getElementById('stat-ene').value.trim(),
      skills: document.getElementById('build-skills-text').value.trim(),
      gear_lv105: document.getElementById('gear-lv105').value.trim(),
      gear_lv120: document.getElementById('gear-lv120').value.trim(),
      gear_lv130: document.getElementById('gear-lv130').value.trim(),
      gear_lv150: document.getElementById('gear-lv150').value.trim(),
      strategy: document.getElementById('build-strategy').value.trim(),
      video: document.getElementById('build-video').value.trim()
    };
  },

  togglePreview() {
    const box = document.getElementById('preview-box');
    const content = document.getElementById('preview-content');
    const d = this.collectFormData();

    if (box.style.display === 'none') {
      content.innerHTML = `
        <h3 style="color:var(--accent-gold);">${d.title} (${d.season} - Patch ${d.patch})</h3>
        <p><strong>Mục đích:</strong> ${d.purpose} | <strong>Độ khó:</strong> ${d.difficulty}</p>
        <div style="margin-top:10px;">${this.parseBBCode(d.intro)}</div>
        <hr style="border-color:var(--border-color);margin:12px 0;">
        <h4 style="color:var(--accent-green);">Ưu điểm:</h4>${this.parseBBCode(d.pros)}
        <h4 style="color:#ff6b6b;margin-top:8px;">Nhược điểm:</h4>${this.parseBBCode(d.cons)}
        <hr style="border-color:var(--border-color);margin:12px 0;">
        <h4 style="color:var(--accent-gold);">Kỹ năng:</h4>${this.parseBBCode(d.skills)}
        <hr style="border-color:var(--border-color);margin:12px 0;">
        <h4 style="color:var(--accent-gold);">Trang bị Level 1-105:</h4>${this.parseBBCode(d.gear_lv105)}
      `;
      box.style.display = 'block';
      box.scrollIntoView({ behavior: 'smooth' });
    } else {
      box.style.display = 'none';
    }
  },

  parseBBCode(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\[item\](.*?)\[\/item\]/gi, (m, name) => `<span class="item-hover-trigger" data-item-key="${name.trim().toLowerCase()}">${name}</span>`)
      .replace(/\[b\](.*?)\[\/b\]/gi, '<strong>$1</strong>')
      .replace(/\[i\](.*?)\[\/i\]/gi, '<em>$1</em>')
      .replace(/\[u\](.*?)\[\/u\]/gi, '<u>$1</u>')
      .replace(/\[rw\](.*?)\[\/rw\]/gi, '<span class="item-runeword">$1</span>')
      .replace(/\[set\](.*?)\[\/set\]/gi, '<span class="item-set">$1</span>')
      .replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, '<blockquote>$1</blockquote>')
      .replace(/\[color=(.*?)\]([\s\S]*?)\[\/color\]/gi, '<span style="color:$1;">$2</span>')
      .replace(/\[img\](.*?)\[\/img\]/gi, '<img src="$1" alt="Image">')
      .replace(/\[url=(.*?)\](.*?)\[\/url\]/gi, '<a href="$1" target="_blank" style="color:var(--accent-gold);">$2</a>')
      .replace(/\[spoiler=(.*?)\]([\s\S]*?)\[\/spoiler\]/gi, '<details style="background:#111315;border:1px solid var(--border-color);padding:8px;border-radius:4px;margin:8px 0;"><summary style="cursor:pointer;color:var(--accent-gold);font-weight:bold;">$1</summary><div style="margin-top:8px;">$2</div></details>')
      .replace(/\n/g, '<br>');
  },

  async handleSubmit(e) {
    e.preventDefault();
    const user = Auth.getCurrentUser();
    if (!user) return Auth.openModal('login');

    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.innerText = 'Đang lưu bài viết...';

    const d = this.collectFormData();

    const statsPayload = {
      season: d.season,
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
      lv105: d.gear_lv105,
      lv120: d.gear_lv120,
      lv130: d.gear_lv130,
      lv150: d.gear_lv150
    };

    const payload = {
      build_id: this.editBuildId,
      title: d.title,
      class_name: d.class_name,
      patch_version: `${d.season} - ${d.patch}`,
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
      if (res.status === 'success') {
        localStorage.removeItem('d2_build_draft_v2');
        window.location.href = `build-detail.html?id=${res.build_id}`;
      } else {
        alert(res.message || 'Lưu thất bại!');
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
