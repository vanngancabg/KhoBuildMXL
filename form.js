// Xử lý logic Form Tạo mới / Chỉnh sửa bài build
const FormHandler = {
  editBuildId: null,

  async init() {
    const user = Auth.getCurrentUser();
    const loginWarning = document.getElementById('login-warning');
    const buildForm = document.getElementById('build-form');

    if (!user) {
      loginWarning.style.display = 'block';
      buildForm.style.opacity = '0.4';
      buildForm.style.pointerEvents = 'none';
      return;
    }

    // Kiểm tra xem trang có đang ở chế độ SỬA bài không (có ?edit=build_id trên link)
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');

    if (editId) {
      this.editBuildId = editId;
      document.getElementById('form-heading').innerText = 'Chỉnh Sửa Hướng Dẫn Build';
      document.getElementById('btn-save-build').innerText = '💾 Lưu Thay Đổi';
      await this.loadExistingBuild(editId, user);
    }
  },

  async loadExistingBuild(buildId, currentUser) {
    try {
      const res = await API.getBuildDetail(buildId);
      if (res.status === 'success' && res.data) {
        const build = res.data;

        // Kiểm tra quyền: Chỉ tác giả mới được vào trang sửa
        if (String(build.author_id).toLowerCase() !== String(currentUser.username).toLowerCase()) {
          alert('Bạn không phải là tác giả của bài viết này!');
          window.location.href = `build-detail.html?id=${buildId}`;
          return;
        }

        // Điền dữ liệu cũ vào các ô input
        document.getElementById('build-title').value = build.title || '';
        document.getElementById('build-class').value = build.class_name || 'Amazon';
        document.getElementById('build-patch').value = build.patch_version || '';
        document.getElementById('build-stats').value = build.stats_desc || '';
        document.getElementById('build-skills').value = build.skills_desc || '';
        document.getElementById('build-gear').value = build.gear_desc || '';
        document.getElementById('build-video').value = build.video_url || '';
      }
    } catch (err) {
      alert('Không thể tải dữ liệu bài viết để sửa!');
    }
  },

  async handleSubmit(event) {
    event.preventDefault();
    const user = Auth.getCurrentUser();
    if (!user) {
      alert('Vui lòng đăng nhập trước khi đăng bài!');
      Auth.openModal('login');
      return;
    }

    const btn = document.getElementById('btn-save-build');
    btn.disabled = true;
    btn.innerText = 'Đang lưu dữ liệu lên máy chủ...';

    const buildPayload = {
      build_id: this.editBuildId, // null nếu tạo mới, có chuỗi ID nếu sửa
      title: document.getElementById('build-title').value.trim(),
      class_name: document.getElementById('build-class').value,
      patch_version: document.getElementById('build-patch').value.trim(),
      author_username: user.username,
      author_name: user.display_name,
      stats_desc: document.getElementById('build-stats').value.trim(),
      skills_desc: document.getElementById('build-skills').value.trim(),
      gear_desc: document.getElementById('build-gear').value.trim(),
      video_url: document.getElementById('build-video').value.trim()
    };

    try {
      const res = await API.saveBuild(buildPayload);
      if (res.status === 'success') {
        alert(res.message || 'Lưu thành công!');
        window.location.href = `build-detail.html?id=${res.build_id}`;
      } else {
        alert(res.message || 'Có lỗi xảy ra!');
      }
    } catch (err) {
      alert('Lỗi kết nối tới máy chủ Google Apps Script!');
    } finally {
      btn.disabled = false;
      btn.innerText = this.editBuildId ? '💾 Lưu Thay Đổi' : '💾 Đăng Bài Viết';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  FormHandler.init();
});
