import * as THREE from 'three'
import { createFrames } from './frames.js'
import { setupControls } from './controls.js'
import { setupAR } from './xr.js'

// ── Scene Setup ──────────────────────────────────────────────
const scene = new THREE.Scene()
// No background — transparent for AR passthrough
scene.background = null

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100)
camera.position.set(0, 1.6, 0)

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
renderer.setClearColor(0x000000, 0)
renderer.xr.enabled = true
document.body.appendChild(renderer.domElement)

// ── Lighting (subtle, works with AR) ─────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
scene.add(ambientLight)

const mainLight = new THREE.DirectionalLight(0xffffff, 0.6)
mainLight.position.set(2, 5, 3)
mainLight.castShadow = true
mainLight.shadow.mapSize.set(1024, 1024)
scene.add(mainLight)

// Hemisphere light for natural AR blending
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4)
scene.add(hemiLight)

// ── Frames ───────────────────────────────────────────────────
const { frames, frameGroup } = createFrames(scene)

// ── Controls (fallback for non-AR) ───────────────────────────
const controls = setupControls(camera, renderer.domElement)

// ── AR Setup ─────────────────────────────────────────────────
const arState = setupAR(renderer, scene, camera, frameGroup)

// ── Raycaster for interaction ────────────────────────────────
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let hoveredFrame = null
let selectedFrame = null

renderer.domElement.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
})

// Tap to select frame in AR
renderer.domElement.addEventListener('click', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(frames, true)

  if (intersects.length > 0) {
    let obj = intersects[0].object
    while (obj.parent && !obj.userData.isFrame) obj = obj.parent
    if (obj.userData.isFrame) {
      if (selectedFrame === obj) {
        // Deselect — return to original position
        obj.userData.selected = false
        selectedFrame = null
      } else {
        // Deselect previous
        if (selectedFrame) selectedFrame.userData.selected = false
        // Select new — bring closer
        obj.userData.selected = true
        selectedFrame = obj
      }
    }
  }
})

// ── Resize ───────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ── Animation Loop ───────────────────────────────────────────
const clock = new THREE.Clock()

function animate(timestamp, xrFrame) {
  const elapsed = clock.getElapsedTime()
  const delta = clock.getDelta()
  const inXR = renderer.xr.isPresenting

  // Float animation for frames
  frames.forEach((frame, i) => {
    const baseY = frame.userData.baseY
    const phase = frame.userData.phase
    const speed = frame.userData.floatSpeed

    // Gentle floating
    const floatY = Math.sin(elapsed * speed + phase) * 0.05
    const floatRotY = Math.sin(elapsed * 0.3 + phase) * 0.015

    frame.position.y = baseY + floatY

    if (!inXR) {
      frame.rotation.y = frame.userData.baseRotY + floatRotY
    }

    // Selected frame: pulse glow
    if (frame.userData.selected) {
      frame.userData.targetScale = 1.08
      // Pulse the glow
      const glow = frame.children.find(c => c.material && c.material.opacity < 0.5)
      if (glow) {
        glow.material.opacity = 0.08 + Math.sin(elapsed * 2) * 0.04
      }
    } else {
      frame.userData.targetScale = frame.userData.targetScale === 1.08 ? 1.0 : frame.userData.targetScale
    }
  })

  // Raycaster hover (non-XR)
  if (!inXR) {
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(frames, true)

    if (hoveredFrame && !hoveredFrame.userData.selected) {
      hoveredFrame.userData.targetScale = 1.0
      hoveredFrame = null
    }

    if (intersects.length > 0) {
      let obj = intersects[0].object
      while (obj.parent && !obj.userData.isFrame) obj = obj.parent
      if (obj.userData.isFrame && !obj.userData.selected) {
        hoveredFrame = obj
        hoveredFrame.userData.targetScale = 1.04
        renderer.domElement.style.cursor = 'pointer'
      }
    } else {
      renderer.domElement.style.cursor = 'default'
    }
  }

  // Smooth scale transitions
  frames.forEach((frame) => {
    const target = frame.userData.targetScale || 1.0
    const current = frame.scale.x
    const newScale = THREE.MathUtils.lerp(current, target, 0.08)
    frame.scale.setScalar(newScale)
  })

  // Non-XR controls
  if (!inXR) {
    controls.update(delta)
  }

  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)

// ── Hide Loader ──────────────────────────────────────────────
setTimeout(() => {
  document.getElementById('loader').classList.add('hidden')
}, 800)
