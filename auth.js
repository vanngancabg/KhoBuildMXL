const Auth = {
  currentUser: null,

  init() {
    const saved = localStorage.getItem('d2_current_user');
    if (saved) {
      try { this.currentUser = JSON.parse(saved); } catch (e) {}
    }
    this.renderAuthSection();
    this.setupModal();
  },

  renderAuthSection() {
    const section = document.getElementById('auth-section');
    if (!section) return;

    if (this.currentUser) {
      section.innerHTML = `
        <div class="user-badge" style="position: relative; cursor: pointer;" onclick="document.getElementById('auth-dropdown').classList.toggle('active')">
          <img src="${this.currentUser.avatar || 'https://i.imgur.com/6VBx3io.png'}" alt="Avatar">
          <div style="display: flex; flex-direction: column; align-items: flex-start; line-height: 1.2;">
            <strong style="color: var(--accent-gold); font-size: 0.85rem;">${this.escapeHTML(this.currentUser.display_name || this.currentUser.username)}</strong>
            <span style="font-size: 0.65rem; color: #fff; background: ${this.currentUser.role === 'Admin' ? 'var(--accent-red)' : 'var(--border-focus)'}; padding: 1px 4px; border-radius: 3px;">${this.currentUser.role || 'Member'}</span>
          </div>
        </div>
        <div id="auth-dropdown" class="notif-popup" style="width: 150px;">
          <div class="notif-item" onclick="Auth.logout()" style="text-align: center; color: #ff6b6b;">Đăng xuất</div>
        </div>
      `;
    } else {
      section.innerHTML = `<button class="btn btn-primary" onclick="Auth.openModal('login')">🔑 Đăng nhập</button>`;
    }
  },

  setupModal() {
    if (document.getElementById('modal-auth')) return;
    const modal = document.createElement('div');
    modal.id = 'modal-auth';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px; padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 id="auth-modal-title" style="color: var(--accent-gold); font-family: var(--font-heading); margin: 0;">ĐĂNG NHẬP</h2>
          <button class="btn btn-sm" onclick="Auth.closeModal()" style="background: transparent; border: none; font-size: 1.2rem;">✖</button>
        </div>

        <!-- FORM ĐĂNG NHẬP -->
        <div id="form-login" style="display: block;">
          <div class="form-group">
            <label>Tên tài khoản</label>
            <input type="text" id="login-username" class="form-control" onkeydown="if(event.key==='Enter') Auth.login()">
          </div>
          <div class="form-group">
            <label>Mật khẩu</label>
            <input type="password" id="login-password" class="form-control" onkeydown="if(event.key==='Enter') Auth.login()">
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <a href="#" onclick="Auth.switchMode('forgot'); return false;" style="color: var(--text-muted); font-size: 0.8rem;">Quên mật khẩu?</a>
          </div>
          <button class="btn btn-primary" style="width: 100%; font-weight: bold; margin-bottom: 12px;" onclick="Auth.login()">Đăng Nhập</button>
          <div style="text-align: center; font-size: 0.85rem; color: var(--text-muted);">
            Chưa có tài khoản? <a href="#" onclick="Auth.switchMode('register'); return false;" style="color: var(--accent-gold);">Đăng ký ngay</a>
          </div>
        </div>

        <!-- FORM ĐĂNG KÝ -->
        <div id="form-register" style="display: none;">
          <div class="form-group">
            <label>Tên tài khoản</label>
            <input type="text" id="reg-username" class="form-control">
          </div>
          <div class="form-group">
            <label>Email (Bắt buộc để khôi phục mật khẩu)</label>
            <input type="email" id="reg-email" class="form-control" placeholder="VD: nguyenvanngan@gmail.com">
          </div>
          <div class="form-group">
            <label>Mật khẩu</label>
            <input type="password" id="reg-password" class="form-control">
          </div>
          <button class="btn btn-primary" style="width: 100%; font-weight: bold; margin-bottom: 12px;" onclick="Auth.register()">Đăng Ký</button>
          <div style="text-align: center; font-size: 0.85rem; color: var(--text-muted);">
            Đã có tài khoản? <a href="#" onclick="Auth.switchMode('login'); return false;" style="color: var(--accent-gold);">Đăng nhập</a>
          </div>
        </div>

        <!-- FORM QUÊN MẬT KHẨU -->
        <div id="form-forgot" style="display: none;">
          <p style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 14px;">Nhập Email của bạn, hệ thống sẽ tạo mật khẩu ngẫu nhiên và gửi thẳng vào Email đó.</p>
          <div class="form-group">
            <label>Email lúc đăng ký</label>
            <input type="email" id="forgot-email" class="form-control" placeholder="Nhập Email của bạn...">
          </div>
          <button class="btn btn-primary" style="width: 100%; font-weight: bold; margin-bottom: 12px;" onclick="Auth.forgotPassword()">Gửi Mật Khẩu Mới</button>
          
          <div style="background: rgba(255, 107, 107, 0.08); border: 1px dashed var(--accent-red); padding: 10px; border-radius: 4px; font-size: 0.8rem; color: #ff8b8b; margin-bottom: 12px;">
            ⚠️ <b>Tài khoản cũ chưa liên kết Email?</b><br>
            Vui lòng nhắn tin cho Admin qua Zalo để được cấp lại mật khẩu ngay lập tức: <br>
            <a href="https://zalo.me/0936559126" target="_blank" style="color: var(--accent-gold); font-weight: bold; display: inline-block; margin-top: 4px;">Zalo: 0936.559.126</a>
          </div>

          <div style="text-align: center; font-size: 0.85rem;">
            <a href="#" onclick="Auth.switchMode('login'); return false;" style="color: var(--accent-gold);">⬅ Quay lại Đăng nhập</a>
          </div>
        </div>

        <!-- FORM CẬP NHẬT EMAIL (Cho User cũ) -->
        <div id="form-update-email" style="display: none;">
          <h3 style="color: var(--accent-green); margin-bottom: 10px;">Bảo Mật Tài Khoản Cũ</h3>
          <p style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 14px;">Hệ thống phát hiện tài khoản của bạn được tạo từ phiên bản cũ và chưa có Email. Vui lòng nhập Email để sau này có thể tự khôi phục mật khẩu nhé!</p>
          <div class="form-group">
            <label>Nhập Email của bạn</label>
            <input type="email" id="update-email-val" class="form-control" placeholder="VD: nguyenvanngan@gmail.com">
          </div>
          <button class="btn btn-primary" style="width: 100%; font-weight: bold; margin-bottom: 8px;" onclick="Auth.updateEmail()">Lưu Email</button>
          <button class="btn" style="width: 100%;" onclick="Auth.closeModal()">Bỏ qua lần này</button>
        </div>

      </div>
    `;
    document.body.appendChild(modal);
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
      document.getElementById('auth-modal-title').innerText = 'CẬP NHẬT EMAIL';
      document.getElementById('form-update-email').style.display = 'block';
    }
  },

  openModal(mode = 'login') {
    this.setupModal();
    this.switchMode(mode);
    document.getElementById('modal-auth').classList.add('active');
  },

  closeModal() {
    const m = document.getElementById('modal-auth');
    if (m) m.classList.remove('active');
  },

  async login() {
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    if (!u || !p) return alert('Nhập đủ thông tin!');
    try {
      const res = await API.login({ username: u, password: p });
      if (res && res.status === 'success') {
        this.currentUser = res.user;
        localStorage.setItem('d2_current_user', JSON.stringify(res.user));
        this.renderAuthSection();
        
        // KIỂM TRA EMAIL: Đòi Email nếu user cũ đăng nhập
        if (!res.user.email || res.user.email.trim() === '') {
          this.switchMode('update_email');
        } else {
          this.closeModal();
          if (typeof App !== 'undefined' && App.loadBuilds) window.location.reload();
          if (typeof DetailHandler !== 'undefined' && DetailHandler.loadBuild) window.location.reload();
        }
      } else {
        alert(res.message || 'Lỗi đăng nhập!');
      }
    } catch (e) { alert('Lỗi mạng!'); }
  },

  async register() {
    const u = document.getElementById('reg-username').value.trim();
    const e = document.getElementById('reg-email').value.trim();
    const p = document.getElementById('reg-password').value;
    if (!u || !e || !p) return alert('Nhập đủ thông tin!');
    if (!e.includes('@') || !e.includes('.')) return alert('Email không hợp lệ!');

    try {
      const res = await API.register({ username: u, password: p, email: e });
      if (res && res.status === 'success') {
        this.currentUser = res.user;
        localStorage.setItem('d2_current_user', JSON.stringify(res.user));
        this.closeModal();
        this.renderAuthSection();
        if (typeof App !== 'undefined' && App.loadBuilds) window.location.reload();
      } else {
        alert(res.message || 'Lỗi đăng ký!');
      }
    } catch (e) { alert('Lỗi mạng!'); }
  },

  async forgotPassword() {
    const e = document.getElementById('forgot-email').value.trim();
    if (!e) return alert('Vui lòng nhập Email!');
    
    const btn = document.querySelector('#form-forgot button.btn-primary');
    btn.disabled = true;
    btn.innerText = 'Đang gửi...';

    try {
      const res = await API.forgotPassword(e);
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

  async updateEmail() {
    const e = document.getElementById('update-email-val').value.trim();
    if (!e || !e.includes('@')) return alert('Email không hợp lệ!');

    try {
      const res = await API.updateEmail(this.currentUser.username, e);
      if (res && res.status === 'success') {
        alert('Cập nhật Email thành công!');
        this.currentUser.email = res.email;
        localStorage.setItem('d2_current_user', JSON.stringify(this.currentUser));
        this.closeModal();
        window.location.reload();
      } else {
        alert(res.message || 'Lỗi cập nhật!');
      }
    } catch (err) { alert('Lỗi mạng!'); }
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('d2_current_user');
    this.renderAuthSection();
    window.location.reload();
  },

  getCurrentUser() { return this.currentUser; },
  escapeHTML(str) { return str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; }
};

document.addEventListener('DOMContentLoaded', () => Auth.init());
