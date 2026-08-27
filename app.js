// Google Apps Script API v10.2 - Chống Crash Dữ Liệu Rỗng 100%

const DRIVE_FOLDER_ID = '1lA-gh3xbSQWjtjNb0-OYMAawTEzBGSPP';

function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'getBuilds') return handleGetBuilds(ss);
    if (action === 'getBuildDetail') return handleGetBuildDetail(ss, e.parameter.build_id);
    if (action === 'getComments') return handleGetComments(ss, e.parameter.build_id);
    if (action === 'getShoutbox') return handleGetShoutbox(ss);
    if (action === 'getItemDatabase') return handleGetItemDatabase(ss);
    if (action === 'getNotifications') return handleGetNotifications(ss, e.parameter.username);
    if (action === 'trackSiteVisit') return handleTrackSiteVisit(ss);
    if (action === 'getCloudDraft') return handleGetCloudDraft(ss, e.parameter.username);
    if (action === 'getPendingItemDetail') return handleGetPendingItemDetail(ss, e.parameter.pending_id);
    
    return responseJSON({ status: 'error', message: 'Hành động không hợp lệ' });
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'uploadImage') return handleUploadImage(data);
    if (action === 'register') return handleRegister(ss, data.user);
    if (action === 'login') return handleLogin(ss, data.credentials);
    if (action === 'saveBuild') return handleSaveBuild(ss, data.build);
    if (action === 'deleteBuild') return handleDeleteBuild(ss, data);
    if (action === 'voteBuild') return handleVoteBuild(ss, data);
    if (action === 'addComment') return handleAddComment(ss, data.comment);
    if (action === 'deleteComment') return handleDeleteComment(ss, data);
    if (action === 'sendShoutbox') return handleSendShoutbox(ss, data.message);
    if (action === 'uploadItemDatabase') return handleUploadItemDatabase(ss, data);
    if (action === 'approvePendingItem') return handleApprovePendingItem(ss, data);
    if (action === 'rejectPendingItem') return handleRejectPendingItem(ss, data);
    if (action === 'markNotificationRead' || action === 'clearNotifications') return handleClearNotifications(ss, data);
    if (action === 'saveCloudDraft') return handleSaveCloudDraft(ss, data);
    if (action === 'deleteCloudDraft') return handleDeleteCloudDraft(ss, data);
    
    return responseJSON({ status: 'error', message: 'Hành động không hợp lệ' });
  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString() });
  }
}

// 1. Quản lý kho ảnh ItemDatabase
function handleGetItemDatabase(ss) {
  let sheet = ss.getSheetByName('ItemDatabase');
  if (!sheet) {
    sheet = ss.insertSheet('ItemDatabase');
    sheet.appendRow(['Item_Name', 'Image_Url', 'Contributor', 'Updated_At', 'Item_Category', 'Patch_Version']);
  }
  const values = sheet.getDataRange().getValues();
  const itemsMap = {};
  if (values.length > 1) {
    for (let i = 1; i < values.length; i++) {
      const rawName = String(values[i][0] || '').trim();
      if (rawName) {
        let url = '';
        let contributor = 'Cộng đồng';
        let updated = '';
        let category = 'Sacred Unique';
        let patch = '2.13';

        for (let col = 1; col < values[i].length; col++) {
          const val = String(values[i][col] || '').trim();
          if (val.startsWith('http://') || val.startsWith('https://')) {
            url = val;
          }
        }

        if (values[i][1] && values[i][1] === url) {
          contributor = values[i][2] || 'Cộng đồng';
          updated = values[i][3] || '';
          category = values[i][4] || 'Sacred Unique';
          patch = values[i][5] || '2.13';
        } else if (values[i][2] && values[i][2] === url) {
          category = values[i][1] || 'Sacred Unique';
          patch = values[i][3] || '2.13';
          contributor = values[i][4] || 'Cộng đồng';
          updated = values[i][5] || '';
        }

        itemsMap[rawName.toLowerCase()] = {
          name: rawName,
          category: category,
          url: url,
          patch: patch,
          by: contributor,
          updated_at: updated
        };
      }
    }
  }
  return responseJSON({ status: 'success', data: itemsMap });
}

// 2. Lấy danh sách Builds (BỌC PHÒNG VỆ CHỐNG NULL CRASH 100%)
function handleGetBuilds(ss) {
  const sheet = ss.getSheetByName('Builds');
  if (!sheet) return responseJSON({ status: 'success', data: [] });
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return responseJSON({ status: 'success', data: [] });
  const headers = values[0];

  const commentsSheet = ss.getSheetByName('Comments');
  const commentCountMap = {};
  if (commentsSheet) {
    const cmtVals = commentsSheet.getDataRange().getValues();
    for (let c = 1; c < cmtVals.length; c++) {
      const bid = String(cmtVals[c][1] || '');
      if (bid) commentCountMap[bid] = (commentCountMap[bid] || 0) + 1;
    }
  }

  const builds = [];
  for (let i = 1; i < values.length; i++) {
    let obj = {};
    headers.forEach((h, idx) => { obj[h] = values[i][idx] !== undefined ? values[i][idx] : ''; });
    
    const rawVoteCell = values[i][12] ? String(values[i][12]).trim() : '';
    const rawVotes = rawVoteCell ? rawVoteCell.split(',').map(x => x.trim().toLowerCase()).filter(x => x) : [];
    
    obj.votes = rawVotes.join(',');
    obj.votes_count = rawVotes.length;
    obj.views_count = Number(values[i][13]) || 0;
    obj.comments_count = commentCountMap[String(obj.build_id)] || 0;
    builds.push(obj);
  }
  builds.reverse();
  return responseJSON({ status: 'success', data: builds });
}

// 3. Lấy chi tiết bài viết
function handleGetBuildDetail(ss, buildId) {
  const sheet = ss.getSheetByName('Builds');
  if (!sheet) return responseJSON({ status: 'error', message: 'Không tìm thấy bài viết' });
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  let found = null;
  let targetRow = -1;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === String(buildId).trim()) {
      found = {};
      headers.forEach((h, idx) => { found[h] = values[i][idx] !== undefined ? values[i][idx] : ''; });
      
      const rawVoteCell = values[i][12] ? String(values[i][12]).trim() : '';
      const rawVotes = rawVoteCell ? rawVoteCell.split(',').map(x => x.trim().toLowerCase()).filter(x => x) : [];
      found.votes = rawVotes.join(',');
      found.votes_count = rawVotes.length;
      
      let currentViews = Number(values[i][13]) || 0;
      currentViews += 1;
      found.views_count = currentViews;
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow > 0) {
    sheet.getRange(targetRow, 14).setValue(found.views_count);
  }

  return found ? responseJSON({ status: 'success', data: found }) : responseJSON({ status: 'error', message: 'Không tìm thấy bài viết' });
}

// 4. Lưu / Sửa bài viết
function handleSaveBuild(ss, build) {
  const sheet = ss.getSheetByName('Builds');
  const values = sheet.getDataRange().getValues();
  const now = new Date().toLocaleString('vi-VN');
  
  if (build.build_id) {
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(build.build_id)) {
        if (String(values[i][4]).toLowerCase() !== String(build.author_username).toLowerCase() && build.role !== 'Admin') {
          return responseJSON({ status: 'error', message: 'Bạn không có quyền sửa bài viết này!' });
        }
        sheet.getRange(i + 1, 2).setValue(build.title);
        sheet.getRange(i + 1, 3).setValue(build.class_name);
        sheet.getRange(i + 1, 4).setValue(build.patch_version);
        sheet.getRange(i + 1, 8).setValue(build.stats_desc);
        sheet.getRange(i + 1, 9).setValue(build.skills_desc);
        sheet.getRange(i + 1, 10).setValue(build.gear_desc);
        sheet.getRange(i + 1, 11).setValue(build.video_url || '');
        sheet.getRange(i + 1, 12).setValue(now);
        return responseJSON({ status: 'success', message: 'Cập nhật thành công!', build_id: build.build_id });
      }
    }
  }
  
  const newId = 'build_' + new Date().getTime();
  sheet.appendRow([newId, build.title, build.class_name, build.patch_version, build.author_username, build.author_name, '', build.stats_desc, build.skills_desc, build.gear_desc, build.video_url || '', now, '', 0]);
  
  try {
    const userSheet = ss.getSheetByName('Users');
    if (userSheet) {
      const userValues = userSheet.getDataRange().getValues();
      const currentAuthor = String(build.author_username).toLowerCase();

      for (let u = 1; u < userValues.length; u++) {
        const targetUsername = String(userValues[u][0]).toLowerCase();
        if (targetUsername && targetUsername !== currentAuthor) {
          sendNotification(ss, targetUsername, build.author_name || build.author_username, newId, build.title, 'new_build');
        }
      }
    }
  } catch (err) {}

  return responseJSON({ status: 'success', message: 'Đăng build thành công!', build_id: newId });
}

function handleDeleteBuild(ss, data) {
  const sheet = ss.getSheetByName('Builds');
  const values = sheet.getDataRange().getValues();
  const buildId = String(data.build_id);

  let targetRow = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === buildId) {
      if (String(values[i][4]).toLowerCase() !== String(data.username).toLowerCase() && data.role !== 'Admin') {
        return responseJSON({ status: 'error', message: 'Không có quyền xóa bài viết này!' });
      }
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow === -1) return responseJSON({ status: 'error', message: 'Không tìm thấy bài viết!' });

  sheet.deleteRow(targetRow);

  const sheetComments = ss.getSheetByName('Comments');
  if (sheetComments) {
    const cmtData = sheetComments.getDataRange().getValues();
    for (let i = cmtData.length - 1; i >= 1; i--) {
      if (String(cmtData[i][1]) === buildId) {
        sheetComments.deleteRow(i + 1);
      }
    }
  }

  return responseJSON({ status: 'success', message: 'Đã xóa bài viết và dọn sạch dữ liệu liên quan!' });
}

function handleVoteBuild(ss, data) {
  const sheet = ss.getSheetByName('Builds');
  const values = sheet.getDataRange().getValues();
  const buildId = String(data.build_id);
  const username = String(data.username).trim().toLowerCase();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === buildId) {
      let currentVotes = values[i][12] ? String(values[i][12]).split(',').map(x => x.trim().toLowerCase()).filter(x => x) : [];
      const userIdx = currentVotes.indexOf(username);
      let isVoted = false;

      if (userIdx >= 0) {
        currentVotes.splice(userIdx, 1);
        isVoted = false;
      } else {
        currentVotes.push(username);
        isVoted = true;
      }

      sheet.getRange(i + 1, 13).setValue(currentVotes.join(','));
      return responseJSON({ status: 'success', votes_count: currentVotes.length, is_voted: isVoted });
    }
  }
  return responseJSON({ status: 'error', message: 'Không tìm thấy bài viết để thả tim!' });
}

function handleGetComments(ss, buildId) {
  const sheet = ss.getSheetByName('Comments');
  if (!sheet) return responseJSON({ status: 'success', data: [] });
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return responseJSON({ status: 'success', data: [] });
  const headers = values[0];
  const comments = [];
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1]) === String(buildId)) {
      let obj = {};
      headers.forEach((h, idx) => { obj[h] = values[i][idx] !== undefined ? values[i][idx] : ''; });
      comments.push(obj);
    }
  }
  return responseJSON({ status: 'success', data: comments });
}

function handleAddComment(ss, comment) {
  const sheet = ss.getSheetByName('Comments');
  const now = new Date().toLocaleString('vi-VN');
  sheet.appendRow(['cmt_' + new Date().getTime(), comment.build_id, comment.username, comment.user_name, comment.avatar, comment.content, now]);

  try {
    const buildsSheet = ss.getSheetByName('Builds');
    const buildsData = buildsSheet.getDataRange().getValues();
    let authorUsername = '';
    let buildTitle = 'Bài viết';

    for (let b = 1; b < buildsData.length; b++) {
      if (String(buildsData[b][0]) === String(comment.build_id)) {
        buildTitle = String(buildsData[b][1]);
        authorUsername = String(buildsData[b][4]);
        break;
      }
    }

    const notifyUsers = new Set();
    if (authorUsername && authorUsername.toLowerCase() !== String(comment.username).toLowerCase()) {
      notifyUsers.add(authorUsername.toLowerCase());
    }

    const cmtData = sheet.getDataRange().getValues();
    for (let c = 1; c < cmtData.length; c++) {
      if (String(cmtData[c][1]) === String(comment.build_id)) {
        const u = String(cmtData[c][2]).toLowerCase();
        if (u && u !== String(comment.username).toLowerCase()) {
          notifyUsers.add(u);
        }
      }
    }

    notifyUsers.forEach(targetUser => {
      sendNotification(ss, targetUser, comment.user_name || comment.username, comment.build_id, buildTitle, 'comment');
    });
  } catch (err) {}

  return responseJSON({ status: 'success' });
}

function handleDeleteComment(ss, data) {
  const sheet = ss.getSheetByName('Comments');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(data.comment_id)) {
      if (String(values[i][2]).toLowerCase() !== String(data.username).toLowerCase() && data.role !== 'Admin') {
        return responseJSON({ status: 'error', message: 'Không có quyền xóa bình luận!' });
      }
      sheet.deleteRow(i + 1);
      return responseJSON({ status: 'success' });
    }
  }
  return responseJSON({ status: 'error' });
}

function sendNotification(ss, targetUser, senderName, buildId, buildTitle, type, extraId = '') {
  let notifSheet = ss.getSheetByName('Notifications');
  if (!notifSheet) {
    notifSheet = ss.insertSheet('Notifications');
    notifSheet.appendRow(['notif_id', 'target_username', 'sender_name', 'build_id', 'build_title', 'type', 'is_read', 'created_at', 'extra_id']);
  }
  const now = new Date().toLocaleString('vi-VN');
  notifSheet.appendRow([
    'notif_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000),
    String(targetUser).toLowerCase(),
    senderName,
    buildId,
    buildTitle,
    type,
    false,
    now,
    extraId
  ]);
}

function handleGetNotifications(ss, username) {
  if (!username) return responseJSON({ status: 'success', data: [] });
  const sheet = ss.getSheetByName('Notifications');
  if (!sheet) return responseJSON({ status: 'success', data: [] });

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return responseJSON({ status: 'success', data: [] });

  const target = String(username).toLowerCase();
  const list = [];

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1]).toLowerCase() === target) {
      list.push({
        notif_id: values[i][0],
        target_username: values[i][1],
        sender_name: values[i][2],
        build_id: values[i][3],
        build_title: values[i][4],
        type: values[i][5],
        is_read: values[i][6],
        created_at: values[i][7],
        extra_id: values[i][8] || ''
      });
    }
  }

  list.reverse();
  return responseJSON({ status: 'success', data: list });
}

function handleClearNotifications(ss, data) {
  const sheet = ss.getSheetByName('Notifications');
  if (!sheet) return responseJSON({ status: 'success' });

  const values = sheet.getDataRange().getValues();
  const targetUser = String(data.username).trim().toLowerCase();

  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][1]).toLowerCase() === targetUser) {
      sheet.deleteRow(i + 1);
    }
  }
  return responseJSON({ status: 'success', message: 'Đã dọn sạch thông báo!' });
}

function handleGetPendingItemDetail(ss, pendingId) {
  const pendingSheet = ss.getSheetByName('ItemPending');
  if (!pendingSheet) return responseJSON({ status: 'error', message: 'Chưa có dữ liệu chờ duyệt' });

  const values = pendingSheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(pendingId)) {
      return responseJSON({
        status: 'success',
        data: {
          pending_id: values[i][0],
          item_name: values[i][1],
          category: values[i][2],
          new_url: values[i][3],
          old_url: values[i][4],
          new_patch: values[i][5],
          new_contributor: values[i][6],
          original_contributor: values[i][7],
          created_at: values[i][8]
        }
      });
    }
  }
  return responseJSON({ status: 'error', message: 'Yêu cầu không tồn tại hoặc đã được xử lý xong' });
}

function handleUploadItemDatabase(ss, data) {
  let sheet = ss.getSheetByName('ItemDatabase');
  if (!sheet) {
    sheet = ss.insertSheet('ItemDatabase');
    sheet.appendRow(['Item_Name', 'Image_Url', 'Contributor', 'Updated_At', 'Item_Category', 'Patch_Version']);
  }

  const values = sheet.getDataRange().getValues();
  const itemName = String(data.itemName || '').trim();
  const category = String(data.category || 'Sacred Unique').trim();
  const patch = String(data.patch || '2.13').trim();
  const normalizedKey = itemName.toLowerCase();
  const now = new Date().toLocaleString('vi-VN');

  let existingRow = -1;
  let oldUrl = '';
  let originalContributor = '';

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === normalizedKey) {
      existingRow = i + 1;
      for (let col = 1; col < values[i].length; col++) {
        const val = String(values[i][col] || '').trim();
        if (val.startsWith('http://') || val.startsWith('https://')) {
          oldUrl = val;
        }
      }
      originalContributor = String(values[i][2]) || String(values[i][4]) || '';
      break;
    }
  }

  if (existingRow === -1) {
    const uploadRes = uploadToDrive(data.base64Data, itemName + '.png', data.mimeType);
    sheet.appendRow([itemName, uploadRes.url, data.username, now, category, patch]);
    return responseJSON({ status: 'success', url: uploadRes.url, message: 'Đã thêm món đồ mới vào kho dữ liệu!' });
  }

  if (String(data.username).toLowerCase() === originalContributor.toLowerCase() || data.role === 'Admin') {
    const uploadRes = uploadToDrive(data.base64Data, itemName + '.png', data.mimeType);
    deleteDriveFileByUrl(oldUrl);

    sheet.getRange(existingRow, 2).setValue(uploadRes.url);
    sheet.getRange(existingRow, 3).setValue(data.username);
    sheet.getRange(existingRow, 4).setValue(now);
    sheet.getRange(existingRow, 5).setValue(category);
    sheet.getRange(existingRow, 6).setValue(patch);

    return responseJSON({ status: 'success', url: uploadRes.url, message: 'Đã cập nhật ảnh phiên bản mới thành công!' });
  }

  const uploadRes = uploadToDrive(data.base64Data, itemName + '_pending.png', data.mimeType);
  let pendingSheet = ss.getSheetByName('ItemPending');
  if (!pendingSheet) {
    pendingSheet = ss.insertSheet('ItemPending');
    pendingSheet.appendRow(['pending_id', 'item_name', 'category', 'new_url', 'old_url', 'patch', 'contributor', 'original_contributor', 'created_at']);
  }

  const pendingId = 'pend_' + new Date().getTime();
  pendingSheet.appendRow([pendingId, itemName, category, uploadRes.url, oldUrl, patch, data.username, originalContributor, now]);

  sendNotification(ss, originalContributor, data.username, '', `đề xuất cập nhật ảnh mới cho món [${itemName}] (${patch})`, 'item_proposal', pendingId);
  sendNotification(ss, 'admin', data.username, '', `đề xuất cập nhật ảnh mới cho món [${itemName}] (${patch})`, 'item_proposal', pendingId);

  return responseJSON({ 
    status: 'pending', 
    message: 'Đề xuất ảnh của bạn đã được gửi đến người đóng góp trước đó và Admin để duyệt!' 
  });
}

function handleApprovePendingItem(ss, data) {
  const pendingSheet = ss.getSheetByName('ItemPending');
  if (!pendingSheet) return responseJSON({ status: 'error', message: 'Không có dữ liệu chờ duyệt' });

  const pValues = pendingSheet.getDataRange().getValues();
  let targetRow = -1;
  let pData = null;

  for (let i = 1; i < pValues.length; i++) {
    if (String(pValues[i][0]) === String(data.pending_id)) {
      targetRow = i + 1;
      pData = pValues[i];
      break;
    }
  }

  if (targetRow === -1) return responseJSON({ status: 'error', message: 'Yêu cầu không tồn tại hoặc đã xử lý' });

  const user = String(data.username).toLowerCase();
  const orig = String(pData[7]).toLowerCase();
  if (user !== orig && data.role !== 'Admin') {
    return responseJSON({ status: 'error', message: 'Bạn không có quyền duyệt ảnh này!' });
  }

  const itemName = pData[1];
  const category = pData[2];
  const newUrl = pData[3];
  const oldUrl = pData[4];
  const patch = pData[5];
  const contributor = pData[6];
  const now = new Date().toLocaleString('vi-VN');

  const dbSheet = ss.getSheetByName('ItemDatabase');
  const dbValues = dbSheet.getDataRange().getValues();
  for (let i = 1; i < dbValues.length; i++) {
    if (String(dbValues[i][0]).toLowerCase() === String(itemName).toLowerCase()) {
      dbSheet.getRange(i + 1, 2).setValue(newUrl);
      dbSheet.getRange(i + 1, 3).setValue(contributor);
      dbSheet.getRange(i + 1, 4).setValue(now);
      dbSheet.getRange(i + 1, 5).setValue(category);
      dbSheet.getRange(i + 1, 6).setValue(patch);
      break;
    }
  }

  deleteDriveFileByUrl(oldUrl);
  pendingSheet.deleteRow(targetRow);

  removeNotificationByExtraId(ss, data.pending_id);
  sendNotification(ss, contributor, data.username, '', `Ảnh đề xuất cho món [${itemName}] của bạn đã được duyệt thành công!`, 'item_approved');

  return responseJSON({ status: 'success', message: 'Đã duyệt và áp dụng ảnh mới thành công!' });
}

function handleRejectPendingItem(ss, data) {
  const pendingSheet = ss.getSheetByName('ItemPending');
  if (!pendingSheet) return responseJSON({ status: 'error' });

  const pValues = pendingSheet.getDataRange().getValues();
  for (let i = 1; i < pValues.length; i++) {
    if (String(pValues[i][0]) === String(data.pending_id)) {
      const newUrl = pValues[i][3];
      const contributor = pValues[i][6];
      const itemName = pValues[i][1];
      deleteDriveFileByUrl(newUrl);
      pendingSheet.deleteRow(i + 1);

      removeNotificationByExtraId(ss, data.pending_id);
      sendNotification(ss, contributor, data.username, '', `Đề xuất ảnh cho món [${itemName}] của bạn đã bị từ chối.`, 'item_rejected');
      return responseJSON({ status: 'success', message: 'Đã từ chối ảnh đề xuất!' });
    }
  }
  return responseJSON({ status: 'error', message: 'Không tìm thấy yêu cầu' });
}

function removeNotificationByExtraId(ss, extraId) {
  if (!extraId) return;
  const notifSheet = ss.getSheetByName('Notifications');
  if (!notifSheet) return;
  const values = notifSheet.getDataRange().getValues();
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][8]) === String(extraId)) {
      notifSheet.deleteRow(i + 1);
    }
  }
}

function deleteDriveFileByUrl(url) {
  if (!url) return;
  try {
    let fileId = null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) fileId = match[1];
    if (!fileId && url.includes('id=')) fileId = url.split('id=')[1].split('&')[0];
    if (fileId) {
      DriveApp.getFileById(fileId).setTrashed(true);
    }
  } catch(e) {}
}

function uploadToDrive(base64Data, fileName, mimeType) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const contentType = mimeType || 'image/png';
  const decoded = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(decoded, contentType, fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { url: 'https://lh3.googleusercontent.com/d/' + file.getId() };
}

function handleUploadImage(data) {
  try {
    const res = uploadToDrive(data.base64Data, data.fileName || ('img_' + Date.now() + '.png'), data.mimeType);
    return responseJSON({ status: 'success', url: res.url });
  } catch (err) {
    return responseJSON({ status: 'error', message: 'Lỗi tải ảnh lên Drive: ' + err.toString() });
  }
}

function handleGetCloudDraft(ss, username) {
  if (!username) return responseJSON({ status: 'success', data: null });
  let sheet = ss.getSheetByName('UserDrafts');
  if (!sheet) return responseJSON({ status: 'success', data: null });

  const values = sheet.getDataRange().getValues();
  const target = String(username).trim().toLowerCase();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === target) {
      try {
        const draftObj = JSON.parse(values[i][1]);
        return responseJSON({ status: 'success', data: draftObj, updated_at: values[i][2] });
      } catch(e) {
        return responseJSON({ status: 'success', data: null });
      }
    }
  }
  return responseJSON({ status: 'success', data: null });
}

function handleSaveCloudDraft(ss, data) {
  if (!data.username) return responseJSON({ status: 'error', message: 'Thiếu username' });
  let sheet = ss.getSheetByName('UserDrafts');
  if (!sheet) {
    sheet = ss.insertSheet('UserDrafts');
    sheet.appendRow(['username', 'draft_json', 'updated_at']);
  }

  const values = sheet.getDataRange().getValues();
  const target = String(data.username).trim().toLowerCase();
  const jsonStr = JSON.stringify(data.draft);
  const now = new Date().toLocaleString('vi-VN');

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === target) {
      sheet.getRange(i + 1, 2).setValue(jsonStr);
      sheet.getRange(i + 1, 3).setValue(now);
      return responseJSON({ status: 'success', updated_at: now });
    }
  }

  sheet.appendRow([target, jsonStr, now]);
  return responseJSON({ status: 'success', updated_at: now });
}

function handleDeleteCloudDraft(ss, data) {
  if (!data.username) return responseJSON({ status: 'success' });
  let sheet = ss.getSheetByName('UserDrafts');
  if (!sheet) return responseJSON({ status: 'success' });

  const values = sheet.getDataRange().getValues();
  const target = String(data.username).trim().toLowerCase();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === target) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return responseJSON({ status: 'success' });
}

function handleTrackSiteVisit(ss) {
  let sheet = ss.getSheetByName('SiteStats');
  if (!sheet) {
    sheet = ss.insertSheet('SiteStats');
    sheet.appendRow(['total_visits', 'last_updated']);
    sheet.appendRow([0, new Date().toLocaleString('vi-VN')]);
  }

  const values = sheet.getDataRange().getValues();
  let currentTotal = 0;
  if (values.length > 1) {
    currentTotal = Number(values[1][0]) || 0;
  }

  currentTotal += 1;
  sheet.getRange(2, 1).setValue(currentTotal);
  sheet.getRange(2, 2).setValue(new Date().toLocaleString('vi-VN'));

  return responseJSON({ status: 'success', total_visits: currentTotal });
}

function handleRegister(ss, user) {
  const sheet = ss.getSheetByName('Users');
  const values = sheet.getDataRange().getValues();
  const username = String(user.username).trim().toLowerCase();
  
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase() === username) {
      return responseJSON({ status: 'error', message: 'Tên tài khoản này đã có người sử dụng!' });
    }
  }
  const now = new Date().toLocaleString('vi-VN');
  sheet.appendRow([username, user.display_name || username, user.password, user.avatar || 'https://i.imgur.com/6VBx3io.png', 'Member', now]);
  return responseJSON({ 
    status: 'success', 
    user: { username, display_name: user.display_name || username, avatar: user.avatar || 'https://i.imgur.com/6VBx3io.png', role: 'Member' }
  });
}

function handleLogin(ss, creds) {
  const sheet = ss.getSheetByName('Users');
  const values = sheet.getDataRange().getValues();
  const username = String(creds.username).trim().toLowerCase();
  const password = String(creds.password);
  
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase() === username && String(values[i][2]) === password) {
      return responseJSON({
        status: 'success',
        user: { username: values[i][0], display_name: values[i][1], avatar: values[i][3], role: values[i][4] || 'Member' }
      });
    }
  }
  return responseJSON({ status: 'error', message: 'Sai tài khoản hoặc mật khẩu!' });
}

function handleGetShoutbox(ss) {
  const sheet = ss.getSheetByName('Shoutbox');
  if (!sheet) return responseJSON({ status: 'success', data: [] });
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return responseJSON({ status: 'success', data: [] });
  const headers = values[0];
  const list = [];
  for (let i = Math.max(1, values.length - 30); i < values.length; i++) {
    let obj = {};
    headers.forEach((h, idx) => { obj[h] = values[i][idx] !== undefined ? values[i][idx] : ''; });
    list.push(obj);
  }
  return responseJSON({ status: 'success', data: list });
}

function handleSendShoutbox(ss, msg) {
  const sheet = ss.getSheetByName('Shoutbox');
  const now = new Date().toLocaleString('vi-VN');
  sheet.appendRow(['msg_' + new Date().getTime(), msg.username, msg.user_name, msg.avatar, msg.message, now]);
  return responseJSON({ status: 'success' });
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
