import * as THREE from 'three'

// 9:16 aspect ratio frame dimensions
const FRAME_W = 0.6
const FRAME_H = FRAME_W * (16 / 9)
const FRAME_DEPTH = 0.02
const BORDER = 0.03

// Gallery art data
const GALLERY_DATA = [
  { title: 'Nebula I', color: '#1a0a2e', accent: '#7b2ff7' },
  { title: 'Void', color: '#0a1628', accent: '#00d4ff' },
  { title: 'Drift', color: '#1a0000', accent: '#ff3366' },
  { title: 'Signal', color: '#001a0a', accent: '#00ff88' },
  { title: 'Pulse', color: '#1a1400', accent: '#ffaa00' },
  { title: 'Echo', color: '#0a0a1e', accent: '#8855ff' },
  { title: 'Static', color: '#141414', accent: '#ffffff' },
  { title: 'Wave', color: '#001a1a', accent: '#00ffcc' },
  { title: 'Bloom', color: '#1a0a14', accent: '#ff44aa' },
]

function generateArtTexture(data, index) {
  const canvas = document.createElement('canvas')
  canvas.width = 540
  canvas.height = 960
  const ctx = canvas.getContext('2d')

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 960)
  bgGrad.addColorStop(0, data.color)
  bgGrad.addColorStop(1, '#000000')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, 540, 960)

  const type = index % 4

  if (type === 0) {
    // Concentric circles
    for (let i = 12; i > 0; i--) {
      ctx.beginPath()
      ctx.arc(270, 480, i * 35, 0, Math.PI * 2)
      ctx.strokeStyle = data.accent + Math.floor((i / 12) * 60 + 10).toString(16).padStart(2, '0')
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  } else if (type === 1) {
    // Vertical lines
    for (let i = 0; i < 30; i++) {
      const x = 60 + i * 14
      const h = 200 + Math.sin(i * 0.5) * 300
      const y = 480 - h / 2
      ctx.fillStyle = data.accent + Math.floor(Math.random() * 40 + 20).toString(16).padStart(2, '0')
      ctx.fillRect(x, y, 2, h)
    }
  } else if (type === 2) {
    // Diagonal grid
    ctx.strokeStyle = data.accent + '30'
    ctx.lineWidth = 0.5
    for (let i = -960; i < 960; i += 40) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i + 960, 960)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(i + 960, 0)
      ctx.lineTo(i, 960)
      ctx.stroke()
    }
    const radGrad = ctx.createRadialGradient(270, 480, 0, 270, 480, 200)
    radGrad.addColorStop(0, data.accent + '60')
    radGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = radGrad
    ctx.fillRect(0, 0, 540, 960)
  } else {
    // Scattered dots
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 540
      const y = Math.random() * 960
      const r = Math.random() * 3 + 0.5
      const dist = Math.sqrt((x - 270) ** 2 + (y - 480) ** 2)
      const alpha = Math.max(0.05, 1 - dist / 500)
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = data.accent + Math.floor(alpha * 80).toString(16).padStart(2, '0')
      ctx.fill()
    }
  }

  // Title at bottom
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = '300 13px "Helvetica Neue", sans-serif'
  ctx.letterSpacing = '4px'
  ctx.textAlign = 'center'
  ctx.fillText(data.title.toUpperCase(), 270, 920)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function createFrames(scene) {
  const frames = []
  const frameGroup = new THREE.Group()

  // Layout: semicircle in front of user (AR-friendly)
  const radius = 2.5
  const count = GALLERY_DATA.length
  const arcAngle = Math.PI * 1.2 // ~216 degrees arc
  const startAngle = -arcAngle / 2

  GALLERY_DATA.forEach((data, i) => {
    const t = count > 1 ? i / (count - 1) : 0.5
    const angle = startAngle + t * arcAngle
    const x = Math.sin(angle) * radius
    const z = -Math.cos(angle) * radius
    // Stagger heights for visual interest
    const row = i % 3
    const y = 0.8 + row * 0.55 + (Math.random() - 0.5) * 0.15

    // Frame group
    const frame = new THREE.Group()
    frame.userData.isFrame = true
    frame.userData.baseY = y
    frame.userData.baseRotY = angle
    frame.userData.phase = Math.random() * Math.PI * 2
    frame.userData.floatSpeed = 0.3 + Math.random() * 0.25
    frame.userData.targetScale = 1.0
    frame.userData.selected = false

    // Glass-like frame border
    const borderGeo = new THREE.BoxGeometry(
      FRAME_W + BORDER * 2,
      FRAME_H + BORDER * 2,
      FRAME_DEPTH
    )
    const borderMat = new THREE.MeshPhysicalMaterial({
      color: 0x222222,
      metalness: 0.95,
      roughness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.9,
    })
    const borderMesh = new THREE.Mesh(borderGeo, borderMat)
    frame.add(borderMesh)

    // Art surface
    const artGeo = new THREE.PlaneGeometry(FRAME_W, FRAME_H)
    const texture = generateArtTexture(data, i)
    const artMat = new THREE.MeshBasicMaterial({
      map: texture,
    })
    const artMesh = new THREE.Mesh(artGeo, artMat)
    artMesh.position.z = FRAME_DEPTH / 2 + 0.001
    frame.add(artMesh)

    // Subtle glow behind frame (visible in AR)
    const glowGeo = new THREE.PlaneGeometry(FRAME_W + 0.2, FRAME_H + 0.2)
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(data.accent),
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const glowMesh = new THREE.Mesh(glowGeo, glowMat)
    glowMesh.position.z = -FRAME_DEPTH / 2 - 0.005
    frame.add(glowMesh)

    // Soft point light per frame (low intensity for AR)
    const pointLight = new THREE.PointLight(
      new THREE.Color(data.accent),
      0.15,
      2,
      2
    )
    pointLight.position.set(0, 0, 0.5)
    frame.add(pointLight)

    // Shadow plane under each frame (grounds it in AR)
    const shadowGeo = new THREE.PlaneGeometry(FRAME_W * 0.6, 0.08)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    })
    const shadow = new THREE.Mesh(shadowGeo, shadowMat)
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -FRAME_H / 2 - 0.1
    frame.add(shadow)

    frame.position.set(x, y, z)
    frame.lookAt(0, y, 0) // Face center

    frameGroup.add(frame)
    frames.push(frame)
  })

  scene.add(frameGroup)
  return { frames, frameGroup }
}
