import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Terminal, AlertTriangle, Cpu } from 'lucide-react';

const TRACKS = [
  { id: 1, title: 'STREAM_01_VOID', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'STREAM_02_NULL', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 3, title: 'STREAM_03_ERR', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

const GRID_SIZE = 20;
const INITIAL_SPEED = 120;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const DIRECTIONS: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const getRandomFoodPosition = (snake: Point[]): Point => {
  let newFood: Point;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    if (!snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
      break;
    }
  }
  return newFood;
};

export default function App() {
  // --- Music Player State ---
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Snake Game State ---
  const [, forceRender] = useState({});
  const snake = useRef<Point[]>([{ x: 10, y: 10 }]);
  const food = useRef<Point>({ x: 15, y: 10 });
  const direction = useRef<Direction>('UP');
  const nextDirection = useRef<Direction>('UP');
  const isGameRunning = useRef(false);
  const isGameOver = useRef(false);
  const score = useRef(0);
  const highScore = useRef(0);

  // --- Music Player Logic ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (isPlayingMusic) {
      const playPromise = audioRef.current?.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("AUDIO_STREAM_ERR:", error);
          setIsPlayingMusic(false);
        });
      }
    } else {
      audioRef.current?.pause();
    }
  }, [isPlayingMusic, currentTrackIndex]);

  const handleNextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlayingMusic(true);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlayingMusic(true);
  };

  const handleTrackEnded = () => {
    handleNextTrack();
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      audioRef.current.currentTime = percentage * audioRef.current.duration;
    }
  };

  // --- Snake Game Logic ---
  const startGame = () => {
    snake.current = [{ x: 10, y: 10 }];
    direction.current = 'UP';
    nextDirection.current = 'UP';
    food.current = getRandomFoodPosition(snake.current);
    score.current = 0;
    isGameOver.current = false;
    isGameRunning.current = true;
    if (!isPlayingMusic) {
      setIsPlayingMusic(true);
    }
    forceRender({});
  };

  const gameLoop = useCallback(() => {
    if (!isGameRunning.current || isGameOver.current) return;

    const head = snake.current[0];
    direction.current = nextDirection.current;
    const currentDir = DIRECTIONS[direction.current];
    const newHead = {
      x: head.x + currentDir.x,
      y: head.y + currentDir.y,
    };

    // Check collisions
    if (
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE ||
      snake.current.some((segment) => segment.x === newHead.x && segment.y === newHead.y)
    ) {
      isGameOver.current = true;
      isGameRunning.current = false;
      highScore.current = Math.max(highScore.current, score.current);
      forceRender({});
      return;
    }

    const newSnake = [newHead, ...snake.current];

    // Check food
    if (newHead.x === food.current.x && newHead.y === food.current.y) {
      score.current += 10;
      food.current = getRandomFoodPosition(newSnake);
    } else {
      newSnake.pop();
    }

    snake.current = newSnake;
    forceRender({});
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' && (isGameOver.current || !isGameRunning.current)) {
        startGame();
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (direction.current !== 'DOWN') nextDirection.current = 'UP';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (direction.current !== 'UP') nextDirection.current = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (direction.current !== 'RIGHT') nextDirection.current = 'LEFT';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (direction.current !== 'LEFT') nextDirection.current = 'RIGHT';
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const speed = Math.max(40, INITIAL_SPEED - Math.floor(score.current / 50) * 10);
    const intervalId = setInterval(gameLoop, speed);
    return () => clearInterval(intervalId);
  }, [gameLoop, score.current]);

  return (
    <div className="min-h-screen bg-black text-[#0ff] font-mono flex flex-col items-center justify-between p-4 md:p-6 overflow-hidden selection:bg-[#f0f]/50 tear-effect">
      <div className="static-overlay" />
      <div className="scanline" />

      {/* Header */}
      <header className="w-full max-w-4xl flex flex-col md:flex-row items-start md:items-center justify-between z-10 mb-4 md:mb-8 border-b-2 border-[#0ff] pb-4">
        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-0">
          <Terminal className="w-6 h-6 md:w-8 md:h-8 text-[#0ff]" />
          <h1 className="text-2xl md:text-4xl font-bold tracking-widest uppercase glitch-text" data-text="PROTOCOL: OROBOROS">
            PROTOCOL: OROBOROS
          </h1>
        </div>
        <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-between md:justify-end">
          <div className="flex flex-col items-start md:items-end border-l-2 border-[#f0f] pl-4">
            <span className="text-sm md:text-base text-[#f0f] uppercase tracking-widest">DATA_COLLECTED</span>
            <span className="text-2xl md:text-3xl font-bold text-[#0ff]">
              {score.current.toString().padStart(4, '0')}
            </span>
          </div>
          <div className="flex flex-col items-start md:items-end border-l-2 border-[#f0f] pl-4">
            <span className="text-sm md:text-base text-[#f0f] uppercase tracking-widest">MAX_CAPACITY</span>
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-2xl md:text-3xl font-bold text-[#0ff]">
                {highScore.current.toString().padStart(4, '0')}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Game Board */}
      <main className="relative z-10 flex-1 flex items-center justify-center w-full">
        <div className="relative w-full max-w-[500px] aspect-square bg-black border-4 border-[#0ff] overflow-hidden shadow-[0_0_20px_#0ff_inset,0_0_20px_#0ff]">
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-20"
               style={{
                 backgroundImage: 'linear-gradient(to right, #0ff 1px, transparent 1px), linear-gradient(to bottom, #0ff 1px, transparent 1px)',
                 backgroundSize: '5% 5%'
               }}
          />

          {/* Food */}
          <div
            className="absolute bg-[#f0f] shadow-[0_0_10px_#f0f]"
            style={{
              width: '5%',
              height: '5%',
              left: `${(food.current.x / GRID_SIZE) * 100}%`,
              top: `${(food.current.y / GRID_SIZE) * 100}%`,
            }}
          />

          {/* Snake */}
          {snake.current.map((segment, index) => {
            const isHead = index === 0;
            return (
              <div
                key={`${segment.x}-${segment.y}-${index}`}
                className={`absolute ${
                  isHead
                    ? 'bg-[#fff] border-2 border-[#0ff] shadow-[0_0_10px_#fff] z-10'
                    : 'bg-[#0ff] border border-black opacity-80'
                }`}
                style={{
                  width: '5%',
                  height: '5%',
                  left: `${(segment.x / GRID_SIZE) * 100}%`,
                  top: `${(segment.y / GRID_SIZE) * 100}%`,
                }}
              />
            );
          })}

          {/* Overlays */}
          {!isGameRunning.current && !isGameOver.current && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 border-4 border-[#0ff] m-4">
              <Cpu className="w-12 h-12 md:w-16 md:h-16 text-[#0ff] mb-4 animate-pulse" />
              <h2 className="text-2xl md:text-3xl font-bold text-[#f0f] mb-2 tracking-widest uppercase glitch-text" data-text="AWAITING_INPUT">AWAITING_INPUT</h2>
              <p className="text-[#0ff] text-lg md:text-xl mb-6 uppercase">&gt;&gt; PRESS_SPACE_TO_EXECUTE</p>
              <button
                onClick={startGame}
                className="px-8 py-3 bg-black border-2 border-[#0ff] text-[#0ff] hover:bg-[#0ff] hover:text-black transition-none uppercase tracking-widest font-bold text-xl shadow-[4px_4px_0px_#f0f] active:translate-y-1 active:translate-x-1 active:shadow-[0px_0px_0px_#f0f]"
              >
                INITIATE
              </button>
            </div>
          )}

          {isGameOver.current && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20 border-4 border-[#f0f] m-4">
              <AlertTriangle className="w-16 h-16 text-[#f0f] mb-4 animate-pulse" />
              <h2 className="text-3xl md:text-5xl font-black text-[#f0f] mb-2 uppercase tracking-widest glitch-text" data-text="SYSTEM_FAILURE">
                SYSTEM_FAILURE
              </h2>
              <p className="text-[#0ff] text-xl md:text-2xl mb-8 font-mono uppercase">&gt;&gt; DATA_LOST: {score.current}</p>
              <button
                onClick={startGame}
                className="px-8 py-3 bg-black border-2 border-[#f0f] text-[#f0f] hover:bg-[#f0f] hover:text-black transition-none uppercase tracking-widest font-bold text-xl shadow-[4px_4px_0px_#0ff] active:translate-y-1 active:translate-x-1 active:shadow-[0px_0px_0px_#0ff]"
              >
                REBOOT_SEQUENCE
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Music Player Footer */}
      <footer className="w-full max-w-[500px] md:max-w-4xl mt-4 md:mt-8 bg-black border-2 border-[#0ff] p-4 z-10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[4px_4px_0px_#f0f]">
        {/* Track Info */}
        <div className="flex items-center gap-4 w-full md:w-1/3">
          <div className="w-12 h-12 shrink-0 bg-black border-2 border-[#f0f] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[#f0f] opacity-20 animate-pulse" />
            <Terminal className="w-6 h-6 text-[#0ff] relative z-10" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-lg font-bold text-[#0ff] truncate uppercase">{TRACKS[currentTrackIndex].title}</span>
            <span className="text-sm text-[#f0f] truncate uppercase animate-pulse">&gt;&gt; AUDIO_STREAM_ACTIVE</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-4 w-full md:w-1/3">
          <div className="flex items-center gap-8">
            <button onClick={handlePrevTrack} className="text-[#0ff] hover:text-[#f0f] hover:scale-110 transition-none">
              <SkipBack className="w-6 h-6" />
            </button>
            <button
              onClick={() => setIsPlayingMusic(!isPlayingMusic)}
              className="w-12 h-12 flex items-center justify-center bg-black border-2 border-[#0ff] text-[#0ff] hover:bg-[#0ff] hover:text-black transition-none shadow-[2px_2px_0px_#f0f] active:translate-y-0.5 active:translate-x-0.5 active:shadow-[0px_0px_0px_#f0f]"
            >
              {isPlayingMusic ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>
            <button onClick={handleNextTrack} className="text-[#0ff] hover:text-[#f0f] hover:scale-110 transition-none">
              <SkipForward className="w-6 h-6" />
            </button>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-3 bg-black border border-[#0ff] cursor-pointer relative" onClick={handleProgressClick}>
             <div className="h-full bg-[#f0f] transition-none" style={{ width: `${progress}%` }} />
             <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,0,0,0.5)_2px,rgba(0,0,0,0.5)_4px)] pointer-events-none" />
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center justify-end gap-4 w-full md:w-1/3">
          <button onClick={() => setIsMuted(!isMuted)} className="text-[#0ff] hover:text-[#f0f] transition-none">
            {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="w-24 h-2 bg-black border border-[#0ff] appearance-none cursor-pointer accent-[#f0f]"
            style={{
              WebkitAppearance: 'none',
              background: `linear-gradient(to right, #f0f 0%, #f0f ${volume * 100}%, #000 ${volume * 100}%, #000 100%)`
            }}
          />
        </div>

        <audio
          ref={audioRef}
          src={TRACKS[currentTrackIndex].url}
          onEnded={handleTrackEnded}
          onTimeUpdate={handleTimeUpdate}
          className="hidden"
        />
      </footer>
    </div>
  );
}
