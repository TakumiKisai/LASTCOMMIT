// LAST COMMIT gameplay prototype (Phaser 3). Tunables: TUNE, CONFIGS, KEYS.
const TUNE = {
  gravity: 1200, walk: 250, run: 430, accelGround: 3200, accelAir: 1500,
  jump: 470, jumpCut: 0.45, coyoteMs: 90, bufferMs: 100, maxVel: 720,
  hp: 5, invMs: 1000, enemyHp: 3, lungeSpeed: 380, boltSpeed: 260,
  bashCdMs: 320, bashMs: 110,
  parryWindowMs: 150, parryCdMs: 550, parryCost: 0,
  bwRegenGrounded: 10,
};
const KEYS = { left: ['A', 'LEFT'], right: ['D', 'RIGHT'], up: ['W', 'UP'], down: ['S', 'DOWN'], jump: ['SPACE'], bash: ['K'], parry: ['L'], run: ['SHIFT'], interact: ['E'], restart: ['R'] };
const CONFIGS = {
  std: { name: 'STANDARD', maxBW: 100, cost: 20, cd: 220, spread: 0.05, recoil: 430, shotDmg: 1, bashDmg: 1, pogo: 520, stagger: 150, life: 700, desc: 'balanced' },
  bay: { name: 'BAYONET', maxBW: 70, cost: 28, cd: 240, spread: 0.2, recoil: 430, shotDmg: 1, bashDmg: 2, pogo: 640, stagger: 300, life: 500, desc: '2x Bash dmg, huge pogo | wild spread, 70 BW cap' },
  pre: { name: 'PRECISION', maxBW: 100, cost: 25, cd: 480, spread: 0, recoil: 540, shotDmg: 2, bashDmg: 0.6, pogo: 480, stagger: 1200, life: 1400, desc: 'exact 2-dmg shots | weak Bash that stuns | slow fire' },
};
const TEAL = 0x2fe0c8, MID = 0x1d2631, ORG = 0xff8a3d;
const Rect = Phaser.Geom.Rectangle;
const hit = (a, b) => Phaser.Geom.Intersects.RectangleToRectangle(a, b);

class Main extends Phaser.Scene {
  constructor() { super('main'); }

  create() {
    const cam = this.cameras.main, W = 2800, H = 720, kb = this.input.keyboard;
    this.cfgKey = this.registry.get('cfg') || 'std'; this.cfg = CONFIGS[this.cfgKey];
    Object.assign(this, { bw: this.cfg.maxBW, hp: TUNE.hp, now: 0, inv: 0, hurtUntil: 0, recoilUntil: 0, shotCd: 0, bashCd: 0, parryUntil: 0, parryCd: 0,
      coyote: 0, jbuf: 0, jumping: false, curMax: TUNE.walk, gT: 0, safe: { x: 120, y: 560 }, bashS: null, dead: false, menu: false, wantBash: false, noBw: 0, stopped: false, kick: 0, wasG: false, lastVy: 0 });
    this.physics.world.setBounds(0, 0, W, 1200);
    cam.setBounds(0, 0, W, H).setBackgroundColor('#0a0e13');
    this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', p => { if (p.rightButtonDown()) this.wantBash = true; });
    this.k = {}; for (const n in KEYS) this.k[n] = KEYS[n].map(c => kb.addKey(c));
    this.numK = ['ONE', 'TWO', 'THREE'].map(c => kb.addKey(c)); this.escK = kb.addKey('ESC');
    this.tex(); this.level(); this.spawn(); this.makeHud();
    cam.startFollow(this.P, true, 0.12, 0.12); cam.setFollowOffset(0, 30); cam.fadeIn(300);
  }

  tex() {
    const mk = (k, w, h, f) => { if (this.textures.exists(k)) return; const g = this.add.graphics(); f(g); g.generateTexture(k, w, h); g.destroy(); };
    mk('kern', 18, 32, g => {
      g.fillStyle(0x0b0b10).fillRect(0, 5, 18, 2).fillRect(3, 0, 12, 6); g.fillStyle(TEAL).fillRect(3, 4, 12, 1);
      g.fillStyle(MID).fillRect(3, 7, 12, 10).lineStyle(1, TEAL).strokeRect(3.5, 7.5, 11, 9);
      g.fillStyle(0x2a3644).fillRect(2, 17, 14, 15).fillStyle(TEAL).fillRect(8, 20, 2, 5).fillStyle(0x0b0b10).fillRect(3, 28, 5, 4).fillRect(10, 28, 5, 4);
    });
    const gun = (k, f) => mk(k, 42, 10, g => {
      g.fillStyle(0x59636f).fillRect(8, 2, 28, 3).fillStyle(0x8e99a6).fillRect(8, 2, 28, 1).fillStyle(0x262c34).fillRect(1, 3, 12, 5).fillRect(1, 6, 5, 4).fillStyle(TEAL).fillRect(14, 3, 12, 1);
      if (f) f(g);
    });
    gun('gun_std'); gun('gun_bay', g => g.fillStyle(0xdce9ee).fillTriangle(22, 5, 40, 5, 22, 9));
    gun('gun_pre', g => g.fillStyle(0x262c34).fillRect(14, 0, 14, 2).fillStyle(TEAL).fillRect(27, 0, 2, 2));
    mk('enemy', 22, 26, g => { g.fillStyle(0x3a1f14).fillRect(0, 0, 22, 26).fillStyle(ORG).fillRect(2, 2, 18, 22).fillStyle(0xffe9c0).fillRect(5, 7, 5, 5).fillRect(13, 7, 5, 5); });
    mk('turret', 24, 20, g => { g.fillStyle(0x3a1f14).fillRect(0, 0, 24, 20).fillStyle(ORG).fillRect(2, 2, 20, 12).fillStyle(0xffe9c0).fillRect(9, 5, 6, 6); });
    mk('spike', 16, 12, g => { g.fillStyle(0xff5a4a).fillTriangle(0, 12, 8, 0, 16, 12); }); this.tex2();
  }

  tex2() {
    const mk = (k, w, h, f) => { if (this.textures.exists(k)) return; const g = this.add.graphics(); f(g); g.generateTexture(k, w, h); g.destroy(); };
    const ker = (k, bob, l, r) => mk(k, 18, 32, g => {
      g.fillStyle(0x0b0b10).fillRect(0, 5 + bob, 18, 2).fillRect(3, bob, 12, 6); g.fillStyle(TEAL).fillRect(3, 4 + bob, 12, 1);
      g.fillStyle(MID).fillRect(3, 7 + bob, 12, 10).lineStyle(1, TEAL).strokeRect(3.5, 7.5 + bob, 11, 9);
      g.fillStyle(0x2a3644).fillRect(2, 17 + bob, 14, 10).fillStyle(TEAL).fillRect(8, 19 + bob, 2, 5);
      g.fillStyle(0x0b0b10).fillRect(l[0], l[1], 5, l[2]).fillRect(r[0], r[1], 5, r[2]);
      g.fillStyle(TEAL).fillRect(l[0], l[1] + l[2] - 1, 5, 1).fillRect(r[0], r[1] + r[2] - 1, 5, 1);
    });
    ker('k_i0', 0, [3, 27, 5], [10, 27, 5]); ker('k_i1', 1, [3, 28, 4], [10, 28, 4]);
    ker('k_r0', 0, [0, 27, 5], [11, 26, 4]); ker('k_r1', 1, [4, 28, 4], [9, 28, 4]); ker('k_r2', 0, [11, 26, 4], [2, 27, 5]);
    ker('k_j', 0, [3, 26, 4], [10, 25, 4]); ker('k_f', 0, [0, 27, 5], [13, 27, 5]);
    const an = (key, fr, rate) => { if (!this.anims.exists(key)) this.anims.create({ key, frames: fr.map(k => ({ key: k })), frameRate: rate, repeat: -1 }); };
    an('idle', ['k_i0', 'k_i1'], 2); an('run', ['k_r0', 'k_r1', 'k_r2', 'k_r1'], 11); an('jump', ['k_j'], 1); an('fall', ['k_f'], 1);
    const cres = (g, R, W, col, al) => {
      const pts = [];
      for (let i = 0; i <= 14; i++) { const a = (i / 7 - 1) * 0.75; pts.push({ x: 4 + R * Math.cos(a), y: 36 + R * Math.sin(a) }); }
      for (let i = 14; i >= 0; i--) { const u = i / 7 - 1, a = u * 0.75, r = R - W * (1 - u * u); pts.push({ x: 4 + r * Math.cos(a), y: 36 + r * Math.sin(a) }); }
      g.fillStyle(col, al).fillPoints(pts, true);
    };
    mk('slash', 60, 72, g => { cres(g, 44, 24, TEAL, 0.5); cres(g, 44, 16, 0xaafff0, 0.85); cres(g, 44, 8, 0xffffff, 1); });
    mk('bullet', 30, 8, g => { g.fillStyle(TEAL, 0.25).fillRect(0, 3, 22, 2).fillStyle(TEAL, 0.6).fillRect(8, 2, 16, 4).fillStyle(0xdcfff8).fillRect(16, 3, 12, 2).fillStyle(0xffffff).fillRect(24, 2, 4, 4); });
    mk('bolt', 20, 20, g => { g.fillStyle(ORG, 0.25).fillCircle(10, 10, 10).fillStyle(ORG, 0.7).fillCircle(10, 10, 6).fillStyle(0xffe9c0).fillCircle(10, 10, 3); });
    mk('spark', 24, 24, g => { g.fillStyle(0xffffff).fillTriangle(12, 0, 15, 12, 9, 12).fillTriangle(12, 24, 15, 12, 9, 12).fillTriangle(0, 12, 12, 9, 12, 15).fillTriangle(24, 12, 12, 9, 12, 15); });
    mk('flash', 28, 16, g => { g.fillStyle(TEAL, 0.5).fillTriangle(0, 8, 28, 0, 28, 16).fillStyle(0xfff0b0).fillTriangle(0, 8, 22, 4, 22, 12).fillStyle(0xffffff).fillTriangle(0, 8, 12, 6, 12, 10); });
    mk('dot', 4, 4, g => { g.fillStyle(0xffffff).fillRect(0, 0, 4, 4); });
    mk('panel', 32, 32, g => { g.fillStyle(0x18212b).fillRect(0, 0, 32, 32).lineStyle(1, 0x253544).strokeRect(0.5, 0.5, 31, 31).fillStyle(0x2c4151).fillRect(3, 3, 2, 2).fillRect(27, 3, 2, 2).fillRect(3, 27, 2, 2).fillRect(27, 27, 2, 2).fillStyle(0x10171e).fillRect(8, 14, 16, 4); });
    mk('sky', 480, 540, g => {
      let x = 0;
      while (x < 480) {
        const w = Math.min(Phaser.Math.Between(30, 70), 480 - x), h = Phaser.Math.Between(120, 360);
        g.fillStyle(0x0d151c).fillRect(x, 540 - h, w, h); g.fillStyle(0x16323a);
        for (let y = 540 - h + 10; y < 520; y += 14) for (let wx = x + 5; wx < x + w - 6; wx += 9) if (Math.random() < 0.18) g.fillRect(wx, y, 3, 5);
        x += w + Phaser.Math.Between(0, 8);
      }
    });
    mk('e2', 22, 26, g => { g.fillStyle(0x2a1710).fillRect(1, 4, 20, 22).fillRect(4, 0, 4, 6).fillRect(14, 0, 4, 6).fillStyle(0xc9622c).fillRect(2, 5, 18, 19).fillStyle(ORG).fillRect(2, 5, 18, 3).fillStyle(0x1a0d08).fillRect(4, 10, 14, 7).fillStyle(0xffe9c0).fillRect(6, 12, 4, 3).fillRect(12, 12, 4, 3).fillStyle(0x1a0d08).fillRect(4, 22, 5, 4).fillRect(13, 22, 5, 4); });
    mk('t2', 24, 20, g => { g.fillStyle(0x2a1710).fillRect(0, 8, 24, 12).fillStyle(0xc9622c).fillRect(2, 10, 20, 8).fillStyle(0x2a1710).fillRect(4, 0, 16, 11).fillStyle(0xc9622c).fillRect(6, 2, 12, 7).fillStyle(0xffe9c0).fillRect(9, 4, 6, 3).fillStyle(ORG).fillRect(10, 12, 4, 2); });
  }

  level() {
    const add = this.add, txt = (x, y, s, c = '#4a7f86') => add.text(x, y, s, { fontFamily: 'monospace', fontSize: '12px', color: c }).setDepth(1);
    for (let i = 0; i < 70; i++) add.text(Phaser.Math.Between(0, 1700), Phaser.Math.Between(0, 560), Phaser.Math.RND.pick(['0', '1', '01', '$', '//', '10']), { fontFamily: 'monospace', fontSize: '14px', color: '#12303a' }).setScrollFactor(0.35).setDepth(-5);
    this.sky = add.tileSprite(0, 0, 960, 540, 'sky').setOrigin(0).setScrollFactor(0).setDepth(-10); this.solids = this.physics.add.staticGroup(); this.sr = []; this.spikes = []; this.enemies = this.physics.add.group(); this.fruits = [];
    const plat = (x, y, w, h) => { this.solids.add(add.rectangle(x + w / 2, y + h / 2, w, h, MID).setVisible(false)); add.tileSprite(x + w / 2, y + h / 2, w, h, 'panel'); add.rectangle(x + w / 2, y + 1, w, 3, TEAL, 0.9); add.rectangle(x + w / 2, y + 7, w, 10, TEAL, 0.1).setBlendMode(Phaser.BlendModes.ADD); this.sr.push(new Rect(x, y, w, h)); };
    const spk = (x, y, w) => { add.tileSprite(x + w / 2, y + 6, w, 12, 'spike'); this.spikes.push(new Rect(x + 2, y + 3, w - 4, 9)); };
    plat(0, 600, 760, 200); plat(900, 600, 500, 200); plat(1700, 600, 600, 200); plat(2400, 600, 400, 200); plat(1540, 250, 240, 16);
    spk(760, 700, 140); spk(1400, 650, 300); spk(2300, 700, 100); spk(1840, 515, 40); spk(1800, 430, 40); spk(1800, 345, 40);
    this.zone = [900, 2300]; [[900, 500], [1700, 600]].forEach(([x, w]) => add.rectangle(x + w / 2, 598, w, 3, TEAL, 0.35));
    this.benchX = 300; add.rectangle(300, 589, 38, 22, 0x10161d).setStrokeStyle(2, TEAL);
    txt(24, 540, 'SIDEQUEST: test lobby'); txt(250, 555, 'WORKBENCH', '#2fe0c8'); txt(920, 560, 'RUN ZONE: hold SHIFT >>>>>>>>', '#2fe0c8');
    txt(1420, 560, 'bash DOWN on spikes = pogo'); txt(1860, 560, 'pogo nodes lead up to a secret');
    [[560, 'FLUXELLE', 40, 0xff6fa8], [1250, 'FLUXXIE', 50, 0xffd84a], [2100, 'FLUXELLE', 40, 0xff6fa8], [2650, 'FLUXXIE', 50, 0xffd84a], [1650, 'FLUXEAR', 100, 0x7dff8a]]
      .forEach(([x, n, bw, c]) => { const o = add.circle(x, x === 1650 ? 230 : 584, 7, c).setStrokeStyle(2, 0xffffff); o.n = n; o.bw = bw; this.tweens.add({ targets: o, y: o.y - 5, yoyo: true, repeat: -1, duration: 600 }); this.fruits.push(o); });
    const en = (type, x, y, min, max) => {
      const e = this.physics.add.sprite(x, y, type === 't' ? 't2' : 'e2'); e.type = type; e.hp = e.mhp = TUNE.enemyHp;
      Object.assign(e, { st: 'patrol', dir: 1, min, max, until: 0, stun: 0, face: 1 }); this.enemies.add(e); if (type === 't') e.body.setImmovable(true); e.setDepth(3);
    };
    en('l', 1050, 570, 960, 1280); en('l', 1900, 570, 1760, 2250); en('t', 2260, 585); en('l', 2580, 570, 2450, 2740);
  }

  spawn() {
    const P = this.P = this.physics.add.sprite(120, 560, 'k_i0').setDepth(4);
    P.body.setSize(14, 30).setOffset(2, 2).setMaxVelocity(TUNE.maxVel, 900); P.setCollideWorldBounds(true);
    this.head = this.add.text(0, 0, '$', { fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#2fe0c8' }).setOrigin(0.5).setDepth(5);
    this.gunS = this.add.sprite(0, 0, 'gun_' + this.cfgKey).setOrigin(0.1, 0.5).setDepth(5);
    this.fx = this.add.graphics().setDepth(6); this.eg = this.add.graphics().setDepth(7);
    this.bullets = this.physics.add.group({ allowGravity: false }); this.bolts = this.physics.add.group({ allowGravity: false });
    const ph = this.physics.add;
    ph.collider(P, this.solids); ph.collider(this.enemies, this.solids);
    ph.collider(this.bullets, this.solids, b => { this.impact(b.x, b.y, TEAL); b.destroy(); }); ph.collider(this.bolts, this.solids, b => { this.impact(b.x, b.y, ORG); b.destroy(); });
    ph.overlap(this.bullets, this.enemies, (b, e) => { this.impact(b.x, b.y, TEAL); this.dmg(e, this.cfg.shotDmg, Math.sign(b.body.velocity.x), 0); b.destroy(); });
  }

  makeHud() {
    const T = (x, y, s, c = '#9fe8dc', sz = '12px') => this.add.text(x, y, s, { fontFamily: 'monospace', fontSize: sz, color: c }).setScrollFactor(0).setDepth(100);
    const R = (x, y, w, h, c, a = 1) => this.add.rectangle(x, y, w, h, c, a).setOrigin(0).setScrollFactor(0).setDepth(100);
    T(20, 12, 'BANDWIDTH'); R(20, 28, 164, 14, 0x000000, 0.7); this.bar = R(22, 30, 160, 10, TEAL);
    this.hpT = T(20, 48, ''); this.cfgT = T(20, 66, '');
    T(14, 516, 'A/D move  SPACE jump  SHIFT run (RUN ZONE)  MOUSE aim  LMB shoot  RMB/K bash  S+bash in air = pogo  L parry  E bench  R reset', '#5f8f94', '11px');
    this.prompt = T(480, 470, '', '#ffffff').setOrigin(0.5);
    this.menuT = T(150, 110, '', '#ffffff', '14px').setBackgroundColor('rgba(5,10,14,0.92)').setPadding(18).setDepth(101).setVisible(false);
  }

  hud(t) {
    const c = this.cfg;
    this.bar.width = 160 * Math.max(0, this.bw) / 100; this.bar.setFillStyle(t < this.noBw ? 0xff4444 : TEAL);
    this.hpT.setText('HP ' + '\u25A0'.repeat(Math.max(0, this.hp)));
    this.cfgT.setText('LAST WORDS: ' + c.name + '   parry: ' + (t < this.parryCd ? 'recovering' : 'ready'));
  }

  update(time, delta) {
    const t = this.now = time, dt = delta / 1000, P = this.P, b = P.body, cam = this.cameras.main, K = this.k;
    const dn = n => K[n].some(k => k.isDown), JD = Phaser.Input.Keyboard.JustDown;
    const J = {}; for (const n of ['jump', 'bash', 'parry', 'interact', 'restart']) J[n] = K[n].map(k => JD(k)).some(v => v);
    const esc = JD(this.escK), nums = this.numK.map(k => JD(k));
    this.hud(t); this.sky.tilePositionX = cam.scrollX * 0.2; this.sky.tilePositionY = cam.scrollY * 0.1;
    if (J.restart) return this.scene.restart();
    if (this.menu) { this.menuInput(J.interact || esc, nums); return; }
    if (this.dead) return;

    const grounded = b.blocked.down, ptr = this.input.activePointer; ptr.updateWorldPoint(cam);
    if (grounded && !this.wasG && this.lastVy > 260) this.dust(P.x, P.y + 15, 7); this.wasG = grounded; this.lastVy = b.velocity.y;
    const ay = P.y + 4, ang = Math.atan2(ptr.worldY - ay, ptr.worldX - P.x), left = Math.abs(ang) > Math.PI / 2;
    this.gT = grounded ? this.gT + delta : 0; if (this.gT > 350) this.safe = { x: P.x, y: P.y };
    if (grounded) { this.coyote = t + TUNE.coyoteMs; if (b.velocity.y >= 0) this.jumping = false; this.bw = Math.min(this.cfg.maxBW, this.bw + TUNE.bwRegenGrounded * dt); }

    // movement
    const inZone = P.x > this.zone[0] && P.x < this.zone[1];
    if (grounded) this.curMax = (inZone && dn('run')) ? TUNE.run : TUNE.walk;
    const ax = (dn('right') ? 1 : 0) - (dn('left') ? 1 : 0);
    if (t > this.recoilUntil && t > this.hurtUntil) {
      const tg = ax * this.curMax, v = b.velocity.x;
      const a = (grounded ? TUNE.accelGround : (Math.abs(v) > this.curMax && Math.sign(v) === ax ? 450 : TUNE.accelAir)) * dt;
      b.setVelocityX(v < tg ? Math.min(v + a, tg) : Math.max(v - a, tg));
    }
    if (J.jump) this.jbuf = t + TUNE.bufferMs;
    if (t < this.jbuf && t < this.coyote && t > this.hurtUntil) { b.setVelocityY(-TUNE.jump); this.jbuf = this.coyote = 0; this.jumping = true; if (grounded) this.dust(P.x, P.y + 15, 4); }
    if (this.jumping && !dn('jump') && b.velocity.y < 0) { b.setVelocityY(b.velocity.y * TUNE.jumpCut); this.jumping = false; }

    // actions
    const face = ax || (left ? -1 : 1);
    if (ptr.leftButtonDown()) this.shoot(t, P.x, ay, ang);
    if (J.bash || this.wantBash) { this.wantBash = false; this.startBash(t, dn('down') && !grounded, face); }
    if (J.parry) this.tryParry(t);
    const near = Math.abs(P.x - this.benchX) < 45 && grounded;
    this.prompt.setText(near ? '[E] LAST WORDS workbench' : '');
    if (near && J.interact) { this.menu = true; this.physics.pause(); this.showMenu(); }

    // bash hitbox, visuals
    const f = this.fx.clear(), B = this.bashS;
    if (B && t < B.until) {
      const dd = B.dir === 'd', r = dd ? new Rect(P.x - 17, P.y + 8, 34, 44) : new Rect(P.x + (B.face > 0 ? 4 : -48), P.y - 14, 44, 30), c = this.cfg;
      for (const e of this.enemies.getChildren().slice()) {
        if (!B.hit.has(e) && hit(r, e.getBounds())) { B.hit.add(e); this.dmg(e, c.bashDmg, B.face, c.stagger); if (dd && !B.pogo) this.pogo(B); }
      }
      if (dd && !B.pogo) for (const s of this.sr.concat(this.spikes)) if (hit(r, s)) { this.pogo(B); break; }
    }
    if (t < this.parryUntil) f.lineStyle(3, TEAL, 0.9).strokeCircle(P.x, P.y, 26);
    if (t < this.recoilUntil) { const g = this.add.image(P.x, P.y, P.texture.key).setTint(TEAL).setAlpha(0.45).setFlipX(P.flipX).setBlendMode(Phaser.BlendModes.ADD).setDepth(3); this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() }); }

    const bsw = B && t < B.until, wl = bsw && B.dir === 'h' ? B.face < 0 : left;
    const an = grounded ? (Math.abs(b.velocity.x) > 30 && ax ? 'run' : 'idle') : (b.velocity.y < 0 ? 'jump' : 'fall');
    P.anims.play(an, true); P.anims.timeScale = an === 'run' ? Phaser.Math.Clamp(Math.abs(b.velocity.x) / TUNE.walk, 0.6, 1.6) : 1;
    P.setFlipX(wl).setAlpha(t < this.inv && Math.floor(t / 80) % 2 ? 0.4 : 1);
    const bob = P.texture.key === 'k_i1' || P.texture.key === 'k_r1' ? 1 : 0;
    let ga = ang, gl = left; this.kick = Math.max(0, this.kick - 50 * dt);
    if (bsw) { const k = 1 - (B.until - t) / TUNE.bashMs; if (B.dir === 'd') { ga = Math.PI / 2; gl = false; } else { ga = B.face > 0 ? -1.1 + 2 * k : Math.PI + 1.1 - 2 * k; gl = B.face < 0; } }
    this.head.setPosition(P.x, P.y - 4 + bob); this.gunS.setPosition(P.x - Math.cos(ga) * this.kick, ay + bob - Math.sin(ga) * this.kick).setRotation(ga).setFlipY(gl);

    // world interactions
    const pb = this.pb();
    if (P.y > 800 || this.spikes.some(s => hit(s, pb))) this.hazard(t);
    this.fruits = this.fruits.filter(o => {
      if (Math.hypot(o.x - P.x, o.y - P.y) > 22) return true;
      this.bw = Math.min(this.cfg.maxBW, this.bw + o.bw); this.pop(o.x, o.y - 10, o.n + ' +' + o.bw + ' BW', '#7dffd8'); o.destroy(); return false;
    });
    this.eg.clear();
    for (const e of this.enemies.getChildren().slice()) {
      this.ai(e, t);
      if (e.hp < e.mhp) this.eg.fillStyle(0x000000).fillRect(e.x - 12, e.y - 22, 24, 4).fillStyle(ORG).fillRect(e.x - 11, e.y - 21, 22 * e.hp / e.mhp, 2);
      if (e.st === 'wind') this.eg.fillStyle(0xff4444).fillRect(e.x - 1, e.y - 38, 3, 9).fillRect(e.x - 1, e.y - 26, 3, 3);
    }
    for (const c of this.bolts.getChildren().slice()) {
      this.dot(c.x, c.y, ORG, 1.4); c.rotation += 0.3;
      if (hit(c.getBounds(), pb)) { const r = this.hurt(t, c.x); if (r !== 'inv') { this.impact(c.x, c.y, r === 'parry' ? TEAL : ORG); c.destroy(); } }
    }
    for (const c of this.bullets.getChildren()) this.dot(c.x, c.y, TEAL, 1);
  }

  pb() { const b = this.P.body; return new Rect(b.x, b.y, b.width, b.height); }

  shoot(t, x, y, ang) {
    const c = this.cfg, b = this.P.body;
    if (t < this.shotCd || t < this.hurtUntil) return;
    this.shotCd = t + c.cd;
    if (this.bw < c.cost) { this.noBw = t + 300; this.shotCd = t + 200; return; }
    this.bw -= c.cost;
    const a = ang + Phaser.Math.FloatBetween(-c.spread, c.spread), dx = Math.cos(a), dy = Math.sin(a), mx = x + dx * 34, my = y + dy * 34;
    const bl = this.physics.add.sprite(mx - dx * 6, my - dy * 6, 'bullet').setRotation(a).setDepth(5).setBlendMode(Phaser.BlendModes.ADD); this.bullets.add(bl);
    bl.body.setSize(8, 8).setAllowGravity(false).setVelocity(dx * 950, dy * 950);
    this.time.delayedCall(c.life, () => bl.active && bl.destroy());
    if (Math.abs(dx) > 0.25) b.velocity.x = -dx * c.recoil;
    if (Math.abs(dy) > 0.25) b.velocity.y = -dy * c.recoil;
    this.recoilUntil = t + 170; this.jumping = false; this.kick = 7;
    const m = this.add.image(mx, my, 'flash').setOrigin(0, 0.5).setRotation(a).setDepth(6).setBlendMode(Phaser.BlendModes.ADD); this.tweens.add({ targets: m, scaleX: 1.6, scaleY: 0.4, alpha: 0, duration: 110, onComplete: () => m.destroy() }); this.burst(mx, my, 0xfff0b0, 4);
    this.cameras.main.shake(60, 0.003);
  }

  startBash(t, down, face) {
    if (t < this.bashCd || t < this.hurtUntil) return;
    this.bashCd = t + TUNE.bashCdMs; this.bashS = { until: t + TUNE.bashMs, dir: down ? 'd' : 'h', face, hit: new Set(), pogo: false };
    const pos = () => down ? [this.P.x, this.P.y + 20] : [this.P.x + face * 20, this.P.y];
    const s = this.add.image(...pos(), 'slash').setRotation(down ? Math.PI / 2 : (face > 0 ? 0 : Math.PI)).setScale(0.6, 0.9).setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: s, scaleX: 1.15, scaleY: 1.05, alpha: 0, duration: TUNE.bashMs + 90, ease: 'Cubic.easeOut', onUpdate: () => s.setPosition(...pos()), onComplete: () => s.destroy() });
  }

  pogo(B) {
    B.pogo = true; this.P.body.velocity.y = -this.cfg.pogo; this.jumping = false; this.recoilUntil = 0; this.bashCd = Math.min(this.bashCd, this.now + 120);
    this.ring(this.P.x, this.P.y + 16, TEAL, 6, 26, 170); this.burst(this.P.x, this.P.y + 18, TEAL, 8); this.cameras.main.shake(50, 0.003);
  }

  tryParry(t) {
    if (t < this.parryCd || this.bw < TUNE.parryCost) return;
    this.bw -= TUNE.parryCost; this.parryUntil = t + TUNE.parryWindowMs; this.parryCd = t + TUNE.parryCdMs;
  }

  parryOK(t) {
    this.parryCd = 0; this.inv = t + 300; const P = this.P;
    this.ring(P.x, P.y, TEAL, 10, 64, 260); this.ring(P.x, P.y, 0xffffff, 6, 40, 200); this.burst(P.x, P.y, TEAL, 14); this.pop(P.x, P.y - 30, 'PARRY', '#2fe0c8'); this.cameras.main.flash(90, 47, 224, 200);
  }

  hurt(t, x) {
    if (t < this.inv) return 'inv';
    if (t < this.parryUntil) { this.parryOK(t); return 'parry'; }
    this.hp--; this.inv = t + TUNE.invMs; this.hurtUntil = t + 220;
    this.P.body.setVelocity((Math.sign(this.P.x - x) || 1) * 260, -260); this.cameras.main.shake(140, 0.007);
    if (this.hp <= 0) this.die();
    return 'hit';
  }

  hazard(t) {
    if (t >= this.inv) { this.hp--; this.cameras.main.shake(140, 0.007); }
    this.inv = t + TUNE.invMs; this.P.setPosition(this.safe.x, this.safe.y).body.setVelocity(0, 0);
    if (this.hp <= 0) this.die();
  }

  die() {
    this.dead = true; this.P.body.setVelocity(0, 0); this.pop(this.P.x, this.P.y - 30, 'DOWN - respawning', '#ff8a3d');
    this.cameras.main.fade(500, 0, 0, 0); this.time.delayedCall(550, () => this.scene.restart());
  }

  dmg(e, n, dir, stun) {
    if (!e.active) return;
    const t = this.now; e.hp -= n; if (e.type === 'l') e.body.setVelocityX(dir * 180); this.ring(e.x, e.y, 0xffffff, 6, 24, 140); this.impact(e.x, e.y, 0xffffff); if (stun > 0) this.hitstop(55);
    if (stun >= 600 && e.st === 'wind') { e.st = 'rec'; e.until = t + stun; }
    e.stun = Math.max(e.stun, t + stun);
    if (e.hp <= 0) { this.ring(e.x, e.y, ORG, 8, 50, 300); this.burst(e.x, e.y, ORG, 14); this.hitstop(90); e.destroy(); }
  }

  bolt(e) {
    const a = Math.atan2(this.P.y - e.y, this.P.x - e.x), c = this.add.circle(e.x, e.y - 4, 6, ORG).setDepth(5);
    this.bolts.add(c); c.body.setAllowGravity(false).setVelocity(Math.cos(a) * TUNE.boltSpeed, Math.sin(a) * TUNE.boltSpeed);
    this.time.delayedCall(4000, () => c.active && c.destroy());
  }

  ai(e, t) {
    const P = this.P, dx = P.x - e.x, ad = Math.abs(dx), s = Math.sign(dx) || 1, b = e.body, near = Math.abs(P.y - e.y) < 90;
    if (t < e.stun) { e.setTint(0x8aa0ff); if (e.type === 'l') b.velocity.x *= 0.9; return; }
    e.clearTint();
    if (e.type === 't') {
      e.setFlipX(dx < 0);
      if (e.st === 'patrol') { if (ad < 520 && Math.abs(P.y - e.y) < 260) { e.st = 'wind'; e.until = t + 650; } }
      else if (e.st === 'wind') { e.setTint(0xff4444); if (t > e.until) { this.bolt(e); e.st = 'rec'; e.until = t + 1600; } }
      else if (t > e.until) e.st = 'patrol';
      return;
    }
    const mv = v => b.setVelocityX(v);
    if (e.st === 'patrol') { mv(e.dir * 50); if (e.x > e.max) e.dir = -1; else if (e.x < e.min) e.dir = 1; e.setFlipX(e.dir < 0); if (ad < 300 && near) e.st = 'chase'; }
    else if (e.st === 'chase') {
      const lim = (s > 0 && e.x >= e.max) || (s < 0 && e.x <= e.min); mv(lim ? 0 : s * 105); e.setFlipX(s < 0);
      if (ad < 100) { e.st = 'wind'; e.until = t + 520; e.face = s; mv(0); } else if (ad > 440 || !near) e.st = 'patrol';
    }
    else if (e.st === 'wind') { e.setTint(0xff4444); if (t > e.until) { e.st = 'atk'; e.until = t + 300; mv(e.face * TUNE.lungeSpeed); } }
    else if (e.st === 'atk') {
      if (t > e.until) { e.st = 'rec'; e.until = t + 650; mv(0); }
      else if (hit(e.getBounds(), this.pb()) && this.hurt(t, e.x) === 'parry') { e.st = 'rec'; e.until = t + 1000; e.stun = t + 800; mv(0); }
    }
    else { mv(0); if (t > e.until) e.st = 'chase'; }
  }

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

  hitstop(ms) {
    if (this.menu || this.stopped) return; this.stopped = true; this.physics.pause();
    this.time.delayedCall(ms, () => { this.stopped = false; if (!this.menu) this.physics.resume(); });
  }

  pop(x, y, s, c) {
    const o = this.add.text(x, y, s, { fontFamily: 'monospace', fontSize: '12px', color: c }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: o, y: y - 30, alpha: 0, duration: 800, onComplete: () => o.destroy() });
  }

  ring(x, y, col, r0, r1, ms) {
    const c = this.add.circle(x, y, r0).setStrokeStyle(2, col).setDepth(6);
    this.tweens.add({ targets: c, scale: r1 / r0, alpha: 0, duration: ms, onComplete: () => c.destroy() });
  }

  showMenu() {
    const ks = Object.keys(CONFIGS);
    this.menuT.setText(['LAST WORDS // WORKBENCH', '', ...ks.map((k, i) => (k === this.cfgKey ? '> ' : '  ') + '[' + (i + 1) + '] ' + CONFIGS[k].name.padEnd(10) + CONFIGS[k].desc), '', '[E] or [ESC] close. Choice persists through death.'].join('\n')).setVisible(true);
  }

  menuInput(close, nums) {
    const ks = Object.keys(CONFIGS);
    nums.forEach((d, i) => {
      if (!d) return;
      this.cfgKey = ks[i]; this.cfg = CONFIGS[ks[i]]; this.registry.set('cfg', ks[i]);
      this.bw = Math.min(this.bw, this.cfg.maxBW); this.gunS.setTexture('gun_' + ks[i]); this.showMenu();
    });
    if (close) { this.menu = false; this.menuT.setVisible(false); this.physics.resume(); }
  }
}

new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: 960, height: 540, backgroundColor: '#0a0e13', pixelArt: true,
  physics: { default: 'arcade', arcade: { gravity: { y: TUNE.gravity }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: Main,
});
