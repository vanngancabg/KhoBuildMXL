// Database dữ liệu chỉ số đồ mẫu cho Median XL (Có thể bổ sung thêm)
const D2_DATABASE = {
  "royal circlet": {
    type: "Sacred Circlet (Unique)",
    color: "#d4af37",
    stats: ["+2 to All Skills", "+(20 to 30)% Spell Damage", "+(15 to 25)% to Maximum Life", "Physical Damage Reduced by 10%"],
    flavor: "Median XL Sacred Unique"
  },
  "truewarp": {
    type: "Runeword Weapon",
    color: "#ed8936",
    stats: ["+1 to All Skills", "Adds 250-500 Fire Damage", "30% Increased Attack Speed", "+(100 to 150)% Enhanced Damage"],
    flavor: "Runes: Jah + Cham + Zod"
  },
  "latent power": {
    type: "Runeword Body Armor",
    color: "#ed8936",
    stats: ["+2 to All Skills", "Total Character Defense +(40 to 60)%", "+(30 to 50) to All Attributes", "All Resistances +(25 to 35)%"],
    flavor: "Runes: Ber + Mal + Ist"
  }
};

const TooltipEngine = {
  init() {
    let tooltipEl = document.getElementById('d2-global-tooltip');
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'd2-global-tooltip';
      tooltipEl.className = 'd2-tooltip';
      document.body.appendChild(tooltipEl);
    }

    document.addEventListener('mouseover', (e) => {
      const target = e.target;
      if (target.classList.contains('item-unique') || target.classList.contains('item-runeword') || target.classList.contains('item-set')) {
        const itemName = target.innerText.trim().toLowerCase();
        const data = D2_DATABASE[itemName] || {
          type: target.classList.contains('item-unique') ? "Unique Item" : "Runeword / Set",
          color: target.classList.contains('item-unique') ? "#d4af37" : "#ed8936",
          stats: ["Dữ liệu chỉ số Median XL tự động nhận diện theo tên."],
          flavor: "Median XL Database"
        };

        tooltipEl.innerHTML = `
          <div class="tt-title" style="color: ${data.color};">${target.innerText}</div>
          <div class="tt-type">${data.type}</div>
          ${data.stats.map(s => `<div class="tt-stat">${s}</div>`).join('')}
          <div class="tt-flavor">${data.flavor}</div>
        `;
        tooltipEl.style.display = 'block';
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (tooltipEl.style.display === 'block') {
        const x = e.clientX + 14;
        const y = e.clientY + 14;
        tooltipEl.style.left = `${Math.min(x, window.innerWidth - 320)}px`;
        tooltipEl.style.top = `${Math.min(y, window.innerHeight - 200)}px`;
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.classList.contains('item-unique') || e.target.classList.contains('item-runeword') || e.target.classList.contains('item-set')) {
        tooltipEl.style.display = 'none';
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => TooltipEngine.init());
