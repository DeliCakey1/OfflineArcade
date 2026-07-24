import { useState, useMemo } from 'react'
import useSound from '../useSound'
import { TITLES, ALL_NAMEPLATES, RARITY_COLORS, TOURNAMENT_TICKET, getSeasonalItems } from '../shopItems'

const NAMEPLATE_TABS = [
  { id: 'colors', label: 'Colors', emoji: '🎨' },
  { id: 'gradients', label: 'Gradients', emoji: '🌈' },
  { id: 'borders', label: 'Borders', emoji: '🔲' },
  { id: 'effects', label: 'Effects', emoji: '✨' },
]

function TitleCard({ item, owned, equipped, coins, onBuy, onEquip, isAdmin }) {
  const canAfford = coins >= item.price
  const rarityColor = RARITY_COLORS[item.rarity] || '#a3a3a3'
  const isLocked = item.adminOnly && !isAdmin

  return (
    <div className={`shop-card ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}`}>
      <div className="shop-card-top">
        <span className="shop-card-emoji">{item.emoji}</span>
        <span className="shop-card-rarity" style={{ color: rarityColor }}>{item.rarity}</span>
      </div>
      <div className="shop-card-name">{item.name}</div>
      {item.adminOnly && <div className="shop-card-admin-badge">🔑 Admin Only</div>}
      {item.championOnly && !isAdmin && <div className="shop-card-champion-badge">Champion Only</div>}
      <div className="shop-card-bottom">
        {isLocked ? (
          <button className="shop-card-btn disabled" disabled>🔒 Admin Only</button>
        ) : equipped ? (
          <button className="shop-card-btn equipped-btn" onClick={() => onEquip(null)}>Equipped ✓</button>
        ) : owned ? (
          <button className="shop-card-btn equip-btn" onClick={() => onEquip(item.id)}>Equip</button>
        ) : (
          <button
            className={`shop-card-btn buy-btn ${!canAfford ? 'disabled' : ''}`}
            onClick={() => canAfford && onBuy(item.id, item.price)}
            disabled={!canAfford}
          >
            🪙 {item.price}
          </button>
        )}
      </div>
    </div>
  )
}

function NameplateCard({ item, owned, equipped, coins, onBuy, onEquip, isAdmin }) {
  const canAfford = coins >= item.price
  const isLocked = item.adminOnly && !isAdmin
  const [hoverKey, setHoverKey] = useState(0)

  function renderPreview() {
    if (item.type === 'solid') {
      return <span className="np-preview-text" style={{ color: item.color }}>{item.name}</span>
    }
    if (item.type === 'gradient') {
      return <span className="np-preview-text" style={{ background: item.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{item.name}</span>
    }
    if (item.type === 'border') {
      const borderStyle = item.gradientBorder
        ? { borderImage: `${item.gradientBorder} 1`, borderImageSlice: 1 }
        : { borderColor: item.borderColor }
      return <span className="np-preview-text np-border-preview" style={{ ...borderStyle, borderWidth: 2, borderStyle: 'solid', padding: '2px 8px' }}>{item.name}</span>
    }
    if (item.type === 'effect') {
      if (item.neonColor) {
        return <span className="np-preview-text" style={{ color: item.neonColor, textShadow: `0 0 8px ${item.neonColor}, 0 0 16px ${item.neonColor}` }}>{item.name}</span>
      }
      if (item.id === 'np-fx-rainbow-wave') {
        return <span key={hoverKey} className="np-preview-text np-rainbow-text">{item.name}</span>
      }
      if (item.id === 'np-fx-gold-shimmer') {
        return <span key={hoverKey} className="np-preview-text np-gold-shimmer-text">{item.name}</span>
      }
      if (item.id === 'np-fx-champion-glow') {
        return <span key={hoverKey} className="np-preview-text" style={{ color: '#ffd700', textShadow: '0 0 12px #ffd700, 0 0 24px #ff6b2b' }}>{item.name}</span>
      }
      if (item.id === 'np-fx-diamond-dust') {
        return <span key={hoverKey} className="np-preview-text np-diamond-text">{item.name}</span>
      }
      if (item.id === 'np-fx-smash') {
        return <span key={hoverKey} className="np-preview-text np-fx-smash">{item.name}</span>
      }
      if (item.id === 'np-fx-spin-in') {
        return <span key={hoverKey} className="np-preview-text np-fx-spin-in">{item.name}</span>
      }
      if (item.id === 'np-fx-pop-out') {
        return <span key={hoverKey} className="np-preview-text np-fx-pop-out">{item.name}</span>
      }
      if (item.id === 'np-fx-glitch') {
        return <span key={hoverKey} className="np-preview-text np-fx-glitch">{item.name}</span>
      }
      if (item.id === 'np-fx-float') {
        return <span key={hoverKey} className="np-preview-text np-fx-float">{item.name}</span>
      }
      if (item.id === 'np-fx-pulse') {
        return <span key={hoverKey} className="np-preview-text np-fx-pulse">{item.name}</span>
      }
      if (item.id === 'np-fx-fire') {
        return <span key={hoverKey} className="np-preview-text np-fx-fire">{item.name}</span>
      }
      if (item.id === 'np-fx-electric') {
        return <span key={hoverKey} className="np-preview-text np-fx-electric">{item.name}</span>
      }
      if (item.id === 'np-fx-frost') {
        return <span key={hoverKey} className="np-preview-text np-fx-frost">{item.name}</span>
      }
      if (item.id === 'np-fx-toxic') {
        return <span key={hoverKey} className="np-preview-text np-fx-toxic">{item.name}</span>
      }
      if (item.id === 'np-fx-hologram') {
        return <span key={hoverKey} className="np-preview-text np-fx-hologram">{item.name}</span>
      }
      if (item.id === 'np-fx-ghost') {
        return <span key={hoverKey} className="np-preview-text np-fx-ghost">{item.name}</span>
      }
      if (item.id === 'np-fx-scanner') {
        return <span key={hoverKey} className="np-preview-text np-fx-scanner">{item.name}</span>
      }
      if (item.id === 'np-fx-wobble') {
        return <span key={hoverKey} className="np-preview-text np-fx-wobble">{item.name}</span>
      }
      if (item.id === 'np-fx-stroke') {
        return <span key={hoverKey} className="np-preview-text np-fx-stroke">{item.name}</span>
      }
      if (item.id === 'np-fx-matrix') {
        return <span key={hoverKey} className="np-preview-text np-fx-matrix">{item.name}</span>
      }
      if (item.id === 'np-fx-comet') {
        return <span key={hoverKey} className="np-preview-text np-fx-comet">{item.name}</span>
      }
      if (item.id === 'np-fx-breathe') {
        return <span key={hoverKey} className="np-preview-text np-fx-breathe">{item.name}</span>
      }
      return <span className="np-preview-text">{item.name}</span>
    }
    return <span className="np-preview-text">{item.name}</span>
  }

  return (
    <div className={`shop-card ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}`}>
      <div className="shop-card-preview" onMouseEnter={() => setHoverKey(k => k + 1)}>
        {renderPreview()}
      </div>
      <div className="shop-card-name">{item.name}</div>
      {item.adminOnly && <div className="shop-card-admin-badge">🔑 Admin Only</div>}
      {item.championOnly && !isAdmin && <div className="shop-card-champion-badge">Champion Only</div>}
      <div className="shop-card-bottom">
        {isLocked ? (
          <button className="shop-card-btn disabled" disabled>🔒 Admin Only</button>
        ) : equipped ? (
          <button className="shop-card-btn equipped-btn" onClick={() => onEquip(null)}>Equipped ✓</button>
        ) : owned ? (
          <button className="shop-card-btn equip-btn" onClick={() => onEquip(item.id)}>Equip</button>
        ) : (
          <button
            className={`shop-card-btn buy-btn ${!canAfford ? 'disabled' : ''}`}
            onClick={() => canAfford && onBuy(item.id, item.price)}
            disabled={!canAfford}
          >
            🪙 {item.price}
          </button>
        )}
      </div>
    </div>
  )
}

export default function ShopPage({ onBack, coins, tournamentTickets, ownedItems, activeTitle, activeNameplate, activeNameplateEffect, onPurchase, onEquipTitle, onEquipNameplate, onEquipNameplateEffect, isChampion, isAdmin }) {
  const [tab, setTab] = useState('titles')
  const [npTab, setNpTab] = useState('colors')
  const sound = useSound()
  const [showBought, setShowBought] = useState(null)

  function handleBuy(itemId, price) {
    onPurchase(itemId, price)
    sound('cash')
    setShowBought(itemId)
    setTimeout(() => setShowBought(null), 1500)
  }

  const filteredTitles = useMemo(() => isAdmin ? TITLES : TITLES.filter(t => !t.championOnly || isChampion), [isAdmin, isChampion])

  const filteredNameplates = useMemo(() => ALL_NAMEPLATES.filter(np => {
    if (!isAdmin && np.championOnly && !isChampion) return false
    if (!isAdmin && np.adminOnly) return false
    if (npTab === 'colors') return np.type === 'solid'
    if (npTab === 'gradients') return np.type === 'gradient' || np.id.startsWith('np-fx-neon') || np.id === 'np-fx-gold-shimmer'
    if (npTab === 'borders') return np.type === 'border'
    if (npTab === 'effects') return np.type === 'effect' && !np.id.startsWith('np-fx-neon') && np.id !== 'np-fx-gold-shimmer'
    return false
  }), [isAdmin, isChampion, npTab])

  const equipHandler = (item) => item.type === 'effect' ? onEquipNameplateEffect : onEquipNameplate
  const activeSlotFor = (item) => item.type === 'effect' ? activeNameplateEffect : activeNameplate

  return (
    <div className="full-page">
      <div className="full-page-header">
        <button className="quit-btn" onClick={onBack}>← Back</button>
        <h2 className="full-page-title">🛒 Shop</h2>
        <div className="shop-coins-badge">🪙 {coins.toLocaleString()}</div>
      </div>

      <div className="shop-tabs">
        <button className={`shop-tab ${tab === 'seasonal' ? 'active' : ''}`} onClick={() => { setTab('seasonal'); sound('click') }}>
          🌸 Seasonal
        </button>
        <button className={`shop-tab ${tab === 'titles' ? 'active' : ''}`} onClick={() => { setTab('titles'); sound('click') }}>
          🏷️ Titles
        </button>
        <button className={`shop-tab ${tab === 'nameplates' ? 'active' : ''}`} onClick={() => { setTab('nameplates'); sound('click') }}>
          ✨ Nameplates
        </button>
        <button className={`shop-tab ${tab === 'tickets' ? 'active' : ''}`} onClick={() => { setTab('tickets'); sound('click') }}>
          🎫 Tickets
        </button>
      </div>

      {showBought && (
        <div className="shop-bought-toast">Purchased!</div>
      )}

      {tab === 'seasonal' && (
        <div className="full-page-content">
          <p className="shop-section-desc">🌸 Limited-time seasonal items — available for a limited time only!</p>
          <div className="shop-grid">
            {getSeasonalItems().map(item => (
              item.category === 'titles' ? (
                <TitleCard
                  key={item.id}
                  item={item}
                  owned={(ownedItems || []).includes(item.id)}
                  equipped={activeTitle === item.id}
                  coins={coins}
                  onBuy={handleBuy}
                  onEquip={onEquipTitle}
                  isAdmin={isAdmin}
                />
              ) : (
                <NameplateCard
                  key={item.id}
                  item={item}
                  owned={(ownedItems || []).includes(item.id)}
                  equipped={activeSlotFor(item) === item.id}
                  coins={coins}
                  onBuy={handleBuy}
                  onEquip={equipHandler(item)}
                  isAdmin={isAdmin}
                />
              )
            ))}
          </div>
        </div>
      )}

      {tab === 'titles' && (
        <div className="full-page-content">
          <p className="shop-section-desc">Titles appear below your name in league standings.</p>
          <div className="shop-grid">
            {filteredTitles.map(item => (
              <TitleCard
                key={item.id}
                item={item}
                owned={(ownedItems || []).includes(item.id)}
                equipped={activeTitle === item.id}
                coins={coins}
                onBuy={handleBuy}
                onEquip={onEquipTitle}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>
      )}

      {tab === 'nameplates' && (
        <div className="full-page-content">
          <div className="shop-sub-tabs">
            {NAMEPLATE_TABS.map(t => (
              <button key={t.id} className={`shop-sub-tab ${npTab === t.id ? 'active' : ''}`} onClick={() => { setNpTab(t.id); sound('click') }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          {(npTab === 'colors' || npTab === 'gradients') && (
            <p className="shop-section-desc">{npTab === 'gradients' ? 'Gradients set your text color. Neon and shimmer effects equip to the effect slot.' : 'Color nameplates set your text color. Equipped in the color slot.'}</p>
          )}
          {(npTab === 'borders' || npTab === 'effects') && (
            <p className="shop-section-desc">Borders and animation effects can be equipped alongside a color. Equipped in the effect slot.</p>
          )}
          <div className="shop-grid">
            {filteredNameplates.map(item => (
              <NameplateCard
                key={item.id}
                item={item}
                owned={(ownedItems || []).includes(item.id)}
                equipped={activeSlotFor(item) === item.id}
                coins={coins}
                onBuy={handleBuy}
                onEquip={equipHandler(item)}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>
      )}

      {tab === 'tickets' && (
        <div className="full-page-content">
          <p className="shop-section-desc">Tickets grant access to exclusive events. Each ticket is consumed on entry.</p>
          <div className="shop-tickets-info">
            <div className="shop-ticket-card">
              <div className="shop-ticket-header">
                <span className="shop-ticket-emoji">{TOURNAMENT_TICKET.emoji}</span>
                <div className="shop-ticket-info">
                  <h3 className="shop-ticket-name">{TOURNAMENT_TICKET.name}</h3>
                  <p className="shop-ticket-desc">{TOURNAMENT_TICKET.description}</p>
                </div>
              </div>
              <div className="shop-ticket-footer">
                <span className="shop-ticket-owned">Owned: {tournamentTickets || 0}</span>
                {coins >= TOURNAMENT_TICKET.price ? (
                  <button className="shop-card-btn buy-btn" onClick={() => handleBuy(TOURNAMENT_TICKET.id, TOURNAMENT_TICKET.price)}>
                    🪙 {TOURNAMENT_TICKET.price.toLocaleString()}
                  </button>
                ) : (
                  <button className="shop-card-btn buy-btn disabled" disabled>
                    🪙 {TOURNAMENT_TICKET.price.toLocaleString()}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
