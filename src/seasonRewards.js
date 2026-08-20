import { getDb, ensureAuth } from './firebase'
import { TITLES } from './shopItems'

let _f = null
async function f() {
  if (_f) return _f
  const [firestore, db] = await Promise.all([import('firebase/firestore'), getDb()])
  _f = { ...firestore, db }
  return _f
}

const SEASON_REWARDS = 'seasonRewards'
const PLAYERS = 'players'

const REWARD_TIERS = [
  { minRank: 1, coins: 5000, titleId: 'title-season-god', nameplateId: null },
  { minRank: 2, coins: 3000, titleId: 'title-season-phoenix', nameplateId: null },
  { minRank: 3, coins: 2000, titleId: 'title-season-cosmic', nameplateId: null },
  { minRank: 4, coins: 1500, titleId: null, nameplateId: null },
  { minRank: 5, coins: 1000, titleId: null, nameplateId: null },
  { minRank: 6, coins: 500, titleId: null, nameplateId: null },
]

const TOURNAMENT_BONUS = {
  1: 3000,
  2: 2000,
  3: 1500,
}

function getSeasonId() {
  const now = new Date()
  const onejan = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now - onejan) / 86400000 + onejan.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function getRewardsForRank(rank) {
  for (const tier of REWARD_TIERS) {
    if (rank <= tier.minRank) return tier
  }
  return { coins: 100, titleId: null, nameplateId: null }
}

export async function generateSeasonRewards(leagueId, leaguePlayers) {
  const { doc, setDoc, getDoc } = await f()
  const { db } = await f()

  const seasonId = getSeasonId()
  const rewardsDoc = { season: seasonId, endedAt: Date.now(), rewards: {} }

  for (const player of leaguePlayers) {
    const rank = player.rank || player.position || 99
    const rewards = getRewardsForRank(rank)
    rewardsDoc.rewards[player.userId || player.id] = {
      rank: rank,
      position: player.position || rank,
      rewards: {
        coins: rewards.coins,
        titleId: rewards.titleId,
        nameplateId: rewards.nameplateId,
      },
      claimed: false,
    }
  }

  await setDoc(doc(db, SEASON_REWARDS, seasonId), rewardsDoc)
  return seasonId
}

export async function claimSeasonReward(seasonId) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, getDoc, updateDoc, arrayUnion } = await f()
  const { db } = await f()

  const seasonDoc = await getDoc(doc(db, SEASON_REWARDS, seasonId))
  if (!seasonDoc.exists()) return { error: 'Season not found' }
  const seasonData = seasonDoc.data()

  const reward = seasonData.rewards[user.uid]
  if (!reward) return { error: 'No rewards for this season' }
  if (reward.claimed) return { error: 'Already claimed' }

  const playerDoc = await getDoc(doc(db, PLAYERS, user.uid))
  const playerData = playerDoc.exists() ? playerDoc.data() : {}

  const updates = {
    [`rewards.${user.uid}.claimed`]: true,
  }
  await updateDoc(doc(db, SEASON_REWARDS, seasonId), updates)

  const playerUpdates = { coins: (playerData.coins || 0) + reward.rewards.coins }

  if (reward.rewards.titleId) {
    playerUpdates.titles = arrayUnion(reward.rewards.titleId)
  }
  if (reward.rewards.nameplateId) {
    playerUpdates.nameplates = arrayUnion(reward.rewards.nameplateId)
  }

  await updateDoc(doc(db, PLAYERS, user.uid), playerUpdates)

  return {
    success: true,
    coins: reward.rewards.coins,
    titleId: reward.rewards.titleId,
    nameplateId: reward.rewards.nameplateId,
  }
}

export async function getUnclaimedRewards(userId) {
  if (!userId) return []
  const { collection, query, where, getDocs } = await f()
  const { db } = await f()

  const q = query(collection(db, SEASON_REWARDS))
  const snap = await getDocs(q)
  const unclaimed = []

  for (const seasonDoc of snap.docs) {
    const data = seasonDoc.data()
    const reward = data.rewards?.[userId]
    if (reward && !reward.claimed) {
      unclaimed.push({ seasonId: seasonDoc.id, ...data, reward })
    }
  }

  return unclaimed
}

export async function getSeasonHistory(userId) {
  if (!userId) return []
  const { collection, getDocs } = await f()
  const { db } = await f()

  const snap = await getDocs(collection(db, SEASON_REWARDS))
  const history = []

  for (const seasonDoc of snap.docs) {
    const data = seasonDoc.data()
    const reward = data.rewards?.[userId]
    if (reward) {
      history.push({
        seasonId: seasonDoc.id,
        season: data.season,
        rank: reward.rank,
        position: reward.position,
        rewards: reward.rewards,
        claimed: reward.claimed,
        endedAt: data.endedAt,
      })
    }
  }

  return history.sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0))
}

export { getSeasonId, REWARD_TIERS, TOURNAMENT_BONUS }
