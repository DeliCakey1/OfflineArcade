import { useState, useEffect, useCallback } from 'react'
import { createClan, joinClan, leaveClan, disbandClan, getClan, getClanMembers, searchClans, updateClan, promoteToOfficer, demoteMember, kickMember, getClanLeaderboard, CLAN_CREATE_COST } from '../clanService'
import { getOrCreatePlayer } from '../leagueService'
import useSound from '../useSound'
import ClanCard from './ClanCard'
import ClanMemberList from './ClanMemberList'

const BANNER_COLORS = [
  { id: 'purple', color: '#b946ff', label: 'Purple' },
  { id: 'blue', color: '#3b82f6', label: 'Blue' },
  { id: 'cyan', color: '#00d4ff', label: 'Cyan' },
  { id: 'green', color: '#22c55e', label: 'Green' },
  { id: 'yellow', color: '#ffe600', label: 'Yellow' },
  { id: 'orange', color: '#ff6b2b', label: 'Orange' },
  { id: 'red', color: '#ff3333', label: 'Red' },
  { id: 'pink', color: '#ff2d7b', label: 'Pink' },
  { id: 'white', color: '#ffffff', label: 'White' },
  { id: 'gold', color: '#ffd700', label: 'Gold' },
]

export default function ClanPage({ userId, username, onHome }) {
  const [clan, setClan] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('my-clan')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createTag, setCreateTag] = useState('')
  const [createColor, setCreateColor] = useState('#b946ff')
  const [error, setError] = useState('')
  const [coins, setCoins] = useState(0)
  const sound = useSound()

  const loadClan = useCallback(async () => {
    if (!userId) return
    try {
      const player = await getOrCreatePlayer(userId)
      const clanId = player?.clanId
      if (clanId) {
        const c = await getClan(clanId)
        setClan(c)
        if (c?.members) {
          const m = await getClanMembers(c.members)
          setMembers(m)
        }
      }
      setCoins(player?.coins || 0)
    } catch {}
  }, [userId])

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    loadClan().finally(() => setLoading(false))
  }, [userId, loadClan])

  useEffect(() => {
    if (tab !== 'leaderboard' || leaderboard.length > 0) return
    getClanLeaderboard().then(setLeaderboard).catch(() => {})
  }, [tab])

  async function handleSearch() {
    if (!search.trim()) return
    setSearching(true)
    try {
      const results = await searchClans(search.trim())
      setSearchResults(results)
    } catch {}
    setSearching(false)
  }

  async function handleCreate() {
    setError('')
    if (!createName.trim() || !createTag.trim()) { setError('Name and tag required'); return }
    if (coins < CLAN_CREATE_COST) { setError(`Need ${CLAN_CREATE_COST} coins`); return }
    sound('confirm')
    const result = await createClan(createName, createTag, { color: createColor, icon: '⚔️' })
    if (result.error) { setError(result.error); return }
    setClan(result)
    setCoins(c => c - CLAN_CREATE_COST)
    setCreating(false)
    setTab('my-clan')
    const m = await getClanMembers(result.members)
    setMembers(m)
  }

  async function handleJoin(clanId) {
    sound('confirm')
    const result = await joinClan(clanId)
    if (result.error) { setError(result.error); return }
    await loadClan()
    setTab('my-clan')
  }

  async function handleLeave() {
    if (!clan) return
    sound('click')
    await leaveClan(clan.id)
    setClan(null)
    setMembers([])
  }

  async function handleDisband() {
    if (!clan) return
    sound('click')
    await disbandClan(clan.id)
    setClan(null)
    setMembers([])
  }

  function getMyRole() {
    const me = members.find(m => m.id === userId)
    return me?.clanRole || 'member'
  }

  if (loading) return <div className="clan-page"><div className="loading-text">Loading clans...</div></div>

  if (!userId) {
    return (
      <div className="clan-page">
        <div className="clan-gate">
          <div className="clan-gate-icon">👥</div>
          <h2>Join the Battle Together</h2>
          <p>Sign in to create or join a clan and compete with friends.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="clan-page">
      <div className="clan-header">
        <button className="clan-back-btn" onClick={onHome}>← Home</button>
        <h1>👥 Clans</h1>
      </div>

      <div className="clan-tabs">
        {[
          { id: 'my-clan', label: 'My Clan' },
          { id: 'browse', label: 'Browse' },
          { id: 'leaderboard', label: 'Leaderboard' },
        ].map(t => (
          <button key={t.id} className={`clan-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="clan-error">{error} <button onClick={() => setError('')}>×</button></div>}

      {tab === 'my-clan' && (
        <div className="clan-my-clan">
          {!clan && !creating && (
            <div className="clan-no-clan">
              <p>You are not in a clan.</p>
              <div className="clan-actions">
                <button className="clan-btn primary" onClick={() => setCreating(true)}>
                  Create Clan ({CLAN_CREATE_COST} 🪙)
                </button>
                <button className="clan-btn secondary" onClick={() => setTab('browse')}>
                  Browse Clans
                </button>
              </div>
            </div>
          )}

          {creating && (
            <div className="clan-create-form">
              <h3>Create a Clan</h3>
              <div className="clan-form-field">
                <label>Clan Name</label>
                <input value={createName} onChange={e => setCreateName(e.target.value)} maxLength={20} placeholder="Enter clan name" />
              </div>
              <div className="clan-form-field">
                <label>Tag (2-4 chars)</label>
                <input value={createTag} onChange={e => setCreateTag(e.target.value.toUpperCase())} maxLength={4} placeholder="TAG" />
              </div>
              <div className="clan-form-field">
                <label>Banner Color</label>
                <div className="clan-color-picker">
                  {BANNER_COLORS.map(c => (
                    <button key={c.id} className={`clan-color-swatch ${createColor === c.color ? 'selected' : ''}`}
                      style={{ background: c.color }} onClick={() => setCreateColor(c.color)} title={c.label} />
                  ))}
                </div>
              </div>
              <div className="clan-form-preview">
                <div className="clan-preview-card" style={{ borderColor: createColor }}>
                  <span className="clan-preview-tag" style={{ color: createColor }}>[{createTag || 'TAG'}]</span>
                  <span className="clan-preview-name">{createName || 'Clan Name'}</span>
                </div>
              </div>
              <div className="clan-form-actions">
                <button className="clan-btn primary" onClick={handleCreate}>Create</button>
                <button className="clan-btn secondary" onClick={() => { setCreating(false); setError('') }}>Cancel</button>
              </div>
            </div>
          )}

          {clan && (
            <div className="clan-detail">
              <div className="clan-banner" style={{ borderColor: clan.banner?.color || '#b946ff' }}>
                <div className="clan-banner-content">
                  <span className="clan-banner-icon">{clan.banner?.icon || '⚔️'}</span>
                  <div className="clan-banner-info">
                    <span className="clan-banner-tag" style={{ color: clan.banner?.color }}>[{clan.tag}]</span>
                    <span className="clan-banner-name">{clan.name}</span>
                  </div>
                </div>
                <div className="clan-banner-stats">
                  <span>{clan.memberCount} members</span>
                  <span>{clan.clanXP?.toLocaleString() || 0} XP</span>
                  <span>{clan.wins || 0} wins</span>
                </div>
              </div>

              {clan.description && <p className="clan-description">{clan.description}</p>}

              <ClanMemberList
                members={members}
                leader={clan.leader}
                myRole={getMyRole()}
                clanId={clan.id}
                userId={userId}
                onRefresh={loadClan}
              />

              <div className="clan-member-actions">
                {getMyRole() === 'leader' && (
                  <button className="clan-btn danger" onClick={handleDisband}>Disband Clan</button>
                )}
                {getMyRole() !== 'leader' && (
                  <button className="clan-btn secondary" onClick={handleLeave}>Leave Clan</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'browse' && (
        <div className="clan-browse">
          <div className="clan-search-bar">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clans..." onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            <button className="clan-btn primary" onClick={handleSearch} disabled={searching}>
              {searching ? '...' : 'Search'}
            </button>
          </div>
          <div className="clan-search-results">
            {searchResults.length === 0 && !searching && <p className="clan-empty">No clans found. Try a different search.</p>}
            {searchResults.map(c => (
              <ClanCard key={c.id} clan={c} onJoin={() => handleJoin(c.id)} isInClan={!!clan} />
            ))}
          </div>
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="clan-leaderboard">
          <h2>🏆 Weekly Clan Leaderboard</h2>
          {leaderboard.length === 0 && <p className="clan-empty">No clans yet.</p>}
          {leaderboard.map(c => (
            <div key={c.id} className="clan-lb-row">
              <span className="clan-lb-rank">#{c.rank}</span>
              <span className="clan-lb-tag" style={{ color: c.banner?.color }}>[{c.tag}]</span>
              <span className="clan-lb-name">{c.name}</span>
              <span className="clan-lb-xp">{c.weeklyXP?.toLocaleString() || 0} XP</span>
              <span className="clan-lb-members">{c.memberCount}/20</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
