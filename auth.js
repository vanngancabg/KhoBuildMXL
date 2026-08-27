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
      setTimeout(() => this.loadNotifications(), 500);

      if (this.notifInterval) clearInterval(this.notifInterval);
      this.notifInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          this.loadNotifications();
        }
      }, 60000);
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
      if (res && res.status === 'success' && Array.isArray(res.data)) {
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

    if (!list || list.length === 0) {
      box.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">Chưa có thông báo nào.</div>';
      return;
    }

    box.innerHTML = '';
    list.forEach(n => {
      const div = document.createElement('div');
      div.className = `notif-item ${!n.is_read ? 'unread' : ''}`;
      
      let actionButtons = '';
      let messageTitle = '';

      if (n.type === 'new_build') {
        messageTitle = `<strong style="color: var(--accent-gold);">${this.escapeHTML(n.sender_name)}</strong> vừa đăng hướng dẫn build mới:`;
      } else if (n.type === 'comment') {
        messageTitle = `<strong style="color: var(--accent-gold);">${this.escapeHTML(n.sender_name)}</strong> đã bình luận về bài viết:`;
      } else if (n.type === 'item_proposal') {
        messageTitle = `<strong style="color: var(--accent-gold);">${this.escapeHTML(n.sender_name)}</strong> ${this.escapeHTML(n.build_title)}`;
        if (n.extra_id) {
          actionButtons = `
            <div style="display:flex; gap:6px; margin-top:6px;">
              <button class="btn btn-sm btn-primary" style="padding:3px 10px; font-size:0.75rem;" onclick="Auth.openCompareModal(event, '${n.extra_id}')">🔍 Xem & So Sánh Ảnh</button>
            </div>
          `;
        }
      } else {
        messageTitle = `<strong style="color: var(--accent-gold);">${this.escapeHTML(n.sender_name)}</strong> ${this.escapeHTML(n.build_title)}`;
      }

      div.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-bright); margin-bottom: 2px;">
          ${messageTitle}
          ${n.type !== 'item_proposal' && n.type !== 'item_approved' && n.type !== 'item_rejected' ? `<div style="color: #90a4ae; font-weight: 500;">${this.escapeHTML(n.build_title)}</div>` : ''}
          ${actionButtons}
        </div>
        <div style="font-size: 0.7rem; color: var(--text-muted);">${n.created_at || ''}</div>
      `;

      if ((n.type === 'comment' || n.type === 'new_build') && n.build_id) {
        div.onclick = () => { window.location.href = `build-detail.html?id=${n.build_id}`; };
      }
      box.appendChild(div);
    });
  },

  async openCompareModal(e, pendingId) {
    e.stopPropagation();
    const p = document.getElementById('notif-popup');
    if (p) p.classList.remove('active');

    let modal = document.getElementById('modal-item-compare');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-item-compare';
      modal.className = 'modal active';
      document.body.appendChild(modal);
    } else {
      modal.classList.add('active');
    }

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px; width: 95%;">
        <div style="text-align: center; color: var(--accent-gold); padding: 40px;">⏳ Đang tải dữ liệu so sánh ảnh...</div>
      </div>
    `;

    try {
      const res = await API.getPendingItemDetail(pendingId);
      if (res && res.status === 'success' && res.data) {
        const d = res.data;
        modal.innerHTML = `
          <div class="modal-content" style="max-width: 850px; width: 95%;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:12px; margin-bottom:16px;">
              <h3 style="color:var(--accent-gold); margin:0; font-family:var(--font-body); font-weight:700;">⚖️ ĐỐI CHIẾU ẢNH: "${this.escapeHTML(d.item_name)}"</h3>
              <button class="btn btn-sm" onclick="document.getElementById('modal-item-compare').classList.remove('active')">✖ Đóng</button>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              <!-- CỘT ẢNH HIỆN TẠI (CŨ) -->
              <div style="background:#0d0e10; border:1px solid rgba(255,255,255,0.06); border-radius:4px; padding:14px; text-align:center;">
                <h4 style="color:#ff6b6b; margin-bottom:8px; font-family:var(--font-body);">📷 ẢNH HIỆN TẠI (CŨ)</h4>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:10px;">
                  Đăng bởi: <b style="color:var(--text-bright);">${this.escapeHTML(d.original_contributor || 'Cộng đồng')}</b>
                </div>
                <div style="min-height:220px; display:flex; align-items:center; justify-content:center;">
                  ${d.old_url ? `<img src="${d.old_url}" alt="Ảnh cũ" style="max-width:100%; max-height:260px; object-fit:contain; border-radius:3px;">` : '<span style="color:var(--text-muted);">Không có ảnh cũ</span>'}
                </div>
              </div>

              <!-- CỘT ẢNH ĐỀ XUẤT (MỚI) -->
              <div style="background:#0d0e10; border:1px solid rgba(46,204,113,0.4); border-radius:4px; padding:14px; text-align:center;">
                <h4 style="color:var(--accent-green); margin-bottom:8px; font-family:var(--font-body);">✨ ẢNH ĐỀ XUẤT (MỚI)</h4>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:10px;">
                  Đề xuất bởi: <b style="color:var(--text-bright);">${this.escapeHTML(d.new_contributor)}</b> | Patch: <b style="color:var(--accent-gold);">${d.new_patch || '2.13'}</b>
                </div>
                <div style="min-height:220px; display:flex; align-items:center; justify-content:center;">
                  <img src="${d.new_url}" alt="Ảnh mới" style="max-width:100%; max-height:260px; object-fit:contain; border-radius:3px;">
                </div>
              </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:12px; border-top:1px solid var(--border-color); padding-top:14px;">
              <button class="btn btn-danger" onclick="Auth.rejectItemFromModal('${d.pending_id}')">✖ Từ Chối Đề Xuất</button>
              <button class="btn btn-primary" style="padding:6px 20px; font-weight:bold;" onclick="Auth.approveItemFromModal('${d.pending_id}')">✔ Đồng Ý Duyệt & Áp Dụng Ảnh Mới</button>
            </div>
          </div>
        `;
      } else {
        modal.innerHTML = `
          <div class="modal-content" style="max-width: 400px; text-align:center;">
            <p style="color:var(--text-muted); margin-bottom:16px;">${res.message || 'Yêu cầu không còn tồn tại'}</p>
            <button class="btn btn-sm" onclick="document.getElementById('modal-item-compare').classList.remove('active')">Đóng</button>
          </div>
        `;
      }
    } catch(err) {
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px; text-align:center;">
          <p style="color:#ff6b6b; margin-bottom:16px;">Lỗi kết nối máy chủ!</p>
          <button class="btn btn-sm" onclick="document.getElementById('modal-item-compare').classList.remove('active')">Đóng</button>
        </div>
      `;
    }
  },

  async approveItemFromModal(pendingId) {
    if (!confirm('Bạn có chắc chắn muốn duyệt và thay thế ảnh mới này cho món đồ?')) return;
    try {
      const res = await API.approvePendingItem(pendingId, this.currentUser.username, this.currentUser.role);
      alert(res.message);
      document.getElementById('modal-item-compare').classList.remove('active');
      
      localStorage.removeItem('d2_cached_itemdb');
      if (typeof ItemTooltipManager !== 'undefined') {
        await ItemTooltipManager.loadDatabase();
      }
      await this.loadNotifications();
    } catch(err) {
      alert('Lỗi khi duyệt ảnh!');
    }
  },

  async rejectItemFromModal(pendingId) {
    if (!confirm('Bạn có chắc chắn muốn từ chối ảnh đề xuất này?')) return;
    try {
      const res = await API.rejectPendingItem(pendingId, this.currentUser.username, this.currentUser.role);
      alert(res.message);
      document.getElementById('modal-item-compare').classList.remove('active');
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
    const badge = document.getElementById('notif-count');
    if (badge) badge.style.display = 'none';

    const box = document.getElementById('notif-list');
    if (box) {
      box.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">Chưa có thông báo nào.</div>';
    }

    try {
      await API.markNotificationRead(this.currentUser.username);
    } catch(e) {}
  },

  // MODAL ĐĂNG NHẬP / ĐĂNG KÝ VỚI FONT TIẾNG VIỆT CHUẨN VÀ NÚT CHUYỂN ĐỔI TIỆN LỢI
  openModal(type) {
    const existing = document.getElementById('auth-modal');
    if (existing) existing.remove();

    const isLogin = type === 'login';
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 420px;">
        <h2 style="color: var(--accent-gold); font-family: var(--font-body); font-weight: 700; margin-bottom: 16px; text-align: center; font-size: 1.35rem;">
          ${isLogin ? 'ĐĂNG NHẬP TÀI KHOẢN' : 'ĐĂNG KÝ THÀNH VIÊN MỚI'}
        </h2>
        <form id="auth-form" onsubmit="Auth.handleAuthSubmit(event, '${type}')">
          <div class="form-group">
            <label>Tên đăng nhập (*)</label>
            <input type="text" id="auth-username" class="form-control" required placeholder="Tên đăng nhập không dấu (VD: assassin99)">
          </div>
          ${!isLogin ? `
            <div class="form-group">
              <label>Tên hiển thị cộng đồng (*)</label>
              <input type="text" id="auth-display" class="form-control" required placeholder="Tên gọi hiển thị (VD: Ken)">
            </div>
          ` : ''}
          <div class="form-group">
            <label>Mật khẩu (*)</label>
            <input type="password" id="auth-password" class="form-control" required placeholder="Nhập mật khẩu của bạn">
          </div>

          <!-- NÚT CHUYỂN ĐỔI ĐĂNG KÝ / ĐĂNG NHẬP -->
          <div style="margin: 12px 0; text-align: center; font-size: 0.85rem;">
            ${isLogin ? `
              <span style="color: var(--text-muted);">Chưa có tài khoản? </span>
              <a href="javascript:void(0)" onclick="Auth.openModal('register')" style="color: var(--accent-gold); font-weight: 600; text-decoration: underline;">Đăng ký ngay</a>
            ` : `
              <span style="color: var(--text-muted);">Đã có tài khoản? </span>
              <a href="javascript:void(0)" onclick="Auth.openModal('login')" style="color: var(--accent-gold); font-weight: 600; text-decoration: underline;">Đăng nhập ngay</a>
            `}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px;">
            <button type="button" class="btn" onclick="document.getElementById('auth-modal').remove()">Đóng</button>
            <button type="submit" id="btn-auth-submit" class="btn btn-primary" style="padding: 7px 20px; font-weight: bold;">
              ${isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản'}
            </button>
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
        if (res && res.status === 'success') {
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
        if (res && res.status === 'success') {
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
