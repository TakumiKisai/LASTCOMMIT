# LAST COMMIT - gameplay prototype
Phaser 3 + Vite, plain JavaScript. Placeholder graphics, no audio. Desktop browser, keyboard + mouse.

## Run
    npm install
    npm run dev      # http://localhost:5173
    npm run build    # production build in dist/

## Controls (rebind in KEYS, top of src/game.js)
A/D or arrows move | Space jump | Shift run (only inside the RUN ZONE) | Mouse aim | LMB shoot (recoil launches you the opposite way)
RMB or K bash | hold S/Down in the air + Bash = downward pogo (enemies, ground, spikes) | L parry | E workbench / close menu | R reset

## Implemented
Movement (coyote time, jump buffer, variable jump), context run zone, Bash + downward pogo, 360-degree aimed recoil shooting,
Bandwidth meter (shots cost it, Bash does not, +10/s while grounded, fruit pickups), parry with timing window,
3 LAST WORDS configs at the workbench (Standard / Bayonet / Precision) with real stat differences that persist through death,
2 enemy types (lunger, turret) with readable windups, spikes/pits that reset you to your last safe ground,
one test level with a gap that needs running, pogo nodes leading to a secret platform, death + respawn.

## Temporary decisions (all tunable)
Bandwidth regenerates only while grounded; parry costs 0 Bandwidth; Bayonet's "lower ammo capacity" = 70 max Bandwidth + pricier shots;
Precision's "stagger" = Bash stuns and interrupts enemy windups; hazards cost 1 HP and send you to your last safe ground.

## Tuning (top of src/game.js)
TUNE: walk, run, jump, gravity, enemyHp, bashCdMs, parryWindowMs, parryCost, bwRegenGrounded.
CONFIGS: per weapon - recoil (recoil strength), bashDmg, pogo (Bash launch force), cost (Bandwidth per shot), maxBW, spread, stagger.
Enemy health is TUNE.enemyHp. Bash force = CONFIGS[x].pogo.

## Known bugs / unfinished
Not playtested in a browser by the author of this build (only syntax-checked) - expect rough edges.
No sound. Art is procedurally generated placeholder sprites (run/idle/jump/fall frames, slash, tracers, impact sparks). Mouse aim only. No upward Bash.
No extraction/return system, no ENTITY presentation. Enemy AI is basic and can be pogo-spammed. Parry effects beyond "negate" are not built.
