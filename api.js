// Cầu nối giao tiếp với Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbwPUxNUaYGUTSWGT4vvFBeuuRcGTR2e2ZK8OR7XJuFE49FbkDHz3ZpKm1tsx2bYZL83mA/exec';

const API = {
  // Lấy danh sách build
  async getBuilds() {
    const res = await fetch(`${API_URL}?action=getBuilds`);
    return await res.json();
  },

  // Lấy chi tiết 1 build
  async getBuildDetail(buildId) {
    const res = await fetch(`${API_URL}?action=getBuildDetail&build_id=${buildId}`);
    return await res.json();
  },

  // Lấy danh sách bình luận
  async getComments(buildId) {
    const res = await fetch(`${API_URL}?action=getComments&build_id=${buildId}`);
    return await res.json();
  },

  // Đăng ký tài khoản
  async register(user) {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'register', user })
    });
    return await res.json();
  },

  // Đăng nhập
  async login(credentials) {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', credentials })
    });
    return await res.json();
  },

  // Tạo hoặc sửa bài build
  async saveBuild(build) {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveBuild', build })
    });
    return await res.json();
  },

  // Gửi bình luận
  async addComment(comment) {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'addComment', comment })
    });
    return await res.json();
  }
};
