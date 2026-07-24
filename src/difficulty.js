const DIFFICULTY_CURVES = {
  snake: { speedStart: 150, speedMin: 60, speedDecay: 3, accelPerScore: 1 },
  tetris: { levelStart: 1, dropStart: 800, dropMin: 100, dropDecay: 50, linesPerLevel: 5 },
  flappy: { gapStart: 160, gapMin: 110, gapDecay: 2, speedStart: 2, speedMax: 4.5, accelPerScore: 0.04 },
  breakout: { ballSpeedStart: 4, ballSpeedMax: 8, speedIncPerLevel: 0.3 },
  dodge: { spawnRateStart: 1200, spawnRateMin: 400, spawnDecay: 15, obstacleSpeedStart: 2, obstacleSpeedMax: 6 },
  mergeblitz: { timeStart: 90, timeBonusPerMerge: 1, comboDecayMs: 2000 },
  whack: { moleSpeedStart: 1200, moleSpeedMin: 400, moleSpeedDecay: 20, moleCountStart: 2, moleCountMax: 5 },
}

export function getAdaptiveDifficulty(gameId, stats) {
  if (!stats || !stats.games || !stats.games[gameId]) return 0
  const game = stats.games[gameId]
  const played = game.played || 0
  const won = game.won || 0
  const winRate = played > 0 ? won / played : 0
  const totalScore = game.totalScore || 0

  let difficulty = 0
  if (played >= 5) {
    if (winRate > 0.7) difficulty = Math.min(3, Math.floor((winRate - 0.5) * 10))
    else if (winRate < 0.3) difficulty = Math.max(-2, Math.floor((winRate - 0.3) * 5))
  }
  if (played >= 20 && totalScore > 5000) difficulty = Math.min(difficulty + 1, 4)

  return difficulty
}

export function getGameConfig(gameId, difficulty) {
  const curve = DIFFICULTY_CURVES[gameId]
  if (!curve) return {}

  const d = Math.max(-2, Math.min(4, difficulty))

  switch (gameId) {
    case 'snake':
      return {
        speed: Math.max(curve.speedMin, curve.speedStart - d * 15),
      }
    case 'tetris':
      return {
        dropInterval: Math.max(curve.dropMin, curve.dropStart - d * 100),
        linesPerLevel: curve.linesPerLevel,
      }
    case 'flappy':
      return {
        gap: Math.max(curve.gapMin, curve.gapStart - d * 10),
        speed: Math.min(curve.speedMax, curve.speedStart + d * 0.3),
      }
    case 'breakout':
      return {
        ballSpeed: Math.min(curve.ballSpeedMax, curve.ballSpeedStart + d * 0.5),
      }
    case 'dodge':
      return {
        spawnRate: Math.max(curve.spawnRateMin, curve.spawnRateStart - d * 150),
        obstacleSpeed: Math.min(curve.obstacleSpeedMax, curve.obstacleSpeedStart + d * 0.5),
      }
    case 'whack':
      return {
        moleSpeed: Math.max(curve.moleSpeedMin, curve.moleSpeedStart - d * 150),
        moleCount: Math.min(curve.moleCountMax, curve.moleCountStart + Math.floor(d / 2)),
      }
    default:
      return {}
  }
}

export function calculateDynamicScore(gameId, baseScore, streak, difficulty, timeMs) {
  let multiplier = 1

  if (streak >= 3) multiplier += 0.1 * Math.min(streak - 2, 5)
  if (difficulty > 0) multiplier += difficulty * 0.15

  if (gameId === 'reaction' || gameId === 'typing' || gameId === 'mathdash') {
    if (timeMs < 300) multiplier *= 2
    else if (timeMs < 500) multiplier *= 1.5
    else if (timeMs < 800) multiplier *= 1.2
  }

  if (gameId === 'snake' || gameId === 'tetris' || gameId === 'flappy') {
    multiplier += Math.min(baseScore / 500, 1)
  }

  return Math.round(baseScore * multiplier)
}
