import { useState, useEffect } from 'react'
import { getUnclaimedRewards, claimSeasonReward } from '../seasonRewards'
import useSound from '../useSound'

export default function SeasonRewardsModal({ userId, onClose }) {
  const [rewards, setRewards] = useState([])
  const [claiming, setClaiming] = useState(false)
  const [claimedReward, setClaimedReward] = useState(null)
  const sound = useSound()

  useEffect(() => {
    if (!userId) return
    getUnclaimedRewards(userId).then(setRewards).catch(() => {})
  }, [userId])

  if (rewards.length === 0 && !claimedReward) return null

  async function handleClaim(seasonId) {
    sound('win')
    setClaiming(true)
    try {
      const result = await claimSeasonReward(seasonId)
      if (result.success) {
        setClaimedReward(result)
        setRewards(r => r.filter(x => x.seasonId !== seasonId))
      }
    } catch {}
    setClaiming(false)
  }

  if (claimedReward) {
    return (
      <div className="season-modal-overlay" onClick={onClose}>
        <div className="season-modal" onClick={e => e.stopPropagation()}>
          <div className="season-modal-confetti">🎉</div>
          <h2>Season Rewards Claimed!</h2>
          <div className="season-rewards-list">
            <div className="season-reward-item">
              <span className="season-reward-icon">🪙</span>
              <span className="season-reward-text">+{claimedReward.coins} Coins</span>
            </div>
            {claimedReward.titleId && (
              <div className="season-reward-item">
                <span className="season-reward-icon">🏷️</span>
                <span className="season-reward-text">New Title Unlocked!</span>
              </div>
            )}
            {claimedReward.nameplateId && (
              <div className="season-reward-item">
                <span className="season-reward-icon">✨</span>
                <span className="season-reward-text">New Nameplate Unlocked!</span>
              </div>
            )}
          </div>
          <button className="clan-btn primary" onClick={onClose}>Awesome!</button>
        </div>
      </div>
    )
  }

  return (
    <div className="season-modal-overlay" onClick={onClose}>
      <div className="season-modal" onClick={e => e.stopPropagation()}>
        <h2>🏆 Season Complete!</h2>
        <p className="season-modal-sub">You earned rewards for your performance this season.</p>
        <div className="season-rewards-to-claim">
          {rewards.map(reward => (
            <div key={reward.seasonId} className="season-reward-card">
              <div className="season-reward-header">
                <span className="season-reward-season">{reward.season}</span>
                <span className="season-reward-rank">Rank #{reward.reward.position}</span>
              </div>
              <div className="season-reward-details">
                <span>🪙 {reward.reward.rewards.coins} Coins</span>
                {reward.reward.rewards.titleId && <span>🏷️ Title</span>}
                {reward.reward.rewards.nameplateId && <span>✨ Nameplate</span>}
              </div>
              <button
                className="clan-btn primary"
                onClick={() => handleClaim(reward.seasonId)}
                disabled={claiming}
              >
                {claiming ? 'Claiming...' : 'Claim Rewards'}
              </button>
            </div>
          ))}
        </div>
        <button className="clan-btn secondary" onClick={onClose}>Later</button>
      </div>
    </div>
  )
}
