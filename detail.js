// Xử lý logic tải bài viết chi tiết, phân quyền tác giả và quản lý bình luận
const DetailHandler = {
  buildId: null,
  currentBuild: null,

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    this.buildId = urlParams.get('id');

    if (!this.buildId) {
      alert('Không tìm thấy mã bài viết!');
      window.location.href = 'index.html';
      return;
    }

    this.checkCommentAuth();
    await this.loadBuildData();
    await this.loadComments();
  },

  checkCommentAuth() {
    const user = Auth.getCurrentUser();
    const commentBox = document.getElementById('comment-box');
    const loginHint = document.getElementById('comment-login-hint');

    if (user) {
      commentBox.style.display = 'block';
      loginHint.style.display = 'none';
    } else {
      commentBox.style.display = 'none';
      loginHint.style.display = 'block';
    }
  },

  async loadBuildData() {
    const loading = document.getElementById('detail-loading');
    const wrapper = document.getElementById('detail-wrapper');

    try {
      const res = await API.getBuildDetail(this.buildId);
      if (res.status === 'success' && res.data) {
        this.currentBuild = res.data;
        this.renderBuild(this.currentBuild);
        loading.style.display = 'none';
        wrapper.style.display = 'block';
      } else {
        loading.innerText = 'Bài viết không tồn tại hoặc đã bị xóa!';
      }
    } catch (err) {
      loading.innerText = 'Lỗi khi tải dữ liệu bài viết!';
    }
  },

  renderBuild(b) {
    document.title = `${b.title} - Median XL Build`;
    document.getElementById('detail-title').innerText = b.title || '';
    document.getElementById('detail-class').innerText = b.class_name || 'Class';
    document.getElementById('detail-patch').innerText = b.patch_version ? `Patch ${b.patch_version}` : '';
    document.getElementById('detail-author').innerText = b.author_name || b.author_id || 'Ẩn danh';
    document.getElementById('detail-time').innerText = b.updated_at || '';

    // Hiển thị nội dung các mục
    document.getElementById('detail-stats').innerText = b.stats_desc || 'Chưa cập nhật điểm thuộc tính.';
    document.getElementById('detail-skills').innerText = b.skills_desc || 'Chưa cập nhật kỹ năng.';
    document.getElementById('detail-gear').innerText = b.gear_desc || 'Chưa cập nhật trang bị.';

    // Kiểm tra quyền tác giả để hiện nút sửa bài
    const user = Auth.getCurrentUser();
    if (user && String(user.username).toLowerCase() === String(b.author_id).toLowerCase()) {
      const authorActions = document.getElementById('author-actions');
      const editLink = document.getElementById('btn-edit-link');
      editLink.href = `create-build.html?edit=${b.build_id}`;
      authorActions.style.display = 'block';
    }

    // Nhúng Video nếu có link youtube
    if (b.video_url && (b.video_url.includes('youtube.com') || b.video_url.includes('youtu.be'))) {
      const videoId = this.extractYouTubeId(b.video_url);
      if (videoId) {
        const videoSection = document.getElementById('video-section');
        const videoContainer = document.getElementById('video-container');
        videoContainer.innerHTML = `
          <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
            src="https://www.youtube.com/embed/${videoId}" allowfullscreen>
          </iframe>
        `;
        videoSection.style.display = 'block';
      }
    }
  },

  async loadComments() {
    try {
      const res = await API.getComments(this.buildId);
      const list = document.getElementById('comments-list');

      if (res.status === 'success' && res.data && res.data.length > 0) {
        list.innerHTML = '';
        res.data.forEach(cmt => {
          const div = document.createElement('div');
          div.className = 'comment-item';
          div.innerHTML = `
            <img src="${cmt.avatar || 'https://i.imgur.com/6VBx3io.png'}" class="comment-avatar" alt="User">
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-weight: bold; color: var(--accent-gold); font-size: 0.9rem;">${this.escapeHTML(cmt.user_name || cmt.user_id)}</span>
                <span style="color: var(--text-muted); font-size: 0.75rem;">${cmt.created_at || ''}</span>
              </div>
              <div style="color: var(--text-bright); font-size: 0.9rem; line-height: 1.4; white-space: pre-wrap;">${this.escapeHTML(cmt.content)}</div>
            </div>
          `;
          list.appendChild(div);
        });
      }
    } catch (err) {
      console.error('Không thể tải bình luận:', err);
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
    if (!content) {
      alert('Vui lòng nhập nội dung bình luận!');
      return;
    }

    const btn = document.getElementById('btn-send-comment');
    btn.disabled = true;
    btn.innerText = 'Đang gửi...';

    try {
      const res = await API.addComment({
        build_id: this.buildId,
        username: user.username,
        user_name: user.display_name,
        avatar: user.avatar,
        content: content
      });

      if (res.status === 'success') {
        input.value = '';
        await this.loadComments();
      } else {
        alert(res.message || 'Lỗi khi gửi bình luận!');
      }
    } catch (err) {
      alert('Lỗi kết nối tới máy chủ Google!');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Gửi Bình Luận';
    }
  },

  extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  },

  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  DetailHandler.init();
});
