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

    const rand = (a, b) => Math.random() * (b - a) + a

    // ── Regular stars ──
    const stars = Array.from({ length: 300 }, () => ({
      x: Math.random(), y: Math.random(),
      r: rand(0.2, 1.4),
      alpha: rand(0.2, 0.8),
      speed: rand(0.001, 0.005),
      phase: rand(0, Math.PI * 2),
    }))

    // ── Bright coloured stars ──
    const brightStars = Array.from({ length: 18 }, () => ({
      x: Math.random(), y: Math.random(),
      r: rand(1.2, 2.8),
      alpha: rand(0.5, 0.9),
      speed: rand(0.0005, 0.002),
      phase: rand(0, Math.PI * 2),
      hue: [200, 220, 260, 280, 300, 30, 190][Math.floor(Math.random() * 7)],
    }))

    // ── Constellation pairs ──
    const constellations = [
      [0, 2], [2, 5], [5, 8], [8, 11],
      [1, 4], [4, 7], [3, 6], [6, 9],
    ]

    // ── Nebula blobs ──
    const blobs = [
      { x: 0.12, y: 0.25, r: 380, color: 'rgba(129,140,248,0.055)' },
      { x: 0.78, y: 0.55, r: 300, color: 'rgba(167,139,250,0.05)'  },
      { x: 0.45, y: 0.88, r: 260, color: 'rgba(56,189,248,0.04)'   },
      { x: 0.88, y: 0.12, r: 220, color: 'rgba(196,181,253,0.04)'  },
      { x: 0.35, y: 0.45, r: 180, color: 'rgba(99,102,241,0.035)'  },
      { x: 0.65, y: 0.78, r: 200, color: 'rgba(139,92,246,0.04)'   },
    ]

    // ── Drifting dust ──
    const dust = Array.from({ length: 60 }, () => ({
      x: Math.random(), y: Math.random(),
      r: rand(0.5, 2),
      alpha: rand(0.03, 0.12),
      dx: rand(-0.00008, 0.00008),
      dy: rand(-0.00004, 0.00004),
      hue: [220, 260, 280, 300][Math.floor(Math.random() * 4)],
    }))

    // ── Shooting stars ──
    const makeShooter = () => ({
      x: rand(0.05, 0.85), y: rand(0.02, 0.35),
      len: rand(120, 260), angle: rand(20, 50) * Math.PI / 180,
      speed: rand(8, 16), life: 0, maxLife: rand(30, 55),
      alpha: rand(0.5, 0.9), active: false, nextIn: rand(80, 260),
    })
    const shooters = Array.from({ length: 4 }, makeShooter)

    let t = 0

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const W = canvas.width, H = canvas.height

      // Nebula blobs
      blobs.forEach(b => {
        const g = ctx.createRadialGradient(b.x * W, b.y * H, 0, b.x * W, b.y * H, b.r)
        g.addColorStop(0, b.color)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
      })

      // Drifting dust
      dust.forEach(d => {
        d.x = (d.x + d.dx + 1) % 1
        d.y = (d.y + d.dy + 1) % 1
        ctx.beginPath()
        ctx.arc(d.x * W, d.y * H, d.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${d.hue},70%,80%,${d.alpha})`
        ctx.fill()
      })

      // Constellation lines
      constellations.forEach(([a, b]) => {
        const sa = brightStars[a], sb = brightStars[b]
        if (!sa || !sb) return
        const alphaA = sa.alpha * (0.6 + 0.4 * Math.sin(t * sa.speed * 60 + sa.phase))
        const alphaB = sb.alpha * (0.6 + 0.4 * Math.sin(t * sb.speed * 60 + sb.phase))
        ctx.beginPath()
        ctx.moveTo(sa.x * W, sa.y * H)
        ctx.lineTo(sb.x * W, sb.y * H)
        ctx.strokeStyle = `rgba(196,181,253,${Math.min(alphaA, alphaB) * 0.18})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      })

      // Regular stars
      stars.forEach(s => {
        const alpha = s.alpha * (0.7 + 0.3 * Math.sin(t * s.speed * 60 + s.phase))
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(241,245,249,${alpha})`
        ctx.fill()
      })

      // Bright stars with glow + cross flare
      brightStars.forEach(s => {
        const alpha = s.alpha * (0.6 + 0.4 * Math.sin(t * s.speed * 60 + s.phase))
        const cx = s.x * W, cy = s.y * H

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s.r * 8)
        g.addColorStop(0, `hsla(${s.hue},80%,80%,${alpha * 0.5})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.fillRect(cx - s.r * 8, cy - s.r * 8, s.r * 16, s.r * 16)

        const flen = s.r * 14 * alpha
        ctx.save()
        ctx.globalAlpha = alpha * 0.25
        ctx.strokeStyle = `hsla(${s.hue},80%,90%,1)`
        ctx.lineWidth = 0.6
        ctx.beginPath(); ctx.moveTo(cx - flen, cy); ctx.lineTo(cx + flen, cy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx, cy - flen * 0.7); ctx.lineTo(cx, cy + flen * 0.7); ctx.stroke()
        ctx.restore()

        ctx.beginPath()
        ctx.arc(cx, cy, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${s.hue},90%,97%,${alpha})`
        ctx.fill()
      })

      // Shooting stars
      shooters.forEach(s => {
        if (!s.active) {
          s.nextIn--
          if (s.nextIn <= 0) {
            s.active = true; s.life = 0
            s.x = rand(0.05, 0.85); s.y = rand(0.02, 0.35)
            s.len = rand(120, 280); s.speed = rand(10, 18)
            s.angle = rand(20, 55) * Math.PI / 180
            s.maxLife = rand(28, 52); s.alpha = rand(0.5, 0.95)
          }
          return
        }
        s.life++
        const progress = s.life / s.maxLife
        const eased = progress < 0.5 ? progress * 2 : (1 - progress) * 2
        const tailAlpha = s.alpha * eased
        const sx = s.x * W + Math.cos(s.angle) * s.speed * s.life
        const sy = s.y * H + Math.sin(s.angle) * s.speed * s.life
        const ex = sx - Math.cos(s.angle) * s.len * eased
        const ey = sy - Math.sin(s.angle) * s.len * eased

        const grad = ctx.createLinearGradient(ex, ey, sx, sy)
        grad.addColorStop(0, 'transparent')
        grad.addColorStop(1, `rgba(220,210,255,${tailAlpha})`)
        ctx.beginPath()
        ctx.moveTo(ex, ey)
        ctx.lineTo(sx, sy)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.5
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(240,235,255,${tailAlpha})`
        ctx.fill()

        if (s.life >= s.maxLife) {
          s.active = false; s.nextIn = rand(90, 280)
        }
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
