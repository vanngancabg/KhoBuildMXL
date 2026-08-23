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
    }
  },

  async loadData(id, user) {
    const res = await API.getBuildDetail(id);
    if (res.status === 'success' && res.data) {
      const b = res.data;
      if (String(b.author_id).toLowerCase() !== String(user.username).toLowerCase() && user.role !== 'Admin') {
        alert('Bạn không có quyền sửa bài này!');
        return window.location.href = 'index.html';
      }
      document.getElementById('build-title').value = b.title || '';
      document.getElementById('build-class').value = b.class_name || 'Amazon';
      document.getElementById('build-patch').value = b.patch_version || '';
      document.getElementById('build-stats').value = b.stats_desc || '';
      document.getElementById('build-skills').value = b.skills_desc || '';
      document.getElementById('build-video').value = b.video_url || '';

      // Tách dữ liệu JSON Gear nếu có
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
    if (active && active.tagName === 'INPUT') {
      const start = active.selectionStart;
      const end = active.selectionEnd;
      active.value = active.value.substring(0, start) + startTag + active.value.substring(start, end) + endTag + active.value.substring(end);
    }
  },

  async handleSubmit(e) {
    e.preventDefault();
    const user = Auth.getCurrentUser();
    const btn = document.getElementById('btn-save');
    btn.disabled = true;

    const gearData = {
      weapon: document.getElementById('gear-weapon').value.trim(),
      helm: document.getElementById('gear-helm').value.trim(),
      armor: document.getElementById('gear-armor').value.trim(),
      gloves: document.getElementById('gear-gloves').value.trim(),
      boots: document.getElementById('gear-boots').value.trim(),
      jewelry: document.getElementById('gear-jewelry').value.trim(),
      charms: document.getElementById('gear-charms').value.trim()
    };

    const payload = {
      build_id: this.editBuildId,
      title: document.getElementById('build-title').value.trim(),
      class_name: document.getElementById('build-class').value,
      patch_version: document.getElementById('build-patch').value.trim(),
      author_username: user.username,
      author_name: user.display_name,
      role: user.role,
      stats_desc: document.getElementById('build-stats').value.trim(),
      skills_desc: document.getElementById('build-skills').value.trim(),
      gear_desc: JSON.stringify(gearData),
      video_url: document.getElementById('build-video').value.trim()
    };

    const res = await API.saveBuild(payload);
    if (res.status === 'success') {
      window.location.href = `build-detail.html?id=${res.build_id}`;
    } else {
      alert(res.message || 'Lỗi!');
      btn.disabled = false;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => FormHandler.init());
