import { useState } from 'react'
import { promoteToOfficer, demoteMember, kickMember } from '../clanService'
import useSound from '../useSound'

export default function ClanMemberList({ members, leader, myRole, clanId, userId, onRefresh }) {
  const [actionTarget, setActionTarget] = useState(null)
  const sound = useSound()

  const sortedMembers = [...(members || [])].sort((a, b) => {
    if (a.id === leader) return -1
    if (b.id === leader) return 1
    if (a.clanRole === 'officer' && b.clanRole !== 'officer') return -1
    if (b.clanRole === 'officer' && a.clanRole !== 'officer') return 1
    return 0
  })

  function getRoleIcon(member) {
    if (member.id === leader) return '👑'
    if (member.clanRole === 'officer') return '⭐'
    return ''
  }

  async function handlePromote(memberId) {
    sound('confirm')
    await promoteToOfficer(clanId, memberId)
    setActionTarget(null)
    onRefresh?.()
  }

  async function handleDemote(memberId) {
    sound('click')
    await demoteMember(clanId, memberId)
    setActionTarget(null)
    onRefresh?.()
  }

  async function handleKick(memberId) {
    sound('click')
    await kickMember(clanId, memberId)
    setActionTarget(null)
    onRefresh?.()
  }

  const isLeader = myRole === 'leader'
  const isOfficer = myRole === 'officer' || isLeader

  return (
    <div className="clan-member-list">
      <h3>Members ({members?.length || 0})</h3>
      <div className="clan-members">
        {sortedMembers.map(member => (
          <div key={member.id} className="clan-member-row">
            <div className="clan-member-info">
              <span className="clan-member-role">{getRoleIcon(member)}</span>
              <span className="clan-member-name">{member.username || member.name || 'Anonymous'}</span>
              {member.id === userId && <span className="clan-member-you">(you)</span>}
              {member.level != null && <span className="clan-member-level">Lv.{member.level}</span>}
            </div>
            {isOfficer && member.id !== userId && member.id !== leader && (
              <div className="clan-member-actions">
                {actionTarget === member.id ? (
                  <div className="clan-member-action-menu">
                    {isLeader && member.clanRole !== 'officer' && (
                      <button className="clan-action-btn" onClick={() => handlePromote(member.id)}>⭐ Promote</button>
                    )}
                    {isLeader && member.clanRole === 'officer' && (
                      <button className="clan-action-btn" onClick={() => handleDemote(member.id)}>↓ Demote</button>
                    )}
                    {isLeader && (
                      <button className="clan-action-btn danger" onClick={() => handleKick(member.id)}>✕ Kick</button>
                    )}
                    <button className="clan-action-btn" onClick={() => setActionTarget(null)}>Cancel</button>
                  </div>
                ) : (
                  <button className="clan-action-trigger" onClick={() => setActionTarget(member.id)}>⋯</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
