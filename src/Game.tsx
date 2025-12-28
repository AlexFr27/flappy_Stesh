import React, { useEffect, useRef, useState, useCallback } from 'react';
import SteshaImage from './photo/Stesha.png';

// Расширение типов для window.gc (сборщик мусора)
declare global {
  interface Window {
    gc?: () => void;
  }
}

// Типы для игрового состояния
interface GameState {
  player: {
    x: number;
    y: number;
    velocity: number;
    width: number;
    height: number;
  };
  pipes: {
    x: number;
    topHeight: number;
    bottomY: number;
    width: number;
    passed: boolean;
  }[];
  background: {
    x1: number;
    x2: number;
  };
  gameStarted: boolean;
  gameOver: boolean;
  isPaused: boolean;
  score: number;
  highScore: number;
  isNewRecord: boolean;
  gameSpeed: number;
  isMobile: boolean;
  devicePerformance: 'low' | 'medium' | 'high';
  frameRate: number;
}

// Константы игры
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const GRAVITY = 0.4;
const JUMP_FORCE = -8;
const PIPE_WIDTH = 80;
const PIPE_GAP = 300;
const PIPE_SPEED = 4;
const BACKGROUND_SPEED = 1;
const STESHA_WIDTH = 80;
const STESHA_HEIGHT = 80;

// Мобильные константы
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MOBILE_STESHA_WIDTH = 60;  // Уменьшенный размер для мобильных
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MOBILE_STESHA_HEIGHT = 60;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MOBILE_PIPE_SPACING_MULTIPLIER = 1.8; // Увеличенное расстояние между трубами

// Функции для работы с рекордами
const getHighScore = (): number => {
  const saved = localStorage.getItem('flappingStesha_highScore');
  return saved ? parseInt(saved, 10) : 0;
};

const saveHighScore = (score: number): void => {
  localStorage.setItem('flappingStesha_highScore', score.toString());
};

// Определение мобильного устройства и его возможностей
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Определение производительности устройства
const getDevicePerformance = (): 'low' | 'medium' | 'high' => {
  // Проверяем количество ядер процессора
  const cores = navigator.hardwareConcurrency || 1;
  // Проверяем объем памяти (если доступно)
  const memory = (navigator as any).deviceMemory || 4;

  if (cores <= 2 || memory <= 2) return 'low';
  if (cores <= 4 || memory <= 4) return 'medium';
  return 'high';
};

// Функция расчета размеров игры для мобильных
const getGameDimensions = () => {
  const isMobile = isMobileDevice();
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  if (isMobile) {
    // Для мобильных устройств используем размеры экрана с отступами
    const maxWidth = Math.min(screenWidth * 0.95, 600);
    const maxHeight = Math.min(screenHeight * 0.85, 800);
    return {
      width: maxWidth,
      height: maxHeight,
      scale: maxWidth / 600 // Базовая ширина для масштабирования
    };
  }

  return {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    scale: 1
  };
};

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState(getGameDimensions());

  // Определяем производительность устройства
  const devicePerf = getDevicePerformance();
  const isMobile = isMobileDevice();

  // Добавляем реф для отслеживания производительности и очистки памяти
  const performanceRef = useRef({
    lastCleanup: Date.now(),
    frameCount: 0
  });

  // Устанавливаем частоту кадров в зависимости от устройства
  const getOptimalFrameRate = (): number => {
    if (!isMobile) return 60;
    switch (devicePerf) {
      case 'low': return 30;
      case 'medium': return 45;
      default: return 60;
    }
  };

  const [gameState, setGameState] = useState<GameState>({
    player: {
      x: 150,
      y: dimensions.height / 2,
      velocity: 0,
      width: (isMobile ? MOBILE_STESHA_WIDTH : STESHA_WIDTH) * dimensions.scale,
      height: (isMobile ? MOBILE_STESHA_HEIGHT : STESHA_HEIGHT) * dimensions.scale,
    },
    pipes: [],
    background: {
      x1: 0,
      x2: dimensions.width,
    },
    gameStarted: false,
    gameOver: false,
    isPaused: false,
    score: 0,
    highScore: getHighScore(),
    isNewRecord: false,
    gameSpeed: 1,
    isMobile: isMobile,
    devicePerformance: devicePerf,
    frameRate: getOptimalFrameRate(),
  });

  // Обновление размеров при изменении размеров окна
  useEffect(() => {
    const handleResize = () => {
      const newDimensions = getGameDimensions();
      setDimensions(newDimensions);

      setGameState(prevState => ({
        ...prevState,
        player: {
          ...prevState.player,
          width: (isMobile ? MOBILE_STESHA_WIDTH : STESHA_WIDTH) * newDimensions.scale,
          height: (isMobile ? MOBILE_STESHA_HEIGHT : STESHA_HEIGHT) * newDimensions.scale,
        },
        background: {
          x1: 0,
          x2: newDimensions.width,
        },
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  const steshaImageRef = useRef<HTMLImageElement>(new Image());

  useEffect(() => {
    steshaImageRef.current.src = SteshaImage;
  }, []);

  // Инициализация игры
  const initGame = () => {
    setGameState(prevState => ({
      ...prevState,
      player: {
        x: 150 * dimensions.scale,
        y: dimensions.height / 2,
        velocity: 0,
        width: (gameState.isMobile ? MOBILE_STESHA_WIDTH : STESHA_WIDTH) * dimensions.scale,
        height: (gameState.isMobile ? MOBILE_STESHA_HEIGHT : STESHA_HEIGHT) * dimensions.scale,
      },
      pipes: [],
      background: {
        x1: 0,
        x2: dimensions.width,
      },
      gameStarted: true,
      gameOver: false,
      isPaused: false,
      score: 0,
      isNewRecord: false,
      gameSpeed: 1,
    }));
  };

  // Прыжок
  const jump = useCallback(() => {
    if (!gameState.gameStarted) {
      initGame();
      return;
    }

    if (gameState.gameOver) {
      initGame();
      return;
    }

    if (gameState.isPaused) {
      return;
    }

    setGameState(prevState => ({
      ...prevState,
      player: {
        ...prevState.player,
        velocity: JUMP_FORCE,
      },
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.gameStarted, gameState.gameOver, gameState.isPaused]);

  // Функция паузы
  const togglePause = useCallback(() => {
    if (!gameState.gameStarted || gameState.gameOver) {
      return;
    }

    setGameState(prevState => ({
      ...prevState,
      isPaused: !prevState.isPaused,
    }));
  }, [gameState.gameStarted, gameState.gameOver]);

  // Проверка коллизий
  const checkCollisions = (player: GameState['player'], pipes: GameState['pipes']) => {
    const groundHeight = 60;
    // Проверка границ экрана (учитываем землю)
    if (player.y <= -20 || player.y + player.height >= CANVAS_HEIGHT - groundHeight) {
      return true;
    }

    // Проверка коллизий с трубами
    for (const pipe of pipes) {
      if (
        player.x < pipe.x + pipe.width &&
        player.x + player.width > pipe.x &&
        (player.y < pipe.topHeight || player.y + player.height > pipe.bottomY)
      ) {
        return true;
      }
    }

    return false;
  };

  // Создание новой трубы
  const createPipe = (x: number) => {
    const groundHeight = 60 * dimensions.scale;
    const pipeGap = PIPE_GAP * dimensions.scale;
    const availableHeight = dimensions.height - pipeGap - groundHeight - 100 * dimensions.scale;
    const topHeight = Math.random() * availableHeight + 50 * dimensions.scale;
    return {
      x,
      topHeight,
      bottomY: topHeight + pipeGap,
      width: PIPE_WIDTH * dimensions.scale,
      passed: false,
    };
  };

  // Основной игровой цикл с адаптивной частотой кадров
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver || gameState.isPaused) return;

    // Вычисляем интервал на основе целевой частоты кадров
    const frameInterval = 1000 / gameState.frameRate;

    const gameLoop = setInterval(() => {
      setGameState(prevState => {
        const newState = { ...prevState };

        // Счетчик кадров для оптимизации памяти
        performanceRef.current.frameCount++;

        // Периодическая очистка памяти (каждые 300 кадров для мобильных)
        const cleanupInterval = gameState.isMobile ? 300 : 600;
        if (performanceRef.current.frameCount % cleanupInterval === 0) {
          // Принудительная сборка мусора, если доступна
          if (window.gc && gameState.devicePerformance === 'low') {
            window.gc();
          }
          performanceRef.current.lastCleanup = Date.now();
        }

        // Расчет скорости на основе очков (ускорение каждые 10 очков)
        const speedMultiplier = 1 + Math.floor(newState.score / 10) * 0.2;
        newState.gameSpeed = speedMultiplier;

        // Корректируем скорость в зависимости от частоты кадров для плавности
        const frameRateMultiplier = newState.frameRate / 60;
        const currentPipeSpeed = PIPE_SPEED * speedMultiplier * frameRateMultiplier;
        const currentBackgroundSpeed = BACKGROUND_SPEED * speedMultiplier * frameRateMultiplier;

        // Обновление физики игрока
        newState.player = {
          ...newState.player,
          velocity: newState.player.velocity + GRAVITY,
          y: newState.player.y + newState.player.velocity,
        };

        // Движение фона
        newState.background = {
          x1: newState.background.x1 - currentBackgroundSpeed,
          x2: newState.background.x2 - currentBackgroundSpeed,
        };

        // Циклический фон
        if (newState.background.x1 <= -dimensions.width) {
          newState.background.x1 = dimensions.width;
        }
        if (newState.background.x2 <= -dimensions.width) {
          newState.background.x2 = dimensions.width;
        }

        // Обновление труб
        newState.pipes = newState.pipes.map(pipe => ({
          ...pipe,
          x: pipe.x - currentPipeSpeed,
        }));

        // Удаление труб за экраном
        newState.pipes = newState.pipes.filter(pipe => pipe.x + pipe.width > 0);

        // Создание новых труб с учетом производительности и мобильных устройств
        const basePipeSpacing = 450 * dimensions.scale;
        const pipeSpacing = gameState.isMobile ?
          basePipeSpacing * MOBILE_PIPE_SPACING_MULTIPLIER :
          basePipeSpacing;

        const shouldCreatePipe = newState.pipes.length === 0 ||
          newState.pipes[newState.pipes.length - 1].x < dimensions.width - pipeSpacing;

        if (shouldCreatePipe) {
          // Ограничиваем количество труб для слабых устройств
          const maxPipes = gameState.devicePerformance === 'low' ? 3 : 5;
          if (newState.pipes.length < maxPipes) {
            newState.pipes.push(createPipe(dimensions.width));
          }
        }

        // Подсчет очков
        newState.pipes.forEach(pipe => {
          if (!pipe.passed && pipe.x + pipe.width < newState.player.x) {
            pipe.passed = true;
            newState.score++;
          }
        });

        // Проверка коллизий
        if (checkCollisions(newState.player, newState.pipes)) {
          newState.gameOver = true;

          // Проверка и сохранение рекорда
          if (newState.score > newState.highScore) {
            newState.highScore = newState.score;
            newState.isNewRecord = true;
            saveHighScore(newState.score);
          }
        }

        return newState;
      });
    }, frameInterval);

    return () => clearInterval(gameLoop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.gameStarted, gameState.gameOver, gameState.isPaused, gameState.frameRate]);

  // Отрисовка с оптимизациями производительности
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Оптимизация контекста для мобильных устройств
    if (gameState.isMobile) {
      // Отключаем сглаживание для лучшей производительности на слабых устройствах
      if (gameState.devicePerformance === 'low') {
        ctx.imageSmoothingEnabled = false;
      }
      // Включаем аппаратное ускорение где возможно
      ctx.globalCompositeOperation = 'source-over';
    }

    // Очистка canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Отрисовка движущегося фона
    const gradient = ctx.createLinearGradient(0, 0, 0, dimensions.height);
    gradient.addColorStop(0, '#87CEEB'); // Небесно-голубой
    gradient.addColorStop(1, '#98FB98'); // Светло-зеленый

    ctx.fillStyle = gradient;
    ctx.fillRect(gameState.background.x1, 0, dimensions.width, dimensions.height);
    ctx.fillRect(gameState.background.x2, 0, dimensions.width, dimensions.height);

    // Добавление облаков с оптимизацией для производительности
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const cloudScale = dimensions.scale;

    // Адаптивное количество облаков в зависимости от производительности
    let numClouds = Math.max(3, Math.floor(dimensions.width / 200));
    if (gameState.devicePerformance === 'low') {
      numClouds = Math.max(2, Math.floor(numClouds / 2)); // Уменьшаем количество облаков на слабых устройствах
    }

    for (let i = 0; i < numClouds; i++) {
      const cloudX = (gameState.background.x1 + i * 200 * cloudScale) % (dimensions.width * 2);
      const cloudY = (50 + i * 30) * cloudScale;
      const cloudSize = 30 * cloudScale;

      ctx.beginPath();
      if (gameState.devicePerformance === 'low') {
        // Упрощенные облака для слабых устройств (меньше кругов)
        ctx.arc(cloudX, cloudY, cloudSize, 0, Math.PI * 2);
        ctx.arc(cloudX + 30 * cloudScale, cloudY, cloudSize * 0.8, 0, Math.PI * 2);
      } else {
        // Полные облака для производительных устройств
        ctx.arc(cloudX, cloudY, cloudSize, 0, Math.PI * 2);
        ctx.arc(cloudX + 25 * cloudScale, cloudY, 35 * cloudScale, 0, Math.PI * 2);
        ctx.arc(cloudX + 50 * cloudScale, cloudY, cloudSize, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // Рисуем землю внизу
    const groundHeight = 60 * dimensions.scale;
    const groundGradient = ctx.createLinearGradient(0, dimensions.height - groundHeight, 0, dimensions.height);
    groundGradient.addColorStop(0, '#8B4513');
    groundGradient.addColorStop(0.3, '#CD853F');
    groundGradient.addColorStop(1, '#A0522D');

    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, dimensions.height - groundHeight, dimensions.width, groundHeight);

    // Добавляем траву на землю
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, dimensions.height - groundHeight, dimensions.width, 10 * dimensions.scale);

    if (gameState.gameStarted) {
      // Отрисовка труб
      ctx.fillStyle = '#228B22';
      gameState.pipes.forEach(pipe => {
        // Верхняя труба
        ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
        // Нижняя труба
        ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, CANVAS_HEIGHT - pipe.bottomY);

        // Границы труб
        ctx.strokeStyle = '#006400';
        ctx.lineWidth = 3;
        ctx.strokeRect(pipe.x, 0, pipe.width, pipe.topHeight);
        ctx.strokeRect(pipe.x, pipe.bottomY, pipe.width, CANVAS_HEIGHT - pipe.bottomY);
      });

      // Функция для рисования одного крыла
      const drawSingleWing = (translateX: number, translateY: number, rotation: number, wingWidth: number, wingHeight: number) => {
        ctx.save();
        ctx.translate(translateX, translateY);
        ctx.rotate(rotation);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, wingWidth, wingHeight, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };

      // Функция для рисования крылышек
      const drawWings = (x: number, y: number, width: number, height: number, wingFlap: number) => {
        const wingY = y + height * 0.3;
        const wingWidth = width * 0.4;
        const wingHeight = height * 0.3;
        const centerY = wingY + wingHeight * 0.5;

        // Левое крыло
        drawSingleWing(x - wingWidth * 0.3, centerY, wingFlap * 0.3, wingWidth, wingHeight);

        // Правое крыло
        drawSingleWing(x + width + wingWidth * 0.3, centerY, -wingFlap * 0.3, wingWidth, wingHeight);
      };

      // Анимация крыльев с оптимизацией для производительности
      let wingFlap;
      if (gameState.devicePerformance === 'low') {
        // Упрощенная анимация для слабых устройств (более медленная и менее сложная)
        wingFlap = Math.sin(Date.now() * 0.005) * 0.3;
      } else {
        // Полная анимация для производительных устройств
        wingFlap = Math.sin(Date.now() * 0.01) * (Math.abs(gameState.player.velocity) * 0.1 + 0.5);
      }

      // Сначала рисуем крылышки (чтобы они были под фото)
      // На слабых устройствах рисуем крылья только каждый второй кадр
      if (gameState.devicePerformance !== 'low' || Math.floor(Date.now() / 100) % 2 === 0) {
        drawWings(
          gameState.player.x,
          gameState.player.y,
          gameState.player.width,
          gameState.player.height,
          wingFlap
        );
      }

      // Отрисовка Стеши
      if (steshaImageRef.current.complete) {
        ctx.drawImage(
          steshaImageRef.current,
          gameState.player.x,
          gameState.player.y,
          gameState.player.width,
          gameState.player.height
        );
      } else {
        // Если изображение еще не загружено, рисуем прямоугольник
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(
          gameState.player.x,
          gameState.player.y,
          gameState.player.width,
          gameState.player.height
        );
      }

      // Отрисовка счета
      const fontSize = 32 * dimensions.scale;
      const smallFontSize = 24 * dimensions.scale;

      ctx.fillStyle = '#000';
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(`Счет: ${gameState.score}`, dimensions.width / 2, 50 * dimensions.scale);

      // Отрисовка рекорда
      ctx.font = `bold ${smallFontSize}px Arial`;
      ctx.fillStyle = '#333';
      ctx.fillText(`Рекорд: ${gameState.highScore}`, dimensions.width / 2, 80 * dimensions.scale);

      // Отрисовка скорости игры и информации о производительности
      if (gameState.gameSpeed > 1) {
        ctx.font = `bold ${smallFontSize * 0.8}px Arial`;
        ctx.fillStyle = '#FF6B35';
        ctx.fillText(`Скорость: x${gameState.gameSpeed.toFixed(1)}`, dimensions.width / 2, 110 * dimensions.scale);
      }

      // Показываем информацию о производительности (только в разработке)
      if (process.env.NODE_ENV === 'development' && gameState.isMobile) {
        ctx.font = `bold ${smallFontSize * 0.6}px Arial`;
        ctx.fillStyle = '#666';
        ctx.textAlign = 'left';
        ctx.fillText(
          `FPS: ${gameState.frameRate} | Performance: ${gameState.devicePerformance}`,
          10 * dimensions.scale,
          dimensions.height - 20 * dimensions.scale
        );
        ctx.textAlign = 'center';
      }

      // Отображение кнопки паузы (для мобильных)
      if (gameState.isMobile && !gameState.isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(dimensions.width - 80 * dimensions.scale, 20 * dimensions.scale, 60 * dimensions.scale, 40 * dimensions.scale);
        ctx.fillStyle = '#333';
        ctx.font = `bold ${smallFontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('⏸', dimensions.width - 50 * dimensions.scale, 45 * dimensions.scale);
      }
    }

    // Экран паузы
    if (gameState.isPaused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      const largeFontSize = 48 * dimensions.scale;
      const smallFontSize = 24 * dimensions.scale;

      ctx.fillStyle = '#FFF';
      ctx.font = `bold ${largeFontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('⏸ ПАУЗА', dimensions.width / 2, dimensions.height / 2 - 50 * dimensions.scale);

      ctx.font = `bold ${smallFontSize}px Arial`;
      if (gameState.isMobile) {
        ctx.fillText('Нажмите на экран для продолжения', dimensions.width / 2, dimensions.height / 2 + 20 * dimensions.scale);
      } else {
        ctx.fillText('Нажмите P или SPACE для продолжения', dimensions.width / 2, dimensions.height / 2 + 20 * dimensions.scale);
      }

      ctx.font = `bold ${smallFontSize * 0.8}px Arial`;
      ctx.fillStyle = '#AAA';
      ctx.fillText(`Текущий счет: ${gameState.score}`, dimensions.width / 2, dimensions.height / 2 + 60 * dimensions.scale);
    }

    // Экран начала игры
    if (!gameState.gameStarted) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      const largeFontSize = 48 * dimensions.scale;
      const smallFontSize = 24 * dimensions.scale;

      ctx.fillStyle = '#FFF';
      ctx.font = `bold ${largeFontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('Flapping Stesha', dimensions.width / 2, dimensions.height / 2 - 50 * dimensions.scale);

      ctx.font = `bold ${smallFontSize}px Arial`;
      if (gameState.isMobile) {
        ctx.fillText('Нажмите на экран для прыжка', dimensions.width / 2, dimensions.height / 2 + 20 * dimensions.scale);
      } else {
        ctx.fillText('Нажмите SPACE для начала', dimensions.width / 2, dimensions.height / 2 + 20 * dimensions.scale);
        ctx.fillText('или кликните мышкой', dimensions.width / 2, dimensions.height / 2 + 50 * dimensions.scale);
      }
    }

    // Экран окончания игры
    if (gameState.gameOver) {
      ctx.fillStyle = gameState.isNewRecord ? 'rgba(255, 215, 0, 0.8)' : 'rgba(255, 0, 0, 0.7)';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      const largeFontSize = 48 * dimensions.scale;
      const mediumFontSize = 32 * dimensions.scale;
      const smallFontSize = 24 * dimensions.scale;

      ctx.fillStyle = '#FFF';
      ctx.font = `bold ${largeFontSize}px Arial`;
      ctx.textAlign = 'center';

      if (gameState.isNewRecord) {
        ctx.fillText('🎉 НОВЫЙ РЕКОРД! 🎉', dimensions.width / 2, dimensions.height / 2 - 80 * dimensions.scale);
      } else {
        ctx.fillText('Игра окончена!', dimensions.width / 2, dimensions.height / 2 - 80 * dimensions.scale);
      }

      ctx.font = `bold ${mediumFontSize}px Arial`;
      ctx.fillText(`Ваш счет: ${gameState.score}`, dimensions.width / 2, dimensions.height / 2 - 20 * dimensions.scale);

      if (!gameState.isNewRecord) {
        ctx.font = `bold ${smallFontSize}px Arial`;
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`Лучший результат: ${gameState.highScore}`, dimensions.width / 2, dimensions.height / 2 + 20 * dimensions.scale);
      }

      ctx.fillStyle = '#FFF';
      ctx.font = `bold ${smallFontSize}px Arial`;
      if (gameState.isMobile) {
        ctx.fillText('Нажмите на экран для перезапуска', dimensions.width / 2, dimensions.height / 2 + 60 * dimensions.scale);
      } else {
        ctx.fillText('Нажмите SPACE для перезапуска', dimensions.width / 2, dimensions.height / 2 + 60 * dimensions.scale);
      }
    }
  });

  // Обработка нажатий клавиш
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (gameState.isPaused) {
          togglePause();
        } else {
          jump();
        }
      } else if (event.code === 'KeyP') {
        event.preventDefault();
        togglePause();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [jump, togglePause]);

  // Обработка касаний для мобильных устройств
  useEffect(() => {
    const handleTouch = (event: TouchEvent) => {
      event.preventDefault();

      const touch = event.touches[0] || event.changedTouches[0];
      const canvas = canvasRef.current;
      if (!canvas || !touch) return;

      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // Проверка нажатия на кнопку паузы
      if (gameState.gameStarted && !gameState.gameOver && !gameState.isPaused && gameState.isMobile) {
        const pauseButtonX = dimensions.width - 80 * dimensions.scale;
        const pauseButtonY = 20 * dimensions.scale;
        const pauseButtonWidth = 60 * dimensions.scale;
        const pauseButtonHeight = 40 * dimensions.scale;

        if (x >= pauseButtonX && x <= pauseButtonX + pauseButtonWidth &&
            y >= pauseButtonY && y <= pauseButtonY + pauseButtonHeight) {
          togglePause();
          return;
        }
      }

      // Обычное управление игрой
      if (gameState.isPaused) {
        togglePause();
      } else {
        jump();
      }
    };

    const canvas = canvasRef.current;
    if (canvas && gameState.isMobile) {
      canvas.addEventListener('touchstart', handleTouch);
      canvas.addEventListener('touchend', handleTouch);

      return () => {
        canvas.removeEventListener('touchstart', handleTouch);
        canvas.removeEventListener('touchend', handleTouch);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.gameStarted, gameState.gameOver, gameState.isPaused, gameState.isMobile, dimensions, jump, togglePause]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '10px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        border: gameState.isMobile ? '2px solid #333' : '4px solid #333',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        maxWidth: '100%',
        maxHeight: '100%',
      }}>
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onClick={!gameState.isMobile ? jump : undefined}
          style={{
            display: 'block',
            cursor: gameState.isMobile ? 'default' : 'pointer',
            maxWidth: '100%',
            maxHeight: '100%',
            touchAction: 'none',
          }}
        />
      </div>

      {/* Мобильная кнопка управления */}
      {gameState.isMobile && (
        <div style={{
          marginTop: '20px',
          display: 'flex',
          gap: '15px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              if (gameState.isPaused) {
                togglePause();
              } else {
                jump();
              }
            }}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              fontWeight: 'bold',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              touchAction: 'manipulation',
              userSelect: 'none',
              minWidth: '120px',
            }}
          >
            {!gameState.gameStarted ? '🚀 СТАРТ' :
             gameState.gameOver ? '🔄 ЗАНОВО' :
             gameState.isPaused ? '▶️ ИГРАТЬ' : '🦅 ПРЫЖОК'}
          </button>

          {gameState.gameStarted && !gameState.gameOver && (
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                togglePause();
              }}
              style={{
                padding: '15px 30px',
                fontSize: '18px',
                fontWeight: 'bold',
                backgroundColor: gameState.isPaused ? '#FF9800' : '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                touchAction: 'manipulation',
                userSelect: 'none',
                minWidth: '120px',
              }}
            >
              {gameState.isPaused ? '▶️ ИГРАТЬ' : '⏸️ ПАУЗА'}
            </button>
          )}
        </div>
      )}

      {/* Информация о скорости и управлении */}
      {gameState.isMobile && (
        <div style={{
          marginTop: '15px',
          textAlign: 'center',
          color: 'white',
          fontSize: '14px',
          maxWidth: '300px',
        }}>
          {gameState.gameSpeed > 1 && (
            <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
              ⚡ Скорость: x{gameState.gameSpeed.toFixed(1)}
            </div>
          )}
          <div>
            💡 Нажимайте кнопку или экран для прыжка
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;