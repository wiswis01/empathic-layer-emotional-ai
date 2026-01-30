import React, { ReactNode, useEffect, useRef } from "react"

export interface BaseParticle {
  element: HTMLElement | SVGSVGElement
  left: number
  size: number
  top: number
}

export interface BaseParticleOptions {
  particle?: string
  size?: number
}

export interface CoolParticle extends BaseParticle {
  direction: number
  speedHorz: number
  speedUp: number
  spinSpeed: number
  spinVal: number
  scale: number
  opacity: number
  initialSize: number
}

export interface CoolParticleOptions extends BaseParticleOptions {
  particleCount?: number
  speedHorz?: number
  speedUp?: number
}

const getContainer = () => {
  const id = "_coolMode_effect"
  const existingContainer = document.getElementById(id)

  if (existingContainer) {
    return existingContainer
  }

  const container = document.createElement("div")
  container.setAttribute("id", id)
  container.setAttribute(
    "style",
    "overflow:hidden; position:fixed; height:100%; top:0; left:0; right:0; bottom:0; pointer-events:none; z-index:2147483647"
  )

  document.body.appendChild(container)

  return container
}

let instanceCounter = 0

const applyParticleEffect = (
  element: HTMLElement,
  options?: CoolParticleOptions
): (() => void) => {
  instanceCounter++

  const defaultParticle = "circle"
  const particleType = options?.particle || defaultParticle
  // Wide variety of sizes - from tiny to large
  const sizes = [5, 10, 15, 20, 25]
  const limit = 35

  let particles: CoolParticle[] = []
  let autoAddParticle = false
  let mouseX = 0
  let mouseY = 0

  const container = getContainer()

  function generateParticle() {
    const size =
      options?.size || sizes[Math.floor(Math.random() * sizes.length)]
    // Wider horizontal spread
    const speedHorz = options?.speedHorz || Math.random() * 8 + 2
    // Gentler upward movement with some variation
    const speedUp = options?.speedUp || Math.random() * 10 + 4
    const spinVal = Math.random() * 360
    // Moderate spin
    const spinSpeed = Math.random() * 20 * (Math.random() <= 0.5 ? -1 : 1)
    // Add random offset to spread particles wider from click point
    const spreadX = (Math.random() - 0.5) * 100
    const spreadY = (Math.random() - 0.5) * 60
    const top = mouseY - size / 2 + spreadY
    const left = mouseX - size / 2 + spreadX
    const direction = Math.random() <= 0.5 ? -1 : 1

    const particle = document.createElement("div")

    if (particleType === "circle") {
      const svgNS = "http://www.w3.org/2000/svg"
      const circleSVG = document.createElementNS(svgNS, "svg")
      const circle = document.createElementNS(svgNS, "circle")
      circle.setAttributeNS(null, "cx", (size / 2).toString())
      circle.setAttributeNS(null, "cy", (size / 2).toString())
      circle.setAttributeNS(null, "r", (size / 2).toString())
      // Use original vivid colors
      circle.setAttributeNS(
        null,
        "fill",
        `hsl(${Math.random() * 360}, 80%, 55%)`
      )

      circleSVG.appendChild(circle)
      circleSVG.setAttribute("width", size.toString())
      circleSVG.setAttribute("height", size.toString())

      particle.appendChild(circleSVG)
    } else if (
      particleType.startsWith("http") ||
      particleType.startsWith("/")
    ) {
      // Handle URL-based images
      particle.innerHTML = `<img src="${particleType}" width="${size}" height="${size}" style="border-radius: 50%">`
    } else {
      // Handle emoji or text characters
      const fontSizeMultiplier = 3 // Make emojis 3x bigger
      const emojiSize = size * fontSizeMultiplier
      particle.innerHTML = `<div style="font-size: ${emojiSize}px; line-height: 1; text-align: center; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; transform: scale(${fontSizeMultiplier}); transform-origin: center;">${particleType}</div>`
    }

    particle.style.position = "absolute"
    particle.style.transform = `translate3d(${left}px, ${top}px, 0px) rotate(${spinVal}deg) scale(1)`
    particle.style.opacity = "1"
    particle.style.transition = "opacity 0.1s ease"

    container.appendChild(particle)

    particles.push({
      direction,
      element: particle,
      left,
      size,
      speedHorz,
      speedUp,
      spinSpeed,
      spinVal,
      top,
      scale: 1,
      opacity: 1,
      initialSize: size,
    })
  }

  function refreshParticles() {
    particles.forEach((p) => {
      p.left = p.left - p.speedHorz * p.direction
      p.top = p.top - p.speedUp
      // Gentler gravity effect
      p.speedUp = Math.min(p.size, p.speedUp - 0.3)
      p.spinVal = p.spinVal + p.spinSpeed

      // Shrink particles over time (start big, get smaller)
      p.scale = Math.max(0, p.scale - 0.015)
      // Fade out as they shrink
      p.opacity = Math.max(0, p.opacity - 0.012)

      // Remove when too small or faded out
      if (
        p.scale <= 0.05 ||
        p.opacity <= 0.05 ||
        p.top >= Math.max(window.innerHeight, document.body.clientHeight) + p.size
      ) {
        particles = particles.filter((o) => o !== p)
        p.element.remove()
        return
      }

      p.element.setAttribute(
        "style",
        [
          "position:absolute",
          "will-change:transform,opacity",
          `top:${p.top}px`,
          `left:${p.left}px`,
          `transform:rotate(${p.spinVal}deg) scale(${p.scale})`,
          `opacity:${p.opacity}`,
        ].join(";")
      )
    })
  }

  let animationFrame: number | undefined

  let lastParticleTimestamp = 0
  const particleGenerationDelay = 1 // Very fast particle generation

  function loop() {
    const currentTime = performance.now()
    if (
      autoAddParticle &&
      particles.length < limit &&
      currentTime - lastParticleTimestamp > particleGenerationDelay
    ) {
      generateParticle()
      lastParticleTimestamp = currentTime
    }

    refreshParticles()
    animationFrame = requestAnimationFrame(loop)
  }

  loop()

  const isTouchInteraction = "ontouchstart" in window

  const tap = isTouchInteraction ? "touchstart" : "mousedown"
  const tapEnd = isTouchInteraction ? "touchend" : "mouseup"
  const move = isTouchInteraction ? "touchmove" : "mousemove"

  const updateMousePosition = (e: MouseEvent | TouchEvent) => {
    if ("touches" in e) {
      mouseX = e.touches?.[0].clientX
      mouseY = e.touches?.[0].clientY
    } else {
      mouseX = e.clientX
      mouseY = e.clientY
    }
  }

  let clickTimeout: ReturnType<typeof setTimeout> | null = null

  const tapHandler = (e: MouseEvent | TouchEvent) => {
    updateMousePosition(e)
    autoAddParticle = true

    // Clear any existing timeout
    if (clickTimeout) {
      clearTimeout(clickTimeout)
    }

    // Keep generating particles for 1ms after tap
    clickTimeout = setTimeout(() => {
      autoAddParticle = false
    }, 1)
  }

  const disableAutoAddParticle = () => {
    // Only disable if not in the click timeout period
    if (!clickTimeout) {
      autoAddParticle = false
    }
  }

  // Also listen for click to trigger burst effect
  const clickHandler = (e: MouseEvent) => {
    updateMousePosition(e)
    autoAddParticle = true

    if (clickTimeout) {
      clearTimeout(clickTimeout)
    }

    clickTimeout = setTimeout(() => {
      autoAddParticle = false
      clickTimeout = null
    }, 250)
  }

  element.addEventListener(move, updateMousePosition, { passive: true })
  element.addEventListener(tap, tapHandler, { passive: true })
  element.addEventListener(tapEnd, disableAutoAddParticle, { passive: true })
  element.addEventListener("click", clickHandler, { passive: true })
  element.addEventListener("mouseleave", disableAutoAddParticle, {
    passive: true,
  })

  return () => {
    if (clickTimeout) {
      clearTimeout(clickTimeout)
    }
    element.removeEventListener(move, updateMousePosition)
    element.removeEventListener(tap, tapHandler)
    element.removeEventListener(tapEnd, disableAutoAddParticle)
    element.removeEventListener("click", clickHandler)
    element.removeEventListener("mouseleave", disableAutoAddParticle)

    const interval = setInterval(() => {
      if (animationFrame && particles.length === 0) {
        cancelAnimationFrame(animationFrame)
        clearInterval(interval)

        if (--instanceCounter === 0) {
          container.remove()
        }
      }
    }, 500)
  }
}

interface CoolModeProps {
  children: ReactNode
  options?: CoolParticleOptions
}

export const CoolMode: React.FC<CoolModeProps> = ({ children, options }) => {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (ref.current) {
      return applyParticleEffect(ref.current, options)
    }
  }, [options])

  return <span ref={ref}>{children}</span>
}
