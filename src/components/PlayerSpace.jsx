import { useState } from 'react'
import { addDecoration, removeDecoration, getDecorations, SPACE_SIZE } from '../worldService'
import useSound from '../useSound'

export default function PlayerSpace({ space, userId, onClose, isOwner, onTrade }) {
  const [showShop, setShowShop] = useState(false)
  const [gridHover, setGridHover] = useState(null)
  const sound = useSound()
  const decorations = getDecorations()

  async function handlePlace(decoId, gridX, gridY) {
    sound('confirm')
    const result = await addDecoration(space.id, decoId, gridX, gridY)
    if (result.error) return
    setShowShop(false)
  }

  async function handleRemove(gridX, gridY) {
    sound('click')
    await removeDecoration(space.id, gridX, gridY)
  }

  const gridTiles = []
  for (let gy = 0; gy < SPACE_SIZE; gy++) {
    for (let gx = 0; gx < SPACE_SIZE; gx++) {
      const deco = (space.decorations || []).find(d => d.gridX === gx && d.gridY === gy)
      gridTiles.push(
        <div
          key={`${gx}-${gy}`}
          className={`space-grid-tile ${deco ? 'has-deco' : ''} ${gridHover?.x === gx && gridHover?.y === gy ? 'hover' : ''}`}
          onMouseEnter={() => setGridHover({ x: gx, y: gy })}
          onMouseLeave={() => setGridHover(null)}
          onClick={() => {
            if (deco && isOwner) handleRemove(gx, gy)
            else if (!deco && isOwner && showShop) return
            else if (!deco && isOwner) setShowShop(true)
          }}
        >
          {deco ? (
            <span className="space-deco-emoji">{deco.emoji}</span>
          ) : (
            <span className="space-empty-tile">·</span>
          )}
        </div>
      )
    }
  }

  return (
    <div className="space-overlay" onClick={onClose}>
      <div className="space-modal" onClick={e => e.stopPropagation()}>
        <div className="space-header">
          <h2>🏠 {space.name}'s Space</h2>
          <button className="space-close" onClick={onClose}>×</button>
        </div>

        <div className="space-grid">
          {gridTiles}
        </div>

        {isOwner && (
          <div className="space-owner-actions">
            <button className="space-btn" onClick={() => setShowShop(!showShop)}>
              {showShop ? 'Done Placing' : '🪙 Add Decoration'}
            </button>
          </div>
        )}

        {!isOwner && userId && (
          <div className="space-visitor-actions">
            <button className="space-btn primary" onClick={() => onTrade?.({ id: space.ownerId, username: space.name })}>
              ⚔️ Trade with {space.name}
            </button>
          </div>
        )}

        {showShop && isOwner && (
          <div className="space-shop">
            <h3>Decorations</h3>
            <div className="space-shop-grid">
              {decorations.map(d => (
                <button key={d.id} className="space-shop-item" onClick={() => {
                  const emptySlot = findEmptySlot(space.decorations || [], SPACE_SIZE)
                  if (emptySlot) handlePlace(d.id, emptySlot.x, emptySlot.y)
                }}>
                  <span className="space-shop-emoji">{d.emoji}</span>
                  <span className="space-shop-name">{d.name}</span>
                  <span className="space-shop-price">{d.price} 🪙</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function findEmptySlot(decorations, size) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!decorations.find(d => d.gridX === x && d.gridY === y)) {
        return { x, y }
      }
    }
  }
  return null
}
