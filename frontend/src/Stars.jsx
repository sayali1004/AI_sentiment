import { useEffect, useRef } from 'react'

export default function Stars() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Generate stars once
    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      alpha: Math.random() * 0.6 + 0.2,
      speed: Math.random() * 0.004 + 0.001,
      phase: Math.random() * Math.PI * 2,
    }))

    // A few larger "bright" stars
    const brightStars = Array.from({ length: 12 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.8 + 1,
      alpha: Math.random() * 0.4 + 0.5,
      speed: Math.random() * 0.002 + 0.0005,
      phase: Math.random() * Math.PI * 2,
      hue: [200, 220, 270, 300, 30][Math.floor(Math.random() * 5)],
    }))

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Dim nebula blobs
      const blobs = [
        { x: 0.15, y: 0.3, r: 300, color: 'rgba(99,102,241,0.04)' },
        { x: 0.75, y: 0.6, r: 250, color: 'rgba(167,139,250,0.035)' },
        { x: 0.5, y: 0.85, r: 200, color: 'rgba(56,189,248,0.03)' },
      ]
      blobs.forEach(b => {
        const g = ctx.createRadialGradient(
          b.x * canvas.width, b.y * canvas.height, 0,
          b.x * canvas.width, b.y * canvas.height, b.r
        )
        g.addColorStop(0, b.color)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      })

      // Regular stars with twinkle
      stars.forEach(s => {
        const alpha = s.alpha * (0.7 + 0.3 * Math.sin(t * s.speed * 60 + s.phase))
        ctx.beginPath()
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(241,245,249,${alpha})`
        ctx.fill()
      })

      // Bright coloured stars
      brightStars.forEach(s => {
        const alpha = s.alpha * (0.6 + 0.4 * Math.sin(t * s.speed * 60 + s.phase))
        const cx = s.x * canvas.width
        const cy = s.y * canvas.height
        // Glow
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s.r * 6)
        g.addColorStop(0, `hsla(${s.hue},80%,80%,${alpha * 0.6})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.fillRect(cx - s.r * 6, cy - s.r * 6, s.r * 12, s.r * 12)
        // Core
        ctx.beginPath()
        ctx.arc(cx, cy, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${s.hue},90%,95%,${alpha})`
        ctx.fill()
      })

      t++
      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas id="stars-canvas" ref={canvasRef} />
}
