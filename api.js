const API_URL = 'https://script.google.com/macros/s/AKfycbwPUxNUaYGUTSWGT4vvFBeuuRcGTR2e2ZK8OR7XJuFE49FbkDHz3ZpKm1tsx2bYZL83mA/exec';

const API = {
  async get(params) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}?${query}`, { method: 'GET' });
    return await res.json();
  },

  async post(data) {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    return await res.json();
  },

  getBuilds() { return this.get({ action: 'getBuilds' }); },
  getBuildDetail(build_id) { return this.get({ action: 'getBuildDetail', build_id }); },
  trackBuildView(build_id) { return this.get({ action: 'trackBuildView', build_id }); },
  getComments(build_id) { return this.get({ action: 'getComments', build_id }); },
  getShoutbox() { return this.get({ action: 'getShoutbox' }); },
  getItemDatabase() { return this.get({ action: 'getItemDatabase' }); },
  getNotifications(username) { return this.get({ action: 'getNotifications', username }); },
  trackSiteVisit() { return this.get({ action: 'trackSiteVisit' }); },
  getCloudDraft(username) { return this.get({ action: 'getCloudDraft', username }); },
  getPendingItemDetail(pending_id) { return this.get({ action: 'getPendingItemDetail', pending_id }); },

  login(credentials) { return this.post({ action: 'login', credentials }); },
  register(user) { return this.post({ action: 'register', user }); },
  saveBuild(build) { return this.post({ action: 'saveBuild', build }); },
  deleteBuild(build_id, username, role) { return this.post({ action: 'deleteBuild', build_id, username, role }); },
  voteBuild(build_id, username) { return this.post({ action: 'voteBuild', build_id, username }); },
  addComment(comment) { return this.post({ action: 'addComment', comment }); },
  deleteComment(comment_id, username, role) { return this.post({ action: 'deleteComment', comment_id, username, role }); },
  sendShoutbox(message) { return this.post({ action: 'sendShoutbox', message }); },
  uploadImage(base64Data, fileName, mimeType) { return this.post({ action: 'uploadImage', base64Data, fileName, mimeType }); },
  deleteDriveImage(url) { return this.post({ action: 'deleteDriveImage', url }); },
  uploadItemDatabase(data) { return this.post({ action: 'uploadItemDatabase', ...data }); },
  approvePendingItem(pending_id, username, role) { return this.post({ action: 'approvePendingItem', pending_id, username, role }); },
  rejectPendingItem(pending_id, username, role) { return this.post({ action: 'rejectPendingItem', pending_id, username, role }); },
  markNotificationRead(username) { return this.post({ action: 'markNotificationRead', username }); },
  saveCloudDraft(username, draft) { return this.post({ action: 'saveCloudDraft', username, draft }); },
  deleteCloudDraft(username) { return this.post({ action: 'deleteCloudDraft', username }); },
  
  // 2 Lệnh mới cho việc khôi phục mật khẩu & cập nhật Email
  updateEmail(username, email) { return this.post({ action: 'updateEmail', username, email }); },
  forgotPassword(email) { return this.post({ action: 'forgotPassword', email }); }
};
