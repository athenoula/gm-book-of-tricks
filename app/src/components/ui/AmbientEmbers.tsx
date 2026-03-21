const EMBER_CONFIGS = [
  { x: '8%', duration: '14s', delay: '0s', drift: '30px', driftEnd: '-15px', size: '2px' },
  { x: '20%', duration: '11s', delay: '3s', drift: '-20px', driftEnd: '25px', size: '3px' },
  { x: '32%', duration: '16s', delay: '1s', drift: '15px', driftEnd: '-30px', size: '2px' },
  { x: '45%', duration: '13s', delay: '5s', drift: '-25px', driftEnd: '10px', size: '3px' },
  { x: '55%', duration: '15s', delay: '2s', drift: '20px', driftEnd: '-20px', size: '2px' },
  { x: '67%', duration: '12s', delay: '7s', drift: '-10px', driftEnd: '30px', size: '3px' },
  { x: '78%', duration: '17s', delay: '4s', drift: '25px', driftEnd: '-5px', size: '2px' },
  { x: '90%', duration: '10s', delay: '6s', drift: '-15px', driftEnd: '20px', size: '3px' },
]

export function AmbientEmbers() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[1]" aria-hidden="true">
      {EMBER_CONFIGS.map((config, i) => (
        <div
          key={i}
          className="ember fixed rounded-full"
          style={{
            left: config.x,
            width: config.size,
            height: config.size,
            background: `radial-gradient(circle, #f0c060, #f59e0b)`,
            animation: `ember-rise ${config.duration} linear infinite`,
            animationDelay: config.delay,
            willChange: 'transform, opacity',
            filter: 'blur(0.5px)',
            '--drift': config.drift,
            '--drift-end': config.driftEnd,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
