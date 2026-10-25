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
