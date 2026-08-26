const ItemTooltipManager = {
  itemsDb: {},
  selectedItemForInsert: null,

  async init() {
    this.createTooltipElement();
    await this.loadDatabase();
    this.bindHoverEvents();
  },

  createTooltipElement() {
    if (!document.getElementById('global-item-tooltip')) {
      const tt = document.createElement('div');
      tt.id = 'global-item-tooltip';
      tt.innerHTML = '<img id="tt-img-src" src="" alt="Item Stats">';
      document.body.appendChild(tt);
    }
  },

  async loadDatabase() {
    // 1. Kiểm tra bộ nhớ đệm trình duyệt trước để mở trang ngay lập tức
    const cached = localStorage.getItem('d2_cached_itemdb');
    const cacheTime = localStorage.getItem('d2_cached_itemdb_time');
    const now = Date.now();

    if (cached && cacheTime && (now - Number(cacheTime) < 300000)) { // 5 phút cache
      try {
        this.itemsDb = JSON.parse(cached);
        return;
      } catch(e) {}
    }

    // 2. Nếu hết hạn hoặc chưa có thì mới tải từ Google Sheets
    try {
      const res = await API.getItemDatabase();
      if (res.status === 'success' && res.data) {
        this.itemsDb = res.data;
        localStorage.setItem('d2_cached_itemdb', JSON.stringify(res.data));
        localStorage.setItem('d2_cached_itemdb_time', String(now));
      }
    } catch (err) {}
  },

  bindHoverEvents() {
    const tooltip = document.getElementById('global-item-tooltip');
    const tooltipImg = document.getElementById('tt-img-src');

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('.item-hover-trigger');
      if (target) {
        let key = target.getAttribute('data-item-key');
        if (!key) {
          key = target.textContent.replace(/<[^>]*>/g, '').trim().toLowerCase();
        }

        const item = this.itemsDb[key];
        if (item && item.url) {
          tooltipImg.src = item.url;
          tooltip.style.display = 'block';
          this.positionTooltip(e);
        }
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (tooltip.style.display === 'block') {
        this.positionTooltip(e);
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('.item-hover-trigger')) {
        tooltip.style.display = 'none';
        tooltipImg.src = '';
      }
    });
  },

  positionTooltip(e) {
    const tooltip = document.getElementById('global-item-tooltip');
    const offset = 15;
    let left = e.clientX + offset;
    let top = e.clientY + offset;

    const ttWidth = tooltip.offsetWidth || 300;
    const ttHeight = tooltip.offsetHeight || 200;

    if (left + ttWidth > window.innerWidth) {
      left = e.clientX - ttWidth - offset;
    }
    if (top + ttHeight > window.innerHeight) {
      top = e.clientY - ttHeight - offset;
    }

    tooltip.style.left = `${Math.max(10, left)}px`;
    tooltip.style.top = `${Math.max(10, top)}px`;
  },

  openPickerModal(onSelectCallback, initialSearch = '', autoSelectItem = '') {
    if (onSelectCallback) {
      this.onSelectCallback = onSelectCallback;
    }
    this.selectedItemForInsert = autoSelectItem || null;
    let modal = document.getElementById('modal-item-picker');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-item-picker';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 850px; width: 95%; max-height: 85vh; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
            <h3 style="color: var(--accent-gold); margin: 0; font-family: var(--font-heading);">🗡️ THƯ VIỆN TRANG BỊ MEDIAN XL</h3>
            <button class="btn btn-sm" onclick="ItemTooltipManager.closePickerModal(true)">✖ Đóng</button>
          </div>

          <div style="margin-bottom: 14px;">
            <input type="text" id="picker-search-input" class="form-control" placeholder="🔍 Gõ tên món đồ để tìm nhanh (VD: Iceflayer, Shadowfang...)" oninput="ItemTooltipManager.renderPickerItems()">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 340px; gap: 16px; flex: 1; overflow: hidden; min-height: 380px;">
            <div id="picker-items-list" style="overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 6px;"></div>
            
            <div style="background: #0d0e10; border: 1px solid rgba(255,255,255,0.06); border-radius: 4px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between;">
              <div id="picker-preview-box" style="text-align: center; flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <div style="color: var(--text-muted); font-size: 0.85rem;">Chọn một món đồ bên trái để xem trước ảnh chỉ số</div>
              </div>
              <div id="picker-preview-actions" style="margin-top: 10px; display: none;">
                <div id="picker-preview-meta" style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px;"></div>
                <div style="display: flex; gap: 8px;">
                  <button id="picker-btn-insert" class="btn btn-primary" style="flex: 1;" onclick="ItemTooltipManager.confirmInsert()">➕ Chèn Vào Bài</button>
                  <button id="picker-btn-update" class="btn btn-sm" style="background: rgba(237, 137, 54, 0.1); color: var(--accent-orange); border-color: rgba(237, 137, 54, 0.3);">🔄 Đề Xuất Ảnh Mới</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closePickerModal(true);
      });
    }

    modal.classList.add('active');
    const inp = document.getElementById('picker-search-input');
    if (inp) {
      inp.value = initialSearch || '';
    }
    
    this.renderPickerItems();

    if (autoSelectItem && this.itemsDb[autoSelectItem.toLowerCase()]) {
      this.selectedItemForInsert = autoSelectItem;
      this.showPickerPreview(this.itemsDb[autoSelectItem.toLowerCase()]);
    }

    setTimeout(() => {
      if (inp) inp.focus();
    }, 100);
  },

  closePickerModal(shouldClearMarker = false) {
    const modal = document.getElementById('modal-item-picker');
    if (modal) modal.classList.remove('active');
    if (shouldClearMarker && typeof FormHandler !== 'undefined') {
      FormHandler.removeCursorMarker();
    }
  },

  renderPickerItems() {
    const list = document.getElementById('picker-items-list');
    const query = (document.getElementById('picker-search-input')?.value || '').trim().toLowerCase();
    list.innerHTML = '';

    const items = Object.values(this.itemsDb).filter(item => {
      return !query || item.name.toLowerCase().includes(query);
    });

    if (items.length === 0) {
      const box = document.getElementById('picker-preview-box');
      const actions = document.getElementById('picker-preview-actions');
      if (box) box.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Chưa có dữ liệu ảnh.</div>';
      if (actions) actions.style.display = 'none';

      list.innerHTML = `
        <div style="text-align: center; padding: 40px 10px;">
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 12px;">Chưa có món đồ "${query}" trong kho dữ liệu.</p>
          <button class="btn btn-primary" onclick="ItemTooltipManager.closePickerModal(false); FormHandler.openDirectUploadModal('${query}')">➕ Tải Ảnh Đóng Góp Món Này</button>
        </div>
      `;
      return;
    }

    items.forEach(item => {
      const isSelected = this.selectedItemForInsert && this.selectedItemForInsert.toLowerCase() === item.name.toLowerCase();
      const itemRow = document.createElement('div');
      itemRow.className = 'picker-item-row';
      itemRow.style.padding = '10px 14px';
      itemRow.style.background = '#14161a';
      itemRow.style.border = isSelected ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.04)';
      itemRow.style.borderRadius = '3px';
      itemRow.style.cursor = 'pointer';
      itemRow.style.display = 'flex';
      itemRow.style.justifyContent = 'space-between';
      itemRow.style.alignItems = 'center';
      itemRow.style.transition = 'all 0.2s';

      itemRow.onclick = () => {
        document.querySelectorAll('.picker-item-row').forEach(r => r.style.borderColor = 'rgba(255,255,255,0.04)');
        itemRow.style.borderColor = 'var(--accent-gold)';
        this.selectedItemForInsert = item.name;
        this.showPickerPreview(item);
      };

      itemRow.innerHTML = `
        <div>
          <strong style="color: var(--accent-gold); font-size: 0.95rem;">${item.name}</strong>
        </div>
        <span style="font-size: 0.7rem; color: #88929b; background: rgba(255,255,255,0.03); padding: 2px 6px; border-radius: 3px;">Patch ${item.patch || '2.13'}</span>
      `;
      list.appendChild(itemRow);
    });
  },

  showPickerPreview(item) {
    const box = document.getElementById('picker-preview-box');
    const actions = document.getElementById('picker-preview-actions');
    const meta = document.getElementById('picker-preview-meta');
    const btnUpdate = document.getElementById('picker-btn-update');

    if (item.url) {
      box.innerHTML = `<img src="${item.url}" alt="${item.name}" style="max-width: 100%; max-height: 280px; object-fit: contain; border-radius: 2px;">`;
    } else {
      box.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem;">Món đồ này chưa có ảnh.</div>`;
    }

    meta.innerHTML = `📸 Đóng góp bởi: <b style="color:var(--text-bright);">${item.by || 'Cộng đồng'}</b> | Patch: <b style="color:var(--accent-gold);">${item.patch || '2.13'}</b>`;
    actions.style.display = 'block';

    btnUpdate.onclick = () => {
      this.closePickerModal(false);
      FormHandler.openDirectUploadModal(item.name, true);
    };
  },

  confirmInsert() {
    if (!this.selectedItemForInsert) {
      alert('Vui lòng bấm chọn một món đồ trong danh sách trước!');
      return;
    }
    const itemName = this.selectedItemForInsert;
    const modal = document.getElementById('modal-item-picker');
    if (modal) modal.classList.remove('active');
    
    if (this.onSelectCallback) {
      this.onSelectCallback(itemName);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => ItemTooltipManager.init());
