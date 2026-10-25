import Phaser from 'phaser';
window.Phaser = Phaser; // game.js uses the global so the same file also runs from a CDN build
import('./game.js');
