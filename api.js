const API_URL = 'https://script.google.com/macros/s/AKfycbwPUxNUaYGUTSWGT4vvFBeuuRcGTR2e2ZK8OR7XJuFE49FbkDHz3ZpKm1tsx2bYZL83mA/exec';

const API = {
  async getBuilds() {
    const res = await fetch(`${API_URL}?action=getBuilds`);
    return await res.json();
  },

  async getBuildDetail(buildId) {
    const res = await fetch(`${API_URL}?action=getBuildDetail&build_id=${encodeURIComponent(buildId)}`);
    return await res.json();
  },

  async getComments(buildId) {
    const res = await fetch(`${API_URL}?action=getComments&build_id=${encodeURIComponent(buildId)}`);
    return await res.json();
  },

  async getShoutbox() {
    const res = await fetch(`${API_URL}?action=getShoutbox`);
    return await res.json();
  },

  async getItemDatabase() {
    const res = await fetch(`${API_URL}?action=getItemDatabase`);
    return await res.json();
  },

  async getNotifications(username) {
    const res = await fetch(`${API_URL}?action=getNotifications&username=${encodeURIComponent(username)}`);
    return await res.json();
  },

  async markNotificationRead(username) {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'markNotificationRead', username })
    });
    return await res.json();
  },

  async trackSiteVisit() {
    const res = await fetch(`${API_URL}?action=trackSiteVisit`);
    return await res.json();
  },

  async uploadItemDatabase(payload) {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'uploadItemDatabase',
        itemName: payload.itemName,
        base64Data: payload.base64Data,
        mimeType: payload.mimeType,
        username: payload.username,
        role: payload.role
      })
    });
    return await res.json();
  },

  async uploadImage(base64Data, fileName, mimeType) {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'uploadImage',
        base64Data: base64Data,
        fileName: fileName,
        mimeType: mimeType
      })
    });
    return await res.json();
  },

  async register(user) {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'register', user })
    });
    return await res.json();
  },

  async login(credentials) {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', credentials })
    });
    return await res.json();
  },

  async saveBuild(build) {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveBuild', build })
    });
    return await res.json();
  },

  async deleteBuild(build_id, username, role) {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteBuild', build_id, username, role })
    });
    return await res.json();
  },

  async voteBuild(build_id, username) {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'voteBuild', build_id, username })
    });
    return await res.json();
  },

  async addComment(comment) {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'addComment', comment })
    });
    return await res.json();
  },

  async deleteComment(comment_id, username, role) {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteComment', comment_id, username, role })
    });
    return await res.json();
  },

  async sendShoutbox(message) {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'sendShoutbox', message })
    });
    return await res.json();
  }
};
