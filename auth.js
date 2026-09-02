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
      setTimeout(() => this.loadNotifications(), 600);

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

          <!-- AVATAR & DROPDOWN MENU -->
          <div class="user-badge" style="position: relative; cursor: pointer;" onclick="document.getElementById('auth-dropdown').classList.toggle('active')">
            <img src="${this.currentUser.avatar || 'https://i.imgur.com/6VBx3io.png'}" alt="Avatar">
            <a href="profile.html?user=${encodeURIComponent(this.currentUser.username)}" style="color: var(--accent-gold); text-decoration: none; font-weight: 600; font-size: 0.9rem;">${this.escapeHTML(this.currentUser.display_name)}</a>
            ${this.currentUser.role === 'Admin' ? '<span style="background:var(--accent-red); color:#fff; font-size:0.65rem; padding:1px 5px; border-radius:3px; font-weight:bold;">Admin</span>' : ''}
          </div>
          
          <div id="auth-dropdown" class="notif-popup" style="width: 160px; right: 0; top: 100%;">
            <div class="notif-item" onclick="Auth.openChangePasswordModal()" style="text-align: center; color: var(--text-bright);">🔑 Đổi mật khẩu</div>
            <div class="notif-item" onclick="Auth.logout()" style="text-align: center; color: #ff6b6b;">🚪 Đăng xuất</div>
          </div>

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
            <p style="color:var(--text-muted); margin-bottom:16px;">${res?.message || 'Yêu cầu không còn tồn tại'}</p>
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
    
    const d = document.getElementById('auth-dropdown');
    if (d) d.classList.remove('active');
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

  switchMode(mode) {
    document.getElementById('form-login').style.display = 'none';
    document.getElementById('form-register').style.display = 'none';
    document.getElementById('form-forgot').style.display = 'none';
    document.getElementById('form-update-email').style.display = 'none';

    if (mode === 'login') {
      document.getElementById('auth-modal-title').innerText = 'ĐĂNG NHẬP';
      document.getElementById('form-login').style.display = 'block';
    } else if (mode === 'register') {
      document.getElementById('auth-modal-title').innerText = 'ĐĂNG KÝ';
      document.getElementById('form-register').style.display = 'block';
    } else if (mode === 'forgot') {
      document.getElementById('auth-modal-title').innerText = 'QUÊN MẬT KHẨU';
      document.getElementById('form-forgot').style.display = 'block';
    } else if (mode === 'update_email') {
      document.getElementById('auth-modal-title').innerText = 'CẬP NHẬT EMAIL BẢO MẬT';
      document.getElementById('form-update-email').style.display = 'block';
    }
  },

  openModal(type = 'login') {
    const existing = document.getElementById('auth-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'modal active';
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 420px; padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 id="auth-modal-title" style="color: var(--accent-gold); font-family: var(--font-body); margin: 0; font-size: 1.35rem; font-weight: bold;">ĐĂNG NHẬP</h2>
          <button class="btn btn-sm" onclick="document.getElementById('auth-modal').remove()" style="background: transparent; border: none; font-size: 1.2rem;">✖</button>
        </div>

        <form id="form-login" onsubmit="Auth.handleAuthSubmit(event, 'login')" style="display: block;">
          <div class="form-group">
            <label>Tên đăng nhập (*)</label>
            <input type="text" id="login-username" class="form-control" required placeholder="Tên đăng nhập không dấu">
          </div>
          <div class="form-group">
            <label>Mật khẩu (*)</label>
            <input type="password" id="login-password" class="form-control" required placeholder="Nhập mật khẩu của bạn">
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <a href="#" onclick="Auth.switchMode('forgot'); return false;" style="color: var(--text-muted); font-size: 0.8rem;">Quên mật khẩu?</a>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; font-weight: bold; margin-bottom: 12px;">Đăng Nhập</button>
          <div style="text-align: center; font-size: 0.85rem; color: var(--text-muted);">
            Chưa có tài khoản? <a href="#" onclick="Auth.switchMode('register'); return false;" style="color: var(--accent-gold);">Đăng ký ngay</a>
          </div>
        </form>

        <form id="form-register" onsubmit="Auth.handleAuthSubmit(event, 'register')" style="display: none;">
          <div class="form-group">
            <label>Tên đăng nhập (*)</label>
            <input type="text" id="reg-username" class="form-control" required>
          </div>
          <div class="form-group">
            <label>Tên hiển thị cộng đồng (*)</label>
            <input type="text" id="reg-display" class="form-control" required placeholder="VD: Ken">
          </div>
          <div class="form-group">
            <label>Email (Bắt buộc để khôi phục mật khẩu)</label>
            <input type="email" id="reg-email" class="form-control" required placeholder="VD: nguyenvanngan@gmail.com">
          </div>
          <div class="form-group">
            <label>Mật khẩu (*)</label>
            <input type="password" id="reg-password" class="form-control" required>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; font-weight: bold; margin-bottom: 12px;">Đăng Ký</button>
          <div style="text-align: center; font-size: 0.85rem; color: var(--text-muted);">
            Đã có tài khoản? <a href="#" onclick="Auth.switchMode('login'); return false;" style="color: var(--accent-gold);">Đăng nhập</a>
          </div>
        </form>

        <div id="form-forgot" style="display: none;">
          <p style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 14px;">Nhập Email của bạn, hệ thống sẽ tạo mật khẩu ngẫu nhiên và gửi thẳng vào Email đó.</p>
          <div class="form-group">
            <label>Email lúc đăng ký</label>
            <input type="email" id="forgot-email" class="form-control" placeholder="Nhập Email của bạn...">
          </div>
          <button id="btn-forgot-submit" class="btn btn-primary" style="width: 100%; font-weight: bold; margin-bottom: 12px;" onclick="Auth.forgotPassword()">Gửi Mật Khẩu Mới</button>
          
          <div style="background: rgba(255, 107, 107, 0.08); border: 1px dashed var(--accent-red); padding: 10px; border-radius: 4px; font-size: 0.8rem; color: #ff8b8b; margin-bottom: 12px;">
            ⚠️ <b>Tài khoản cũ chưa liên kết Email?</b><br>
            Vui lòng nhắn tin cho Admin qua Zalo để được cấp lại mật khẩu ngay lập tức: <br>
            <a href="https://zalo.me/0936559126" target="_blank" style="color: var(--accent-gold); font-weight: bold; display: inline-block; margin-top: 4px;">Zalo: 0936.559.126</a>
          </div>
          <div style="text-align: center; font-size: 0.85rem;">
            <a href="#" onclick="Auth.switchMode('login'); return false;" style="color: var(--accent-gold);">⬅ Quay lại Đăng nhập</a>
          </div>
        </div>

        <div id="form-update-email" style="display: none;">
          <h3 style="color: var(--accent-green); margin-bottom: 10px;">Bảo Mật Tài Khoản</h3>
          <p style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 14px;">Hệ thống phát hiện tài khoản của bạn chưa liên kết Email. Vui lòng nhập Email để sau này có thể tự khôi phục mật khẩu nhé!</p>
          <div class="form-group">
            <label>Nhập Email của bạn</label>
            <input type="email" id="update-email-val" class="form-control" placeholder="VD: nguyenvanngan@gmail.com">
          </div>
          <button id="btn-update-email" class="btn btn-primary" style="width: 100%; font-weight: bold; margin-bottom: 8px;" onclick="Auth.updateEmail()">Lưu Email</button>
          <button class="btn" style="width: 100%;" onclick="document.getElementById('auth-modal').remove(); window.location.reload();">Bỏ qua lần này</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.switchMode(type);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  },

  async handleAuthSubmit(e, type) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Đang xử lý...';

    try {
      if (type === 'login') {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const res = await API.login({ username, password });
        
        if (res && res.status === 'success') {
          this.currentUser = res.user;
          localStorage.setItem('d2_current_user', JSON.stringify(res.user));
          
          if (!res.user.email || res.user.email.trim() === '') {
            this.switchMode('update_email');
          } else {
            document.getElementById('auth-modal').remove();
            this.renderNavbar();
            window.location.reload();
          }
        } else {
          alert(res?.message || 'Đăng nhập thất bại!');
          btn.disabled = false;
          btn.innerText = originalText;
        }
      } else if (type === 'register') {
        const username = document.getElementById('reg-username').value.trim();
        const displayName = document.getElementById('reg-display').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        
        if (!email.includes('@')) {
          alert('Email không hợp lệ!');
          btn.disabled = false;
          btn.innerText = originalText;
          return;
        }

        const res = await API.register({ username, display_name: displayName, password, email });
        if (res && res.status === 'success') {
          alert('Đăng ký thành công!');
          this.currentUser = res.user;
          localStorage.setItem('d2_current_user', JSON.stringify(res.user));
          document.getElementById('auth-modal').remove();
          this.renderNavbar();
          window.location.reload();
        } else {
          alert(res?.message || 'Đăng ký thất bại!');
          btn.disabled = false;
          btn.innerText = originalText;
        }
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ!');
      btn.disabled = false;
      btn.innerText = originalText;
    }
  },

  async forgotPassword() {
    const email = document.getElementById('forgot-email').value.trim();
    if (!email) return alert('Vui lòng nhập Email!');
    const btn = document.getElementById('btn-forgot-submit');
    btn.disabled = true;
    btn.innerText = 'Đang gửi...';

    try {
      const res = await API.forgotPassword(email);
      if (res && res.status === 'success') {
        alert('✅ Mật khẩu mới đã được gửi vào Email của bạn. Hãy kiểm tra cả hộp thư Rác (Spam) nhé!');
        this.switchMode('login');
      } else {
        alert(res.message || 'Lỗi khôi phục!');
      }
    } catch (err) { alert('Lỗi kết nối máy chủ!'); }
    
    btn.disabled = false;
    btn.innerText = 'Gửi Mật Khẩu Mới';
  },

  // ĐÃ SỬA: Hiệu ứng nút Đang lưu...
  async updateEmail() {
    const e = document.getElementById('update-email-val').value.trim();
    if (!e || !e.includes('@')) return alert('Email không hợp lệ!');
    const btn = document.getElementById('btn-update-email');
    const originalText = btn.innerText;
    
    btn.disabled = true;
    btn.innerText = 'Đang lưu...';

    try {
      const res = await API.updateEmail(this.currentUser.username, e);
      if (res && res.status === 'success') {
        alert('Cập nhật Email thành công!');
        this.currentUser.email = res.email;
        localStorage.setItem('d2_current_user', JSON.stringify(this.currentUser));
        document.getElementById('auth-modal').remove();
        window.location.reload();
      } else {
        alert(res.message || 'Lỗi cập nhật!');
        btn.disabled = false;
        btn.innerText = originalText;
      }
    } catch (err) { 
      alert('Lỗi mạng!'); 
      btn.disabled = false;
      btn.innerText = originalText;
    }
  },

  openChangePasswordModal() {
    const d = document.getElementById('auth-dropdown');
    if (d) d.classList.remove('active');

    const existing = document.getElementById('auth-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px; padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="color: var(--accent-gold); font-family: var(--font-body); margin: 0; font-size: 1.35rem; font-weight: bold;">ĐỔI MẬT KHẨU</h2>
          <button class="btn btn-sm" onclick="document.getElementById('auth-modal').remove()" style="background: transparent; border: none; font-size: 1.2rem;">✖</button>
        </div>
        <div class="form-group">
          <label>Mật khẩu hiện tại</label>
          <input type="password" id="cp-old-pass" class="form-control" required>
        </div>
        <div class="form-group">
          <label>Mật khẩu mới</label>
          <input type="password" id="cp-new-pass" class="form-control" required>
        </div>
        <button id="btn-cp-submit" class="btn btn-primary" style="width: 100%; font-weight: bold; margin-top: 10px;" onclick="Auth.submitChangePassword()">Xác Nhận Đổi</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  },

  async submitChangePassword() {
    const oldP = document.getElementById('cp-old-pass').value;
    const newP = document.getElementById('cp-new-pass').value;
    if (!oldP || !newP) return alert('Vui lòng nhập đầy đủ thông tin!');
    
    const btn = document.getElementById('btn-cp-submit');
    btn.disabled = true;
    btn.innerText = 'Đang xử lý...';

    try {
      const res = await API.changePassword(this.currentUser.username, oldP, newP);
      if (res && res.status === 'success') {
        alert('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
        this.logout();
      } else {
        alert(res.message || 'Lỗi đổi mật khẩu!');
        btn.disabled = false;
        btn.innerText = 'Xác Nhận Đổi';
      }
    } catch(e) {
      alert('Lỗi kết nối máy chủ!');
      btn.disabled = false;
      btn.innerText = 'Xác Nhận Đổi';
    }
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('d2_current_user');
    if (this.notifInterval) clearInterval(this.notifInterval);
    window.location.reload();
  },

  escapeHTML(str) { 
    return str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; 
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  window.addEventListener('click', (e) => {
    const p = document.getElementById('notif-popup');
    if (p && !e.target.closest('#notif-popup') && !e.target.closest('.notif-badge') && !e.target.closest('button[title="Thông báo"]')) {
      p.classList.remove('active');
    }
    const d = document.getElementById('auth-dropdown');
    if (d && !e.target.closest('#auth-dropdown') && !e.target.closest('.user-badge')) {
      d.classList.remove('active');
    }
  });
});
