export default function LoadingSkeleton({ type = 'game' }) {
  if (type === 'game') {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <SkeletonBar width={80} height={32} />
          <SkeletonBar width={60} height={32} />
        </div>
        <SkeletonCard />
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <SkeletonBar width="100%" height={44} />
          <SkeletonBar width="100%" height={44} />
        </div>
      </div>
    )
  }

  if (type === 'page') {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <SkeletonBar width={80} height={36} />
          <SkeletonBar width={160} height={28} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        <SkeletonCard />
        <div style={{ marginTop: 16 }}>
          <SkeletonBar width="60%" height={20} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <SkeletonBar width="100%" height={48} />
            <SkeletonBar width="100%" height={48} />
            <SkeletonBar width="100%" height={48} />
          </div>
        </div>
      </div>
    )
  }

  return <SkeletonCard />
}

function SkeletonBar({ width = '100%', height = 16 }) {
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.5s infinite',
    }} />
  )
}

function SkeletonCard() {
  return (
    <div style={{
      borderRadius: 12, padding: 16,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <SkeletonBar width={40} height={40} />
        <div style={{ flex: 1 }}>
          <SkeletonBar width="60%" height={16} />
          <SkeletonBar width="40%" height={12} style={{ marginTop: 6 }} />
        </div>
      </div>
      <SkeletonBar width="100%" height={80} />
    </div>
  )
}

function SkeletonStatCard() {
  return (
    <div style={{
      borderRadius: 8, padding: 12, textAlign: 'center',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <SkeletonBar width={24} height={24} />
      <SkeletonBar width={40} height={16} />
      <SkeletonBar width={50} height={10} />
    </div>
  )
}
