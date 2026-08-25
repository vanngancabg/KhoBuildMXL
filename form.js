const FormHandler = {
  editBuildId: null,
  activeEditor: null,
  savedRange: null,
  pendingItemName: '',

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
    this.setupModalOutsideClick();

    const editId = new URLSearchParams(window.location.search).get('edit');
    if (editId) {
      this.editBuildId = editId;
      document.getElementById('form-heading').innerText = 'EDIT TOPIC / SỬA HƯỚNG DẪN BUILD';
      await this.loadData(editId, user);
    } else {
      this.populateDefaultGearTemplates();
      this.loadDraft();
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

      // Bắt phím Tab để thụt đầu dòng tự nhiên
      ed.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          this.execIndent();
        }
      });

      // Bắt dán ảnh trực tiếp từ Clipboard
      ed.addEventListener('paste', async (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
          if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            const file = item.getAsFile();
            await this.processImageFile(file);
            break;
          }
        }
      });
    });

    this.activeEditor = document.getElementById('build-intro');
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
      }
    });
  },

  // THỰC THI LỆNH ĐỊNH DẠNG
  execCmd(command, value = null) {
    this.restoreSelection();
    document.execCommand(command, false, value);
    this.saveSelection();
  },

  // XỬ LÝ THỤT LỀ CHUẨN XÁC
  execIndent() {
    this.restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const selectedText = range.toString();

    if (selectedText.length > 0) {
      const span = document.createElement('span');
      span.className = 'bb-indent';
      span.textContent = selectedText;
      range.deleteContents();
      range.insertNode(span);
    } else {
      document.execCommand('insertText', false, '    ');
    }
    this.saveSelection();
  },

  // XỬ LÝ LÙI LỀ
  execOutdent() {
    this.restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let node = sel.anchorNode;
    while (node && node !== this.activeEditor) {
      if (node.nodeType === 1 && node.classList.contains('bb-indent')) {
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

  // ÁP DỤNG MÀU CHỮ TRỰC TIẾP
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

  // GẮN TOOLTIP ITEM TRỰC QUAN
  async handleTriggerItemTag() {
    this.restoreSelection();
    let selected = window.getSelection().toString().trim();

    if (!selected) {
      selected = prompt('Nhập tên món đồ muốn gắn ảnh khi rê chuột (VD: Ra):');
      if (!selected) return;
      selected = selected.trim();
    }

    const cleanItemName = selected.toLowerCase();

    if (ItemTooltipManager.itemsDb && ItemTooltipManager.itemsDb[cleanItemName]) {
      const itemHTML = `<span class="item-hover-trigger" data-item-key="${cleanItemName}">${selected}</span>&nbsp;`;
      document.execCommand('insertHTML', false, itemHTML);
    } else {
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
    statusEl.innerText = `⏳ Đang tải ảnh cho "${itemName}" lên kho...`;

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
          ItemTooltipManager.itemsDb[itemName.toLowerCase()] = {
            name: itemName,
            url: res.url,
            by: user.username
          };

          this.restoreSelection();
          const itemHTML = `<span class="item-hover-trigger" data-item-key="${itemName.toLowerCase()}">${itemName}</span>&nbsp;`;
          document.execCommand('insertHTML', false, itemHTML);
          this.closeItemModal();

          statusEl.innerText = `✅ Đã lưu ảnh món "${itemName}" thành công!`;
          setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
        } else {
          alert('Lỗi: ' + res.message);
          statusEl.style.display = 'none';
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ khi lưu ảnh!');
        statusEl.style.display = 'none';
      }
    };
    reader.readAsDataURL(file);
  },

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
        if (res.status === 'success' && res.url) {
          this.restoreSelection();
          const imgHTML = `<img src="${res.url}" alt="Image" style="max-width:100%; border-radius:4px; margin:6px 0;"><p><br></p>`;
          document.execCommand('insertHTML', false, imgHTML);
          if (statusEl) {
            statusEl.innerText = '✅ Đã tải ảnh lên Drive thành công!';
            setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
          }
        } else {
          alert('Lỗi tải ảnh: ' + (res.message || 'Không xác định'));
          if (statusEl) statusEl.style.display = 'none';
        }
      } catch (err) {
        alert('Lỗi kết nối khi tải ảnh lên Google Drive!');
        if (statusEl) statusEl.style.display = 'none';
      }
    };
    reader.readAsDataURL(file);
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

  // BỘ CHUYỂN ĐỔI: BBCODE CŨ -> HTML TRỰC QUAN
  bbcodeToHTML(text) {
    if (!text) return '';
    let str = String(text);
    str = str
      .replace(/\[color=([#\w]+)\]([\s\S]*?)\[\/color\]/gi, '<span style="color:$1;">$2</span>')
      .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>')
      .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>')
      .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>')
      .replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<s>$1</s>')
      .replace(/\[indent\]([\s\S]*?)\[\/indent\]/gi, '<span class="bb-indent">$1</span>')
      .replace(/\[quote=(.*?)\]([\s\S]*?)\[\/quote\]/gi, '<div class="bb-quote-container"><div class="bb-quote-header">💬 $1 đã viết:</div><div class="bb-quote-body">$2</div></div>')
      .replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, '<div class="bb-quote-container"><div class="bb-quote-header">💬 Trích dẫn:</div><div class="bb-quote-body">$1</div></div>')
      .replace(/\[spoiler=(.*?)\]([\s\S]*?)\[\/spoiler\]/gi, '<details class="bb-spoiler-box"><summary class="bb-spoiler-title">$1</summary><div class="bb-spoiler-content">$2</div></details>')
      .replace(/\[img\](.*?)\[\/img\]/gi, '<img src="$1" alt="Image" style="max-width:100%; border-radius:4px; margin:6px 0;">')
      .replace(/\[url=(.*?)\]([\s\S]*?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold); text-decoration:underline;">$2</a>')
      .replace(/\[url\]([\s\S]*?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold); text-decoration:underline;">$1</a>')
      .replace(/\[item\]([\s\S]*?)\[\/item\]/gi, (m, name) => `<span class="item-hover-trigger" data-item-key="${name.trim().toLowerCase()}">${name}</span>`)
      .replace(/\[list\]([\s\S]*?)\[\/list\]/gi, (m, body) => {
        const items = body.split(/\[\*\]/).filter(x => x.trim().length > 0);
        return `<ul class="bb-list">${items.map(it => `<li>${it.trim()}</li>`).join('')}</ul>`;
      })
      .replace(/\n/g, '<br>');
    return str;
  },

  // BỘ CHUYỂN ĐỔI CHUẨN XÁC 100%: HTML TRỰC QUAN -> BBCODE ĐỂ LƯU DATABASE
  htmlToBBCode(html) {
    if (!html) return '';
    let div = document.createElement('div');
    div.innerHTML = html;

    // 1. Chuyển đổi các widget khối
    div.querySelectorAll('.item-hover-trigger').forEach(el => {
      const name = el.innerText;
      el.replaceWith(`[item]${name}[/item]`);
    });

    div.querySelectorAll('.bb-quote-container').forEach(el => {
      const body = el.querySelector('.bb-quote-body')?.innerHTML || el.innerHTML;
      el.replaceWith(`[quote]${this.htmlToBBCode(body)}[/quote]`);
    });

    div.querySelectorAll('.bb-spoiler-box').forEach(el => {
      const title = el.querySelector('.bb-spoiler-title')?.innerText || 'Chi tiết';
      const content = el.querySelector('.bb-spoiler-content')?.innerHTML || '';
      el.replaceWith(`[spoiler=${title}]${this.htmlToBBCode(content)}[/spoiler]`);
    });

    div.querySelectorAll('.bb-video-embed iframe').forEach(el => {
      const src = el.getAttribute('src') || '';
      el.parentElement.replaceWith(`[youtube]${src}[/youtube]`);
    });

    // 2. Chuyển đổi Thụt lề và Danh sách
    div.querySelectorAll('.bb-indent').forEach(el => {
      el.replaceWith(`[indent]${el.innerHTML}[/indent]`);
    });

    div.querySelectorAll('blockquote').forEach(el => {
      el.replaceWith(`[indent]${el.innerHTML}[/indent]`);
    });

    div.querySelectorAll('ul').forEach(el => {
      let listItems = '';
      el.querySelectorAll('li').forEach(li => {
        listItems += `[*] ${li.innerHTML}\n`;
      });
      el.replaceWith(`[list]\n${listItems}[/list]`);
    });

    div.querySelectorAll('ol').forEach(el => {
      let listItems = '';
      el.querySelectorAll('li').forEach(li => {
        listItems += `[*] ${li.innerHTML}\n`;
      });
      el.replaceWith(`[list]\n${listItems}[/list]`);
    });

    let str = div.innerHTML;

    // 3. Chuyển đổi định dạng chữ & Màu sắc
    str = str
      .replace(/<font\s+color=["'](.*?)["']>([\s\S]*?)<\/font>/gi, '[color=$1]$2[/color]')
      .replace(/<span\s+style=["']color:\s*(.*?);?["']>([\s\S]*?)<\/span>/gi, '[color=$1]$2[/color]')
      .replace(/<strong>([\s\S]*?)<\/strong>/gi, '[b]$1[/b]')
      .replace(/<b>([\s\S]*?)<\/b>/gi, '[b]$1[/b]')
      .replace(/<em>([\s\S]*?)<\/em>/gi, '[i]$1[/i]')
      .replace(/<i>([\s\S]*?)<\/i>/gi, '[i]$1[/i]')
      .replace(/<u>([\s\S]*?)<\/u>/gi, '[u]$1[/u]')
      .replace(/<s>([\s\S]*?)<\/s>/gi, '[s]$1[/s]')
      .replace(/<strike>([\s\S]*?)<\/strike>/gi, '[s]$1[/s]')
      .replace(/<a\s+href=["'](.*?)["'].*?>([\s\S]*?)<\/a>/gi, '[url=$1]$2[/url]')
      .replace(/<img\s+.*?src=["'](.*?)["'].*?>/gi, '[img]$1[/img]')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<div>/gi, '\n')
      .replace(/<\/div>/gi, '')
      .replace(/<p>/gi, '')
      .replace(/<\/p>/gi, '\n');

    const temp = document.createElement('div');
    temp.innerHTML = str;
    return (temp.textContent || temp.innerText || '').trim();
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
        document.getElementById('build-video').value = b.video_url || '';

        let seasonVal = '';
        let patchVal = '1.0';

        if (b.patch_version) {
          const parts = String(b.patch_version).split('-').map(s => s.trim()).filter(s => s);
          if (parts.length > 0) {
            seasonVal = parts[0];
            patchVal = parts[parts.length - 1];
          }
        }

        try {
          const statsObj = JSON.parse(b.stats_desc);
          document.getElementById('build-season').value = statsObj.season || seasonVal || '';
          document.getElementById('build-patch').value = statsObj.patch || (patchVal !== seasonVal ? patchVal : '1.0');
          document.getElementById('build-purpose').value = statsObj.purpose || 'Speed Farming';
          document.getElementById('build-difficulty').value = statsObj.difficulty || 'Dễ';
          document.getElementById('build-intro').innerHTML = this.bbcodeToHTML(statsObj.intro || '');
          document.getElementById('build-pros').innerHTML = this.bbcodeToHTML(statsObj.pros || '');
          document.getElementById('build-cons').innerHTML = this.bbcodeToHTML(statsObj.cons || '');
          document.getElementById('stat-str').value = statsObj.str || '';
          document.getElementById('stat-dex').value = statsObj.dex || '';
          document.getElementById('stat-vit').value = statsObj.vit || '';
          document.getElementById('stat-ene').value = statsObj.ene || '';
          document.getElementById('build-strategy').innerHTML = this.bbcodeToHTML(statsObj.strategy || '');
        } catch(e) {
          document.getElementById('build-season').value = seasonVal || '';
          document.getElementById('build-patch').value = patchVal || '1.0';
          document.getElementById('build-intro').innerHTML = this.bbcodeToHTML(b.stats_desc || '');
        }

        document.getElementById('build-skills-text').innerHTML = this.bbcodeToHTML(b.skills_desc || '');

        try {
          const gearObj = JSON.parse(b.gear_desc);
          document.getElementById('gear-lv0-50').innerHTML = this.bbcodeToHTML(gearObj.lv0_50 || gearObj.lv105 || this.defaultGearTemplate);
          document.getElementById('gear-lv50-135').innerHTML = this.bbcodeToHTML(gearObj.lv50_135 || gearObj.lv120 || this.defaultGearTemplate);
          document.getElementById('gear-lv135plus').innerHTML = this.bbcodeToHTML(gearObj.lv135plus || gearObj.lv130 || gearObj.lv150 || this.defaultGearTemplate);
        } catch(e) {
          document.getElementById('gear-lv0-50').innerHTML = this.bbcodeToHTML(b.gear_desc || this.defaultGearTemplate);
          document.getElementById('gear-lv50-135').innerHTML = this.bbcodeToHTML(this.defaultGearTemplate);
          document.getElementById('gear-lv135plus').innerHTML = this.bbcodeToHTML(this.defaultGearTemplate);
        }
      }
    } catch (e) {
      alert('Không thể tải bài viết để sửa!');
    }
  },

  saveDraft() {
    const draft = this.collectFormData();
    localStorage.setItem('d2_build_draft_wysiwyg', JSON.stringify(draft));
    alert('Đã lưu bản nháp vào trình duyệt!');
  },

  loadDraft() {
    const saved = localStorage.getItem('d2_build_draft_wysiwyg');
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
      if (d.skills) document.getElementById('build-skills-text').innerHTML = this.bbcodeToHTML(d.skills);
      if (d.gear_lv0_50) document.getElementById('gear-lv0-50').innerHTML = this.bbcodeToHTML(d.gear_lv0_50);
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
      intro: this.htmlToBBCode(document.getElementById('build-intro').innerHTML),
      pros: this.htmlToBBCode(document.getElementById('build-pros').innerHTML),
      cons: this.htmlToBBCode(document.getElementById('build-cons').innerHTML),
      str: document.getElementById('stat-str').value.trim(),
      dex: document.getElementById('stat-dex').value.trim(),
      vit: document.getElementById('stat-vit').value.trim(),
      ene: document.getElementById('stat-ene').value.trim(),
      skills: this.htmlToBBCode(document.getElementById('build-skills-text').innerHTML),
      gear_lv0_50: this.htmlToBBCode(document.getElementById('gear-lv0-50').innerHTML),
      gear_lv50_135: this.htmlToBBCode(document.getElementById('gear-lv50-135').innerHTML),
      gear_lv135plus: this.htmlToBBCode(document.getElementById('gear-lv135plus').innerHTML),
      strategy: this.htmlToBBCode(document.getElementById('build-strategy').innerHTML),
      video: document.getElementById('build-video').value.trim()
    };
  },

  openPreviewModal() {
    const d = this.collectFormData();
    const modal = document.getElementById('modal-preview-full');
    const body = document.getElementById('preview-modal-body');

    let videoEmbed = '';
    if (d.video && (d.video.includes('youtube.com') || d.video.includes('youtu.be'))) {
      const match = d.video.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
      if (match && match[2].length === 11) {
        videoEmbed = `
          <div class="bb-video-embed">
            <iframe src="https://www.youtube.com/embed/${match[2]}" allowfullscreen></iframe>
          </div>
        `;
      }
    }

    let seasonDisplay = d.season;
    if (seasonDisplay && !seasonDisplay.toLowerCase().startsWith('mùa') && !seasonDisplay.toLowerCase().startsWith('season')) {
      seasonDisplay = 'Mùa ' + seasonDisplay;
    }

    body.innerHTML = `
      <div style="border-bottom: 2px solid var(--accent-gold); padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: var(--accent-gold); font-family: var(--font-heading); font-size: 2rem; margin: 0 0 6px 0;">${d.title || 'Tiêu Đề Bài Viết'}</h2>
        <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; gap: 12px; flex-wrap: wrap;">
          <span>Class: <strong style="color: var(--text-bright);">${d.class_name}</strong></span>
          <span>Mùa giải: <strong style="color: var(--text-bright);">${seasonDisplay || 'Chưa đặt'}</strong></span>
          <span>Mục đích: <strong style="color: var(--text-bright);">${d.purpose}</strong></span>
          <span>Độ khó: <strong style="color: var(--text-bright);">${d.difficulty}</strong></span>
        </div>
      </div>

      <div class="detail-card">
        <div class="detail-card-title">📖 TỔNG QUAN LỐI CHƠI</div>
        <div class="markdown-rendered">${this.parseBBCode(d.intro || 'Chưa có giới thiệu.')}</div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
          <div>
            <strong style="color: var(--accent-green); font-size: 1rem; display: block; margin-bottom: 6px;">ƯU ĐIỂM (PROS)</strong>
            <div class="markdown-rendered">${this.parseBBCode(d.pros || '• Chưa cập nhật')}</div>
          </div>
          <div>
            <strong style="color: #ff6b6b; font-size: 1rem; display: block; margin-bottom: 6px;">NHƯỢC ĐIỂM (CONS)</strong>
            <div class="markdown-rendered">${this.parseBBCode(d.cons || '• Chưa cập nhật')}</div>
          </div>
        </div>
      </div>

      <div class="detail-card">
        <div class="detail-card-title">📊 PHÂN BỔ STATS</div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
          <div class="stat-pill"><div style="font-size:0.75rem; color:var(--text-muted);">STRENGTH</div><strong style="color:var(--accent-gold);">${d.str || '0'}</strong></div>
          <div class="stat-pill"><div style="font-size:0.75rem; color:var(--text-muted);">DEXTERITY</div><strong style="color:var(--accent-gold);">${d.dex || '0'}</strong></div>
          <div class="stat-pill"><div style="font-size:0.75rem; color:var(--text-muted);">VITALITY</div><strong style="color:var(--accent-gold);">${d.vit || '0'}</strong></div>
          <div class="stat-pill"><div style="font-size:0.75rem; color:var(--text-muted);">ENERGY</div><strong style="color:var(--accent-gold);">${d.ene || '0'}</strong></div>
        </div>
      </div>

      <div class="detail-card">
        <div class="detail-card-title">⚡ KỸ NĂNG & ROTATION</div>
        <div class="markdown-rendered">${this.parseBBCode(d.skills || 'Chưa cập nhật kỹ năng.')}</div>
      </div>

      <div class="detail-card">
        <div class="detail-card-title">🛡️ LỘ TRÌNH TRANG BỊ (GEAR PROGRESSION)</div>
        
        <details class="gear-accordion-item" open>
          <summary class="gear-accordion-header">🔰 Mức 1: Level 1 - 115</summary>
          <div class="gear-accordion-body">
            <div class="markdown-rendered">${this.parseBBCode(d.gear_lv0_50 || 'Chưa cập nhật')}</div>
          </div>
        </details>

        ${d.gear_lv50_135 ? `
          <details class="gear-accordion-item">
            <summary class="gear-accordion-header">⚔️ Mức 2: Level 115 - 135</summary>
            <div class="gear-accordion-body">
              <div class="markdown-rendered">${this.parseBBCode(d.gear_lv50_135)}</div>
            </div>
          </details>
        ` : ''}

        ${d.gear_lv135plus ? `
          <details class="gear-accordion-item">
            <summary class="gear-accordion-header">👑 Mức 3: Level 135+</summary>
            <div class="gear-accordion-body">
              <div class="markdown-rendered">${this.parseBBCode(d.gear_lv135plus)}</div>
            </div>
          </details>
        ` : ''}
      </div>

      ${d.strategy || videoEmbed ? `
        <div class="detail-card">
          <div class="detail-card-title">🎬 CHIẾN THUẬT BOSS & VIDEO GAMEPLAY</div>
          ${d.strategy ? `<div class="markdown-rendered" style="margin-bottom: 12px;">${this.parseBBCode(d.strategy)}</div>` : ''}
          ${videoEmbed}
        </div>
      ` : ''}
    `;

    modal.classList.add('active');
  },

  closePreviewModal() {
    document.getElementById('modal-preview-full').classList.remove('active');
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
      if (res.status === 'success') {
        localStorage.removeItem('d2_build_draft_wysiwyg');
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
