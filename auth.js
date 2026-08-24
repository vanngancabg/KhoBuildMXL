const Auth = {
  getCurrentUser() {
    const user = localStorage.getItem('d2_current_user');
    return user ? JSON.parse(user) : null;
  },

  setCurrentUser(user) {
    localStorage.setItem('d2_current_user', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('d2_current_user');
    window.location.reload();
  },

  renderNavUser() {
    const container = document.getElementById('auth-section');
    if (!container) return;

    const user = this.getCurrentUser();
    if (user) {
      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px;">
          <!-- CHUÔNG THÔNG BÁO -->
          <div class="notif-wrapper" style="position: relative;">
            <button id="btn-notif-bell" class="btn btn-sm" onclick="Auth.toggleNotificationPopup()" title="Thông báo" style="position: relative; font-size: 1rem; padding: 4px 8px;">
              🔔
              <span id="notif-badge" class="notif-badge" style="display: none;">0</span>
            </button>
            <div id="notif-popup" class="notif-popup">
              <div class="notif-header">
                <span>🔔 Thông báo của bạn</span>
                <span style="font-size: 0.75rem; color: var(--accent-gold); cursor: pointer;" onclick="Auth.markAllRead()">Đã đọc tất cả</span>
              </div>
              <div id="notif-list" class="notif-list">
                <div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 12px;">Đang tải...</div>
              </div>
            </div>
          </div>

          <div class="user-badge">
            <img src="${user.avatar || 'https://i.imgur.com/6VBx3io.png'}" alt="Avatar">
            <a href="profile.html?user=${encodeURIComponent(user.username)}" style="color: var(--accent-gold); font-weight: 600; text-decoration: none;">${user.display_name}</a>
            <button class="btn btn-danger btn-sm" onclick="Auth.logout()">Đăng xuất</button>
          </div>
        </div>
      `;
      this.fetchNotifications(user);
    } else {
      container.innerHTML = `
        <button class="btn" onclick="Auth.openModal('login')">Đăng nhập</button>
        <button class="btn btn-primary" onclick="Auth.openModal('register')">Đăng ký</button>
      `;
    }
  },

  async fetchNotifications(user) {
    try {
      const res = await API.getNotifications(user.username);
      const buildsRes = await API.getBuilds();
      const notifListEl = document.getElementById('notif-list');
      const badgeEl = document.getElementById('notif-badge');

      let notifications = [];
      if (res.status === 'success' && res.data) {
        notifications = res.data;
      }

      // 1. Kiểm tra bài viết mới kể từ lần truy cập trước
      const lastVisit = localStorage.getItem('d2_last_visit_time');
      const now = new Date().getTime();
      let newBuildsCount = 0;

      if (buildsRes.status === 'success' && buildsRes.data) {
        buildsRes.data.forEach(b => {
          if (String(b.author_id).toLowerCase() !== String(user.username).toLowerCase()) {
            if (lastVisit) {
              const buildCreated = new Date(b.created_at || b.updated_at).getTime();
              if (buildCreated > Number(lastVisit)) {
                newBuildsCount++;
              }
            }
          }
        });
      }

      // 2. Đếm số thông báo chưa đọc
      const unreadComments = notifications.filter(n => !n.is_read).length;
      const totalUnread = unreadComments + newBuildsCount;

      if (totalUnread > 0) {
        badgeEl.innerText = totalUnread > 99 ? '99+' : totalUnread;
        badgeEl.style.display = 'inline-block';
      } else {
        badgeEl.style.display = 'none';
      }

      // 3. Hiển thị danh sách thông báo
      let html = '';
      if (newBuildsCount > 0) {
        html += `
          <div class="notif-item unread" onclick="window.location.href='index.html'">
            <div style="font-size: 0.85rem; color: var(--accent-gold); font-weight: bold;">✨ Có ${newBuildsCount} bài Build mới được đăng!</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Bấm để ra trang chủ khám phá ngay</div>
          </div>
        `;
      }

      if (notifications.length === 0 && newBuildsCount === 0) {
        html = '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 14px;">Không có thông báo mới.</div>';
      } else {
        notifications.slice(0, 15).forEach(n => {
          const isUnread = !n.is_read ? 'unread' : '';
          html += `
            <div class="notif-item ${isUnread}" onclick="window.location.href='build-detail.html?id=${n.build_id}'">
              <div style="font-size: 0.85rem; color: var(--text-bright);">
                <strong>${n.sender_name}</strong> đã bình luận trong: <span style="color: var(--accent-gold);">${n.build_title}</span>
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">🕒 ${n.created_at || ''}</div>
            </div>
          `;
        });
      }

      notifListEl.innerHTML = html;
      localStorage.setItem('d2_last_visit_time', String(now));
    } catch (e) {}
  },

  toggleNotificationPopup() {
    const popup = document.getElementById('notif-popup');
    if (popup) {
      popup.classList.toggle('active');
    }
  },

  async markAllRead() {
    const user = this.getCurrentUser();
    if (!user) return;
    const badgeEl = document.getElementById('notif-badge');
    badgeEl.style.display = 'none';

    document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
    await API.markNotificationRead(user.username);
  },

  openModal(type) {
    const modal = document.getElementById('auth-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('auth-form');
    const switchText = document.getElementById('auth-switch-text');
    const nameGroup = document.getElementById('group-display-name');

    if (!modal) return;
    modal.classList.add('active');

    if (type === 'register') {
      title.innerText = 'Đăng ký tài khoản';
      nameGroup.style.display = 'block';
      form.dataset.mode = 'register';
      switchText.innerHTML = 'Đã có tài khoản? <a href="javascript:void(0)" style="color: var(--accent-gold);" onclick="Auth.openModal(\'login\')">Đăng nhập ngay</a>';
    } else {
      title.innerText = 'Đăng nhập';
      nameGroup.style.display = 'none';
      form.dataset.mode = 'login';
      switchText.innerHTML = 'Chưa có tài khoản? <a href="javascript:void(0)" style="color: var(--accent-gold);" onclick="Auth.openModal(\'register\')">Đăng ký mới</a>';
    }
  },

  closeModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('active');
  },

  async handleAuthSubmit(event) {
    event.preventDefault();
    const mode = event.target.dataset.mode;
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    const displayName = document.getElementById('auth-display-name')?.value.trim();
    const btnSubmit = document.getElementById('btn-auth-submit');

    if (!username || !password) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Đang xử lý...';

    try {
      if (mode === 'register') {
        const res = await API.register({
          username: username,
          password: password,
          display_name: displayName || username,
          avatar: 'https://i.imgur.com/6VBx3io.png'
        });

        if (res.status === 'success') {
          alert('Đăng ký thành công!');
          this.setCurrentUser(res.user);
          this.closeModal();
          window.location.reload();
        } else {
          alert(res.message || 'Đăng ký thất bại!');
        }
      } else {
        const res = await API.login({ username, password });
        if (res.status === 'success') {
          this.setCurrentUser(res.user);
          this.closeModal();
          window.location.reload();
        } else {
          alert(res.message || 'Đăng nhập thất bại!');
        }
      }
    } catch (err) {
      alert('Lỗi kết nối tới máy chủ Google!');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerText = mode === 'register' ? 'Đăng ký' : 'Đăng nhập';
    }
  }
};

// Tự động đóng popup thông báo khi click ra ngoài
document.addEventListener('click', (e) => {
  const popup = document.getElementById('notif-popup');
  const btnBell = document.getElementById('btn-notif-bell');
  if (popup && btnBell && !popup.contains(e.target) && !btnBell.contains(e.target)) {
    popup.classList.remove('active');
  }
});

// Tự động dựng khung modal xác thực vào trang web
document.addEventListener('DOMContentLoaded', () => {
  const modalHTML = `
    <div id="auth-modal" class="modal">
      <div class="modal-content">
        <h3 id="modal-title" style="color: var(--accent-gold); margin-bottom: 16px;">Đăng nhập</h3>
        <form id="auth-form" onsubmit="Auth.handleAuthSubmit(event)">
          <div class="form-group" id="group-display-name" style="display: none;">
            <label>Tên hiển thị (Nickname)</label>
            <input type="text" id="auth-display-name" class="form-control" placeholder="VD: Sát Thủ Bóng Đêm">
          </div>
          <div class="form-group">
            <label>Tên đăng nhập (viết liền không dấu)</label>
            <input type="text" id="auth-username" class="form-control" required placeholder="VD: darkknight123">
          </div>
          <div class="form-group">
            <label>Mật khẩu</label>
            <input type="password" id="auth-password" class="form-control" required placeholder="••••••••">
          </div>
          <button type="submit" id="btn-auth-submit" class="btn btn-primary" style="width: 100%; justify-content: center; margin-top: 10px;">Xác nhận</button>
        </form>
        <div style="margin-top: 16px; text-align: center; font-size: 0.85rem;" id="auth-switch-text"></div>
        <div style="text-align: center; margin-top: 10px;">
          <button class="btn" style="padding: 4px 12px; font-size: 0.8rem;" onclick="Auth.closeModal()">Đóng</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  Auth.renderNavUser();
});
