const Auth = {
  currentUser: null,
  notifInterval: null,

  init() {
    const saved = localStorage.getItem('d2_current_user');
    if (saved) {
      try { this.currentUser = JSON.parse(saved); } catch (e) { this.currentUser = null; }
    }
    this.renderNavbar();
    if (this.currentUser) {
      this.loadNotifications();
      this.notifInterval = setInterval(() => this.loadNotifications(), 20000);
    }
  },

  getCurrentUser() {
    return this.currentUser;
  },

  renderNavbar() {
    const container = document.getElementById('auth-section');
    if (!container) return;

    if (this.currentUser) {
      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; position: relative;">
          <!-- NÚT CHUÔNG THÔNG BÁO -->
          <div style="position: relative;">
            <button class="btn btn-sm" onclick="Auth.toggleNotifPopup(event)" title="Thông báo" style="position: relative;">
              🔔 <span id="notif-count" class="notif-badge" style="display: none;">0</span>
            </button>
            <div id="notif-popup" class="notif-popup">
              <div class="notif-header">
                <span>Thông Báo Của Bạn</span>
                <span style="font-size: 0.75rem; color: var(--accent-gold); cursor: pointer;" onclick="Auth.markAllRead()">Đánh dấu đã đọc</span>
              </div>
              <div class="notif-list" id="notif-list">
                <div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">Đang tải...</div>
              </div>
            </div>
          </div>

          <div class="user-badge">
            <img src="${this.currentUser.avatar || 'https://i.imgur.com/6VBx3io.png'}" alt="Avatar">
            <a href="profile.html?user=${encodeURIComponent(this.currentUser.username)}" style="color: var(--accent-gold); text-decoration: none; font-weight: 600; font-size: 0.9rem;">${this.escapeHTML(this.currentUser.display_name)}</a>
            ${this.currentUser.role === 'Admin' ? '<span style="background:var(--accent-red); color:#fff; font-size:0.65rem; padding:1px 5px; border-radius:3px; font-weight:bold;">Admin</span>' : ''}
          </div>
          <button class="btn btn-sm" onclick="Auth.logout()">Đăng Xuất</button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <button class="btn btn-sm" onclick="Auth.openModal('login')">Đăng Nhập</button>
        <button class="btn btn-sm btn-primary" onclick="Auth.openModal('register')">Đăng Ký</button>
      `;
    }
  },

  async loadNotifications() {
    if (!this.currentUser) return;
    try {
      const res = await API.getNotifications(this.currentUser.username);
      if (res.status === 'success' && res.data) {
        const list = res.data;
        const unreadCount = list.filter(n => !n.is_read).length;
        const badge = document.getElementById('notif-count');
        if (badge) {
          if (unreadCount > 0) {
            badge.innerText = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'inline-block';
          } else {
            badge.style.display = 'none';
          }
        }
        this.renderNotifList(list);
      }
    } catch(e) {}
  },

  renderNotifList(list) {
    const box = document.getElementById('notif-list');
    if (!box) return;

    if (list.length === 0) {
      box.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">Chưa có thông báo nào.</div>';
      return;
    }

    box.innerHTML = '';
    list.forEach(n => {
      const div = document.createElement('div');
      div.className = `notif-item ${!n.is_read ? 'unread' : ''}`;
      
      let actionButtons = '';
      if (n.type === 'item_proposal' && n.extra_id) {
        actionButtons = `
          <div style="display:flex; gap:6px; margin-top:6px;">
            <button class="btn btn-sm btn-primary" style="padding:2px 8px; font-size:0.75rem;" onclick="Auth.approveItemProposal(event, '${n.extra_id}')">✔ Duyệt Thay Thế</button>
            <button class="btn btn-sm btn-danger" style="padding:2px 8px; font-size:0.75rem;" onclick="Auth.rejectItemProposal(event, '${n.extra_id}')">✖ Từ Chối</button>
          </div>
        `;
      }

      div.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-bright); margin-bottom: 2px;">
          <strong style="color: var(--accent-gold);">${this.escapeHTML(n.sender_name)}</strong> ${n.type === 'comment' ? 'đã bình luận về bài viết:' : ''}
          <div style="color: #90a4ae; font-weight: 500;">${this.escapeHTML(n.build_title)}</div>
          ${actionButtons}
        </div>
        <div style="font-size: 0.7rem; color: var(--text-muted);">${n.created_at || ''}</div>
      `;

      if (n.type === 'comment' && n.build_id) {
        div.onclick = () => { window.location.href = `build-detail.html?id=${n.build_id}`; };
      }
      box.appendChild(div);
    });
  },

  async approveItemProposal(e, pendingId) {
    e.stopPropagation();
    if (!confirm('Bạn có đồng ý áp dụng ảnh mới này và xóa ảnh cũ trên Drive không?')) return;
    try {
      const res = await API.approvePendingItem(pendingId, this.currentUser.username, this.currentUser.role);
      alert(res.message);
      await this.loadNotifications();
      await ItemTooltipManager.init();
    } catch(err) {
      alert('Lỗi khi duyệt ảnh!');
    }
  },

  async rejectItemProposal(e, pendingId) {
    e.stopPropagation();
    if (!confirm('Từ chối đề xuất ảnh này?')) return;
    try {
      const res = await API.rejectPendingItem(pendingId, this.currentUser.username, this.currentUser.role);
      alert(res.message);
      await this.loadNotifications();
    } catch(err) {
      alert('Lỗi khi từ chối ảnh!');
    }
  },

  toggleNotifPopup(e) {
    e.stopPropagation();
    const p = document.getElementById('notif-popup');
    if (p) p.classList.toggle('active');
  },

  async markAllRead() {
    if (!this.currentUser) return;
    await API.markNotificationRead(this.currentUser.username);
    const badge = document.getElementById('notif-count');
    if (badge) badge.style.display = 'none';
    document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
  },

  openModal(type) {
    const existing = document.getElementById('auth-modal');
    if (existing) existing.remove();

    const isLogin = type === 'login';
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content">
        <h2 style="color: var(--accent-gold); font-family: var(--font-heading); margin-bottom: 16px; text-align: center;">
          ${isLogin ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ THÀNH VIÊN'}
        </h2>
        <form id="auth-form" onsubmit="Auth.handleAuthSubmit(event, '${type}')">
          <div class="form-group">
            <label>Tài khoản (*)</label>
            <input type="text" id="auth-username" class="form-control" required placeholder="Tên đăng nhập không dấu">
          </div>
          ${!isLogin ? `
            <div class="form-group">
              <label>Tên hiển thị cộng đồng (*)</label>
              <input type="text" id="auth-display" class="form-control" required placeholder="VD: Ken">
            </div>
          ` : ''}
          <div class="form-group">
            <label>Mật khẩu (*)</label>
            <input type="password" id="auth-password" class="form-control" required placeholder="Nhập mật khẩu">
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
            <button type="button" class="btn" onclick="document.getElementById('auth-modal').remove()">Đóng</button>
            <button type="submit" id="btn-auth-submit" class="btn btn-primary">${isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản'}</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  },

  async handleAuthSubmit(e, type) {
    e.preventDefault();
    const btn = document.getElementById('btn-auth-submit');
    btn.disabled = true;
    btn.innerText = 'Đang xử lý...';

    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;

    try {
      if (type === 'login') {
        const res = await API.login({ username, password });
        if (res.status === 'success') {
          this.currentUser = res.user;
          localStorage.setItem('d2_current_user', JSON.stringify(res.user));
          document.getElementById('auth-modal').remove();
          this.renderNavbar();
          window.location.reload();
        } else {
          alert(res.message || 'Đăng nhập thất bại!');
          btn.disabled = false;
          btn.innerText = 'Đăng Nhập';
        }
      } else {
        const displayName = document.getElementById('auth-display').value.trim();
        const res = await API.register({ username, display_name: displayName, password });
        if (res.status === 'success') {
          alert('Đăng ký thành công! Bạn có thể sử dụng tài khoản ngay bây giờ.');
          this.currentUser = res.user;
          localStorage.setItem('d2_current_user', JSON.stringify(res.user));
          document.getElementById('auth-modal').remove();
          this.renderNavbar();
          window.location.reload();
        } else {
          alert(res.message || 'Đăng ký thất bại!');
          btn.disabled = false;
          btn.innerText = 'Tạo Tài Khoản';
        }
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ!');
      btn.disabled = false;
      btn.innerText = 'Thử lại';
    }
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('d2_current_user');
    if (this.notifInterval) clearInterval(this.notifInterval);
    window.location.reload();
  },

  escapeHTML(str) { return str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; }
};

document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  window.addEventListener('click', (e) => {
    const p = document.getElementById('notif-popup');
    if (p && !e.target.closest('#notif-popup') && !e.target.closest('.notif-badge') && !e.target.closest('button[title="Thông báo"]')) {
      p.classList.remove('active');
    }
  });
});
