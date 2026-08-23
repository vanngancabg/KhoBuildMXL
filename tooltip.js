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
      // Tải trực tiếp file JSON từ kho GitHub của bạn
      const res = await fetch('median_items.json');
      if (res.ok) {
        this.itemsDb = await res.json();
      }
    } catch (e) {
      console.warn('Không thể nạp median_items.json, dùng dữ liệu dự phòng');
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

    let statsHtml = '';
    if (item.stats && item.stats.length > 0) {
      statsHtml = item.stats.map(s => `<div class="tt-stat">${s}</div>`).join('');
    }

    this.tooltipEl.innerHTML = `
      <div class="tt-title ${colorClass}">${item.name}</div>
      <div class="tt-type">${item.base || ''} ${item.tier ? `(${item.tier})` : ''}</div>
      ${item.defense ? `<div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">Defense: <span style="color:#fff;">${item.defense}</span></div>` : ''}
      ${item.req_lvl ? `<div style="font-size:0.75rem; color:#aaa; margin-bottom:2px;">Required Level: <span style="color:#fff;">${item.req_lvl}</span></div>` : ''}
      ${item.req_str ? `<div style="font-size:0.75rem; color:#aaa; margin-bottom:6px;">Required Strength: <span style="color:#fff;">${item.req_str}</span></div>` : ''}
      <div style="border-top: 1px solid #333; margin: 6px 0;"></div>
      ${statsHtml}
      ${item.flavor ? `<div class="tt-flavor">${item.flavor}</div>` : ''}
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
