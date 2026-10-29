import { KEYS, keyName, saveKeys, playMusic, beep, getTouchMode, setTouchMode, getMouseAim, setMouseAim } from './shared.js';
const font = (s, c = '#e8e2d0', b) => ({ fontFamily: 'monospace', fontSize: s + 'px', color: c, fontStyle: b ? 'bold' : 'normal' });

// THE CASCADE investigation board. START plays: Kern walks up, crosses out the 3 in 403, writes a 4 (=404), walks off into the dungeon.
export class Title extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    this.registry.set('snap', null); this.busy = false; this.sel = 0; const A = this.add;
    playMusic(this, 'disc', 0.55); this.cameras.main.fadeIn(400);
    A.rectangle(0, 0, 960, 540, 0x070a0e).setOrigin(0);
    this.sky = A.tileSprite(0, 0, 960, 540, 'sky').setOrigin(0).setAlpha(0.5);
    A.rectangle(500, 262, 700, 392, 0x14181d).setStrokeStyle(5, 0x0b0e12); A.rectangle(500, 262, 684, 376, 0x23282d).setStrokeStyle(2, 0x2f4a52);
    A.text(480, 22, 'LAST COMMIT', font(44, '#2fe0c8', 1)).setOrigin(0.5, 0).setLetterSpacing(6);
    A.text(500, 92, 'THE CASCADE', font(32, '#e8e2d0', 1)).setOrigin(0.5).setLetterSpacing(10);
    const pins = [], cards = [[250, 190, -4, 'sky'], [372, 178, 3, 'doc'], [492, 205, -2, 'glitch'], [616, 180, 4, 'doc'], [742, 200, -3, 'photo'], [310, 292, 2, 'photo'], [440, 300, -3, 'glitch'], [574, 296, 3, 'sky']];
    cards.forEach(([x, y, a, kind]) => {
      const c = A.container(x, y).setAngle(a), paper = kind === 'doc';
      c.add(A.rectangle(0, 0, 66, 82, paper ? 0xcfc9b4 : 0xd9d4c3).setStrokeStyle(1, 0x000000, 0.4));
      if (paper) for (let i = 0; i < 7; i++) c.add(A.rectangle(0, -28 + i * 9, 48 - (i % 3) * 8, 2, 0x3a3a34));
      else { c.add(A.rectangle(0, -8, 54, 54, kind === 'glitch' ? 0x0d1f22 : 0x10161d));
        if (kind === 'sky') [[-16, 14], [-6, 22], [6, 10], [16, 18]].forEach(([bx, h]) => c.add(A.rectangle(bx, 19 - h / 2, 8, h, 0x2f6f6a)));
        else c.add(A.text(0, -8, kind === 'glitch' ? '0xFF' : '?', font(kind === 'glitch' ? 16 : 28, '#2fe0c8', 1)).setOrigin(0.5)); }
      pins.push([x + Math.sin(a * 0.0175) * -36, y - 36 * Math.cos(a * 0.0175)]);
    });
    const s = A.graphics(); [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [2, 6], [6, 7], [4, 7], [5, 6], [1, 6]].forEach(([a, b], i) => s.lineStyle(1.5, i % 2 ? 0x2fe0c8 : 0xc0392b, 0.85).lineBetween(...pins[a], ...pins[b]));
    pins.forEach(p => A.circle(p[0], p[1], 4, 0xd33a2c).setStrokeStyle(1, 0x400000));
    const t = A.graphics(); A.rectangle(225, 385, 140, 62, 0x1a2024).setStrokeStyle(1, 0x2f4a52); A.text(225, 360, 'DAYS LOGGED', font(9, '#7fa8a3')).setOrigin(0.5);
    for (let g = 0; g < 5; g++) { const bx = 170 + g * 24; for (let i = 0; i < 4; i++) t.lineStyle(2, 0xe8e2d0).lineBetween(bx + i * 4, 372, bx + i * 4, 396); t.lineStyle(2, 0xc0392b).lineBetween(bx - 2, 396, bx + 14, 372); }
    this.dig = ['4', '0', '3'].map((c, i) => A.text(500 + (i - 1) * 42, 372, c, font(66, '#e8e2d0', 1)).setOrigin(0.5));
    this.days = A.text(500, 420, 'DAYS SINCE THE CASCADE', font(18, '#a9c7c3')).setOrigin(0.5).setLetterSpacing(2);
    A.rectangle(0, 500, 960, 40, 0x0b0f14).setOrigin(0);
    this.kern = A.sprite(360, 500, 'kpx_bash', 14).setOrigin(0.5, 62 / 64).setScale(2); this.tweens.add({ targets: this.kern, y: 501, yoyo: true, repeat: -1, duration: 1600 }); // back view: studying the board
    [[480, 262, 14], [260, 240, 6], [740, 330, 6]].forEach(([x, y, sc], i) => { const gl = A.image(x, y, 'glow').setTint(0x2fe0c8).setScale(sc).setAlpha(0.12).setBlendMode(Phaser.BlendModes.ADD); this.tweens.add({ targets: gl, alpha: 0.2, duration: 1800 + i * 500, yoyo: true, repeat: -1 }); });
    for (let i = 0; i < 16; i++) { const d = A.image(Phaser.Math.Between(150, 850), Phaser.Math.Between(120, 480), 'dot').setTint(0x2fe0c8).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD); this.tweens.add({ targets: d, y: d.y - 40, alpha: 0, duration: Phaser.Math.Between(3000, 6000), repeat: -1, delay: i * 200 }); }
    this.items = ['START EXPEDITION', 'CONTROLS'].map((txt, i) => {
      const y = 350 + i * 48, ang = i ? 1.5 : -1.5, r = A.rectangle(745, y, 200, 36, 0xe3d9a6).setAngle(ang), tx = A.text(745, y, txt, font(15, '#1b1b14', 1)).setOrigin(0.5).setAngle(ang);
      r.setInteractive({ useHandCursor: true }).on('pointerover', () => { this.sel = i; this.paint(); }).on('pointerdown', () => this.pick(i)); return { r, tx };
    });
    const kb = this.input.keyboard; kb.on('keydown-UP', () => this.move(-1)); kb.on('keydown-W', () => this.move(-1)); kb.on('keydown-DOWN', () => this.move(1)); kb.on('keydown-S', () => this.move(1));
    ['ENTER', 'SPACE'].forEach(k => kb.on('keydown-' + k, () => this.pick(this.sel)));
    this.paint();
  }
  update() { this.sky.tilePositionX += 0.15; }
  move(d) { if (this.busy) return; this.sel = (this.sel + d + 2) % 2; this.paint(); beep(this, 500, 600, 0.04, 'triangle', 0.04); }
  paint() { this.items.forEach((it, i) => it.r.setStrokeStyle(i === this.sel ? 3 : 0, 0x2fe0c8).setFillStyle(i === this.sel ? 0xf4ecb8 : 0xe3d9a6)); }
  pick(i) { if (this.busy) return; if (i === 1) { this.scene.start('Controls'); return; } this.start(); }
  start() { // no walking: Kern raises his hand, a stream of 0/1 bits rewrites the 3 into a 4 (403 -> 404)
    this.busy = true; beep(this, 500, 900, 0.1, 'triangle'); const A = this.add, k = this.kern, d3 = this.dig[2], hx = k.x + 28, hy = k.y - 70;
    for (let i = 0; i < 30; i++) this.time.delayedCall(i * 30, () => { const b = A.text(hx, hy, Math.random() < 0.5 ? '0' : '1', font(14, '#2fe0c8', 1)).setOrigin(0.5).setDepth(6); this.tweens.add({ targets: b, x: d3.x + Phaser.Math.Between(-16, 16), y: d3.y + Phaser.Math.Between(-30, 30), alpha: 0.15, duration: 420, onComplete: () => b.destroy() }); });
    this.time.delayedCall(500, () => {
      const bits = A.text(d3.x, d3.y, '0', font(66, '#2fe0c8', 1)).setOrigin(0.5).setDepth(5); d3.setAlpha(0);
      this.time.addEvent({ delay: 55, repeat: 13, callback: () => { bits.setText(Math.random() < 0.5 ? '0' : '1'); beep(this, 900 + Math.random() * 500, 700, 0.03, 'square', 0.03); } });
      this.time.delayedCall(800, () => { this.tweens.add({ targets: bits, alpha: 0, duration: 220, onComplete: () => bits.destroy() }); this.write4(d3); });
    });
  }

  write4(d3) {
    const n = this.add.text(d3.x, d3.y, '4', font(66, '#7ddc6f', 1)).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: n, alpha: 1, duration: 420, onComplete: () => { n.setColor('#e8e2d0'); beep(this, 700, 1400, 0.12, 'triangle'); this.days.setColor('#ffffff'); this.time.delayedCall(1000, () => this.leave()); } });
  }

  leave() { this.cameras.main.fadeOut(900, 0, 0, 0); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Main')); }
}

export class Controls extends Phaser.Scene {
  constructor() { super('Controls'); }
  create() {
    const A = this.add; this.waiting = -1; this.sel = 0;
    A.rectangle(0, 0, 960, 540, 0x070a0e).setOrigin(0); A.tileSprite(0, 0, 960, 540, 'sky').setOrigin(0).setAlpha(0.3);
    A.text(480, 12, 'CONTROLS', font(30, '#2fe0c8', 1)).setOrigin(0.5, 0).setLetterSpacing(6);
    this.acts = [['left', 'Move / face / aim left'], ['right', 'Move / face / aim right'], ['up', 'Aim up'], ['down', 'Aim down / pogo (with Bash)'], ['jump', 'Jump'], ['shoot', 'Shoot (hold)'], ['bash', 'Bash'], ['parry', 'Parry'], ['run', 'Run (RUN ZONES)'], ['interact', 'Interact / workbench'], ['restart', 'Reset expedition']];
    this.toggles = [['Touch controls', () => getTouchMode().toUpperCase(), () => setTouchMode({ auto: 'on', on: 'off', off: 'auto' }[getTouchMode()])], ['Mouse aim + click shoot (testing)', () => (getMouseAim() ? 'ON' : 'OFF'), () => setMouseAim(!getMouseAim())]];
    const n = this.acts.length, y0 = 66, dy = 27; this.n = n; this.rows = [];
    [...this.acts.map(a => a[1]), ...this.toggles.map(a => a[0])].forEach((label, i) => {
      const y = y0 + i * dy; A.text(240, y, label, font(14, '#cfe')).setOrigin(0, 0.5);
      const r = A.rectangle(650, y, 220, 24, 0x16222a).setStrokeStyle(1, 0x2f4a52).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.act(i)), v = A.text(650, y, '', font(13, '#fff', 1)).setOrigin(0.5); this.rows.push({ r, v });
    });
    A.text(480, 450, 'Movement keys set facing and 8-way aim. Hold SHOOT to fire; SHOOT + a direction aims that way (down works on the ground too).\nTouch: D-pad left, JUMP / BASH / PARRY right, drag on the right side to aim and fire.', font(11, '#7fa8a3')).setOrigin(0.5).setAlign('center');
    this.back = A.text(480, 508, '< BACK', font(20, '#2fe0c8', 1)).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('Title'));
    const kb = this.input.keyboard; kb.on('keydown-ESC', () => { if (this.waiting < 0) this.scene.start('Title'); });
    kb.on('keydown-UP', () => this.nav(-1)); kb.on('keydown-DOWN', () => this.nav(1)); kb.on('keydown-ENTER', () => this.act(this.sel));
    this.refresh();
  }
  nav(d) { if (this.waiting < 0) { const m = this.rows.length; this.sel = (this.sel + d + m) % m; this.refresh(); } }
  act(i) {
    if (this.waiting >= 0) return;
    if (i >= this.n) { this.toggles[i - this.n][2](); this.refresh(); return; }
    this.waiting = i; this.rows[i].v.setText('PRESS A KEY...');
    this.input.keyboard.once('keydown', ev => {
      const nm = keyName(ev.keyCode), key = this.acts[i][0]; this.waiting = -1;
      if (ev.keyCode !== 27 && nm !== '?') { const other = Object.keys(KEYS).find(o => o !== key && KEYS[o][0] === nm); if (other) KEYS[other][0] = KEYS[key][0]; KEYS[key][0] = nm; saveKeys(); }
      this.refresh();
    });
  }
  refresh() {
    this.rows.forEach((row, i) => { row.v.setText(i < this.n ? KEYS[this.acts[i][0]].join(' / ') : this.toggles[i - this.n][1]()); row.r.setStrokeStyle(i === this.sel ? 2 : 1, i === this.sel ? 0x2fe0c8 : 0x2f4a52); });
  }
}
