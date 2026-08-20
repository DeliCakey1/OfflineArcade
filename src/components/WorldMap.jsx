import { useState, useEffect, useRef, useCallback } from 'react'
import { updatePosition, subscribeToNearbyPlayers, claimSpace, subscribeToSpaces, getMapTile, isWalkable, MAP_SIZE, SPACE_SIZE, TILE_SIZE } from '../worldService'
import useSound from '../useSound'
import PlayerSpace from './PlayerSpace'
import TradeModal from './TradeModal'

const VIEW_TILES = 15
const MOVE_KEYS = { w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }

export default function WorldMap({ userId, username, onHome, onTrade }) {
  const [playerPos, setPlayerPos] = useState({ x: 40, y: 40 })
  const [otherPlayers, setOtherPlayers] = useState([])
  const [spaces, setSpaces] = useState([])
  const [selectedSpace, setSelectedSpace] = useState(null)
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 })
  const [claimMode, setClaimMode] = useState(false)
  const [tradeTarget, setTradeTarget] = useState(null)
  const [mobileDir, setMobileDir] = useState(null)
  const mapRef = useRef(null)
  const sound = useSound()
  const lastMoveRef = useRef(0)

  useEffect(() => {
    let unsubPlayers = null
    let unsubSpaces = null
    unsubPlayers = subscribeToNearbyPlayers(setOtherPlayers)
    unsubSpaces = subscribeToSpaces(setSpaces)
    return () => { unsubPlayers?.(); unsubSpaces?.() }
  }, [])

  useEffect(() => {
    if (userId) updatePosition(playerPos.x, playerPos.y).catch(() => {})
  }, [playerPos.x, playerPos.y, userId])

  useEffect(() => {
    setViewOffset({
      x: playerPos.x - Math.floor(VIEW_TILES / 2),
      y: playerPos.y - Math.floor(VIEW_TILES / 2),
    })
  }, [playerPos])

  const move = useCallback((dx, dy) => {
    const now = Date.now()
    if (now - lastMoveRef.current < 80) return
    lastMoveRef.current = now
    setPlayerPos(prev => {
      const nx = prev.x + dx
      const ny = prev.y + dy
      if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) return prev
      if (!isWalkable(nx, ny)) return prev
      return { x: nx, y: ny }
    })
  }, [])

  useEffect(() => {
    function handleKey(e) {
      const dir = MOVE_KEYS[e.key]
      if (dir) { e.preventDefault(); move(dir[0], dir[1]) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [move])

  useEffect(() => {
    if (!mobileDir) return
    const interval = setInterval(() => {
      const dir = MOVE_KEYS[mobileDir]
      if (dir) move(dir[0], dir[1])
    }, 100)
    return () => clearInterval(interval)
  }, [mobileDir, move])

  function handleTileClick(x, y) {
    const worldX = viewOffset.x + x
    const worldY = viewOffset.y + y
    if (claimMode && userId) {
      claimSpace(worldX, worldY).then(result => {
        if (result.error) return
        sound('confirm')
        setClaimMode(false)
      })
      return
    }
    const space = spaces.find(s =>
      worldX >= s.x && worldX < s.x + SPACE_SIZE &&
      worldY >= s.y && worldY < s.y + SPACE_SIZE
    )
    if (space) {
      setSelectedSpace(space)
      sound('click')
    }
  }

  function getSpaceAt(wx, wy) {
    return spaces.find(s => wx >= s.x && wx < s.x + SPACE_SIZE && wy >= s.y && wy < s.y + SPACE_SIZE)
  }

  function getSpaceOwnerName(space) {
    const player = otherPlayers.find(p => p.id === space.ownerId)
    return player?.username || player?.name || space.name || 'Player'
  }

  const tiles = []
  for (let vy = 0; vy < VIEW_TILES; vy++) {
    for (let vx = 0; vx < VIEW_TILES; vx++) {
      const wx = viewOffset.x + vx
      const wy = viewOffset.y + vy
      const tile = getMapTile(wx, wy)
      const space = getSpaceAt(wx, wy)
      const isPlayer = wx === playerPos.x && wy === playerPos.y
      const otherHere = otherPlayers.find(p => p.x === wx && p.y === wy && p.id !== userId)
      const isClaimTile = claimMode && isWalkable(wx, wy) && !space

      tiles.push(
        <div
          key={`${vx}-${vy}`}
          className={`world-tile ${space ? 'world-tile-space' : ''} ${isPlayer ? 'world-tile-self' : ''} ${otherHere ? 'world-tile-player' : ''} ${isClaimTile ? 'world-tile-claimable' : ''}`}
          style={{ gridColumn: vx + 1, gridRow: vy + 1 }}
          onClick={() => handleTileClick(vx, vy)}
        >
          <span className="world-tile-emoji">{tile || '🟩'}</span>
          {space && (
            <div className="world-tile-space-marker">
              <span className="world-tile-home">🏠</span>
            </div>
          )}
          {isPlayer && <div className="world-tile-marker self">😊</div>}
          {otherHere && (
            <div className="world-tile-marker other" onClick={(e) => { e.stopPropagation(); setTradeTarget(otherHere) }}>
              <span>😄</span>
              <span className="world-tile-name">{otherHere.username || otherHere.name || 'Player'}</span>
            </div>
          )}
        </div>
      )
    }
  }

  return (
    <div className="world-page">
      <div className="world-header">
        <button className="world-back-btn" onClick={onHome}>← Home</button>
        <h1>🌍 World</h1>
        <div className="world-header-actions">
          <span className="world-coords">({playerPos.x}, {playerPos.y})</span>
          <button className={`world-claim-btn ${claimMode ? 'active' : ''}`} onClick={() => setClaimMode(!claimMode)}>
            {claimMode ? 'Cancel Claim' : '🏠 Claim Space'}
          </button>
        </div>
      </div>

      {claimMode && (
        <div className="world-claim-hint">Click a walkable tile to claim it as your space (500 🪙). Max 3 spaces.</div>
      )}

      <div className="world-map-container">
        <div className="world-map" ref={mapRef} style={{ display: 'grid', gridTemplateColumns: `repeat(${VIEW_TILES}, 1fr)` }}>
          {tiles}
        </div>
      </div>

      <div className="world-mobile-controls">
        <div className="world-dpad">
          <button className="world-dpad-btn up" onTouchStart={() => setMobileDir('w')} onTouchEnd={() => setMobileDir(null)} onMouseDown={() => setMobileDir('w')} onMouseUp={() => setMobileDir(null)}>▲</button>
          <div className="world-dpad-mid">
            <button className="world-dpad-btn left" onTouchStart={() => setMobileDir('a')} onTouchEnd={() => setMobileDir(null)} onMouseDown={() => setMobileDir('a')} onMouseUp={() => setMobileDir(null)}>◀</button>
            <button className="world-dpad-btn right" onTouchStart={() => setMobileDir('d')} onTouchEnd={() => setMobileDir(null)} onMouseDown={() => setMobileDir('d')} onMouseUp={() => setMobileDir(null)}>▶</button>
          </div>
          <button className="world-dpad-btn down" onTouchStart={() => setMobileDir('s')} onTouchEnd={() => setMobileDir(null)} onMouseDown={() => setMobileDir('s')} onMouseUp={() => setMobileDir(null)}>▼</button>
        </div>
      </div>

      <div className="world-players-list">
        <h3>Players Nearby ({otherPlayers.length})</h3>
        <div className="world-players-grid">
          {otherPlayers.slice(0, 20).map(p => (
            <div key={p.id} className="world-player-chip" onClick={() => setTradeTarget(p)}>
              <span className="world-player-chip-name">{p.username || p.name || 'Player'}</span>
              <span className="world-player-chip-pos">({p.x},{p.y})</span>
            </div>
          ))}
          {otherPlayers.length === 0 && <p className="world-empty">No other players nearby</p>}
        </div>
      </div>

      {selectedSpace && (
        <PlayerSpace
          space={selectedSpace}
          userId={userId}
          onClose={() => setSelectedSpace(null)}
          isOwner={selectedSpace.ownerId === userId}
          onTrade={(target) => { setSelectedSpace(null); setTradeTarget(target) }}
        />
      )}

      {tradeTarget && userId && (
        <TradeModal
          userId={userId}
          username={username}
          targetUser={tradeTarget}
          onClose={() => setTradeTarget(null)}
        />
      )}
    </div>
  )
}
