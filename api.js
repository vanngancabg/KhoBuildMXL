const API_URL = 'https://script.google.com/macros/s/AKfycbwPUxNUaYGUTSWGT4vvFBeuuRcGTR2e2ZK8OR7XJuFE49FbkDHz3ZpKm1tsx2bYZL83mA/exec';

const API = {
  // Cơ chế Fetch chịu lỗi cao, tự động Retry 2 lần nếu Google Apps Script phản hồi chậm
  async request(url, options = {}, retries = 2) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error('HTTP Error ' + response.status);
      return await response.json();
    } catch (err) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return await this.request(url, options, retries - 1);
      }
      return { status: 'error', message: 'Không thể kết nối tới Google Server. Vui lòng tải lại trang!' };
    }
  },

  async getBuilds() {
    return await this.request(`${API_URL}?action=getBuilds`);
  },

  async getBuildDetail(buildId) {
    return await this.request(`${API_URL}?action=getBuildDetail&build_id=${encodeURIComponent(buildId)}`);
  },

  async getComments(buildId) {
    return await this.request(`${API_URL}?action=getComments&build_id=${encodeURIComponent(buildId)}`);
  },

  async getShoutbox() {
    return await this.request(`${API_URL}?action=getShoutbox`);
  },

  async getItemDatabase() {
    return await this.request(`${API_URL}?action=getItemDatabase`);
  },

  async getNotifications(username) {
    return await this.request(`${API_URL}?action=getNotifications&username=${encodeURIComponent(username)}`);
  },

  async markNotificationRead(username) {
    return await this.request(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'clearNotifications', username })
    });
  },

  async trackSiteVisit() {
    if (sessionStorage.getItem('d2_visited')) return { status: 'success' };
    sessionStorage.setItem('d2_visited', 'true');
    return await this.request(`${API_URL}?action=trackSiteVisit`);
  },

  async getCloudDraft(username) {
    return await this.request(`${API_URL}?action=getCloudDraft&username=${encodeURIComponent(username)}`);
  },

  async saveCloudDraft(username, draft) {
    return await this.request(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveCloudDraft', username, draft })
    });
  },

  async deleteCloudDraft(username) {
    return await this.request(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteCloudDraft', username })
    });
  },

  async getPendingItemDetail(pending_id) {
    return await this.request(`${API_URL}?action=getPendingItemDetail&pending_id=${encodeURIComponent(pending_id)}`);
  },

  async uploadItemDatabase(payload) {
    localStorage.removeItem('d2_cached_itemdb');
    return await this.request(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'uploadItemDatabase',
        itemName: payload.itemName,
        category: payload.category,
        patch: payload.patch,
        base64Data: payload.base64Data,
        mimeType: payload.mimeType,
        username: payload.username,
        role: payload.role
      })
    });
  },

  async approvePendingItem(pending_id, username, role) {
    localStorage.removeItem('d2_cached_itemdb');
    return await this.request(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'approvePendingItem', pending_id, username, role })
    });
  },

  async rejectPendingItem(pending_id, username, role) {
    return await this.request(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'rejectPendingItem', pending_id, username, role })
    });
  },

  async uploadImage(base64Data, fileName, mimeType) {
    return await this.request(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'uploadImage',
        base64Data: base64Data,
        fileName: fileName,
        mimeType: mimeType
      })
    });
  },

  async register(user) {
    return await this.request(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'register', user })
    });
  },

  async login(credentials) {
    return await this.request(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', credentials })
    });
  },

  async saveBuild(build) {
    return await this.request(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveBuild', build })
    });
  },

  async deleteBuild(build_id, username, role) {
    return await this.request(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteBuild', build_id, username, role })
    });
  },

  async voteBuild(build_id, username) {
    return await this.request(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'voteBuild', build_id, username })
    });
  },

  async addComment(comment) {
    return await this.request(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'addComment', comment })
    });
  },

  async deleteComment(comment_id, username, role) {
    return await this.request(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteComment', comment_id, username, role })
    });
  },

  async sendShoutbox(message) {
    return await this.request(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'sendShoutbox', message })
    });
  }
};
