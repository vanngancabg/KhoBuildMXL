const FormHandler = {
  editBuildId: null,

  async init() {
    const user = Auth.getCurrentUser();
    if (!user) {
      document.getElementById('login-warning').style.display = 'block';
      document.getElementById('build-form').style.opacity = '0.4';
      document.getElementById('build-form').style.pointerEvents = 'none';
      return;
    }

    const editId = new URLSearchParams(window.location.search).get('edit');
    if (editId) {
      this.editBuildId = editId;
      document.getElementById('form-heading').innerText = 'EDIT TOPIC / SỬA HƯỚNG DẪN BUILD';
      await this.loadData(editId, user);
    } else {
      // Khởi tạo Skill Tree mặc định
      SkillPlanner.init(document.getElementById('build-class').value);
      // Tải lại bản nháp nếu có
      this.loadDraft();
    }
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

        // Tải nội dung BBCode chính
        document.getElementById('build-content').value = b.stats_desc || '';

        // Tải phân bổ Skill Tree
        try {
          const parsedSkills = JSON.parse(b.skills_desc);
          SkillPlanner.init(b.class_name || 'Amazon', parsedSkills.tree || {});
        } catch (e) {
          SkillPlanner.init(b.class_name || 'Amazon');
        }
      }
    } catch (e) {
      alert('Không thể tải bài viết để sửa!');
    }
  },

  insertBB(startTag, endTag) {
    const textarea = document.getElementById('build-content');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    const replacement = startTag + selected + endTag;
    
    textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    textarea.focus();
    textarea.setSelectionRange(start + startTag.length, start + startTag.length + selected.length);
  },

  insertSmiley(icon) {
    const textarea = document.getElementById('build-content');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.substring(0, start) + ' ' + icon + ' ' + textarea.value.substring(end);
    textarea.focus();
  },

  togglePreview() {
    const box = document.getElementById('preview-box');
    const content = document.getElementById('preview-content');
    const raw = document.getElementById('build-content').value;

    if (box.style.display === 'none') {
      content.innerHTML = this.parseBBCode(raw);
      box.style.display = 'block';
      box.scrollIntoView({ behavior: 'smooth' });
    } else {
      box.style.display = 'none';
    }
  },

  saveDraft() {
    const draft = {
      title: document.getElementById('build-title').value,
      class_name: document.getElementById('build-class').value,
      patch: document.getElementById('build-patch').value,
      content: document.getElementById('build-content').value,
      skill_tree: SkillPlanner.getPoints()
    };
    localStorage.setItem('d2_build_draft', JSON.stringify(draft));
    alert('Đã lưu bản nháp vào trình duyệt của bạn!');
  },

  loadDraft() {
    const saved = localStorage.getItem('d2_build_draft');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (confirm('Tìm thấy một bản nháp chưa hoàn thành. Bạn có muốn khôi phục không?')) {
          if (d.title) document.getElementById('build-title').value = d.title;
          if (d.class_name) {
            document.getElementById('build-class').value = d.class_name;
            SkillPlanner.init(d.class_name, d.skill_tree || {});
          }
          if (d.patch) document.getElementById('build-patch').value = d.patch;
          if (d.content) document.getElementById('build-content').value = d.content;
        }
      } catch (e) {}
    }
  },

  importBuildCode() {
    const rawCode = prompt('Dán chuỗi Mã Build (Build Code) vào đây:');
    if (!rawCode) return;

    try {
      const jsonStr = decodeURIComponent(escape(atob(rawCode.trim())));
      const data = JSON.parse(jsonStr);

      if (data.title) document.getElementById('build-title').value = data.title;
      if (data.class_name) {
        document.getElementById('build-class').value = data.class_name;
        SkillPlanner.init(data.class_name, data.skill_tree || {});
      }
      if (data.patch) document.getElementById('build-patch').value = data.patch;
      if (data.content) document.getElementById('build-content').value = data.content;

      alert('Đã nhập dữ liệu cấu hình thành công!');
    } catch (err) {
      alert('Mã Build không hợp lệ!');
    }
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

  async handleSubmit(e) {
    e.preventDefault();
    const user = Auth.getCurrentUser();
    if (!user) return Auth.openModal('login');

    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.innerText = 'Đang đăng bài...';

    const skillsData = {
      tree: SkillPlanner.getPoints()
    };

    const payload = {
      build_id: this.editBuildId,
      title: document.getElementById('build-title').value.trim(),
      class_name: document.getElementById('build-class').value,
      patch_version: document.getElementById('build-patch').value.trim(),
      author_username: user.username,
      author_name: user.display_name,
      role: user.role || 'Member',
      stats_desc: document.getElementById('build-content').value.trim(), // Toàn bộ BBCode được lưu tại đây
      skills_desc: JSON.stringify(skillsData),
      gear_desc: '',
      video_url: ''
    };

    try {
      const res = await API.saveBuild(payload);
      if (res.status === 'success') {
        localStorage.removeItem('d2_build_draft'); // Xóa nháp khi đăng xong
        window.location.href = `build-detail.html?id=${res.build_id}`;
      } else {
        alert(res.message || 'Lưu thất bại!');
        btn.disabled = false;
        btn.innerText = 'Submit / Đăng Bài';
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ Google!');
      btn.disabled = false;
      btn.innerText = 'Submit / Đăng Bài';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => FormHandler.init());
