// Quản lý Đăng ký / Đăng nhập / Đăng xuất tài khoản
const Auth = {
  // Lấy thông tin user hiện tại đang lưu trên trình duyệt
  getCurrentUser() {
    const user = localStorage.getItem('d2_current_user');
    return user ? JSON.parse(user) : null;
  },

  // Lưu phiên đăng nhập
  setCurrentUser(user) {
    localStorage.setItem('d2_current_user', JSON.stringify(user));
  },

  // Đăng xuất
  logout() {
    localStorage.removeItem('d2_current_user');
    window.location.reload();
  },

  // Hiển thị nút đăng nhập hoặc Avatar góc trên màn hình
  renderNavUser() {
    const container = document.getElementById('auth-section');
    if (!container) return;

    const user = this.getCurrentUser();
    if (user) {
      container.innerHTML = `
        <div class="user-badge">
          <img src="${user.avatar || 'https://i.imgur.com/6VBx3io.png'}" alt="Avatar">
          <span style="color: var(--accent-gold); font-weight: 600;">${user.display_name}</span>
          <button class="btn btn-danger" style="padding: 4px 10px; font-size: 0.8rem;" onclick="Auth.logout()">Đăng xuất</button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <button class="btn" onclick="Auth.openModal('login')">Đăng nhập</button>
        <button class="btn btn-primary" onclick="Auth.openModal('register')">Đăng ký</button>
      `;
    }
  },

  // Mở Popup đăng nhập / đăng ký
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

  // Xử lý gửi form đăng ký / đăng nhập
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
