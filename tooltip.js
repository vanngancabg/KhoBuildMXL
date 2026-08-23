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
      el.style.position = 'fixed';
      el.style.display = 'none';
      el.style.zIndex = '99999';
      el.style.pointerEvents = 'none';
      el.style.background = 'rgba(0, 0, 0, 0.95)';
      el.style.border = '2px solid #5a4b32';
      el.style.borderRadius = '4px';
      el.style.padding = '4px';
      el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.9)';
      el.style.maxWidth = '360px';
      el.innerHTML = '<img id="tt-img-src" src="" style="max-width:100%; height:auto; display:block; border-radius:2px;">';
      document.body.appendChild(el);
    }
    this.tooltipEl = el;
  },

  async loadDatabase() {
    try {
      const res = await API.getItemDatabase();
      if (res.status === 'success' && res.data) {
        this.itemsDb = res.data;
      }
    } catch (e) {
      console.error('Không thể tải Item Database:', e);
    }
  },

  attachEvents() {
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('.item-hover-trigger');
      if (target) {
        const itemKey = target.getAttribute('data-item-key');
        const itemData = this.itemsDb[itemKey];

        if (itemData && itemData.url) {
          const imgEl = document.getElementById('tt-img-src');
          imgEl.src = itemData.url;
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

  positionTooltip(e) {
    const offset = 16;
    let left = e.clientX + offset;
    let top = e.clientY + offset;

    // Giữ khung không bị tràn khỏi màn hình
    const ttWidth = this.tooltipEl.offsetWidth || 300;
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
