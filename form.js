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
      document.getElementById('form-heading').innerText = 'Chỉnh Sửa Hướng Dẫn Build';
      await this.loadData(editId, user);
    } else {
      SkillPlanner.init(document.getElementById('build-class').value);
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
        document.getElementById('build-stats').value = b.stats_desc || '';
        document.getElementById('build-video').value = b.video_url || '';

        // Tách kỹ năng và điểm Skill Tree
        try {
          const parsedSkills = JSON.parse(b.skills_desc);
          document.getElementById('build-skills').value = parsedSkills.notes || '';
          SkillPlanner.init(b.class_name || 'Amazon', parsedSkills.tree || {});
        } catch (e) {
          document.getElementById('build-skills').value = b.skills_desc || '';
          SkillPlanner.init(b.class_name || 'Amazon');
        }

        // Tách trang bị
        try {
          const gear = JSON.parse(b.gear_desc);
          document.getElementById('gear-weapon').value = gear.weapon || '';
          document.getElementById('gear-helm').value = gear.helm || '';
          document.getElementById('gear-armor').value = gear.armor || '';
          document.getElementById('gear-gloves').value = gear.gloves || '';
          document.getElementById('gear-boots').value = gear.boots || '';
          document.getElementById('gear-jewelry').value = gear.jewelry || '';
          document.getElementById('gear-charms').value = gear.charms || '';
        } catch (e) {
          document.getElementById('gear-charms').value = b.gear_desc || '';
        }
      }
    } catch (e) {
      alert('Không thể tải bài viết để sửa!');
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
      if (data.stats) document.getElementById('build-stats').value = data.stats;
      if (data.skills_notes) document.getElementById('build-skills').value = data.skills_notes;

      if (data.gear) {
        document.getElementById('gear-weapon').value = data.gear.weapon || '';
        document.getElementById('gear-helm').value = data.gear.helm || '';
        document.getElementById('gear-armor').value = data.gear.armor || '';
        document.getElementById('gear-gloves').value = data.gear.gloves || '';
        document.getElementById('gear-boots').value = data.gear.boots || '';
        document.getElementById('gear-jewelry').value = data.gear.jewelry || '';
        document.getElementById('gear-charms').value = data.gear.charms || '';
      }
      alert('Đã nhập dữ liệu cấu hình thành công!');
    } catch (err) {
      alert('Mã Build không hợp lệ hoặc bị lỗi!');
    }
  },

  insertTag(id, startTag, endTag) {
    const el = document.getElementById(id);
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    el.value = text.substring(0, start) + startTag + text.substring(start, end) + endTag + text.substring(end);
    el.focus();
  },

  insertItemTag(startTag, endTag) {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      const start = active.selectionStart;
      const end = active.selectionEnd;
      active.value = active.value.substring(0, start) + startTag + active.value.substring(start, end) + endTag + active.value.substring(end);
    }
  },

  async handleSubmit(e) {
    e.preventDefault();
    const user = Auth.getCurrentUser();
    if (!user) {
      Auth.openModal('login');
      return;
    }

    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.innerText = 'Đang lưu...';

    const gearData = {
      weapon: document.getElementById('gear-weapon').value.trim(),
      helm: document.getElementById('gear-helm').value.trim(),
      armor: document.getElementById('gear-armor').value.trim(),
      gloves: document.getElementById('gear-gloves').value.trim(),
      boots: document.getElementById('gear-boots').value.trim(),
      jewelry: document.getElementById('gear-jewelry').value.trim(),
      charms: document.getElementById('gear-charms').value.trim()
    };

    const skillsData = {
      notes: document.getElementById('build-skills').value.trim(),
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
      stats_desc: document.getElementById('build-stats').value.trim(),
      skills_desc: JSON.stringify(skillsData),
      gear_desc: JSON.stringify(gearData),
      video_url: document.getElementById('build-video').value.trim()
    };

    try {
      const res = await API.saveBuild(payload);
      if (res.status === 'success') {
        window.location.href = `build-detail.html?id=${res.build_id}`;
      } else {
        alert(res.message || 'Lưu thất bại!');
        btn.disabled = false;
        btn.innerText = '💾 Lưu Bài Viết';
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ Google!');
      btn.disabled = false;
      btn.innerText = '💾 Lưu Bài Viết';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => FormHandler.init());
