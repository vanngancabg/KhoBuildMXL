// Dữ liệu kỹ năng mẫu đặc trưng của 7 Class Diablo 2 Median XL
const MEDIAN_SKILLS = {
  Amazon: [
    { id: 'amz_1', name: 'Barrage', max: 20, desc: 'Bắn liên hoàn nhiều mũi tên hỏa lực diện rộng.' },
    { id: 'amz_2', name: 'Phalanx', max: 20, desc: 'Triệu hồi cung thủ bóng đêm hỗ trợ tấn công.' },
    { id: 'amz_3', name: 'Curare', max: 20, desc: 'Cường hóa độc tính cực mạnh vào mọi đòn đánh.' },
    { id: 'amz_uber', name: 'Wild and Free (Uber)', max: 1, desc: 'Gia tăng tốc độ chạy và kháng hiệu ứng toàn diện.' }
  ],
  Assassin: [
    { id: 'asn_1', name: 'Batstrike', max: 20, desc: 'Đòn đánh tích tụ triệu hồi bầy dơi hút máu.' },
    { id: 'asn_2', name: 'Shadow Refuge', max: 20, desc: 'Tăng mạnh giáp phòng thủ và khả năng hút máu.' },
    { id: 'asn_3', name: 'Hades Gate', max: 20, desc: 'Dịch chuyển tức thời gây sát thương diện rộng.' },
    { id: 'asn_uber', name: 'Beacon (Uber)', max: 1, desc: 'Triệu hồi quả cầu năng lượng quét sạch kẻ thù.' }
  ],
  Barbarian: [
    { id: 'bar_1', name: 'Stormblast', max: 20, desc: 'Chém tạo ra luồng sấm sét tấn công tầm xa.' },
    { id: 'bar_2', name: 'Mountain King', max: 20, desc: 'Tăng toàn diện chỉ số thuộc tính và sức mạnh cơ bắp.' },
    { id: 'bar_3', name: 'Fortress', max: 20, desc: 'Triệu hồi tháp pháo mini tự động xả tên.' },
    { id: 'bar_uber', name: 'Shamanic Trance (Uber)', max: 1, desc: 'Tăng cường sức mạnh triệu hồi linh hồn chiến binh.' }
  ],
  Druid: [
    { id: 'dru_1', name: 'Plague Avatar', max: 20, desc: 'Biến hình thành quái vật độc gieo rắc mầm bệnh.' },
    { id: 'dru_2', name: 'Spore Breath', max: 20, desc: 'Thổi luồng độc tố hủy diệt kẻ thù phía trước.' },
    { id: 'dru_3', name: 'Barkskin', max: 20, desc: 'Lớp giáp gỗ cổ thụ giảm lượng lớn sát thương nhận vào.' },
    { id: 'dru_uber', name: 'Force of Nature (Uber)', max: 1, desc: 'Gia tăng sát thương nguyên tố toàn bộ kỹ năng.' }
  ],
  Necromancer: [
    { id: 'nec_1', name: 'Nightcrawler', max: 20, desc: 'Triệu hồi quái thú bóng đêm săn đuổi mục tiêu.' },
    { id: 'nec_2', name: 'Bane', max: 20, desc: 'Lời nguyền suy yếu giáp và kháng của kẻ địch.' },
    { id: 'nec_3', name: 'Death Ward', max: 20, desc: 'Lá chắn tử thần tăng khả năng chống chịu.' },
    { id: 'nec_uber', name: 'Rathmas Chosen (Uber)', max: 1, desc: 'Biến bản thân trở nên bất tử trong thoáng chốc.' }
  ],
  Paladin: [
    { id: 'pal_1', name: 'Colosseum', max: 20, desc: 'Tạo đấu trường ánh sáng giam cầm và tiêu diệt quái vật.' },
    { id: 'pal_2', name: 'Sacred Armor', max: 20, desc: 'Bảo hộ thánh thần hấp thụ sát thương cực lớn.' },
    { id: 'pal_3', name: 'Vindicate', max: 20, desc: 'Hồi phục máu tức thì cho bản thân sau mỗi mạng hạ gục.' },
    { id: 'pal_uber', name: 'Superbeast (Uber)', max: 1, desc: 'Biến thân thành thần hộ mệnh tăng tốc độ ra đòn.' }
  ],
  Sorceress: [
    { id: 'sor_1', name: 'Abyss', max: 20, desc: 'Tạo hố đen băng giá hút và làm chậm toàn bộ quái vật.' },
    { id: 'sor_2', name: 'Flamefront', max: 20, desc: 'Phóng ra nhiều quả cầu lửa càn quét chiến trường.' },
    { id: 'sor_3', name: 'Warp Armor', max: 20, desc: 'Giáp không gian tăng khả năng phòng thủ và né tránh.' },
    { id: 'sor_uber', name: 'Chronofield (Uber)', max: 1, desc: 'Ngưng đọng thời gian làm quái vật gần như đứng yên.' }
  ]
};

const SkillPlanner = {
  currentClass: 'Amazon',
  skillsState: {},

  init(className, initialPoints = {}) {
    this.currentClass = className || 'Amazon';
    this.skillsState = initialPoints || {};
    this.render();
  },

  render() {
    const container = document.getElementById('skill-tree-container');
    if (!container) return;

    const list = MEDIAN_SKILLS[this.currentClass] || [];
    let totalSpent = 0;

    let html = `
      <div style="background: #111315; border: 1px solid var(--border-color); border-radius: 6px; padding: 14px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <strong style="color: var(--accent-gold); font-size: 0.95rem;">⚡ Bảng Cộng Điểm Skill Tree (${this.currentClass})</strong>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Tổng điểm: <strong id="total-skill-points" style="color: var(--accent-gold);">0</strong></span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px;">
    `;

    list.forEach(skill => {
      const pts = this.skillsState[skill.id] || 0;
      totalSpent += pts;
      html += `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 10px; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <strong style="color: var(--text-bright); font-size: 0.9rem;">${skill.name}</strong>
            <span style="color: var(--accent-gold); font-weight: bold; font-size: 0.85rem;">${pts}/${skill.max}</span>
          </div>
          <p style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.3; margin-bottom: 8px;">${skill.desc}</p>
          <div style="display: flex; gap: 6px; justify-content: flex-end;">
            <button type="button" class="btn btn-sm" style="padding: 2px 8px;" onclick="SkillPlanner.addPoint('${skill.id}', -1, ${skill.max})">-</button>
            <button type="button" class="btn btn-sm btn-primary" style="padding: 2px 8px;" onclick="SkillPlanner.addPoint('${skill.id}', 1, ${skill.max})">+</button>
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
    const totalEl = document.getElementById('total-skill-points');
    if (totalEl) totalEl.innerText = totalSpent;
  },

  addPoint(skillId, delta, max) {
    const current = this.skillsState[skillId] || 0;
    const updated = Math.max(0, Math.min(max, current + delta));
    this.skillsState[skillId] = updated;
    this.render();
  },

  getPoints() {
    return this.skillsState;
  },

  setPoints(points) {
    this.skillsState = points || {};
    this.render();
  }
};
