const crypto = require('crypto')

const MATCH_TIMEOUT_MS = 30000
const PONG_TICK_MS = 16
const PONG_W = 480
const PONG_H = 320
const PONG_PADDLE_W = 10
const PONG_PADDLE_OFFSET = 20
const PONG_PADDLE_HEIGHT = 70
const PONG_BALL_RADIUS = 7
const PONG_BALL_SPEED = 5
const PONG_WIN_SCORE = 7
const TYPING_TIME_LIMIT = 30000
const RPS_CHOOSE_TIME = 10000
const RPS_ROUNDS_TO_WIN = 3
const RPS_BEST_OF = 5

const TYPING_SENTENCES = [
  'The quick brown fox jumps over the lazy dog',
  'Pack my box with five dozen liquor jugs',
  'How vexingly quick daft zebras jump',
  'The five boxing wizards jump quickly',
  'Sphinx of black quartz judge my vow',
  'Two driven jocks help fax my big quiz',
  'The jay pig fox zebra bounced my car',
  'Crazy Frederick bought many very exquisite opal jewels',
  'We promptly judged antique ivory buckles for the next prize',
  'A mad boxer shot a quick gloved jab to the jaw',
  'The quick brown fox jumps over the lazy dog near the bank of the river',
  'Amazingly few discotheques provide jukeboxes',
  'Jackdaws love my big sphinx of quartz',
  'Mr Jock TV quiz PhD bags few lynx',
  'Bright vixens jump dozy fowl quack',
  'The job requires extra pluck and zeal from every young wage earner',
  'Jaded zombies acted quaintly but kept driving their oxen forward',
  'A wizard quick study of levitation can baffled zphinx',
  'Pack my red box with five dozen liquor jugs',
  'The fox jumped quickly over the lazy brown dog',
]

function genRoomId() {
  return 'pvp_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex')
}

function pickSentence() {
  return TYPING_SENTENCES[Math.floor(Math.random() * TYPING_SENTENCES.length)]
}

function rpsResult(a, b) {
  if (a === b) return 'draw'
  if ((a === 'rock' && b === 'scissors') || (a === 'paper' && b === 'rock') || (a === 'scissors' && b === 'paper')) return 'p1'
  return 'p2'
}

module.exports = function initPvP(io) {
  const queue = new Map()
  const rooms = new Map()
  const socketToRoom = new Map()

  function cleanupRoom(roomId) {
    const room = rooms.get(roomId)
    if (!room) return
    if (room.pongLoop) clearInterval(room.pongLoop)
    if (room.typingTimer) clearTimeout(room.typingTimer)
    if (room.rpsTimer) clearTimeout(room.rpsTimer)
    for (const p of room.players) {
      socketToRoom.delete(p.socketId)
    }
    rooms.delete(roomId)
  }

  function removePlayerFromQueue(socketId) {
    const entry = queue.get(socketId)
    if (!entry) return
    clearTimeout(entry.timeout)
    queue.delete(socketId)
  }

  function findMatch(socketId) {
    const entry = queue.get(socketId)
    if (!entry) return

    for (const [otherId, other] of queue) {
      if (otherId === socketId) continue
      if (other.gameId !== entry.gameId) continue

      removePlayerFromQueue(otherId)
      removePlayerFromQueue(socketId)
      createRoom(entry.gameId, entry, other)
      return
    }

    entry.timeout = setTimeout(() => {
      queue.delete(socketId)
      const s = io.sockets.sockets.get(socketId)
      if (s) s.emit('match:timeout')
    }, MATCH_TIMEOUT_MS)
  }

  function createRoom(gameId, player1, player2) {
    const roomId = genRoomId()
    const room = {
      id: roomId,
      gameId,
      players: [
        { socketId: player1.socketId, userId: player1.userId, username: player1.username },
        { socketId: player2.socketId, userId: player2.userId, username: player2.username },
      ],
      state: null,
      pongLoop: null,
      typingTimer: null,
      rpsTimer: null,
    }
    rooms.set(roomId, room)
    socketToRoom.set(player1.socketId, roomId)
    socketToRoom.set(player2.socketId, roomId)

    for (const p of room.players) {
      const s = io.sockets.sockets.get(p.socketId)
      if (s) {
        s.join(roomId)
        s.emit('match:found', {
          roomId,
          gameId,
          opponent: room.players.find(x => x.socketId !== p.socketId),
          side: p.socketId === player1.socketId ? 'p1' : 'p2',
        })
      }
    }

    if (gameId === 'pong') initPong(room)
    else if (gameId === 'typing') initTyping(room)
    else if (gameId === 'rps') initRps(room)
  }

  function broadcastToRoom(roomId, event, data) {
    io.to(roomId).emit(event, data)
  }

  function getOpponent(room, socketId) {
    return room.players.find(p => p.socketId !== socketId)
  }

  // ==================== PONG ====================

  function initPong(room) {
    const paddleH = PONG_PADDLE_HEIGHT
    room.state = {
      p1Y: PONG_H / 2,
      p2Y: PONG_H / 2,
      ballX: PONG_W / 2,
      ballY: PONG_H / 2,
      ballVX: 0,
      ballVY: 0,
      p1Score: 0,
      p2Score: 0,
      rally: 0,
      started: false,
    }

    broadcastToRoom(room.id, 'game:start', {
      p1: room.players[0],
      p2: room.players[1],
    })

    startPongBall(room)

    if (room.pongLoop) clearInterval(room.pongLoop)
    room.pongLoop = setInterval(() => tickPong(room), PONG_TICK_MS)
  }

  function startPongBall(room) {
    const s = room.state
    s.ballX = PONG_W / 2
    s.ballY = PONG_H / 2
    const angle = (Math.random() * Math.PI / 4) - Math.PI / 8
    const dir = Math.random() < 0.5 ? 1 : -1
    s.ballVX = dir * Math.cos(angle) * PONG_BALL_SPEED
    s.ballVY = Math.sin(angle) * PONG_BALL_SPEED
    s.rally = 0
  }

  function tickPong(room) {
    const s = room.state
    if (!s || s.gameOver) return

    s.ballX += s.ballVX
    s.ballY += s.ballVY

    if (s.ballY - PONG_BALL_RADIUS <= 0) {
      s.ballY = PONG_BALL_RADIUS
      s.ballVY = Math.abs(s.ballVY)
    } else if (s.ballY + PONG_BALL_RADIUS >= PONG_H) {
      s.ballY = PONG_H - PONG_BALL_RADIUS
      s.ballVY = -Math.abs(s.ballVY)
    }

    const p1PaddleX = PONG_PADDLE_OFFSET + PONG_PADDLE_W
    if (s.ballVX < 0 && s.ballX - PONG_BALL_RADIUS <= p1PaddleX && s.ballX + PONG_BALL_RADIUS >= PONG_PADDLE_OFFSET) {
      if (s.ballY >= s.p1Y - PONG_PADDLE_HEIGHT / 2 && s.ballY <= s.p1Y + PONG_PADDLE_HEIGHT / 2) {
        s.ballX = p1PaddleX + PONG_BALL_RADIUS
        const hitPos = (s.ballY - s.p1Y) / (PONG_PADDLE_HEIGHT / 2)
        const angle = hitPos * (Math.PI / 4)
        const speed = Math.sqrt(s.ballVX * s.ballVX + s.ballVY * s.ballVY) * 1.05
        s.ballVX = Math.abs(Math.cos(angle)) * speed
        s.ballVY = Math.sin(angle) * speed
        s.rally++
      }
    }

    const p2PaddleX = PONG_W - PONG_PADDLE_OFFSET - PONG_PADDLE_W
    if (s.ballVX > 0 && s.ballX + PONG_BALL_RADIUS >= p2PaddleX && s.ballX - PONG_BALL_RADIUS <= PONG_W - PONG_PADDLE_OFFSET) {
      if (s.ballY >= s.p2Y - PONG_PADDLE_HEIGHT / 2 && s.ballY <= s.p2Y + PONG_PADDLE_HEIGHT / 2) {
        s.ballX = p2PaddleX - PONG_BALL_RADIUS
        const hitPos = (s.ballY - s.p2Y) / (PONG_PADDLE_HEIGHT / 2)
        const angle = hitPos * (Math.PI / 4)
        const speed = Math.sqrt(s.ballVX * s.ballVX + s.ballVY * s.ballVY) * 1.05
        s.ballVX = -Math.abs(Math.cos(angle)) * speed
        s.ballVY = Math.sin(angle) * speed
        s.rally++
      }
    }

    if (s.ballX < -PONG_BALL_RADIUS * 2) {
      s.p2Score++
      if (s.p2Score >= PONG_WIN_SCORE) {
        endPong(room, room.players[1])
        return
      }
      startPongBall(room)
    } else if (s.ballX > PONG_W + PONG_BALL_RADIUS * 2) {
      s.p1Score++
      if (s.p1Score >= PONG_WIN_SCORE) {
        endPong(room, room.players[0])
        return
      }
      startPongBall(room)
    }

    broadcastToRoom(room.id, 'game:state', {
      ballX: Math.round(s.ballX),
      ballY: Math.round(s.ballY),
      p1Y: Math.round(s.p1Y),
      p2Y: Math.round(s.p2Y),
      p1Score: s.p1Score,
      p2Score: s.p2Score,
      rally: s.rally,
    })
  }

  function endPong(room, winner) {
    room.state.gameOver = true
    if (room.pongLoop) clearInterval(room.pongLoop)
    broadcastToRoom(room.id, 'game:over', {
      winnerId: winner.userId,
      winnerName: winner.username,
      score: { p1: room.state.p1Score, p2: room.state.p2Score },
    })
    setTimeout(() => cleanupRoom(room.id), 5000)
  }

  // ==================== TYPING ====================

  function initTyping(room) {
    const sentence = pickSentence()
    room.state = {
      sentence,
      p1Finished: false,
      p2Finished: false,
      p1Progress: { wpm: 0, accuracy: 0 },
      p2Progress: { wpm: 0, accuracy: 0 },
      p1FinishTime: null,
      p2FinishTime: null,
      gameOver: false,
    }

    broadcastToRoom(room.id, 'game:start', {
      sentence,
      timeLimit: TYPING_TIME_LIMIT,
      p1: room.players[0],
      p2: room.players[1],
    })

    room.typingTimer = setTimeout(() => {
      endTyping(room)
    }, TYPING_TIME_LIMIT + 2000)
  }

  function endTyping(room) {
    if (room.state.gameOver) return
    room.state.gameOver = true
    if (room.typingTimer) clearTimeout(room.typingTimer)

    const s = room.state
    let winner
    if (s.p1Finished && !s.p2Finished) winner = room.players[0]
    else if (s.p2Finished && !s.p1Finished) winner = room.players[1]
    else if (s.p1Progress.wpm > s.p2Progress.wpm) winner = room.players[0]
    else if (s.p2Progress.wpm > s.p1Progress.wpm) winner = room.players[1]
    else if (s.p1Progress.accuracy > s.p2Progress.accuracy) winner = room.players[0]
    else winner = null

    broadcastToRoom(room.id, 'game:over', {
      winnerId: winner?.userId || null,
      winnerName: winner?.username || null,
      p1: { ...s.p1Progress, finished: s.p1Finished },
      p2: { ...s.p2Progress, finished: s.p2Finished },
    })
    setTimeout(() => cleanupRoom(room.id), 5000)
  }

  // ==================== RPS ====================

  function initRps(room) {
    room.state = {
      round: 0,
      p1Wins: 0,
      p2Wins: 0,
      draws: 0,
      p1Choice: null,
      p2Choice: null,
      choosing: false,
      roundResult: null,
      gameOver: false,
      history: [],
    }

    broadcastToRoom(room.id, 'game:start', {
      p1: room.players[0],
      p2: room.players[1],
      bestOf: RPS_BEST_OF,
    })

    setTimeout(() => startRpsRound(room), 1500)
  }

  function startRpsRound(room) {
    if (room.state.gameOver) return
    const s = room.state
    s.round++
    s.p1Choice = null
    s.p2Choice = null
    s.choosing = true
    s.roundResult = null

    broadcastToRoom(room.id, 'game:round', {
      round: s.round,
      p1Wins: s.p1Wins,
      p2Wins: s.p2Wins,
    })

    if (room.rpsTimer) clearTimeout(room.rpsTimer)
    room.rpsTimer = setTimeout(() => {
      if (s.choosing) {
        if (!s.p1Choice && !s.p2Choice) {
          s.draws++
          s.roundResult = { p1: null, p2: null, result: 'draw' }
        } else if (!s.p1Choice) {
          s.p2Wins++
          s.roundResult = { p1: null, p2: s.p2Choice, result: 'p2' }
        } else {
          s.p1Wins++
          s.roundResult = { p1: s.p1Choice, p2: null, result: 'p1' }
        }
        s.choosing = false
        broadcastToRoom(room.id, 'game:result', s.roundResult)
        checkRpsGameOver(room)
      }
    }, RPS_CHOOSE_TIME)
  }

  function handleRpsChoice(room, socketId, choice) {
    const s = room.state
    if (!s.choosing || s.gameOver) return
    if (!['rock', 'paper', 'scissors'].includes(choice)) return

    const isP1 = room.players[0].socketId === socketId
    if (isP1) s.p1Choice = choice
    else s.p2Choice = choice

    if (s.p1Choice && s.p2Choice) {
      if (room.rpsTimer) clearTimeout(room.rpsTimer)
      s.choosing = false
      const result = rpsResult(s.p1Choice, s.p2Choice)
      if (result === 'draw') s.draws++
      else if (result === 'p1') s.p1Wins++
      else s.p2Wins++
      s.roundResult = { p1: s.p1Choice, p2: s.p2Choice, result }
      s.history.push({ round: s.round, ...s.roundResult })
      broadcastToRoom(room.id, 'game:result', s.roundResult)
      checkRpsGameOver(room)
    } else {
      broadcastToRoom(room.id, 'rps:waiting', { choseBy: isP1 ? 'p1' : 'p2' })
    }
  }

  function checkRpsGameOver(room) {
    const s = room.state
    const winsNeeded = Math.ceil(RPS_BEST_OF / 2)
    let winner = null
    if (s.p1Wins >= winsNeeded) winner = room.players[0]
    else if (s.p2Wins >= winsNeeded) winner = room.players[1]
    else if (s.round >= RPS_BEST_OF) {
      if (s.p1Wins > s.p2Wins) winner = room.players[0]
      else if (s.p2Wins > s.p1Wins) winner = room.players[1]
    }

    if (winner || s.round >= RPS_BEST_OF) {
      s.gameOver = true
      broadcastToRoom(room.id, 'game:over', {
        winnerId: winner?.userId || null,
        winnerName: winner?.username || null,
        score: { p1: s.p1Wins, p2: s.p2Wins, draws: s.draws },
        history: s.history,
      })
      setTimeout(() => cleanupRoom(room.id), 5000)
    } else {
      setTimeout(() => startRpsRound(room), 2000)
    }
  }

  // ==================== SOCKET HANDLERS ====================

  io.on('connection', (socket) => {
    socket.on('match:join', (data) => {
      const { gameId, userId, username } = data || {}
      if (!gameId) return
      removePlayerFromQueue(socket.id)

      const existingRoom = socketToRoom.get(socket.id)
      if (existingRoom) return

      queue.set(socket.id, {
        socketId: socket.id,
        gameId,
        userId: userId || 'guest',
        username: username || 'Anonymous',
        timeout: null,
        joinedAt: Date.now(),
      })

      socket.emit('match:queued', { position: queue.size, gameId })
      findMatch(socket.id)
    })

    socket.on('match:leave', () => {
      removePlayerFromQueue(socket.id)
    })

    socket.on('paddle:move', (data) => {
      const roomId = socketToRoom.get(socket.id)
      if (!roomId) return
      const room = rooms.get(roomId)
      if (!room || room.gameId !== 'pong') return
      const y = Math.max(PONG_PADDLE_HEIGHT / 2, Math.min(PONG_H - PONG_PADDLE_HEIGHT / 2, Number(data?.y) || PONG_H / 2))

      const isP1 = room.players[0].socketId === socket.id
      if (isP1) room.state.p1Y = y
      else room.state.p2Y = y
    })

    socket.on('typing:progress', (data) => {
      const roomId = socketToRoom.get(socket.id)
      if (!roomId) return
      const room = rooms.get(roomId)
      if (!room || room.gameId !== 'typing' || room.state.gameOver) return

      const isP1 = room.players[0].socketId === socket.id
      const progress = { wpm: Math.min(200, Math.max(0, Number(data?.wpm) || 0)), accuracy: Math.min(100, Math.max(0, Number(data?.accuracy) || 0)) }

      if (isP1) room.state.p1Progress = progress
      else room.state.p2Progress = progress

      const opp = getOpponent(room, socket.id)
      if (opp) {
        const oppSocket = io.sockets.sockets.get(opp.socketId)
        if (oppSocket) oppSocket.emit('game:progress', { ...progress, by: isP1 ? 'p1' : 'p2' })
      }
    })

    socket.on('typing:finish', () => {
      const roomId = socketToRoom.get(socket.id)
      if (!roomId) return
      const room = rooms.get(roomId)
      if (!room || room.gameId !== 'typing' || room.state.gameOver) return

      const isP1 = room.players[0].socketId === socket.id
      if (isP1) {
        room.state.p1Finished = true
        room.state.p1FinishTime = Date.now()
      } else {
        room.state.p2Finished = true
        room.state.p2FinishTime = Date.now()
      }

      if (room.state.p1Finished && room.state.p2Finished) endTyping(room)
    })

    socket.on('rps:choose', (data) => {
      const roomId = socketToRoom.get(socket.id)
      if (!roomId) return
      const room = rooms.get(roomId)
      if (!room || room.gameId !== 'rps') return
      handleRpsChoice(room, socket.id, data?.choice)
    })

    socket.on('disconnect', () => {
      removePlayerFromQueue(socket.id)

      const roomId = socketToRoom.get(socket.id)
      if (!roomId) return
      const room = rooms.get(roomId)

      if (room) {
        const opp = getOpponent(room, socket.id)
        if (opp) {
          const oppSocket = io.sockets.sockets.get(opp.socketId)
          if (oppSocket) oppSocket.emit('game:opponent-disconnected')
        }
        cleanupRoom(roomId)
      }
    })
  })

  return { queue, rooms }
}
