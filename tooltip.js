const ItemTooltipManager = {
  itemsDb: {},
  tooltipEl: null,

  async init() {
    this.createTooltipElement();
    await this.loadDatabase();
    this.attachEvents();
  },

  createTooltipElement() {
    let el = document.getElementById('global-item-tooltip');
    if (!el) {
      el = document.createElement('div');
      el.id = 'global-item-tooltip';
      el.className = 'd2-tooltip';
      document.body.appendChild(el);
    }
    this.tooltipEl = el;
  },

  async loadDatabase() {
    try {
      const res = await fetch('median_items.json');
      if (res.ok) {
        this.itemsDb = await res.json();
      }
    } catch (e) {
      console.warn('Không thể nạp median_items.json');
    }
  },

  attachEvents() {
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('.item-hover-trigger');
      if (target) {
        const itemKey = target.getAttribute('data-item-key');
        const itemData = this.itemsDb[itemKey];

        if (itemData) {
          this.renderItemTooltip(itemData);
          this.tooltipEl.style.display = 'block';
          this.positionTooltip(e);
        }
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.tooltipEl && this.tooltipEl.style.display === 'block') {
        this.positionTooltip(e);
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('.item-hover-trigger');
      if (target && this.tooltipEl) {
        this.tooltipEl.style.display = 'none';
      }
    });
  },

  renderItemTooltip(item) {
    let colorClass = 'item-unique';
    if (item.quality === 'runeword') colorClass = 'item-runeword';
    if (item.quality === 'set') colorClass = 'item-set';

    // Xử lý màu sắc từng dòng chỉ số
    let statsHtml = '';
    if (item.stats && Array.isArray(item.stats)) {
      statsHtml = item.stats.map(rawLine => {
        const line = rawLine.trim();
        if (!line) return '';

        // Tiêu đề cấp bậc Tier
        if (line.startsWith('Tier ')) {
          return `<div class="tt-stat-gold">${line}</div>`;
        }

        const lower = line.toLowerCase();

        // 1. Dòng yêu cầu / Thuộc tính cơ bản (Màu trắng)
        if (lower.includes('damage:') || lower.includes('innate') || lower.includes('defense:') || lower.includes('required') || lower.includes('item level:')) {
          return `<div class="tt-stat-white">${line}</div>`;
        }

        // 2. Dòng cơ chế đặc biệt / Lưu ý cam (Màu cam)
        if (
          lower.includes('while in') || 
          lower.includes('you cannot') || 
          lower.includes('added as') || 
          lower.includes('reduced by') || 
          lower.includes('always') ||
          lower.includes('gained per point') ||
          lower.includes('orbs applied') ||
          lower.includes('corrupted')
        ) {
          return `<div class="tt-stat-orange">${line}</div>`;
        }

        // 3. Dòng thuộc tính phép ma thuật thông thường (Màu xanh dương)
        return `<div class="tt-stat-blue">${line}</div>`;
      }).join('');
    }

    this.tooltipEl.innerHTML = `
      <div class="tt-title ${colorClass}">${item.name}</div>
      ${item.base ? `<div class="tt-req">${item.base}</div>` : ''}
      ${item.req_lvl ? `<div class="tt-req">Required Level: <span style="color:#fff;">${item.req_lvl}</span></div>` : ''}
      ${item.req_str ? `<div class="tt-req">Required Strength: <span style="color:#fff;">${item.req_str}</span></div>` : ''}
      ${item.req_dex ? `<div class="tt-req">Required Dexterity: <span style="color:#fff;">${item.req_dex}</span></div>` : ''}
      ${item.defense ? `<div class="tt-req">Defense: <span style="color:#fff;">${item.defense}</span></div>` : ''}
      <div class="tt-divider"></div>
      ${statsHtml}
    `;
  },

  positionTooltip(e) {
    const offset = 16;
    let left = e.clientX + offset;
    let top = e.clientY + offset;

    const ttWidth = this.tooltipEl.offsetWidth || 280;
    const ttHeight = this.tooltipEl.offsetHeight || 200;

    if (left + ttWidth > window.innerWidth) {
      left = e.clientX - ttWidth - offset;
    }
    if (top + ttHeight > window.innerHeight) {
      top = e.clientY - ttHeight - offset;
    }

    this.tooltipEl.style.left = `${Math.max(10, left)}px`;
    this.tooltipEl.style.top = `${Math.max(10, top)}px`;
  }
};

document.addEventListener('DOMContentLoaded', () => ItemTooltipManager.init());
