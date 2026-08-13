import { useState, useMemo, useEffect } from 'react'
import useSound from '../useSound'
import { ensureAuth } from '../firebase'
import { TITLES, ALL_NAMEPLATES, RARITY_COLORS, TOURNAMENT_TICKET, getSeasonalItems, salePercentFor, salePriceFor } from '../shopItems'

const NAMEPLATE_TABS = [
  { id: 'colors', label: 'Colors', emoji: '🎨' },
  { id: 'gradients', label: 'Gradients', emoji: '🌈' },
  { id: 'borders', label: 'Borders', emoji: '🔲' },
  { id: 'effects', label: 'Effects', emoji: '✨' },
]

function TitleCard({ item, owned, equipped, coins, onBuy, onEquip, isAdmin, saleItems }) {
  const salePercent = salePercentFor(saleItems, item.id)
  const price = salePriceFor(item, saleItems)
  const canAfford = coins >= price
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
      {salePercent > 0 && <div className="shop-card-sale-badge">-{salePercent}%</div>}
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
            onClick={() => canAfford && onBuy(item.id, price)}
            disabled={!canAfford}
          >
            {salePercent > 0 && <span className="shop-card-old-price">🪙 {item.price}</span>}
            🪙 {price}
          </button>
        )}
      </div>
    </div>
  )
}

function NameplateCard({ item, owned, equipped, coins, onBuy, onEquip, isAdmin, saleItems }) {
  const salePercent = salePercentFor(saleItems, item.id)
  const price = salePriceFor(item, saleItems)
  const canAfford = coins >= price
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
      {salePercent > 0 && <div className="shop-card-sale-badge">-{salePercent}%</div>}
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
            onClick={() => canAfford && onBuy(item.id, price)}
            disabled={!canAfford}
          >
            {salePercent > 0 && <span className="shop-card-old-price">🪙 {item.price}</span>}
            🪙 {price}
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
  const [saleItems, setSaleItems] = useState({})
  const [coinsPackages, setCoinsPackages] = useState([])
  const [coinsStatus, setCoinsStatus] = useState(null)
  const [coinsBusy, setCoinsBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    import('../leagueService').then(({ getShopSale }) => getShopSale()).then(sale => {
      if (!cancelled) setSaleItems(sale?.items || {})
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (tab !== 'coins') return
    let cancelled = false
    fetch('/api/payment/packages').then(r => r.json()).then(list => {
      if (!cancelled && Array.isArray(list)) setCoinsPackages(list)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [tab])

  async function handleBuyCoins(pkg) {
    if (coinsBusy) return
    sound('click')
    setCoinsBusy(true)
    setCoinsStatus(null)
    try {
      const user = await ensureAuth()
      if (!user) {
        setCoinsStatus('Please sign in to buy coins.')
        return
      }
      const idToken = await user.getIdToken()
      const res = await fetch('/api/payment/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
        body: JSON.stringify({ packageId: pkg.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCoinsStatus(data.error || 'Payment is unavailable right now.')
        return
      }
      window.open(data.url, '_blank')
      setCoinsStatus('Payment window opened. Your coins appear here once the payment completes.')
    } catch {
      setCoinsStatus('Could not start payment. Try again.')
    } finally {
      setCoinsBusy(false)
    }
  }

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
        <button className={`shop-tab ${tab === 'coins' ? 'active' : ''}`} onClick={() => { setTab('coins'); sound('click') }}>
          💳 Coins
        </button>
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

      {tab === 'coins' && (
        <div className="full-page-content">
          <p className="shop-section-desc">Run low? Buy more coins to spend anywhere in the shop.</p>
          {coinsStatus && <div className="shop-coins-status">{coinsStatus}</div>}
          <div className="shop-grid">
            {coinsPackages.length === 0 ? (
              <p className="shop-section-desc">Loading coin packs…</p>
            ) : coinsPackages.map(pkg => (
              <div className="shop-card" key={pkg.id}>
                <div className="shop-card-top">
                  <span className="shop-card-emoji">🪙</span>
                  <span className="shop-card-rarity">Coin Pack</span>
                </div>
                <div className="shop-card-name">{pkg.coins.toLocaleString()} Coins</div>
                <div className="shop-card-bottom">
                  <button className="shop-card-btn buy-btn" onClick={() => handleBuyCoins(pkg)} disabled={coinsBusy}>
                    💳 ${pkg.usd.toFixed(2)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
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
                  saleItems={saleItems}
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
                  saleItems={saleItems}
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
                saleItems={saleItems}
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
                saleItems={saleItems}
              />
            ))}
          </div>
        </div>
      )}

      {tab === 'tickets' && (() => {
        const ticketSalePercent = salePercentFor(saleItems, TOURNAMENT_TICKET.id)
        const ticketPrice = salePriceFor(TOURNAMENT_TICKET, saleItems)
        return (
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
                  {ticketSalePercent > 0 && <span className="shop-card-sale-badge">-{ticketSalePercent}%</span>}
                  {coins >= ticketPrice ? (
                    <button className="shop-card-btn buy-btn" onClick={() => handleBuy(TOURNAMENT_TICKET.id, ticketPrice)}>
                      {ticketSalePercent > 0 && <span className="shop-card-old-price">🪙 {TOURNAMENT_TICKET.price.toLocaleString()}</span>}
                      🪙 {ticketPrice.toLocaleString()}
                    </button>
                  ) : (
                    <button className="shop-card-btn buy-btn disabled" disabled>
                      {ticketSalePercent > 0 && <span className="shop-card-old-price">🪙 {TOURNAMENT_TICKET.price.toLocaleString()}</span>}
                      🪙 {ticketPrice.toLocaleString()}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
