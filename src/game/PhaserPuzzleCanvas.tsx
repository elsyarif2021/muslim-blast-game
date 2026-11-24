import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import {
  ALL_BLOCK_COLORS,
  BLOCK_META,
  BOARD_SIZE,
  applyPuzzleMove,
  createInitialBoard,
  findConnectedGroup,
  type PuzzleBoardState,
} from './puzzleLogic.ts';
import { soundEngine, triggerHaptic } from './soundEngine.ts';
import type { BlockColor, GameLevelConfig, PuzzleCell, PuzzleMove, SpecialType } from '../types/index.ts';

interface PhaserPuzzleCanvasProps {
  level: GameLevelConfig;
  seed: number;
  initialMoves?: PuzzleMove[];
  interactionEnabled?: boolean;
  activeTool: 'tap' | 'hammer';
  reducedMotion: boolean;
  hapticsEnabled: boolean;
  externalMoveTrigger: { id: number; move: PuzzleMove } | null;
  onStateChange: (state: PuzzleBoardState, movesHistory: PuzzleMove[]) => void;
  onToolUsed: () => void;
  onMoveCommitted?: (moves: PuzzleMove[]) => void;
}

class MuslimBlastScene extends Phaser.Scene {
  private level!: GameLevelConfig;
  private seed = 12345;
  private boardState!: PuzzleBoardState;
  private rng!: () => number;
  private nextId!: () => string;
  private movesHistory: PuzzleMove[] = [];
  private initialMoves: PuzzleMove[] = [];
  private interactionEnabled = true;
  private onMoveCommitted?: (moves: PuzzleMove[]) => void;
  private sprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private activeTool: 'tap' | 'hammer' = 'tap';
  private reducedMotion = false;
  private hapticsEnabled = true;
  private isAnimating = false;
  private onStateChange!: (state: PuzzleBoardState, movesHistory: PuzzleMove[]) => void;
  private onToolUsed!: () => void;
  private cellSize = 56;
  private boardOffsetX = 16;
  private boardOffsetY = 16;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super({ key: 'MuslimBlastScene' });
  }

  init(data: {
    level: GameLevelConfig;
    seed: number;
    initialMoves?: PuzzleMove[];
    activeTool?: 'tap' | 'hammer';
    interactionEnabled?: boolean;
    onMoveCommitted?: (moves: PuzzleMove[]) => void;
    reducedMotion: boolean;
    hapticsEnabled: boolean;
    onStateChange: (state: PuzzleBoardState, movesHistory: PuzzleMove[]) => void;
    onToolUsed: () => void;
  }) {
    this.level = data.level;
    this.seed = data.seed;
    this.initialMoves = data.initialMoves || [];
    this.activeTool = data.activeTool || 'tap';
    this.interactionEnabled = data.interactionEnabled ?? true;
    this.onMoveCommitted = data.onMoveCommitted;
    this.reducedMotion = data.reducedMotion;
    this.hapticsEnabled = data.hapticsEnabled;
    this.onStateChange = data.onStateChange;
    this.onToolUsed = data.onToolUsed;
  }

  create() {
    const width = this.scale.width;
    this.cellSize = Math.floor((width - 24) / BOARD_SIZE);
    this.boardOffsetX = Math.floor((width - this.cellSize * BOARD_SIZE) / 2);
    this.boardOffsetY = Math.floor((this.scale.height - this.cellSize * BOARD_SIZE) / 2);

    // Draw rich deep-emerald recessed game board background
    const bg = this.add.graphics();
    bg.fillStyle(0x022c22, 0.94);
    bg.fillRoundedRect(
      this.boardOffsetX - 10,
      this.boardOffsetY - 10,
      this.cellSize * BOARD_SIZE + 20,
      this.cellSize * BOARD_SIZE + 20,
      18
    );
    bg.lineStyle(3, 0xf5c542, 0.85);
    bg.strokeRoundedRect(
      this.boardOffsetX - 10,
      this.boardOffsetY - 10,
      this.cellSize * BOARD_SIZE + 20,
      this.cellSize * BOARD_SIZE + 20,
      18
    );

    // Subtle checkerboard slots
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        bg.fillStyle((r + c) % 2 === 0 ? 0x064e3b : 0x053d2e, 0.55);
        bg.fillRoundedRect(
          this.boardOffsetX + c * this.cellSize + 2,
          this.boardOffsetY + r * this.cellSize + 2,
          this.cellSize - 4,
          this.cellSize - 4,
          10
        );
      }
    }

    this.createBlockTextures();

    // Particle texture
    const pGfx = this.add.graphics();
    pGfx.fillStyle(0xffffff, 1);
    pGfx.fillCircle(6, 6, 6);
    pGfx.generateTexture('blast_particle', 12, 12);
    pGfx.destroy();

    this.particles = this.add.particles(0, 0, 'blast_particle', {
      speed: { min: 90, max: 240 },
      scale: { start: 1.0, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 420,
      gravityY: 260,
      emitting: false,
    });
    this.particles.setDepth(40);

    const init = createInitialBoard(this.seed, this.level);
    this.boardState = init.state;
    this.rng = init.rng;
    this.nextId = init.nextId;
    this.movesHistory = [];
    for (const move of this.initialMoves) {
      const restored = applyPuzzleMove(this.boardState, move, this.level, this.rng, this.nextId);
      if (!restored.valid) break;
      this.boardState = restored.state;
      this.movesHistory.push(move);
    }
    this.syncSprites(false);
    this.onStateChange(this.boardState, this.movesHistory);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.interactionEnabled || this.isAnimating || this.boardState.status !== 'playing') return;
      const col = Math.floor((pointer.x - this.boardOffsetX) / this.cellSize);
      const row = Math.floor((pointer.y - this.boardOffsetY) / this.cellSize);
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;

      const move: PuzzleMove = {
        type: this.activeTool === 'hammer' ? 'hammer' : 'tap',
        row,
        col,
      };
      this.executeMove(move);
    });
  }

  private createBlockTextures() {
    const size = Math.max(44, this.cellSize - 6);
    const half = size / 2;

    for (const color of ALL_BLOCK_COLORS) {
      const key = `block_${color}`;
      if (this.textures.exists(key)) continue;

      const meta = BLOCK_META[color];
      const gfx = this.add.graphics();

      const primary = Phaser.Display.Color.HexStringToColor(meta.primary).color;
      const shadow = Phaser.Display.Color.HexStringToColor(meta.shadow).color;
      const highlight = Phaser.Display.Color.HexStringToColor(meta.highlight).color;

      // 3D beveled block base
      gfx.fillStyle(shadow, 1);
      gfx.fillRoundedRect(0, 3, size, size - 3, 12);
      gfx.fillStyle(primary, 1);
      gfx.fillRoundedRect(0, 0, size, size - 4, 12);

      // Glossy top rim
      gfx.fillStyle(highlight, 0.45);
      gfx.fillRoundedRect(4, 3, size - 8, Math.max(8, size * 0.28), 8);

      // Non-sacred geometric/ornamental emblem in center
      gfx.lineStyle(2.4, 0xffffff, 0.92);
      gfx.fillStyle(0xffffff, 0.9);

      if (color === 'emerald_geo') {
        // 8-point geometric star (two overlapping squares)
        const r = size * 0.22;
        gfx.strokeRect(half - r, half - r - 1, r * 2, r * 2);
        const d = r * 1.15;
        gfx.beginPath();
        gfx.moveTo(half, half - d - 1);
        gfx.lineTo(half + d, half - 1);
        gfx.lineTo(half, half + d - 1);
        gfx.lineTo(half - d, half - 1);
        gfx.closePath();
        gfx.strokePath();
      } else if (color === 'blue_crescent') {
        gfx.fillCircle(half - 2, half - 1, size * 0.22);
        gfx.fillStyle(primary, 1);
        gfx.fillCircle(half + 4, half - 3, size * 0.17);
      } else if (color === 'gold_star') {
        const pts: Phaser.Math.Vector2[] = [];
        const outer = size * 0.25;
        const inner = size * 0.11;
        for (let i = 0; i < 10; i++) {
          const rad = i % 2 === 0 ? outer : inner;
          const ang = -Math.PI / 2 + (i * Math.PI) / 5;
          pts.push(new Phaser.Math.Vector2(half + Math.cos(ang) * rad, half - 1 + Math.sin(ang) * rad));
        }
        gfx.fillPoints(pts, true);
      } else if (color === 'purple_lantern') {
        gfx.fillRoundedRect(half - size * 0.15, half - size * 0.2, size * 0.3, size * 0.36, 6);
        gfx.fillStyle(0xfef08a, 0.95);
        gfx.fillCircle(half, half - 1, size * 0.08);
      } else if (color === 'orange_ornament') {
        gfx.strokeCircle(half, half - 1, size * 0.21);
        gfx.fillCircle(half, half - 1, size * 0.09);
      } else {
        // Pink flower (4 petals + center)
        const pR = size * 0.11;
        const off = size * 0.12;
        gfx.fillCircle(half - off, half - 1, pR);
        gfx.fillCircle(half + off, half - 1, pR);
        gfx.fillCircle(half, half - 1 - off, pR);
        gfx.fillCircle(half, half - 1 + off, pR);
        gfx.fillStyle(0xfef08a, 1);
        gfx.fillCircle(half, half - 1, size * 0.08);
      }

      gfx.generateTexture(key, size, size);
      gfx.destroy();
    }
  }

  public setTool(tool: 'tap' | 'hammer') {
    this.activeTool = tool;
  }

  public setInteractionEnabled(enabled: boolean) {
    this.interactionEnabled = enabled;
  }

  public updateAccessibility(reducedMotion: boolean, hapticsEnabled: boolean) {
    this.reducedMotion = reducedMotion;
    this.hapticsEnabled = hapticsEnabled;
  }

  public triggerExternalMove(move: PuzzleMove) {
    if (!this.interactionEnabled || this.isAnimating || this.boardState.status !== 'playing') return;
    this.executeMove(move);
  }

  private getCellCenter(row: number, col: number) {
    return {
      x: this.boardOffsetX + col * this.cellSize + this.cellSize / 2,
      y: this.boardOffsetY + row * this.cellSize + this.cellSize / 2,
    };
  }

  private createSpecialBadge(special: SpecialType): Phaser.GameObjects.Text | null {
    if (special === 'none') return null;
    const label =
      special === 'rocket_h'
        ? '↔'
        : special === 'rocket_v'
          ? '↕'
          : special === 'bomb'
            ? '✦'
            : '❂';
    const txt = this.add.text(0, -1, label, {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: `${Math.round(this.cellSize * 0.44)}px`,
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#022C22',
      strokeThickness: 5,
    });
    txt.setOrigin(0.5);
    return txt;
  }

  private executeMove(move: PuzzleMove) {
    const res = applyPuzzleMove(this.boardState, move, this.level, this.rng, this.nextId);
    if (!res.valid) {
      if (move.row !== undefined && move.col !== undefined) {
        const cell = this.boardState.grid[move.row]?.[move.col];
        const container = cell ? this.sprites.get(cell.id) : undefined;
        if (container && !this.reducedMotion) {
          this.tweens.add({
            targets: container,
            x: container.x + 5,
            duration: 45,
            yoyo: true,
            repeat: 2,
          });
        }
      }
      soundEngine.playTap();
      return;
    }

    const usedHammer = move.type === 'hammer';
    if (usedHammer) {
      this.activeTool = 'tap';
      this.onToolUsed();
    }

    this.movesHistory.push(move);
    this.boardState = res.state;
    // Save the step before its animation, including the final winning step.
    this.onMoveCommitted?.([...this.movesHistory]);

    // Visual & audio juice
    const bigBlast = res.removedCells.length >= 5 || res.createdSpecial !== null;
    if (bigBlast) {
      soundEngine.playSpecial();
      triggerHaptic(this.hapticsEnabled, [18, 25, 18]);
      if (!this.reducedMotion) {
        this.cameras.main.shake(140, 0.006);
      }
    } else {
      soundEngine.playBlast(res.removedCells.length);
      triggerHaptic(this.hapticsEnabled, 12);
    }

    // Burst particles for removed blocks
    for (const removed of res.removedCells) {
      const sprite = this.sprites.get(removed.id);
      if (sprite) {
        if (!this.reducedMotion) {
          const tint = Phaser.Display.Color.HexStringToColor(BLOCK_META[removed.color].primary).color;
          this.particles.setParticleTint(tint);
          this.particles.emitParticleAt(sprite.x, sprite.y, 6);
        }
        sprite.destroy();
        this.sprites.delete(removed.id);
      }
    }

    // Floating score popup
    if (res.pointsGained > 0 && res.removedCells.length > 0) {
      const anchor = res.removedCells[0];
      const pos = this.getCellCenter(anchor.row, anchor.col);
      const comboText =
        this.boardState.combo > 1
          ? `+${res.pointsGained} (x${this.boardState.combo})`
          : `+${res.pointsGained}`;
      const floatTxt = this.add
        .text(pos.x, pos.y, comboText, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#FEF08A',
          stroke: '#022C22',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(50);

      if (this.reducedMotion) {
        this.time.delayedCall(450, () => floatTxt.destroy());
      } else {
        this.tweens.add({
          targets: floatTxt,
          y: pos.y - 40,
          alpha: 0,
          duration: 550,
          ease: 'Cubic.easeOut',
          onComplete: () => floatTxt.destroy(),
        });
      }
    }

    this.isAnimating = true;
    this.syncSprites(true);
    this.time.delayedCall(this.reducedMotion ? 40 : 210, () => {
      this.isAnimating = false;
      this.onStateChange(this.boardState, [...this.movesHistory]);
    });
  }

  private syncSprites(animate: boolean) {
    const activeIds = new Set<string>();

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell: PuzzleCell | null = this.boardState.grid[r][c];
        if (!cell) continue;
        activeIds.add(cell.id);

        const target = this.getCellCenter(r, c);
        let container = this.sprites.get(cell.id);

        if (!container) {
          const startY = animate && !this.reducedMotion ? this.boardOffsetY - this.cellSize : target.y;
          container = this.add.container(target.x, startY);
          const blockImg = this.add.image(0, 0, `block_${cell.color}`);
          container.add(blockImg);

          const badge = this.createSpecialBadge(cell.special);
          if (badge) {
            const ring = this.add.circle(0, 0, this.cellSize * 0.34, 0x022c22, 0.72);
            ring.setStrokeStyle(2, 0xf5c542, 1);
            container.add(ring);
            container.add(badge);
          }

          this.sprites.set(cell.id, container);
          if (animate && !this.reducedMotion) {
            container.setScale(0.75);
            this.tweens.add({
              targets: container,
              x: target.x,
              y: target.y,
              scale: 1,
              duration: 190,
              ease: 'Back.easeOut',
            });
          }
        } else {
          if (animate && !this.reducedMotion) {
            this.tweens.add({
              targets: container,
              x: target.x,
              y: target.y,
              duration: 170,
              ease: 'Cubic.easeOut',
            });
          } else {
            container.setPosition(target.x, target.y);
          }
        }
      }
    }

    // Clean up stale sprites (e.g., after reshuffle)
    for (const [id, sprite] of this.sprites.entries()) {
      if (!activeIds.has(id)) {
        sprite.destroy();
        this.sprites.delete(id);
      }
    }
  }
}

export const PhaserPuzzleCanvas: React.FC<PhaserPuzzleCanvasProps> = ({
  level,
  seed,
  initialMoves,
  interactionEnabled = true,
  activeTool,
  reducedMotion,
  hapticsEnabled,
  externalMoveTrigger,
  onStateChange,
  onToolUsed,
  onMoveCommitted,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<MuslimBlastScene | null>(null);
  const onStateRef = useRef(onStateChange);
  const onToolUsedRef = useRef(onToolUsed);
  const onMoveCommittedRef = useRef(onMoveCommitted);

  onStateRef.current = onStateChange;
  onToolUsedRef.current = onToolUsed;
  onMoveCommittedRef.current = onMoveCommitted;

  useEffect(() => {
    if (!containerRef.current) return;
    const width = 400;
    const height = 400;

    const scene = new MuslimBlastScene();
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width,
      height,
      transparent: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [scene],
    });
    gameRef.current = game;

    game.scene.start('MuslimBlastScene', {
      level,
      seed,
      initialMoves,
      activeTool,
      interactionEnabled,
      reducedMotion,
      hapticsEnabled,
      onStateChange: (s: PuzzleBoardState, h: PuzzleMove[]) => onStateRef.current(s, h),
      onToolUsed: () => onToolUsedRef.current(),
      onMoveCommitted: (moves: PuzzleMove[]) => onMoveCommittedRef.current?.(moves),
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [level.id, seed]);

  useEffect(() => {
    sceneRef.current?.setInteractionEnabled(interactionEnabled);
  }, [interactionEnabled]);

  useEffect(() => {
    sceneRef.current?.setTool(activeTool);
  }, [activeTool]);

  useEffect(() => {
    sceneRef.current?.updateAccessibility(reducedMotion, hapticsEnabled);
  }, [reducedMotion, hapticsEnabled]);

  useEffect(() => {
    if (externalMoveTrigger) {
      sceneRef.current?.triggerExternalMove(externalMoveTrigger.move);
    }
  }, [externalMoveTrigger]);

  // Also provide keyboard hint info cleanly
  return (
    <div className="relative w-full max-w-[420px] aspect-square mx-auto select-none">
      <div
        ref={containerRef}
        className="w-full h-full rounded-2xl overflow-hidden shadow-[0_14px_35px_rgba(2,44,34,0.35)]"
        aria-label="Papan Puzzle 8x8 Muslim Blast"
      />
    </div>
  );
};
