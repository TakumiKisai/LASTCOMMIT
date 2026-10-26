// Shared constants/helpers. Uses the global Phaser (main.js sets window.Phaser first).
export const KERN = { fw: 98, fh: 68, ay: 64, cols: 7, k: 0.545 / 0.42, rows: { idle: 0, walk: 1, run: 2, jump: 3, fall: 4, land: 5, bash: 6, dbash: 7, shoot_up: 8, shoot_side: 9, shoot_down: 10, parry: 11, dmg: 12 }, n: { idle: 4, walk: 6, run: 7, jump: 4, fall: 3, land: 3, bash: 4, dbash: 5, shoot_up: 4, shoot_side: 4, shoot_down: 3, parry: 4, dmg: 5 } };
// [primary (rebindable), ...fixed alternates]. Parry = F: index finger on the home row, no clash with WASD/Space/Shift/K.
export const KEYS = { left: ['A', 'LEFT'], right: ['D', 'RIGHT'], up: ['W', 'UP'], down: ['S', 'DOWN'], jump: ['SPACE'], bash: ['K'], parry: ['F'], run: ['SHIFT'], interact: ['E'], restart: ['R'] };
const LS = 'lastcommit.keys.v1';
export const loadKeys = () => { try { const o = JSON.parse(localStorage.getItem(LS) || '{}'); for (const n in o) if (KEYS[n] && typeof o[n] === 'string') KEYS[n][0] = o[n]; } catch (e) { /* storage blocked */ } };
export const saveKeys = () => { try { const o = {}; for (const n in KEYS) o[n] = KEYS[n][0]; localStorage.setItem(LS, JSON.stringify(o)); } catch (e) { /* ignore */ } };
export const getTouchMode = () => { try { return localStorage.getItem('lastcommit.touch') || 'auto'; } catch (e) { return 'auto'; } };
export const setTouchMode = m => { try { localStorage.setItem('lastcommit.touch', m); } catch (e) { /* ignore */ } };
export const keyName = code => Object.keys(Phaser.Input.Keyboard.KeyCodes).find(k => Phaser.Input.Keyboard.KeyCodes[k] === code) || '?';
export function beep(scene, f0, f1, dur, type = 'square', vol = 0.07) {
  const c = scene.sound && scene.sound.context; if (!c || c.state !== 'running') return;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.03);
}
export function playMusic(scene, key, vol = 0.5) {
  const sm = scene.sound; sm.getAllPlaying().forEach(s => { if (s.key !== key) s.stop(); });
  const cur = sm.get(key); if (cur && cur.isPlaying) return;
  const go = () => { const c2 = sm.get(key); if (!c2 || !c2.isPlaying) sm.play(key, { loop: true, volume: vol }); };
  if (sm.locked) sm.once(Phaser.Sound.Events.UNLOCKED, go); else go();
}
