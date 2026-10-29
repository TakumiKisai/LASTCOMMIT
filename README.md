# LAST COMMIT - gameplay prototype
Phaser 3 + Vite, plain JavaScript. Desktop (keyboard + mouse) and touch. Music: Disconnected (title), The Last Compile (dungeon).

## Run
    npm install
    npm run dev      # http://localhost:5173
    npm run build    # production build in dist/

## Controls (rebind in-game: Title > CONTROLS; defaults in src/shared.js)
A/D or arrows move | Space jump | Shift run (RUN ZONES only) | Mouse aim, LMB shoot (recoil launches you the opposite way) | RMB or K bash
hold S/Down in the air + Bash = downward pogo | F parry (rebindable) | E workbench | R reset expedition
Touch: D-pad bottom-left, JUMP / BASH / PARRY bottom-right, drag on the right half to aim and fire (aim down in the air + BASH = pogo).

## Dungeon
Entrance (workbench) > room 1 > run corridor (380px gap) > armored guard (only damageable while stunned: parry it) > CHECKPOINT > climb (hanging spike pods = pogo) > EXIT.
Checkpoint = exact snapshot (Bandwidth, HP, pickups, kills). Dying rewinds to it; the weapon loadout is permanent and survives.

## Known gaps
Not run in a browser by the author of this pass (syntax-checked only). Touch can't open the workbench menu yet. No temporary upgrades exist yet to snapshot.

## Character art (pixel art, native 64x64 cells)
Idle = kern2 (16 frames). Aiming = kern3 pointing poses (E / NE / SE, mirrored left; N reuses NE, S reuses SE) with the revolver in the glove, shown only while firing.
Walk / run / jump / fall / land / damage frames were drawn from the idle sprite's palette (SpriteCook is not wired into this workflow). Parry = idle pose + teal VIGIL barrier.
Bash and pogo still use the older painterly frames (kept unchanged, resized to match). Kern is drawn 1:1 (about 60px tall) so the pixel art stays sharp; a larger Kern would mean scaling the whole world, so for now the camera just follows him.

## Update: new Kern frames + CASCADE enemies
Kern now uses only the pixel-art sheets: idle (kern2 frames 0-3), walk (kernupd), run / land / damage / jump / dive / rebound (kernother), bash (kernbash: wind-up, palm, punch, recover),
parry = guard stance (kernbash 4) + teal barrier. The painterly sheet and kernjump2 are no longer used. After ~8s standing still Kern plays a random taunt (TAUNTS in src/game.js).
Enemies: Fragment (rusher), Shard (hovering 3-bolt shooter), Core (armored, parry it to stun) replace the placeholder drones; art is public/assets/enemy/*_px.png (cleaned 1:1 from the PixelLab sheets).
Not built yet: PRISM / Memory Leak boss and the army rules (sprites are in public/assets/enemy/prism.png and memoryleak.png).

## Update: keyboard aiming, floating revolver, variants (step A)
Controls: arrows/WASD move + face + 8-way aim, J = shoot (hold), K bash, F parry, Down + Bash in the air = pogo. Facing follows movement (no moonwalking); SHOOT + Down fires straight down even on the ground.
Mouse aim + click shoot is a disabled-by-default toggle in Controls (testing only). Straight up/down reuse the NE/SE arm poses until N/S poses exist; the gun still points at the true angle.
LAST WORDS floats on a faint tether beside Kern's hip, snaps into his hand to fire and returns to the same spot. Variants: Kern (Standard), Soren (Precision: fast piercing shots), Vera (Impact: bash, pogo, wide parry).
Workbench: hologram + card menu (tap or 1/2/3); 1% easter egg renames Kern to "You". Run = the walk cycle played faster. Airborne frames are re-aligned to the idle body height. Title: back-view Kern, 403 -> 404 via a 0/1 bit stream.
