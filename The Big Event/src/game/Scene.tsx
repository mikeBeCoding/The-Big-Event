import { useEffect, useRef } from 'react'

export type SceneVariant = 'outdoor' | 'indoor'

interface SceneProps {
  variant?: SceneVariant
}

export default function Scene({ variant = 'outdoor' }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Read the latest variant inside the animation loop without restarting it.
  const variantRef = useRef(variant)
  useEffect(() => {
    variantRef.current = variant
  }, [variant])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rand = (a: number, b: number) => a + Math.random() * (b - a)

    // Logical (CSS-pixel) size, kept in sync by the ResizeObserver below.
    let W = canvas.clientWidth || canvas.parentElement?.clientWidth || 800
    let H = canvas.clientHeight || canvas.parentElement?.clientHeight || 600

    // --- Persistent scene data (generated once so it doesn't flicker) ---

    // Apartment buildings for the outdoor scene. Geometry is resolved per-frame
    // from W/H, but the lit-window pattern is fixed up front.
    const buildings = [
      { xf: -0.02, wf: 0.34, hf: 0.36, floors: 5, cols: 5, hue: '#9fb0c4' },
      { xf: 0.32, wf: 0.3, hf: 0.46, floors: 6, cols: 4, hue: '#8c9fb6' },
      { xf: 0.68, wf: 0.36, hf: 0.32, floors: 4, cols: 6, hue: '#aab9cb' },
    ].map((b) => ({
      ...b,
      lit: Array.from({ length: b.floors * b.cols }, () => Math.random() > 0.55),
    }))

    const clouds = [
      { x: -100, y: 80, scale: 1.2, speed: 6 },
      { x: 200, y: 120, scale: 0.9, speed: 9 },
      { x: 600, y: 60, scale: 1.1, speed: 7 },
      { x: 900, y: 140, scale: 0.8, speed: 11 },
      { x: 1200, y: 100, scale: 1.3, speed: 5 },
    ]

    // Neighbours drifting through the background.
    const neighbours = Array.from({ length: 3 }, (_, i) => ({
      base: rand(0, 1),
      speed: rand(0.012, 0.025) * (i % 2 === 0 ? 1 : -1),
      yf: rand(0.62, 0.65),
      scale: rand(0.7, 1),
      tint: rand(60, 90),
    }))

    // Floating dust / pollen motes (shared by both scenes).
    const motes = Array.from({ length: 30 }, () => ({
      xf: Math.random(),
      yf: Math.random(),
      r: rand(0.8, 2.4),
      speed: rand(0.005, 0.018),
      sway: rand(0.4, 1.4),
      phase: rand(0, Math.PI * 2),
    }))

    // Grass tufts along the outdoor horizon.
    const tufts = Array.from({ length: 60 }, () => ({
      xf: Math.random(),
      h: rand(8, 22),
      phase: rand(0, Math.PI * 2),
    }))

    let animationId: number
    let t = 0

    // --- Shared helpers ---

    function drawCloud(cx: number, cy: number, scale: number, alpha: number) {
      ctx!.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx!.beginPath()
      ctx!.arc(cx, cy, 35 * scale, 0, Math.PI * 2)
      ctx!.arc(cx + 40 * scale, cy, 45 * scale, 0, Math.PI * 2)
      ctx!.arc(cx + 75 * scale, cy, 35 * scale, 0, Math.PI * 2)
      ctx!.fill()
    }

    function drawMotes() {
      for (const m of motes) {
        // Drift slowly upward and wrap; sway sideways with a sine.
        const y = ((m.yf - t * m.speed) % 1 + 1) % 1
        const x = m.xf + Math.sin(t * m.sway + m.phase) * 0.01
        ctx!.fillStyle = 'rgba(255, 255, 255, 0.5)'
        ctx!.beginPath()
        ctx!.arc(x * W, y * H, m.r, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    function drawVignette(strength: number) {
      const g = ctx!.createRadialGradient(
        W / 2,
        H * 0.45,
        Math.min(W, H) * 0.25,
        W / 2,
        H * 0.45,
        Math.max(W, H) * 0.75
      )
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(1, `rgba(0,0,0,${strength})`)
      ctx!.fillStyle = g
      ctx!.fillRect(0, 0, W, H)
    }

    function drawPerson(x: number, y: number, scale: number, color: string) {
      ctx!.fillStyle = color
      // Body
      ctx!.beginPath()
      ctx!.moveTo(x - 9 * scale, y)
      ctx!.quadraticCurveTo(x - 11 * scale, y - 34 * scale, x, y - 34 * scale)
      ctx!.quadraticCurveTo(x + 11 * scale, y - 34 * scale, x + 9 * scale, y)
      ctx!.fill()
      // Head
      ctx!.beginPath()
      ctx!.arc(x, y - 42 * scale, 8 * scale, 0, Math.PI * 2)
      ctx!.fill()
    }

    // --- Outdoor scene ---

    function drawSunGlow(cx: number, cy: number, r: number) {
      const pulse = 1 + Math.sin(t * 0.6) * 0.04
      const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r * 2.4 * pulse)
      g.addColorStop(0, 'rgba(255, 247, 200, 0.9)')
      g.addColorStop(0.3, 'rgba(255, 235, 130, 0.45)')
      g.addColorStop(1, 'rgba(255, 235, 130, 0)')
      ctx!.fillStyle = g
      ctx!.beginPath()
      ctx!.arc(cx, cy, r * 2.4 * pulse, 0, Math.PI * 2)
      ctx!.fill()
      ctx!.fillStyle = 'rgba(255, 244, 170, 0.95)'
      ctx!.beginPath()
      ctx!.arc(cx, cy, r * 0.7, 0, Math.PI * 2)
      ctx!.fill()
    }

    function drawBuildings(horizon: number) {
      for (const b of buildings) {
        const bx = b.xf * W
        const bw = b.wf * W
        const top = horizon - b.hf * H
        const bh = horizon - top
        ctx!.fillStyle = b.hue
        ctx!.fillRect(bx, top, bw, bh)
        // Roof line
        ctx!.fillStyle = 'rgba(0,0,0,0.12)'
        ctx!.fillRect(bx, top, bw, 6)

        // Windows
        const pad = bw * 0.08
        const cellW = (bw - pad * 2) / b.cols
        const cellH = (bh * 0.82) / b.floors
        const winW = cellW * 0.55
        const winH = cellH * 0.5
        for (let f = 0; f < b.floors; f++) {
          for (let c = 0; c < b.cols; c++) {
            const wx = bx + pad + c * cellW + (cellW - winW) / 2
            const wy = top + bh * 0.1 + f * cellH + (cellH - winH) / 2
            const isLit = b.lit[f * b.cols + c]
            ctx!.fillStyle = isLit
              ? 'rgba(255, 214, 130, 0.92)'
              : 'rgba(40, 55, 75, 0.5)'
            ctx!.fillRect(wx, wy, winW, winH)
          }
        }
      }
    }

    function drawStringLights(y: number) {
      const colors = ['#ffd27d', '#fff2c2', '#ffb86b', '#ffe9a8']
      const sag = 26
      const count = 14
      ctx!.strokeStyle = 'rgba(40,40,50,0.55)'
      ctx!.lineWidth = 2
      ctx!.beginPath()
      ctx!.moveTo(0, y)
      ctx!.quadraticCurveTo(W / 2, y + sag, W, y)
      ctx!.stroke()
      for (let i = 0; i <= count; i++) {
        const p = i / count
        // Point on the quadratic sag curve.
        const bx = (1 - p) * (1 - p) * 0 + 2 * (1 - p) * p * (W / 2) + p * p * W
        const by =
          (1 - p) * (1 - p) * y + 2 * (1 - p) * p * (y + sag) + p * p * y
        const pulse = 0.7 + Math.sin(t * 1.5 + i) * 0.3
        const color = colors[i % colors.length]
        const glow = ctx!.createRadialGradient(bx, by + 6, 0, bx, by + 6, 12)
        glow.addColorStop(0, color)
        glow.addColorStop(1, 'rgba(255,255,255,0)')
        ctx!.globalAlpha = pulse
        ctx!.fillStyle = glow
        ctx!.beginPath()
        ctx!.arc(bx, by + 6, 12, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.fillStyle = color
        ctx!.beginPath()
        ctx!.arc(bx, by + 6, 3.5, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.globalAlpha = 1
      }
    }

    function drawShrubs(horizon: number) {
      ctx!.fillStyle = '#4f8f43'
      for (let i = 0; i < 7; i++) {
        const x = (i / 6) * W
        const r = 28 + (i % 3) * 10
        ctx!.beginPath()
        ctx!.arc(x, horizon + 6, r, Math.PI, Math.PI * 2)
        ctx!.fill()
      }
      // Swaying grass blades
      ctx!.strokeStyle = '#5fae4d'
      ctx!.lineWidth = 2
      for (const g of tufts) {
        const x = g.xf * W
        const sway = Math.sin(t * 1.6 + g.phase) * 5
        ctx!.beginPath()
        ctx!.moveTo(x, horizon + 8)
        ctx!.quadraticCurveTo(x + sway, horizon - g.h / 2, x + sway * 1.6, horizon - g.h)
        ctx!.stroke()
      }
    }

    function drawOutdoor() {
      const horizon = H * 0.62

      const sky = ctx!.createLinearGradient(0, 0, 0, H * 0.7)
      sky.addColorStop(0, '#8ec5e8')
      sky.addColorStop(1, '#e3f3fc')
      ctx!.fillStyle = sky
      ctx!.fillRect(0, 0, W, H)

      drawSunGlow(W * 0.84, H * 0.16, 70)

      for (const c of clouds) {
        const x = ((c.x + t * c.speed) % (W + 260)) - 130
        drawCloud(x, c.y, c.scale, 0.85)
      }

      drawBuildings(horizon)

      // Grass ground
      const grass = ctx!.createLinearGradient(0, horizon, 0, H)
      grass.addColorStop(0, '#9ad26f')
      grass.addColorStop(1, '#79b85a')
      ctx!.fillStyle = grass
      ctx!.fillRect(0, horizon, W, H - horizon)

      // Walkway leading toward the table
      ctx!.fillStyle = 'rgba(206, 196, 172, 0.85)'
      ctx!.beginPath()
      ctx!.moveTo(W / 2 - 30, horizon)
      ctx!.lineTo(W / 2 + 30, horizon)
      ctx!.lineTo(W / 2 + 130, H)
      ctx!.lineTo(W / 2 - 130, H)
      ctx!.closePath()
      ctx!.fill()

      // Neighbours strolling by
      for (const n of neighbours) {
        const p = ((n.base + t * n.speed) % 1 + 1) % 1
        drawPerson(p * W, n.yf * H, n.scale, `rgba(${n.tint},${n.tint + 10},${n.tint + 25},0.4)`)
      }

      drawShrubs(horizon)
      drawStringLights(H * 0.08)
      drawMotes()
      drawVignette(0.22)
    }

    // --- Indoor scene (clubhouse / common room) ---

    function drawWindow(x: number, y: number, w: number, h: number) {
      // Outside view
      const view = ctx!.createLinearGradient(0, y, 0, y + h)
      view.addColorStop(0, '#9fd0ee')
      view.addColorStop(1, '#dceefb')
      ctx!.fillStyle = view
      ctx!.fillRect(x, y, w, h)
      // A drifting cloud, clipped to the window
      ctx!.save()
      ctx!.beginPath()
      ctx!.rect(x, y, w, h)
      ctx!.clip()
      const cx = x + ((t * 12) % (w + 160)) - 80
      drawCloud(cx, y + h * 0.32, 0.7, 0.9)
      ctx!.fillStyle = 'rgba(120, 190, 110, 0.5)'
      ctx!.fillRect(x, y + h * 0.78, w, h * 0.22)
      ctx!.restore()
      // Frame + muntins
      ctx!.strokeStyle = '#f7efe1'
      ctx!.lineWidth = 10
      ctx!.strokeRect(x, y, w, h)
      ctx!.lineWidth = 5
      ctx!.beginPath()
      ctx!.moveTo(x + w / 2, y)
      ctx!.lineTo(x + w / 2, y + h)
      ctx!.moveTo(x, y + h / 2)
      ctx!.lineTo(x + w, y + h / 2)
      ctx!.stroke()
    }

    function drawBanner() {
      const y = H * 0.07
      ctx!.strokeStyle = 'rgba(0,0,0,0.18)'
      ctx!.lineWidth = 2
      ctx!.beginPath()
      ctx!.moveTo(W * 0.2, y - 8)
      ctx!.quadraticCurveTo(W / 2, y + 14, W * 0.8, y - 8)
      ctx!.stroke()
      // Pennant flags
      const colors = ['#e76f6f', '#f2b84b', '#5fae4d', '#5b8fd6', '#a86fd6']
      const n = 12
      for (let i = 0; i < n; i++) {
        const p = i / (n - 1)
        const bx =
          (1 - p) * (1 - p) * W * 0.2 +
          2 * (1 - p) * p * (W / 2) +
          p * p * W * 0.8
        const by =
          (1 - p) * (1 - p) * (y - 8) +
          2 * (1 - p) * p * (y + 14) +
          p * p * (y - 8)
        ctx!.fillStyle = colors[i % colors.length]
        ctx!.beginPath()
        ctx!.moveTo(bx - 9, by)
        ctx!.lineTo(bx + 9, by)
        ctx!.lineTo(bx, by + 20)
        ctx!.closePath()
        ctx!.fill()
      }
      ctx!.fillStyle = 'rgba(90, 70, 50, 0.85)'
      ctx!.font = `600 ${Math.max(16, W * 0.024)}px system-ui, sans-serif`
      ctx!.textAlign = 'center'
      ctx!.fillText('WELCOME, NEIGHBORS!', W / 2, y + 52)
      ctx!.textAlign = 'start'
    }

    function drawBalloons(x: number, baseY: number) {
      const palette = ['#e76f6f', '#f2b84b', '#5b8fd6']
      palette.forEach((color, i) => {
        const sway = Math.sin(t * 1.1 + i) * 6
        const bx = x + i * 26 + sway
        const by = baseY + Math.cos(t * 0.9 + i) * 4
        ctx!.strokeStyle = 'rgba(120,120,120,0.6)'
        ctx!.lineWidth = 1.5
        ctx!.beginPath()
        ctx!.moveTo(bx, by + 26)
        ctx!.lineTo(x + i * 8, baseY + 90)
        ctx!.stroke()
        ctx!.fillStyle = color
        ctx!.beginPath()
        ctx!.ellipse(bx, by, 18, 22, 0, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.fillStyle = 'rgba(255,255,255,0.35)'
        ctx!.beginPath()
        ctx!.ellipse(bx - 5, by - 7, 4, 6, 0, 0, Math.PI * 2)
        ctx!.fill()
      })
    }

    function drawPlant(x: number, floorY: number) {
      // Pot
      ctx!.fillStyle = '#b5654b'
      ctx!.beginPath()
      ctx!.moveTo(x - 26, floorY)
      ctx!.lineTo(x + 26, floorY)
      ctx!.lineTo(x + 18, floorY - 46)
      ctx!.lineTo(x - 18, floorY - 46)
      ctx!.closePath()
      ctx!.fill()
      // Leaves
      ctx!.fillStyle = '#4f9a45'
      for (let i = -2; i <= 2; i++) {
        const sway = Math.sin(t * 1.3 + i) * 4
        ctx!.save()
        ctx!.translate(x + sway, floorY - 46)
        ctx!.rotate(i * 0.32)
        ctx!.beginPath()
        ctx!.ellipse(0, -34, 10, 38, 0, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.restore()
      }
    }

    function drawCeilingGlow() {
      const g = ctx!.createRadialGradient(W / 2, -H * 0.1, 0, W / 2, -H * 0.1, H * 0.9)
      g.addColorStop(0, 'rgba(255, 244, 214, 0.6)')
      g.addColorStop(1, 'rgba(255, 244, 214, 0)')
      ctx!.fillStyle = g
      ctx!.fillRect(0, 0, W, H)
    }

    function drawIndoor() {
      const floorY = H * 0.68

      const wall = ctx!.createLinearGradient(0, 0, 0, floorY)
      wall.addColorStop(0, '#f3e6cf')
      wall.addColorStop(1, '#e7d3b3')
      ctx!.fillStyle = wall
      ctx!.fillRect(0, 0, W, floorY)

      // Wood floor + boards
      const floor = ctx!.createLinearGradient(0, floorY, 0, H)
      floor.addColorStop(0, '#c79a6a')
      floor.addColorStop(1, '#a87a4f')
      ctx!.fillStyle = floor
      ctx!.fillRect(0, floorY, W, H - floorY)
      ctx!.strokeStyle = 'rgba(120, 85, 50, 0.3)'
      ctx!.lineWidth = 2
      for (let i = 1; i < 8; i++) {
        const y = floorY + (i / 8) * (H - floorY)
        ctx!.beginPath()
        ctx!.moveTo(0, y)
        ctx!.lineTo(W, y)
        ctx!.stroke()
      }
      // Baseboard
      ctx!.fillStyle = '#e3cfa8'
      ctx!.fillRect(0, floorY - 12, W, 12)

      drawCeilingGlow()
      drawWindow(W * 0.08, H * 0.2, W * 0.3, H * 0.32)
      drawPlant(W * 0.88, floorY + 18)
      drawBalloons(W * 0.62, H * 0.34)
      drawBanner()
      drawMotes()
      drawVignette(0.28)
    }

    function animate() {
      ctx!.clearRect(0, 0, W, H)
      if (variantRef.current === 'indoor') drawIndoor()
      else drawOutdoor()
      t += 0.016
      animationId = requestAnimationFrame(animate)
    }

    function resize() {
      const parent = canvas!.parentElement
      if (!parent) return
      const dpr = window.devicePixelRatio || 1
      W = parent.clientWidth
      H = parent.clientHeight
      canvas!.width = W * dpr
      canvas!.height = H * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    animate()

    return () => {
      cancelAnimationFrame(animationId)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ background: variant === 'indoor' ? '#e7d3b3' : '#8ec5e8' }}
    />
  )
}
