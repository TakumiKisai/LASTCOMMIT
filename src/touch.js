import { getTouchMode } from './shared.js';
// On-screen controls (game-space coords, 960x540). D-pad bottom-left, action buttons bottom-right, floating aim stick:
// touch anywhere on the right half (outside buttons) and drag; pulling past a small deadzone aims AND fires.
const BTN = { left: [80, 456, 58], right: [215, 456, 58], jump: [884, 452, 60], bash: [770, 486, 50], parry: [884, 340, 46] };
const LABEL = { left: '<', right: '>', jump: 'JUMP', bash: 'BASH', parry: 'PARRY' };
export class Touch {
  constructor(scene) {
    this.s = scene; scene.input.addPointer(3); this.seen = false; this.prev = {}; this.cur = {}; this.aim = { on: false, x: 1, y: 0 };
    scene.input.on('pointerdown', p => { if (p.wasTouch) this.seen = true; });
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(200);
    this.labels = Object.keys(BTN).map(k => scene.add.text(BTN[k][0], BTN[k][1], LABEL[k], { fontFamily: 'monospace', fontSize: k === 'left' || k === 'right' ? '34px' : '15px', color: '#bff' }).setOrigin(0.5).setScrollFactor(0).setDepth(201));
  }
  get on() { const m = getTouchMode(); return m === 'on' || (m === 'auto' && this.seen); }
  update() {
    const on = this.on, g = this.g.clear(); this.labels.forEach(l => l.setVisible(on));
    this.prev = this.cur; this.cur = {}; this.aim = { on: false, x: this.aim.x, y: this.aim.y };
    if (!on) return;
    const hit = (x, y) => Object.keys(BTN).find(k => Math.hypot(x - BTN[k][0], y - BTN[k][1]) < BTN[k][2] + 10);
    let stick = null;
    for (const p of this.s.input.manager.pointers) {
      if (!p.isDown) continue;
      const bd = hit(p.downX, p.downY);
      if (bd) { const dpad = bd === 'left' || bd === 'right'; const b = dpad ? hit(p.x, p.y) : bd; if (b && (!dpad || b === 'left' || b === 'right')) this.cur[b] = true; }
      else if (p.downX > 420) {
        const dx = p.x - p.downX, dy = p.y - p.downY, d = Math.hypot(dx, dy);
        this.aim = { on: d > 16, x: d > 4 ? dx / d : this.aim.x, y: d > 4 ? dy / d : this.aim.y }; stick = { p, d };
      }
    }
    for (const k in BTN) { const [x, y, r] = BTN[k]; g.fillStyle(0x2fe0c8, this.cur[k] ? 0.4 : 0.16).fillCircle(x, y, r).lineStyle(2, 0x2fe0c8, 0.55).strokeCircle(x, y, r); }
    if (stick) { const { p } = stick, kx = p.downX + Phaser.Math.Clamp(p.x - p.downX, -50, 50), ky = p.downY + Phaser.Math.Clamp(p.y - p.downY, -50, 50); g.lineStyle(2, 0x2fe0c8, 0.4).strokeCircle(p.downX, p.downY, 50).fillStyle(0x2fe0c8, 0.35).fillCircle(kx, ky, 20); }
  }
  down(k) { return !!this.cur[k]; }
  pressed(k) { return !!this.cur[k] && !this.prev[k]; }
}
