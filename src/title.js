import { KEYS, KERN, keyName, saveKeys, playMusic, beep, getTouchMode, setTouchMode } from './shared.js';
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
    this.kern = A.sprite(85, 500, 'kernsheet', 0).setOrigin(0.5, KERN.ay / KERN.fh).setScale(2).play('idle');
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
  start() {
    this.busy = true; beep(this, 500, 900, 0.1, 'triangle'); const k = this.kern, d3 = this.dig[2];
    k.play('run'); this.tweens.add({ targets: k, x: d3.x - 120, duration: 1300, ease: 'Sine.easeInOut', onComplete: () => {
      k.anims.stop(); k.setFrame(KERN.rows.bash * KERN.cols); const g = this.add.graphics().setDepth(5), p = { t: 0 };
      this.tweens.add({ targets: p, t: 1, duration: 520, onUpdate: () => {
        const x0 = d3.x - 24, y0 = d3.y - 38, x1 = d3.x + 24, y1 = d3.y + 38, q = Math.min(1, p.t * 2), r = Math.max(0, p.t * 2 - 1);
        g.clear().lineStyle(5, 0xff4030).lineBetween(x0, y0, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q); if (r > 0) g.lineBetween(x1, y0, x1 + (x0 - x1) * r, y0 + (y1 - y0) * r);
        if (Math.random() < 0.3) beep(this, 250 + Math.random() * 200, 120, 0.04, 'sawtooth', 0.04); }, onComplete: () => this.write4(d3) });
    } });
  }
  write4(d3) {
    d3.setAlpha(0.55); const n = this.add.text(d3.x + 8, d3.y - 62, '4', font(60, '#ff5a4a', 1)).setOrigin(0.5).setAngle(-8).setAlpha(0).setScale(0.5);
    this.tweens.add({ targets: n, alpha: 1, scale: 1, duration: 450, ease: 'Back.easeOut', onComplete: () => { beep(this, 700, 1400, 0.12, 'triangle'); this.days.setColor('#ffffff'); this.time.delayedCall(900, () => this.leave()); } });
  }
  leave() {
    const k = this.kern; k.setFlipX(false).play('run'); this.tweens.add({ targets: k, x: 1060, duration: 1100, ease: 'Sine.easeIn' });
    this.cameras.main.fadeOut(900, 0, 0, 0); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Main'));
  }
}

export class Controls extends Phaser.Scene {
  constructor() { super('Controls'); }
  create() {
    const A = this.add; this.waiting = -1; this.sel = 0;
    A.rectangle(0, 0, 960, 540, 0x070a0e).setOrigin(0); A.tileSprite(0, 0, 960, 540, 'sky').setOrigin(0).setAlpha(0.3);
    A.text(480, 22, 'CONTROLS', font(32, '#2fe0c8', 1)).setOrigin(0.5, 0).setLetterSpacing(6);
    this.acts = [['left', 'Move left'], ['right', 'Move right'], ['jump', 'Jump'], ['run', 'Run (RUN ZONES)'], ['bash', 'Bash  (RMB also)'], ['parry', 'Parry'], ['down', 'Down / pogo aim'], ['up', 'Up'], ['interact', 'Interact / workbench'], ['restart', 'Reset expedition']];
    this.rows = this.acts.map(([n, label], i) => {
      const y = 84 + i * 33; A.text(250, y, label, font(15, '#cfe')).setOrigin(0, 0.5);
      const r = A.rectangle(640, y, 190, 26, 0x16222a).setStrokeStyle(1, 0x2f4a52).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.act(i)), v = A.text(640, y, '', font(14, '#fff', 1)).setOrigin(0.5); return { r, v };
    });
    const ty = 84 + this.acts.length * 33; A.text(250, ty, 'Touch controls', font(15, '#cfe')).setOrigin(0, 0.5);
    this.tr = A.rectangle(640, ty, 190, 26, 0x16222a).setStrokeStyle(1, 0x2f4a52).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.act(this.acts.length)); this.tv = A.text(640, ty, '', font(14, '#fff', 1)).setOrigin(0.5);
    A.text(480, 462, 'Aim: mouse   Shoot: left click   |   Touch: D-pad bottom-left, JUMP / BASH / PARRY bottom-right,\ndrag on the right side to aim and fire (aim down in the air + BASH = pogo).', font(11, '#7fa8a3')).setOrigin(0.5).setAlign('center');
    this.back = A.text(480, 506, '< BACK', font(20, '#2fe0c8', 1)).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('Title'));
    const kb = this.input.keyboard; kb.on('keydown-ESC', () => { if (this.waiting < 0) this.scene.start('Title'); });
    kb.on('keydown-UP', () => this.nav(-1)); kb.on('keydown-DOWN', () => this.nav(1)); kb.on('keydown-ENTER', () => this.act(this.sel));
    this.refresh();
  }
  nav(d) { if (this.waiting < 0) { this.sel = (this.sel + d + this.acts.length + 1) % (this.acts.length + 1); this.refresh(); } }
  act(i) {
    if (this.waiting >= 0) return;
    if (i === this.acts.length) { setTouchMode({ auto: 'on', on: 'off', off: 'auto' }[getTouchMode()]); this.refresh(); return; }
    this.waiting = i; this.rows[i].v.setText('PRESS A KEY...');
    this.input.keyboard.once('keydown', ev => {
      const nm = keyName(ev.keyCode), n = this.acts[i][0]; this.waiting = -1;
      if (ev.keyCode !== 27 && nm !== '?') { const other = Object.keys(KEYS).find(o => o !== n && KEYS[o][0] === nm); if (other) KEYS[other][0] = KEYS[n][0]; KEYS[n][0] = nm; saveKeys(); }
      this.refresh();
    });
  }
  refresh() {
    this.acts.forEach(([n], i) => { this.rows[i].v.setText(KEYS[n].join(' / ')); this.rows[i].r.setStrokeStyle(i === this.sel ? 2 : 1, i === this.sel ? 0x2fe0c8 : 0x2f4a52); });
    this.tv.setText(getTouchMode().toUpperCase() + (getTouchMode() === 'auto' ? ' (on after first touch)' : '')); this.tr.setStrokeStyle(this.sel === this.acts.length ? 2 : 1, this.sel === this.acts.length ? 0x2fe0c8 : 0x2f4a52);
  }
}
