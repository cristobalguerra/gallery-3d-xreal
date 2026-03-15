import * as THREE from 'three'

// 9:16 aspect ratio frame dimensions
const FRAME_W = 1.0
const FRAME_H = FRAME_W * (16 / 9)
const FRAME_DEPTH = 0.04
const BORDER = 0.05

// Gallery images — procedurally generated art as placeholders
// Replace these with your own images in /public/textures/
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

  // Abstract art based on index
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
    // Focal circle
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
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '300 11px "Helvetica Neue", sans-serif'
  ctx.letterSpacing = '4px'
  ctx.textAlign = 'center'
  ctx.fillText(data.title.toUpperCase(), 270, 910)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function createFrames(scene) {
  const frames = []
  const frameGroup = new THREE.Group()

  // Layout: circular arrangement
  const radius = 5
  const count = GALLERY_DATA.length
  const angleStep = (Math.PI * 2) / count

  GALLERY_DATA.forEach((data, i) => {
    const angle = i * angleStep - Math.PI / 2
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const y = 1.6 + (Math.random() - 0.5) * 0.6

    // Frame group
    const frame = new THREE.Group()
    frame.userData.isFrame = true
    frame.userData.baseY = y
    frame.userData.baseRotY = -angle + Math.PI / 2
    frame.userData.phase = Math.random() * Math.PI * 2
    frame.userData.floatSpeed = 0.4 + Math.random() * 0.3
    frame.userData.targetScale = 1.0

    // Frame border (matte black)
    const borderGeo = new THREE.BoxGeometry(
      FRAME_W + BORDER * 2,
      FRAME_H + BORDER * 2,
      FRAME_DEPTH
    )
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.8,
      roughness: 0.3,
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

    // Subtle glow behind frame
    const glowGeo = new THREE.PlaneGeometry(FRAME_W + 0.4, FRAME_H + 0.4)
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(data.accent),
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
    })
    const glowMesh = new THREE.Mesh(glowGeo, glowMat)
    glowMesh.position.z = -FRAME_DEPTH / 2 - 0.01
    frame.add(glowMesh)

    // Spot light per frame
    const spotLight = new THREE.PointLight(
      new THREE.Color(data.accent),
      0.3,
      4,
      2
    )
    spotLight.position.set(0, 0, 1)
    frame.add(spotLight)

    frame.position.set(x, y, z)
    frame.rotation.y = -angle + Math.PI / 2

    frameGroup.add(frame)
    frames.push(frame)
  })

  scene.add(frameGroup)
  return { frames, frameGroup }
}
