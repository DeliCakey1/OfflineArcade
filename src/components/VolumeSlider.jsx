export function VolumeSlider({ volume, onChange }) {
  return (
    <div className="volume-slider-wrap" title={`Volume: ${Math.round(volume * 100)}%`}>
      <span className="volume-icon">{volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="volume-slider"
        aria-label="Sound volume"
      />
    </div>
  )
}
