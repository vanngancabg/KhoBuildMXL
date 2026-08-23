const ItemTooltipManager = {
  itemsDb: {},
  individualItemsMap: {},
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
        this.buildIndividualMap();
      }
    } catch (e) {
      console.warn('Không thể nạp median_items.json');
    }
  },

  // Tách từng món đồ con bên trong các mảng gộp
  buildIndividualMap() {
    const rawKeys = Object.keys(this.itemsDb);
    rawKeys.forEach(k => {
      const entry = this.itemsDb[k];
      const nameKey = (entry.name || k).trim().toLowerCase();
      this.individualItemsMap[nameKey] = entry;

      // Quét các dòng stats xem có chứa tên món đồ riêng lẻ không
      if (entry.stats && Array.isArray(entry.stats)) {
        let currentSubName = '';
        let currentSubStats = [];

        entry.stats.forEach(line => {
          const trimmed = line.trim();
          // Nếu dòng là tên món đồ riêng
          if (trimmed.length > 2 && trimmed.length < 45 && !trimmed.includes(':') && !trimmed.startsWith('+') && !trimmed.startsWith('-') && !trimmed.startsWith('(')) {
            if (currentSubName && currentSubStats.length > 0) {
              this.individualItemsMap[currentSubName.toLowerCase()] = {
                name: currentSubName,
                quality: entry.quality || 'unique',
                req_lvl: entry.req_lvl || '',
                req_str: entry.req_str || '',
                stats: currentSubStats
              };
            }
            currentSubName = trimmed;
            currentSubStats = [];
          } else {
            currentSubStats.push(trimmed);
          }
        });

        if (currentSubName && currentSubStats.length > 0) {
          this.individualItemsMap[currentSubName.toLowerCase()] = {
            name: currentSubName,
            quality: entry.quality || 'unique',
            req_lvl: entry.req_lvl || '',
            req_str: entry.req_str || '',
            stats: currentSubStats
          };
        }
      }
    });
  },

  attachEvents() {
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('.item-hover-trigger');
      if (target) {
        const itemKey = target.getAttribute('data-item-key');
        const itemData = this.individualItemsMap[itemKey] || this.itemsDb[itemKey];

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
    if (item.stats && Array.isArray(item.stats)) {
      statsHtml = item.stats.map(s => {
        if (s.startsWith('Tier ')) return `<div style="color:var(--accent-gold); font-weight:bold; margin-top:4px;">${s}</div>`;
        return `<div class="tt-stat">${s}</div>`;
      }).join('');
    }

    this.tooltipEl.innerHTML = `
      <div class="tt-title ${colorClass}">${item.name}</div>
      ${item.defense ? `<div style="font-size:0.8rem; color:#aaa; margin-bottom:2px;">Defense: <span style="color:#fff;">${item.defense}</span></div>` : ''}
      ${item.req_lvl ? `<div style="font-size:0.75rem; color:#aaa; margin-bottom:2px;">Required Level: <span style="color:#fff;">${item.req_lvl}</span></div>` : ''}
      ${item.req_str ? `<div style="font-size:0.75rem; color:#aaa; margin-bottom:4px;">Required Strength: <span style="color:#fff;">${item.req_str}</span></div>` : ''}
      <div style="border-top: 1px solid #333; margin: 6px 0;"></div>
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
