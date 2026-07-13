import { useState } from 'react'
import useSound from '../useSound'
import { TITLES, ALL_NAMEPLATES, RARITY_COLORS } from '../shopItems'

const NAMEPLATE_TABS = [
  { id: 'colors', label: 'Colors', emoji: '🎨' },
  { id: 'gradients', label: 'Gradients', emoji: '🌈' },
  { id: 'borders', label: 'Borders', emoji: '🔲' },
  { id: 'effects', label: 'Effects', emoji: '✨' },
]

function TitleCard({ item, owned, equipped, coins, onBuy, onEquip, isAdmin }) {
  const canAfford = isAdmin || coins >= item.price
  const rarityColor = RARITY_COLORS[item.rarity] || '#a3a3a3'

  return (
    <div className={`shop-card ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}`}>
      <div className="shop-card-top">
        <span className="shop-card-emoji">{item.emoji}</span>
        <span className="shop-card-rarity" style={{ color: rarityColor }}>{item.rarity}</span>
      </div>
      <div className="shop-card-name">{item.name}</div>
      {item.championOnly && !isAdmin && <div className="shop-card-champion-badge">Champion Only</div>}
      {isAdmin && <div className="shop-card-admin-badge">👑 Admin</div>}
      <div className="shop-card-bottom">
        {equipped ? (
          <button className="shop-card-btn equipped-btn" onClick={() => onEquip(null)}>Equipped ✓</button>
        ) : owned ? (
          <button className="shop-card-btn equip-btn" onClick={() => onEquip(item.id)}>Equip</button>
        ) : (
          <button
            className={`shop-card-btn buy-btn ${!canAfford ? 'disabled' : ''}`}
            onClick={() => canAfford && onBuy(item.id, isAdmin ? 0 : item.price)}
            disabled={!canAfford}
          >
            {isAdmin ? '✨ Free' : `🪙 ${item.price}`}
          </button>
        )}
      </div>
    </div>
  )
}

function NameplateCard({ item, owned, equipped, coins, onBuy, onEquip, isAdmin }) {
  const canAfford = isAdmin || coins >= item.price

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
        return <span className="np-preview-text np-rainbow-text">{item.name}</span>
      }
      if (item.id === 'np-fx-gold-shimmer') {
        return <span className="np-preview-text np-gold-shimmer-text">{item.name}</span>
      }
      if (item.id === 'np-fx-champion-glow') {
        return <span className="np-preview-text" style={{ color: '#ffd700', textShadow: '0 0 12px #ffd700, 0 0 24px #ff6b2b' }}>{item.name}</span>
      }
      if (item.id === 'np-fx-diamond-dust') {
        return <span className="np-preview-text np-diamond-text">{item.name}</span>
      }
      return <span className="np-preview-text">{item.name}</span>
    }
    return <span className="np-preview-text">{item.name}</span>
  }

  return (
    <div className={`shop-card ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}`}>
      <div className="shop-card-preview">
        {renderPreview()}
      </div>
      <div className="shop-card-name">{item.name}</div>
      {item.championOnly && !isAdmin && <div className="shop-card-champion-badge">Champion Only</div>}
      {isAdmin && <div className="shop-card-admin-badge">👑 Admin</div>}
      <div className="shop-card-bottom">
        {equipped ? (
          <button className="shop-card-btn equipped-btn" onClick={() => onEquip(null)}>Equipped ✓</button>
        ) : owned ? (
          <button className="shop-card-btn equip-btn" onClick={() => onEquip(item.id)}>Equip</button>
        ) : (
          <button
            className={`shop-card-btn buy-btn ${!canAfford ? 'disabled' : ''}`}
            onClick={() => canAfford && onBuy(item.id, isAdmin ? 0 : item.price)}
            disabled={!canAfford}
          >
            {isAdmin ? '✨ Free' : `🪙 ${item.price}`}
          </button>
        )}
      </div>
    </div>
  )
}

export default function ShopPage({ onBack, coins, ownedItems, activeTitle, activeNameplate, onPurchase, onEquipTitle, onEquipNameplate, isChampion, isAdmin }) {
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

  const filteredTitles = isAdmin ? TITLES : TITLES.filter(t => !t.championOnly || isChampion)

  const filteredNameplates = ALL_NAMEPLATES.filter(np => {
    if (!isAdmin && np.championOnly && !isChampion) return false
    if (npTab === 'colors') return np.type === 'solid'
    if (npTab === 'gradients') return np.type === 'gradient'
    if (npTab === 'borders') return np.type === 'border'
    if (npTab === 'effects') return np.type === 'effect'
    return false
  })

  return (
    <div className="full-page">
      <div className="full-page-header">
        <button className="quit-btn" onClick={onBack}>← Back</button>
        <h2 className="full-page-title">🛒 Shop</h2>
        {isAdmin ? (
          <div className="shop-admin-badge">👑 Admin</div>
        ) : (
          <div className="shop-coins-badge">🪙 {coins.toLocaleString()}</div>
        )}
      </div>

      <div className="shop-tabs">
        <button className={`shop-tab ${tab === 'titles' ? 'active' : ''}`} onClick={() => { setTab('titles'); sound('click') }}>
          🏷️ Titles
        </button>
        <button className={`shop-tab ${tab === 'nameplates' ? 'active' : ''}`} onClick={() => { setTab('nameplates'); sound('click') }}>
          ✨ Nameplates
        </button>
      </div>

      {showBought && (
        <div className="shop-bought-toast">{isAdmin ? 'Admin Unlocked!' : 'Purchased!'}</div>
      )}

      {isAdmin && (
        <div className="shop-admin-banner">👑 Admin Mode — All items free, all items unlocked</div>
      )}

      {tab === 'titles' && (
        <div className="full-page-content">
          <p className="shop-section-desc">Titles appear below your name in league standings.</p>
          <div className="shop-grid">
            {filteredTitles.map(item => (
              <TitleCard
                key={item.id}
                item={item}
                owned={ownedItems.includes(item.id)}
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
          <div className="shop-grid">
            {filteredNameplates.map(item => (
              <NameplateCard
                key={item.id}
                item={item}
                owned={ownedItems.includes(item.id)}
                equipped={activeNameplate === item.id}
                coins={coins}
                onBuy={handleBuy}
                onEquip={onEquipNameplate}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
