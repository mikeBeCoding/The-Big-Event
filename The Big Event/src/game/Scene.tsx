import { useEffect, useRef } from 'react'

export default function Scene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let cloudOffset = 0

    function drawScene() {
      const width = canvas!.width
      const height = canvas!.height

      // Sky gradient
      const gradient = ctx!.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, '#87CEEB')
      gradient.addColorStop(1, '#E0F6FF')
      ctx!.fillStyle = gradient
      ctx!.fillRect(0, 0, width, height)

      // Distant trees/landscape (very light)
      ctx!.fillStyle = 'rgba(76, 140, 76, 0.2)'
      ctx!.fillRect(0, height * 0.45, width, height * 0.15)

      // Ground
      ctx!.fillStyle = '#90EE90'
      ctx!.fillRect(0, height * 0.6, width, height * 0.4)

      // Sun (subtle)
      ctx!.fillStyle = 'rgba(247, 223, 0, 0.7)'
      ctx!.beginPath()
      ctx!.arc(width * 0.85, height * 0.15, 80, 0, Math.PI * 2)
      ctx!.fill()

      // Draw clouds with animation
      drawClouds(width, height, cloudOffset)
      cloudOffset += 0.1
    }

    function drawClouds(width: number, _height: number, offset: number) {
      const cloudPositions = [
        { x: -100, y: 80, scale: 1.2 },
        { x: 200, y: 120, scale: 0.9 },
        { x: 600, y: 60, scale: 1.1 },
        { x: 900, y: 140, scale: 0.8 },
        { x: 1200, y: 100, scale: 1.3 },
      ]

      cloudPositions.forEach((pos) => {
        const x = (pos.x + offset) % (width + 200) - 100
        const y = pos.y
        const scale = pos.scale

        ctx!.fillStyle = 'rgba(255, 255, 255, 0.85)'
        ctx!.beginPath()

        // Cloud bumps
        ctx!.arc(x, y, 35 * scale, 0, Math.PI * 2)
        ctx!.arc(x + 40 * scale, y, 45 * scale, 0, Math.PI * 2)
        ctx!.arc(x + 75 * scale, y, 35 * scale, 0, Math.PI * 2)
        ctx!.fill()
      })
    }

    function animate() {
      drawScene()
      animationId = requestAnimationFrame(animate)
    }

    // Set canvas size
    const container = canvas.parentElement
    if (container) {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }

    animate()

    return () => cancelAnimationFrame(animationId)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ background: '#87CEEB' }}
    />
  )
}
