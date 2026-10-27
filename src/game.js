// LAST COMMIT: Phaser 3 prototype. Scenes: Boot -> Title (investigation board) -> Main (dungeon). Controls scene = rebinding.
import { KEYS, KERN, loadKeys, beep, playMusic } from './shared.js';
import { Title, Controls } from './title.js';
import { Touch } from './touch.js';
loadKeys();

const TUNE = {
  gravity: 1200, walk: 280, run: 480, accelGround: 3600, accelAir: 1700, jump: 520, jumpCut: 0.45, coyoteMs: 90, bufferMs: 100, maxVel: 820,
  hp: 5, invMs: 1000, enemyHp: 3, lungeSpeed: 420, boltSpeed: 280, bashCdMs: 320, bashMs: 110,
  parryWindowMs: 170, parryCdMs: 550, parryCost: 0, bwRegenGrounded: 10,
};
const BODY = { w: 18, h: 44 }, GY = 640; // collision box (art is ~66px tall; hat/head poke above the box on purpose)
const CONFIGS = {
  std: { name: 'STANDARD', maxBW: 100, cost: 20, cd: 220, spread: 0.05, recoil: 480, shotDmg: 1, bashDmg: 1, pogo: 580, stagger: 150, life: 700, desc: 'balanced' },
  bay: { name: 'BAYONET', maxBW: 70, cost: 28, cd: 240, spread: 0.2, recoil: 480, shotDmg: 1, bashDmg: 2, pogo: 700, stagger: 300, life: 500, desc: '2x Bash dmg, huge pogo | wild spread, 70 BW cap' },
  pre: { name: 'PRECISION', maxBW: 100, cost: 25, cd: 480, spread: 0, recoil: 600, shotDmg: 2, bashDmg: 0.6, pogo: 530, stagger: 1200, life: 1400, desc: 'exact 2-dmg shots | weak Bash that stuns | slow fire' },
};
// Revolver is drawn only while firing. The arm is baked into kern3's pointing poses: aim angle -> nearest of E / NE / SE (mirrored for the
// left side; N reuses NE, S reuses SE) and the gun sits in that pose's glove at the TRUE aim angle, so barrel and bullet always agree.
// dx/dy = glove position relative to Kern's feet anchor (detected from the art, not eyeballed).
const IDLE_FRAMES = [0, 1, 2, 3]; // kern2: 4-5 blink, 6-7 tip the hat, so the idle loop stays steady (hat tip is now an occasional taunt)
const tk = (k, tex, frames, fps) => ({ k, tex, frames, fps, ms: Math.round(frames.length / fps * 1000) + 350 });
// Played one at a time (random) after Kern has stood completely still for ~8s, then again every 6-12s; any input cancels it.
const TAUNTS = [tk('t_hat', 'kpx_idle', [6, 7, 7, 6], 5), tk('t_vest', 'kpx_idle', [12, 13, 13, 12], 4), tk('t_point', 'kpx_upd', [12, 12, 12], 3), tk('t_salute', 'kpx_upd', [13, 13, 13], 3),
  tk('t_beckon', 'kpx_upd', [14, 14, 14, 14], 4), tk('t_flex', 'kpx_bash', [8, 8, 8], 3), tk('t_wave', 'kpx_bash', [13, 13, 13, 13], 4), tk('t_hatfling', 'kpx_other', [9, 9, 9], 3), tk('t_shrug', 'kpx_bash', [15, 15, 15], 3)];
const ENEMY_SCALE = { l: 2, t: 3, g: 1 }, ENEMY_ART = { l: 'fragment', t: 'shard', g: 'core' }; // l = Fragment (rusher), t = Shard (hovering shooter), g = Core (armored)
const GUN_S = 0.58, PX = 62 / 64;
const POSES = { E: { f: 0, dx: 10.6, dy: -30.1 }, NE: { f: 1, dx: 9.6, dy: -42.2 }, SE: { f: 2, dx: 8.7, dy: -18.3 } };
const WEAPONS = { std: { px: 9.4, py: 23.0, tx: 46, ty: 21.5 }, pre: { px: 9.8, py: 17.0, tx: 46, ty: 19.0 }, bay: { px: 9.1, py: 23.0, tx: 46, ty: 23.0 } };
const TEAL = 0x2fe0c8, MID = 0x1d2631, ORG = 0xff8a3d, GREEN = 0x7ddc6f, BLOCK = ['bash', 'dbash', 'rebound', 'parry', 'dmg', 'ko'];
const Rect = Phaser.Geom.Rectangle, hit = (a, b) => Phaser.Geom.Intersects.RectangleToRectangle(a, b);

class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    const t = this.add.text(480, 270, 'LOADING', { fontFamily: 'monospace', fontSize: '18px', color: '#2fe0c8' }).setOrigin(0.5);
    this.load.on('progress', v => t.setText('LOADING ' + Math.round(v * 100) + '%'));
    ['idle', 'aim', 'upd', 'bash', 'other', 'walk'].forEach(n => this.load.spritesheet('kpx_' + n, 'assets/kern/kern_' + n + '.png', { frameWidth: 64, frameHeight: 64 })); // Kern (pixel art)
    ['fragment', 'shard', 'core'].forEach(n => this.load.image('en_' + n, 'assets/enemy/' + n + '_px.png')); // CASCADE enemies, cleaned to 1:1 pixels
    ['std', 'bay', 'pre'].forEach(k => this.load.image('lw_' + k, 'assets/weapons/lastwords_' + k + '.png'));
    this.load.audio('disc', 'assets/audio/disconnected.mp3');
  }
  create() {
    Main.prototype.tex.call(this); Main.prototype.kernAnims.call(this);
    ['std', 'bay', 'pre'].forEach(k => this.textures.get('lw_' + k).setFilter(Phaser.Textures.FilterMode.LINEAR));
    this.scene.start('Title');
  }
}

class Main extends Phaser.Scene {
  constructor() { super('Main'); }
  preload() {
    if (this.cache.audio.exists('compile')) return;
    const t = this.add.text(480, 270, 'LOADING', { fontFamily: 'monospace', fontSize: '18px', color: '#2fe0c8' }).setOrigin(0.5);
    this.load.on('progress', v => t.setText('LOADING ' + Math.round(v * 100) + '%'));
    this.load.audio('compile', 'assets/audio/the-last-compile.mp3');
  }

  create() {
    const cam = this.cameras.main, W = 3600, H = 800, kb = this.input.keyboard, snap = this.registry.get('snap');
    this.cfgKey = this.registry.get('cfg') || 'std'; this.cfg = CONFIGS[this.cfgKey];
    Object.assign(this, { bw: Math.min(this.cfg.maxBW, snap ? snap.bw : 999), hp: snap ? snap.hp : TUNE.hp, now: 0, inv: 0, hurtUntil: 0, recoilUntil: 0, shotCd: 0, bashCd: 0, parryUntil: 0, parryCd: 0,
      coyote: 0, jbuf: 0, jumping: false, curMax: TUNE.walk, gT: 0, bashS: null, dead: false, won: false, menu: false, wantBash: false, noBw: 0, stopped: false, kick: 0, wasG: false, lastVy: 0,
      act: null, lean: 0, barrierFlash: 0, nextTaunt: 8000, gunUntil: 0, faceLeft: false, cp: !!snap, picked: new Set(snap ? snap.picked : []), killed: new Set(snap ? snap.killed : []) });
    this.safe = snap ? { x: snap.x, y: snap.y } : { x: 120, y: GY - 30 };
    this.physics.world.setBounds(0, 0, W, 1400); cam.setBounds(0, 0, W, H).setBackgroundColor('#0a0e13');
    this.input.mouse.disableContextMenu(); this.input.on('pointerdown', p => { if (p.rightButtonDown()) this.wantBash = true; });
    this.k = {}; for (const n in KEYS) this.k[n] = KEYS[n].map(c => kb.addKey(c));
    this.numK = ['ONE', 'TWO', 'THREE'].map(c => kb.addKey(c)); this.escK = kb.addKey('ESC');
    this.touch = new Touch(this);
    this.tex(); this.kernAnims(); this.level(); this.spawn(); this.makeHud();
    playMusic(this, 'compile', 0.45);
    cam.startFollow(this.P, true, 0.12, 0.12); cam.setFollowOffset(0, 40); cam.fadeIn(300);
  }

  tex() {
    const mk = (k, w, h, f) => { if (this.textures.exists(k)) return; const g = this.add.graphics(); f(g); g.generateTexture(k, w, h); g.destroy(); };
    mk('spike', 16, 12, g => { g.fillStyle(0xff5a4a).fillTriangle(0, 12, 8, 0, 16, 12).fillStyle(0xffb0a0).fillTriangle(8, 0, 10, 6, 8, 6); });
    mk('panel', 32, 32, g => { g.fillStyle(0x18212b).fillRect(0, 0, 32, 32).lineStyle(1, 0x253544).strokeRect(0.5, 0.5, 31, 31).fillStyle(0x2c4151).fillRect(3, 3, 2, 2).fillRect(27, 3, 2, 2).fillRect(3, 27, 2, 2).fillRect(27, 27, 2, 2).fillStyle(0x10171e).fillRect(8, 14, 16, 4); });
    mk('sky', 480, 540, g => {
      let x = 0;
      while (x < 480) {
        const w = Math.min(Phaser.Math.Between(30, 70), 480 - x), h = Phaser.Math.Between(120, 360); g.fillStyle(0x0d151c).fillRect(x, 540 - h, w, h); g.fillStyle(0x16323a);
        for (let y = 540 - h + 10; y < 520; y += 14) for (let wx = x + 5; wx < x + w - 6; wx += 9) if (Math.random() < 0.18) g.fillRect(wx, y, 3, 5);
        x += w + Phaser.Math.Between(0, 8);
      }
    });
    const cres = (g, r0, W, col, al) => {
      const pts = [];
      for (let i = 0; i <= 14; i++) { const a = (i / 7 - 1) * 0.75; pts.push({ x: 4 + r0 * Math.cos(a), y: 36 + r0 * Math.sin(a) }); }
      for (let i = 14; i >= 0; i--) { const u = i / 7 - 1, a = u * 0.75, r = r0 - W * (1 - u * u); pts.push({ x: 4 + r * Math.cos(a), y: 36 + r * Math.sin(a) }); }
      g.fillStyle(col, al).fillPoints(pts, true);
    };
    mk('slash', 60, 72, g => { cres(g, 44, 24, TEAL, 0.5); cres(g, 44, 16, 0xaafff0, 0.85); cres(g, 44, 8, 0xffffff, 1); });
    mk('bullet', 30, 8, g => { g.fillStyle(TEAL, 0.25).fillRect(0, 3, 22, 2).fillStyle(TEAL, 0.6).fillRect(8, 2, 16, 4).fillStyle(0xdcfff8).fillRect(16, 3, 12, 2).fillStyle(0xffffff).fillRect(24, 2, 4, 4); });
    mk('bolt', 20, 20, g => { g.fillStyle(ORG, 0.25).fillCircle(10, 10, 10).fillStyle(ORG, 0.7).fillCircle(10, 10, 6).fillStyle(0xffe9c0).fillCircle(10, 10, 3); });
    mk('spark', 24, 24, g => { g.fillStyle(0xffffff).fillTriangle(12, 0, 15, 12, 9, 12).fillTriangle(12, 24, 15, 12, 9, 12).fillTriangle(0, 12, 12, 9, 12, 15).fillTriangle(24, 12, 12, 9, 12, 15); });
    mk('flash', 28, 16, g => { g.fillStyle(TEAL, 0.5).fillTriangle(0, 8, 28, 0, 28, 16).fillStyle(0xfff0b0).fillTriangle(0, 8, 22, 4, 22, 12).fillStyle(0xffffff).fillTriangle(0, 8, 12, 6, 12, 10); });
    mk('dot', 4, 4, g => { g.fillStyle(0xffffff).fillRect(0, 0, 4, 4); });
    if (!this.textures.exists('glow')) {
      const c = this.textures.createCanvas('glow', 64, 64), x = c.getContext(), r = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = r; x.fillRect(0, 0, 64, 64); c.refresh();
    }
    if (!this.textures.exists('barrier')) {
      const c = this.textures.createCanvas('barrier', 40, 84), x = c.getContext(), gr = x.createLinearGradient(0, 0, 40, 0);
      gr.addColorStop(0, 'rgba(47,224,200,0.05)'); gr.addColorStop(1, 'rgba(47,224,200,0.45)');
      x.fillStyle = gr; x.beginPath(); x.ellipse(4, 42, 30, 38, 0, -Math.PI / 2, Math.PI / 2); x.fill();
      x.strokeStyle = 'rgba(190,255,248,0.95)'; x.lineWidth = 3; x.beginPath(); x.ellipse(4, 42, 30, 38, 0, -Math.PI / 2, Math.PI / 2); x.stroke();
      x.strokeStyle = 'rgba(47,224,200,0.35)'; x.lineWidth = 1;
      for (let y = 10; y < 76; y += 8) { x.beginPath(); x.moveTo(6, y); x.lineTo(4 + 30 * Math.sqrt(1 - ((y - 42) / 38) ** 2) - 2, y); x.stroke(); }
      c.refresh();
    }
    mk('bench', 64, 44, g => {
      g.fillStyle(0x10161d).fillRect(2, 24, 60, 6).fillRect(6, 30, 5, 14).fillRect(53, 30, 5, 14).fillStyle(0x2c4151).fillRect(2, 24, 60, 2);
      g.fillStyle(0x0b0f14).fillRect(10, 2, 30, 20).lineStyle(1, TEAL).strokeRect(10.5, 2.5, 29, 19); g.fillStyle(0x1f7f78).fillRect(13, 5, 24, 14).fillStyle(TEAL).fillRect(15, 8, 12, 2).fillRect(15, 12, 18, 2).fillRect(15, 15, 8, 2);
      g.fillStyle(0x59636f).fillRect(44, 16, 14, 6).fillRect(48, 12, 3, 4).fillStyle(TEAL).fillRect(52, 18, 4, 2);
    });
    mk('cp', 30, 54, g => {
      g.fillStyle(0x10161d).fillRect(4, 10, 22, 44).fillRect(13, 0, 4, 10).fillStyle(0x2c4151).fillRect(4, 10, 22, 2); g.fillStyle(0x0b0f14).fillRect(8, 16, 14, 16).lineStyle(1, TEAL).strokeRect(8.5, 16.5, 13, 15);
      g.fillStyle(TEAL).fillRect(10, 19, 10, 2).fillRect(10, 23, 7, 2).fillRect(10, 27, 9, 2); g.fillStyle(0x3a4a58).fillRect(8, 38, 14, 3).fillRect(8, 44, 14, 3); g.fillStyle(ORG).fillRect(13, 0, 4, 3);
    });
    mk('door', 44, 76, g => { g.fillStyle(0x10161d).fillRect(0, 0, 44, 76).fillStyle(0x0b0f14).fillRect(5, 6, 34, 70).lineStyle(2, TEAL).strokeRect(5, 6, 34, 70).fillStyle(0x1f7f78).fillRect(9, 10, 26, 66).fillStyle(TEAL).fillRect(20, 10, 4, 66).fillStyle(0x0b0f14).fillRect(0, 0, 44, 5); });
  }

  kernAnims() {
    const A = (key, tex, fps, rep, list) => { if (!this.anims.exists(key)) this.anims.create({ key, frames: list.map(i => ({ key: tex, frame: i })), frameRate: fps, repeat: rep }); };
    A('idle', 'kpx_idle', 4, -1, IDLE_FRAMES); A('walk', 'kpx_walk', 4, -1, [2, 6, 7, 6]); // picked in the animation picker (kernwalk3 frames 2, 6, 7, 6) A('run', 'kpx_other', 15, -1, [0, 1, 2, 3, 4, 5]);
    A('jump', 'kpx_other', 14, 0, [11, 15]); A('fall', 'kpx_upd', 8, -1, [7]); A('land', 'kpx_other', 18, 0, [11, 6, 7]);
    A('bash', 'kpx_bash', 22, 0, [2, 1, 9, 3]); A('dbash', 'kpx_other', 1, 0, [13]); A('rebound', 'kpx_other', 12, 0, [14, 15]);
    A('parry', 'kpx_bash', 1, 0, [4]); A('dmg', 'kpx_other', 9, 0, [12, 10]); A('ko', 'kpx_upd', 1, 0, [10]);
    TAUNTS.forEach(t => A(t.k, t.tex, t.fps, 0, t.frames));
  }

  level() {
    const add = this.add, txt = (x, y, s, c = '#4a7f86') => add.text(x, y, s, { fontFamily: 'monospace', fontSize: '12px', color: c }).setDepth(1);
    const glow = (x, y, sc, tint = TEAL, a = 0.25) => add.image(x, y, 'glow').setTint(tint).setScale(sc).setAlpha(a).setBlendMode(Phaser.BlendModes.ADD).setDepth(2);
    this.sky = add.tileSprite(0, 0, 960, 540, 'sky').setOrigin(0).setScrollFactor(0).setDepth(-10);
    for (let i = 0; i < 50; i++) add.text(Phaser.Math.Between(0, 2000), Phaser.Math.Between(0, 560), Phaser.Math.RND.pick(['0', '1', '01', '$', '//', '10']), { fontFamily: 'monospace', fontSize: '14px', color: '#12303a' }).setScrollFactor(0.35).setDepth(-5);
    this.solids = this.physics.add.staticGroup(); this.sr = []; this.spikes = []; this.enemies = this.physics.add.group(); this.fruits = [];
    const plat = (x, y, w, h) => { this.solids.add(add.rectangle(x + w / 2, y + h / 2, w, h, MID).setVisible(false)); add.tileSprite(x + w / 2, y + h / 2, w, h, 'panel'); add.rectangle(x + w / 2, y + 1, w, 3, TEAL, 0.9); add.rectangle(x + w / 2, y + 7, w, 10, TEAL, 0.1).setBlendMode(Phaser.BlendModes.ADD); this.sr.push(new Rect(x, y, w, h)); };
    const spk = (x, y, w) => { add.tileSprite(x + w / 2, y + 6, w, 12, 'spike'); this.spikes.push(new Rect(x + 2, y + 3, w - 4, 9)); };
    const hang = (x, y) => { add.rectangle(x + 20, y / 2, 3, y, 0x23343c); add.rectangle(x + 20, 4, 18, 8, 0x2c4151); spk(x, y, 40); };
    // Dungeon: entrance -> room 1 -> run corridor (380px gap) -> guard room -> checkpoint -> climb -> exit
    plat(0, GY, 520, 300); plat(520, 760, 140, 40); plat(660, GY, 640, 300); plat(1300, 740, 380, 60); plat(1680, GY, 700, 300);
    plat(2440, 540, 130, 16); plat(2630, 440, 130, 16); plat(2810, 345, 130, 16); plat(2960, 250, 640, 700); plat(2120, 250, 200, 16);
    spk(520, 748, 140); spk(1300, 728, 380); hang(2330, 540); hang(2370, 445); hang(2330, 350); add.rectangle(2350, 15, 340, 30, 0x10161d);
    this.zone = [660, 2380]; [[660, 640], [1680, 700]].forEach(([x, w]) => add.rectangle(x + w / 2, GY - 2, w, 3, TEAL, 0.35));
    this.benchX = 300; add.image(300, GY, 'bench').setOrigin(0.5, 1).setDepth(2); glow(300, GY - 26, 2.4, TEAL, 0.3);
    add.image(70, GY, 'door').setOrigin(0.5, 1).setDepth(1); glow(70, GY - 40, 2.6, TEAL, 0.2);
    this.cpx = 2280; add.image(this.cpx, GY, 'cp').setOrigin(0.5, 1).setDepth(2); this.cpGlow = glow(this.cpx, GY - 30, 2.2, this.cp ? TEAL : ORG, 0.35);
    this.exit = new Rect(3470, 250 - 76, 44, 76); add.image(3492, 250, 'door').setOrigin(0.5, 1).setDepth(2); glow(3492, 215, 3.2, TEAL, 0.4);
    txt(24, GY - 130, 'SIDEQUEST // ENTRANCE'); txt(250, GY - 70, 'WORKBENCH', '#2fe0c8'); txt(690, GY - 120, 'RUN ZONE: hold SHIFT >>>>>>', '#2fe0c8'); txt(1330, GY - 100, 'bash DOWN on spikes = pogo');
    txt(1700, GY - 150, 'ARMORED GUARD: PARRY to stun it, then Bash'); txt(2200, GY - 110, 'CHECKPOINT', '#2fe0c8'); txt(2150, 215, 'secret'); txt(3380, 130, 'EXIT >', '#2fe0c8');
    const fr = (id, x, y, n, bw, c) => {
      if (this.picked.has(id)) return; const o = add.circle(x, y, 8, c).setStrokeStyle(2, 0xffffff).setDepth(3); Object.assign(o, { id, n, bw }); glow(x, y, 0.8, c, 0.35);
      this.tweens.add({ targets: o, y: y - 5, yoyo: true, repeat: -1, duration: 600 }); this.fruits.push(o);
    };
    fr('f0', 420, GY - 18, 'FLUXELLE', 40, 0xff6fa8); fr('f1', 900, GY - 18, 'FLUXXIE', 50, 0xffd84a); fr('f2', 1850, GY - 18, 'FLUXELLE', 40, 0xff6fa8); fr('f3', 2200, GY - 18, 'FLUXXIE', 50, 0xffd84a);
    fr('f4', 2500, 515, 'FLUXELLE', 40, 0xff6fa8); fr('f5', 2220, 226, 'FLUXEAR', 100, 0x7dff8a); fr('f6', 3100, 226, 'FLUXXIE', 50, 0xffd84a);
    const en = (id, type, x, y, min, max) => {
      if (this.killed.has(id)) return; const e = this.physics.add.sprite(x, y, 'en_' + ENEMY_ART[type]).setScale(ENEMY_SCALE[type]);
      Object.assign(e, { id, type, hp: type === 'g' ? 4 : TUNE.enemyHp, st: 'patrol', dir: 1, min, max, until: 0, stun: 0, face: 1 }); e.mhp = e.hp; this.enemies.add(e); if (type === 't') { e.body.setImmovable(true); e.body.setAllowGravity(false); } e.setDepth(3); e.body.setSize(Math.round(e.width * 0.7), Math.round(e.height * 0.7));
    };
    en('l1', 'l', 1000, GY - 40, 720, 1240); en('l2', 'l', 1190, GY - 40, 720, 1240); en('g1', 'g', 2000, GY - 70, 1780, 2200); en('t1', 't', 2350, GY - 120);
    en('t2', 't', 2700, 440 - 100); en('l3', 'l', 3250, 250 - 40, 3040, 3450);
  }

  spawn() {
    const snap = this.registry.get('snap'), P = this.P = this.physics.add.sprite(snap ? snap.x : 120, snap ? snap.y : GY - 26, 'dot').setVisible(false);
    P.body.setSize(BODY.w, BODY.h).setMaxVelocity(TUNE.maxVel, 900); P.setCollideWorldBounds(true);
    this.vis = this.add.sprite(P.x, P.y + BODY.h / 2, 'kpx_idle', 0).setOrigin(0.5, PX).setDepth(4).play('idle');
    this.barrier = this.add.image(0, 0, 'barrier').setBlendMode(Phaser.BlendModes.ADD).setDepth(6).setVisible(false); this.gunS = this.add.sprite(0, 0, 'lw_' + this.cfgKey).setDepth(5).setVisible(false);
    this.pl = this.add.image(P.x, P.y, 'glow').setTint(TEAL).setScale(5).setAlpha(0.1).setBlendMode(Phaser.BlendModes.ADD).setDepth(3);
    this.fx = this.add.graphics().setDepth(6); this.eg = this.add.graphics().setDepth(7);
    this.bullets = this.physics.add.group({ allowGravity: false }); this.bolts = this.physics.add.group({ allowGravity: false });
    const ph = this.physics.add;
    ph.collider(P, this.solids); ph.collider(this.enemies, this.solids);
    ph.collider(this.bullets, this.solids, b => { this.impact(b.x, b.y, TEAL); b.destroy(); }); ph.collider(this.bolts, this.solids, b => { this.impact(b.x, b.y, GREEN); b.destroy(); });
    ph.overlap(this.bullets, this.enemies, (b, e) => { this.impact(b.x, b.y, TEAL); this.dmg(e, this.cfg.shotDmg, Math.sign(b.body.velocity.x), 0); b.destroy(); });
  }

  makeHud() {
    const T = (x, y, s, c = '#9fe8dc', sz = '12px') => this.add.text(x, y, s, { fontFamily: 'monospace', fontSize: sz, color: c }).setScrollFactor(0).setDepth(100);
    const R = (x, y, w, h, c, a = 1) => this.add.rectangle(x, y, w, h, c, a).setOrigin(0).setScrollFactor(0).setDepth(100);
    T(20, 12, 'BANDWIDTH'); R(20, 28, 164, 14, 0x000000, 0.7); this.bar = R(22, 30, 160, 10, TEAL); this.hpT = T(20, 48, ''); this.cfgT = T(20, 66, '');
    this.objT = T(480, 12, '', '#ffd84a', '13px').setOrigin(0.5, 0);
    const kn = n => KEYS[n][0];
    T(14, 516, `${kn('left')}/${kn('right')} move  ${kn('jump')} jump  ${kn('run')} run (RUN ZONE)  MOUSE aim, LMB shoot  RMB/${kn('bash')} bash  ${kn('down')}+bash in air = pogo  ${kn('parry')} parry  ${kn('interact')} bench  ${kn('restart')} reset`, '#5f8f94', '11px');
    this.prompt = T(480, 470, '', '#ffffff').setOrigin(0.5);
    this.menuT = T(150, 110, '', '#ffffff', '14px').setBackgroundColor('rgba(5,10,14,0.92)').setPadding(18).setDepth(101).setVisible(false);
  }

  hud(t) {
    const c = this.cfg; this.bar.width = 160 * Math.max(0, this.bw) / 100; this.bar.setFillStyle(t < this.noBw ? 0xff4444 : TEAL);
    this.hpT.setText('HP ' + '\u25A0'.repeat(Math.max(0, this.hp))); this.cfgT.setText('LAST WORDS: ' + c.name + '   parry: ' + (t < this.parryCd ? 'recovering' : 'ready'));
    this.objT.setText(this.won ? 'EXPEDITION COMPLETE' : this.cp ? 'OBJECTIVE: climb to the EXIT (top right)' : 'OBJECTIVE: reach the CHECKPOINT, then the EXIT');
  }

  aimPose(ang) {
    const el = Math.atan2(Math.sin(ang), Math.abs(Math.cos(ang))), p = el < -0.39 ? POSES.NE : el > 0.39 ? POSES.SE : POSES.E;
    return { ...p, left: Math.abs(ang) > Math.PI / 2 };
  }

  gunGeom(ang) {
    const V = this.vis, wp = WEAPONS[this.cfgKey], p = this.aimPose(ang), left = p.left, fl = left ? -1 : 1;
    const hx = V.x + p.dx * fl - Math.cos(ang) * this.kick, hy = V.y + p.dy - Math.sin(ang) * this.kick;
    const tv = new Phaser.Math.Vector2((wp.tx - wp.px) * GUN_S, (wp.ty - wp.py) * GUN_S * (left ? -1 : 1)).rotate(ang);
    return { hx, hy, mx: hx + tv.x, my: hy + tv.y, left, wp, p };
  }

  update(time, delta) {
    const t = this.now = time, dt = delta / 1000, P = this.P, b = P.body, cam = this.cameras.main, K = this.k, T = this.touch, V = this.vis, JD = Phaser.Input.Keyboard.JustDown;
    T.update();
    const J = {}; for (const n of ['jump', 'bash', 'parry', 'interact', 'restart']) J[n] = K[n].map(k => JD(k)).some(v => v) || T.pressed(n);
    const esc = JD(this.escK), nums = this.numK.map(k => JD(k)), dn = n => K[n].some(k => k.isDown) || T.down(n);
    this.hud(t); this.sky.tilePositionX = cam.scrollX * 0.2; this.sky.tilePositionY = cam.scrollY * 0.1;
    if (J.restart) { this.registry.set('snap', null); return this.scene.restart(); }
    if (this.menu) { this.menuInput(J.interact || esc, nums); return; }
    if (this.dead || this.won) return;

    const grounded = b.blocked.down, ptr = this.input.activePointer, k = KERN.k, feet = P.y + BODY.h / 2;
    const ax = (dn('right') ? 1 : 0) - (dn('left') ? 1 : 0);
    const sx = V.x, sy = V.y - 36; let ang;
    if (T.on) ang = T.aim.on ? Math.atan2(T.aim.y, T.aim.x) : (this.faceLeft ? Math.PI : 0); else { ptr.updateWorldPoint(cam); ang = Math.atan2(ptr.worldY - sy, ptr.worldX - sx); }
    this.faceLeft = T.on ? (T.aim.on ? Math.abs(ang) > Math.PI / 2 : (ax ? ax < 0 : this.faceLeft)) : Math.abs(ang) > Math.PI / 2;
    if (grounded && !this.wasG && this.lastVy > 260) { this.dust(P.x, feet, 7); this.playAct('land', 130, true); } this.wasG = grounded; this.lastVy = b.velocity.y;
    this.gT = grounded ? this.gT + delta : 0; if (this.gT > 350) this.safe = { x: P.x, y: P.y };
    if (grounded) { this.coyote = t + TUNE.coyoteMs; if (b.velocity.y >= 0) this.jumping = false; this.bw = Math.min(this.cfg.maxBW, this.bw + TUNE.bwRegenGrounded * dt); }

    const inZone = P.x > this.zone[0] && P.x < this.zone[1];
    if (grounded) this.curMax = (inZone && dn('run')) ? TUNE.run : TUNE.walk;
    if (t > this.recoilUntil && t > this.hurtUntil) {
      const tg = ax * this.curMax, v = b.velocity.x, a = (grounded ? TUNE.accelGround : (Math.abs(v) > this.curMax && Math.sign(v) === ax ? 450 : TUNE.accelAir)) * dt;
      b.setVelocityX(v < tg ? Math.min(v + a, tg) : Math.max(v - a, tg));
    }
    if (J.jump) this.jbuf = t + TUNE.bufferMs;
    if (t < this.jbuf && t < this.coyote && t > this.hurtUntil) { b.setVelocityY(-TUNE.jump); this.jbuf = this.coyote = 0; this.jumping = true; if (grounded) this.dust(P.x, feet, 4); }
    if (this.jumping && !dn('jump') && b.velocity.y < 0) { b.setVelocityY(b.velocity.y * TUNE.jumpCut); this.jumping = false; }

    if (T.on ? T.aim.on : ptr.leftButtonDown()) this.shoot(t, ang);
    const downIn = dn('down') || (T.on && T.aim.on && T.aim.y > 0.6);
    if (J.bash || this.wantBash) { this.wantBash = false; this.startBash(t, downIn && !grounded, ax || (this.faceLeft ? -1 : 1)); }
    if (J.parry) this.tryParry(t);
    const nearB = Math.abs(P.x - this.benchX) < 55 && grounded;
    this.prompt.setText(nearB ? '[' + KEYS.interact[0] + '] LAST WORDS workbench' : '');
    if (nearB && J.interact) { this.menu = true; this.physics.pause(); this.showMenu(); }
    if (!this.cp && Math.abs(P.x - this.cpx) < 50 && P.y > GY - 140 && P.y < GY) this.saveCheckpoint();

    const f = this.fx.clear(), B = this.bashS;
    if (B && t < B.until) {
      const dd = B.dir === 'd', r = dd ? new Rect(P.x - 24, P.y + 14, 48, 62) : new Rect(P.x + (B.face > 0 ? 6 : -72), P.y - 22, 66, 46), c = this.cfg;
      for (const e of this.enemies.getChildren().slice()) {
        if (!B.hit.has(e) && hit(r, e.getBounds())) { B.hit.add(e); this.dmg(e, c.bashDmg, B.face, c.stagger); if (dd && !B.pogo) this.pogo(B); }
      }
      if (dd && !B.pogo) for (const s of this.sr.concat(this.spikes)) if (hit(r, s)) { this.pogo(B); break; }
    }
    if (t < this.recoilUntil) { const g = this.add.image(V.x, V.y, V.texture.key, V.frame.name).setOrigin(V.originX, V.originY).setFlipX(V.flipX).setAngle(V.angle).setTintFill(TEAL).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(3); this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() }); }

    // body animation (feet-anchored art on the hidden physics body; animation never touches collision)
    const bsw = B && t < B.until, wl = bsw && B.dir === 'h' ? B.face < 0 : this.faceLeft, spd = Math.abs(b.velocity.x);
    const an = grounded ? (spd > 30 && ax ? (spd > TUNE.walk + 30 ? 'run' : 'walk') : 'idle') : (b.velocity.y < 0 ? 'jump' : 'fall');
    const anyInput = Object.values(K).some(l => l.some(k => k.isDown)) || (T.on ? (T.aim.on || Object.keys(T.cur).length > 0) : ptr.leftButtonDown());
    const still = grounded && !anyInput && an === 'idle' && t > this.hurtUntil && !(this.act && !this.act.taunt && t < this.act.until);
    if (!still) { this.nextTaunt = t + 8000; if (this.act && this.act.taunt) this.act = null; }
    else if (t > this.nextTaunt && !(this.act && t < this.act.until)) { const tkn = Phaser.Math.RND.pick(TAUNTS); this.playAct(tkn.k, tkn.ms); this.act.taunt = true; this.nextTaunt = t + Phaser.Math.Between(6000, 12000); }
    const acting = this.act && t < this.act.until; if (!acting) V.anims.play(an, true);
    V.anims.timeScale = !acting && (an === 'run' || an === 'walk') ? Phaser.Math.Clamp(spd / (an === 'run' ? TUNE.run : TUNE.walk), 0.6, 1.4) : 1;
    this.lean -= this.lean * Math.min(1, 10 * dt);
    V.setPosition(P.x, feet).setFlipX(wl).setAngle(this.lean).setAlpha(t < this.inv && Math.floor(t / 80) % 2 ? 0.4 : 1);
    this.pl.setPosition(P.x, P.y); V.setOrigin(0.5, PX);
    const bf = t < this.barrierFlash; // parry = idle pose + VIGIL barrier
    this.barrier.setVisible(t < this.parryUntil || bf).setPosition(P.x + (this.faceLeft ? -28 : 28), P.y - 6).setFlipX(this.faceLeft).setAlpha(bf ? 1 : 0.55 + 0.25 * Math.sin(t / 25)).setScale(bf ? 1.3 : 1);

    // revolver + aim arm: only while firing (arm = kern3 pose chosen from the aim angle, gun in its glove)
    const g = this.gunGeom(ang), show = t < this.gunUntil && !(acting && BLOCK.includes(this.act.k));
    this.kick = Math.max(0, this.kick - 40 * dt); this.gunS.setVisible(show);
    if (show) {
      V.anims.stop(); V.setTexture('kpx_aim', g.p.f).setOrigin(0.5, PX).setFlipX(g.left);
      this.gunS.setScale(GUN_S).setOrigin(g.wp.px / 48, g.wp.py / 48).setPosition(g.hx, g.hy).setRotation(ang).setFlipY(g.left).setAlpha(Math.min(1, (this.gunUntil - t) / 90));
      if (this.cfgKey === 'pre') f.lineStyle(1, TEAL, 0.3).lineBetween(g.mx, g.my, g.mx + Math.cos(ang) * 240, g.my + Math.sin(ang) * 240);
    }

    const pb = this.pb();
    if (P.y > 940 || this.spikes.some(s => hit(s, pb))) this.hazard(t);
    if (hit(this.exit, pb)) this.win();
    this.fruits = this.fruits.filter(o => {
      if (Math.hypot(o.x - P.x, o.y - P.y) > 30) return true;
      this.bw = Math.min(this.cfg.maxBW, this.bw + o.bw); this.picked.add(o.id); this.pop(o.x, o.y - 10, o.n + ' +' + o.bw + ' BW', '#7dffd8'); beep(this, 600, 1200, 0.1, 'triangle'); o.destroy(); return false;
    });
    this.eg.clear();
    for (const e of this.enemies.getChildren().slice()) {
      this.ai(e, t); const top = e.y - e.displayHeight / 2;
      if (e.hp < e.mhp) this.eg.fillStyle(0x000000).fillRect(e.x - 14, top - 12, 28, 4).fillStyle(GREEN).fillRect(e.x - 13, top - 11, 26 * e.hp / e.mhp, 2);
      if (e.st === 'wind') this.eg.fillStyle(0xff4444).fillRect(e.x - 1, top - 32, 3, 9).fillRect(e.x - 1, top - 20, 3, 3);
    }
    for (const c of this.bolts.getChildren().slice()) {
      this.dot(c.x, c.y, GREEN, 1.4); c.rotation += 0.3;
      if (hit(c.getBounds(), pb)) { const r = this.hurt(t, c.x); if (r !== 'inv') { this.impact(c.x, c.y, r === 'parry' ? TEAL : GREEN); c.destroy(); } }
    }
    for (const c of this.bullets.getChildren()) this.dot(c.x, c.y, TEAL, 1);
  }

  pb() { const b = this.P.body; return new Rect(b.x, b.y, b.width, b.height); }

  shoot(t, ang) {
    const c = this.cfg, b = this.P.body;
    if (t < this.shotCd || t < this.hurtUntil) return;
    this.shotCd = t + c.cd;
    if (this.bw < c.cost) { this.noBw = t + 300; this.shotCd = t + 200; beep(this, 140, 100, 0.05, 'square', 0.04); return; }
    this.bw -= c.cost; this.gunUntil = t + 300;
    const g = this.gunGeom(ang), a = ang + Phaser.Math.FloatBetween(-c.spread, c.spread), dx = Math.cos(a), dy = Math.sin(a);
    const bl = this.physics.add.sprite(g.mx - dx * 8, g.my - dy * 8, 'bullet').setRotation(a).setDepth(5).setBlendMode(Phaser.BlendModes.ADD); this.bullets.add(bl);
    bl.body.setSize(8, 8).setAllowGravity(false).setVelocity(dx * 950, dy * 950); this.time.delayedCall(c.life, () => bl.active && bl.destroy());
    if (Math.abs(dx) > 0.25) b.velocity.x = -dx * c.recoil; if (Math.abs(dy) > 0.25) b.velocity.y = -dy * c.recoil;
    this.recoilUntil = t + 170; this.jumping = false; this.kick = 4; this.lean = Math.abs(dy) < 0.8 ? -dx * 14 : 0;
    const m = this.add.image(g.mx, g.my, 'flash').setTint({ std: 0xffffff, bay: 0xffb070, pre: 0x7ff0ff }[this.cfgKey]).setOrigin(0, 0.5).setRotation(a).setScale(1.3).setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: m, scaleX: 2, scaleY: 0.5, alpha: 0, duration: 110, onComplete: () => m.destroy() }); this.burst(g.mx, g.my, 0xfff0b0, 4);
    this.cameras.main.shake(60, 0.003); beep(this, 320, 90, 0.08, 'square', 0.06);
  }

  startBash(t, down, face) {
    if (t < this.bashCd || t < this.hurtUntil) return;
    this.bashCd = t + TUNE.bashCdMs; this.bashS = { until: t + TUNE.bashMs, dir: down ? 'd' : 'h', face, hit: new Set(), pogo: false }; this.playAct(down ? 'dbash' : 'bash', 230);
    const sc = KERN.k, pos = () => down ? [this.P.x, this.P.y + 30] : [this.P.x + face * 30, this.P.y - 2];
    const s = this.add.image(...pos(), 'slash').setRotation(down ? Math.PI / 2 : (face > 0 ? 0 : Math.PI)).setScale(0.6 * sc, 0.9 * sc).setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: s, scaleX: 1.15 * sc, scaleY: 1.05 * sc, alpha: 0, duration: TUNE.bashMs + 90, ease: 'Cubic.easeOut', onUpdate: () => s.setPosition(...pos()), onComplete: () => s.destroy() });
    beep(this, 200, 70, 0.1, 'sawtooth', 0.06);
  }

  pogo(B) {
    B.pogo = true; this.playAct('rebound', 420); this.P.body.velocity.y = -this.cfg.pogo; this.jumping = false; this.recoilUntil = 0; this.bashCd = Math.min(this.bashCd, this.now + 120);
    this.ring(this.P.x, this.P.y + 24, TEAL, 6, 30, 170); this.burst(this.P.x, this.P.y + 26, TEAL, 8); this.cameras.main.shake(50, 0.003); beep(this, 400, 800, 0.08, 'triangle', 0.06);
  }

  tryParry(t) {
    if (t < this.parryCd || this.bw < TUNE.parryCost) return;
    this.bw -= TUNE.parryCost; this.parryUntil = t + TUNE.parryWindowMs; this.parryCd = t + TUNE.parryCdMs; this.playAct('parry', 280); beep(this, 500, 650, 0.05, 'triangle', 0.04);
  }

  parryOK(t) {
    this.parryCd = 0; this.inv = t + 300; this.barrierFlash = t + 180; const P = this.P;
    this.ring(P.x, P.y, TEAL, 10, 70, 260); this.ring(P.x, P.y, 0xffffff, 6, 44, 200); this.burst(P.x, P.y, TEAL, 14); this.pop(P.x, P.y - 44, 'PARRY', '#2fe0c8'); this.cameras.main.flash(90, 47, 224, 200);
    beep(this, 880, 1760, 0.12, 'triangle', 0.12); this.time.delayedCall(70, () => beep(this, 1320, 2640, 0.14, 'triangle', 0.1)); this.hitstop(70);
  }

  hurt(t, x) {
    if (t < this.inv) return 'inv';
    if (t < this.parryUntil) { this.parryOK(t); return 'parry'; }
    this.hp--; this.inv = t + TUNE.invMs; this.hurtUntil = t + 220; this.playAct('dmg', 350); beep(this, 140, 50, 0.15, 'sawtooth', 0.09);
    this.P.body.setVelocity((Math.sign(this.P.x - x) || 1) * 280, -300); this.cameras.main.shake(140, 0.007);
    if (this.hp <= 0) this.die();
    return 'hit';
  }

  hazard(t) {
    if (t >= this.inv) { this.hp--; this.cameras.main.shake(140, 0.007); beep(this, 140, 50, 0.15, 'sawtooth', 0.09); }
    this.inv = t + TUNE.invMs; this.P.setPosition(this.safe.x, this.safe.y).body.setVelocity(0, 0); if (this.hp <= 0) this.die();
  }

  saveCheckpoint() {
    this.cp = true; this.registry.set('snap', { bw: this.bw, hp: this.hp, x: this.cpx, y: GY - 26, picked: [...this.picked], killed: [...this.killed] }); // exact state at activation; permanent loadout lives in registry 'cfg'
    this.cpGlow.setTint(TEAL); this.ring(this.cpx, GY - 30, TEAL, 8, 70, 400); this.pop(this.cpx, GY - 90, 'CHECKPOINT: STATE SAVED', '#2fe0c8'); beep(this, 500, 1500, 0.25, 'triangle', 0.1);
  }

  die() {
    this.dead = true; this.playAct('ko', 99999); this.P.body.setVelocity(0, 0); this.pop(this.P.x, this.P.y - 40, this.cp ? 'REWINDING TO CHECKPOINT' : 'REWINDING', '#ff8a3d');
    this.cameras.main.fade(600, 0, 0, 0); this.time.delayedCall(650, () => this.scene.restart());
  }

  win() {
    if (this.won) return; this.won = true; this.P.body.setVelocity(0, 0); beep(this, 500, 1500, 0.4, 'triangle', 0.1);
    const s = { fontFamily: 'monospace', color: '#2fe0c8' }; this.add.text(480, 190, 'EXPEDITION COMPLETE', { ...s, fontSize: '34px', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
    this.add.text(480, 240, 'press any key or tap to return to the board', { ...s, fontSize: '14px' }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
    this.time.delayedCall(1200, () => { const go = () => { this.registry.set('snap', null); this.cameras.main.fadeOut(400); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Title')); }; this.input.keyboard.once('keydown', go); this.input.once('pointerdown', go); });
  }

  dmg(e, n, dir, stun) {
    if (!e.active) return; const t = this.now;
    if (e.type === 'g' && t >= e.stun) { this.ring(e.x, e.y, 0x9fb4c8, 6, 28, 140); beep(this, 900, 700, 0.05, 'square', 0.05); if (t > (e.popT || 0)) { e.popT = t + 800; this.pop(e.x, e.y - 40, 'ARMORED: parry it!', '#9fb4c8'); } return; }
    e.hp -= n; if (e.type !== 't') e.body.setVelocityX(dir * 180); this.ring(e.x, e.y, 0xffffff, 6, 26, 140); this.impact(e.x, e.y, 0xffffff); if (stun > 0) this.hitstop(55); beep(this, 220, 90, 0.07, 'sawtooth', 0.06);
    if (stun >= 600 && e.st === 'wind') { e.st = 'rec'; e.until = t + stun; }
    e.stun = Math.max(e.stun, t + stun);
    if (e.hp <= 0) { this.killed.add(e.id); this.ring(e.x, e.y, GREEN, 8, 54, 300); this.burst(e.x, e.y, GREEN, 14); this.hitstop(90); e.destroy(); }
  }

  bolt(e) { // Shard burst: 3 bolts fanned around the player
    const a0 = Math.atan2(this.P.y - e.y, this.P.x - e.x);
    for (const off of [-0.22, 0, 0.22]) {
      const a = a0 + off, c = this.physics.add.sprite(e.x, e.y, 'bolt').setTint(GREEN).setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
      this.bolts.add(c); c.body.setSize(12, 12).setAllowGravity(false).setVelocity(Math.cos(a) * TUNE.boltSpeed, Math.sin(a) * TUNE.boltSpeed); this.time.delayedCall(4000, () => c.active && c.destroy());
    }
  }

  ai(e, t) {
    const P = this.P, dx = P.x - e.x, ad = Math.abs(dx), s = Math.sign(dx) || 1, b = e.body, near = Math.abs(P.y - e.y) < 110, g = e.type === 'g';
    if (t < e.stun) { e.setTintFill(0x8aa0ff); if (e.type !== 't') b.velocity.x *= 0.9; return; }
    e.clearTint();
    if (e.type === 't') {
      b.setVelocityY(Math.cos(t / 450) * 22); // Shards hover
      if (e.st === 'patrol') { if (ad < 560 && Math.abs(P.y - e.y) < 300) { e.st = 'wind'; e.until = t + 650; } }
      else if (e.st === 'wind') { e.setTintFill(Math.floor(t / 90) % 2 ? 0xffffff : 0xff4444); if (t > e.until) { this.bolt(e); e.st = 'rec'; e.until = t + 1700; } }
      else if (t > e.until) e.st = 'patrol';
      return;
    }
    const mv = v => b.setVelocityX(v);
    if (e.st === 'patrol') { mv(e.dir * 55); if (e.x > e.max) e.dir = -1; else if (e.x < e.min) e.dir = 1; e.setFlipX(e.dir < 0); if (ad < 320 && near) e.st = 'chase'; }
    else if (e.st === 'chase') {
      const lim = (s > 0 && e.x >= e.max) || (s < 0 && e.x <= e.min); mv(lim ? 0 : s * (g ? 85 : 115)); e.setFlipX(s < 0);
      if (ad < 120) { e.st = 'wind'; e.until = t + (g ? 700 : 520); e.face = s; mv(0); } else if (ad > 480 || !near) e.st = 'patrol';
    }
    else if (e.st === 'wind') { e.setTintFill(Math.floor(t / 90) % 2 ? 0xffffff : 0xff4444); if (t > e.until) { e.st = 'atk'; e.until = t + 300; mv(e.face * TUNE.lungeSpeed * (g ? 0.9 : 1)); } }
    else if (e.st === 'atk') {
      if (t > e.until) { e.st = 'rec'; e.until = t + 650; mv(0); }
      else if (hit(new Rect(e.body.x, e.body.y, e.body.width, e.body.height), this.pb()) && this.hurt(t, e.x) === 'parry') { e.st = 'rec'; e.until = t + (g ? 1900 : 1000); e.stun = t + (g ? 1800 : 800); mv(0); }
    }
    else { mv(0); if (t > e.until) e.st = 'chase'; }
  }

  playAct(k, ms, soft) { if (soft && this.act && this.now < this.act.until) return; this.act = { k, until: this.now + ms }; this.vis.anims.play(k, false); }

  dot(x, y, col, sc = 1) {
    const d = this.add.image(x, y, 'dot').setTint(col).setScale(sc * 1.5).setAlpha(0.8).setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: d, alpha: 0, scale: 0, duration: 160, onComplete: () => d.destroy() });
  }

  burst(x, y, col, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, d = 14 + Math.random() * 30, p = this.add.image(x, y, 'dot').setTint(col).setDepth(6).setBlendMode(Phaser.BlendModes.ADD).setRotation(a);
      this.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scaleX: 2.5, scaleY: 0.5, duration: 240, onComplete: () => p.destroy() });
    }
  }

  impact(x, y, col) {
    const s = this.add.image(x, y, 'spark').setTint(col).setDepth(6).setBlendMode(Phaser.BlendModes.ADD).setRotation(Math.random() * 3);
    this.tweens.add({ targets: s, scale: 1.8, alpha: 0, rotation: s.rotation + 0.6, duration: 160, onComplete: () => s.destroy() }); this.burst(x, y, col, 5);
  }

  dust(x, y, n) {
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x + (Math.random() - 0.5) * 14, y, 'dot').setTint(0x6c8590).setAlpha(0.6).setDepth(3);
      this.tweens.add({ targets: p, x: p.x + (Math.random() - 0.5) * 40, y: y - 4 - Math.random() * 10, alpha: 0, scale: 2.5, duration: 320, onComplete: () => p.destroy() });
    }
  }

  hitstop(ms) { if (this.menu || this.stopped) return; this.stopped = true; this.physics.pause(); this.time.delayedCall(ms, () => { this.stopped = false; if (!this.menu) this.physics.resume(); }); }

  pop(x, y, s, c) {
    const o = this.add.text(x, y, s, { fontFamily: 'monospace', fontSize: '12px', color: c }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: o, y: y - 30, alpha: 0, duration: 900, onComplete: () => o.destroy() });
  }

  ring(x, y, col, r0, r1, ms) {
    const c = this.add.circle(x, y, r0).setStrokeStyle(2, col).setDepth(6);
    this.tweens.add({ targets: c, scale: r1 / r0, alpha: 0, duration: ms, onComplete: () => c.destroy() });
  }

  showMenu() {
    const ks = Object.keys(CONFIGS);
    this.menuT.setText(['LAST WORDS // WORKBENCH', '', ...ks.map((k, i) => (k === this.cfgKey ? '> ' : '  ') + '[' + (i + 1) + '] ' + CONFIGS[k].name.padEnd(10) + CONFIGS[k].desc), '', '[' + KEYS.interact[0] + '] or [ESC] close. Choice persists through death.'].join('\n')).setVisible(true);
  }

  menuInput(close, nums) {
    const ks = Object.keys(CONFIGS);
    nums.forEach((d, i) => { if (!d) return; this.cfgKey = ks[i]; this.cfg = CONFIGS[ks[i]]; this.registry.set('cfg', ks[i]); this.bw = Math.min(this.bw, this.cfg.maxBW); this.gunS.setTexture('lw_' + ks[i]); this.showMenu(); });
    if (close) { this.menu = false; this.menuT.setVisible(false); this.physics.resume(); }
  }
}

new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: 960, height: 540, backgroundColor: '#0a0e13', pixelArt: true,
  physics: { default: 'arcade', arcade: { gravity: { y: TUNE.gravity }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Title, Controls, Main],
});
