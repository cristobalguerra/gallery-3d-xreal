import * as THREE from 'three'
import { createFrames } from './frames.js'
import { setupControls } from './controls.js'
import { setupXR } from './xr.js'
import { createEnvironment } from './environment.js'

// ── Scene Setup ──────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050508)
scene.fog = new THREE.FogExp2(0x050508, 0.035)

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 1.6, 8)

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
renderer.xr.enabled = true
document.body.appendChild(renderer.domElement)

// ── Lighting ─────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.15)
scene.add(ambientLight)

const mainLight = new THREE.DirectionalLight(0xeeeeff, 0.6)
mainLight.position.set(5, 10, 5)
scene.add(mainLight)

// ── Environment ──────────────────────────────────────────────
createEnvironment(scene)

// ── Frames ───────────────────────────────────────────────────
const { frames, frameGroup } = createFrames(scene)

// ── Controls ─────────────────────────────────────────────────
const controls = setupControls(camera, renderer.domElement)

// ── XR (Xreal / WebXR) ──────────────────────────────────────
setupXR(renderer, scene, camera)

// ── Raycaster for hover ──────────────────────────────────────
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let hoveredFrame = null

renderer.domElement.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
})

// ── Resize ───────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ── Animation Loop ───────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  const elapsed = clock.getElapsedTime()
  const delta = clock.getDelta()

  // Float animation for frames
  frames.forEach((frame, i) => {
    const baseY = frame.userData.baseY
    const phase = frame.userData.phase
    const speed = frame.userData.floatSpeed
    frame.position.y = baseY + Math.sin(elapsed * speed + phase) * 0.08
    frame.rotation.y = frame.userData.baseRotY + Math.sin(elapsed * 0.3 + phase) * 0.02
  })

  // Raycaster hover effect
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(frames, true)

  if (hoveredFrame) {
    hoveredFrame.userData.targetScale = 1.0
    hoveredFrame = null
  }

  if (intersects.length > 0) {
    let obj = intersects[0].object
    while (obj.parent && !obj.userData.isFrame) obj = obj.parent
    if (obj.userData.isFrame) {
      hoveredFrame = obj
      hoveredFrame.userData.targetScale = 1.06
      renderer.domElement.style.cursor = 'pointer'
    }
  } else {
    renderer.domElement.style.cursor = 'default'
  }

  // Smooth scale transitions
  frames.forEach((frame) => {
    const target = frame.userData.targetScale || 1.0
    const current = frame.scale.x
    const newScale = THREE.MathUtils.lerp(current, target, 0.08)
    frame.scale.setScalar(newScale)
  })

  // Gentle global rotation for particle environment
  const particles = scene.getObjectByName('particles')
  if (particles) {
    particles.rotation.y = elapsed * 0.02
    particles.rotation.x = Math.sin(elapsed * 0.01) * 0.05
  }

  controls.update(delta)
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)

// ── Hide Loader ──────────────────────────────────────────────
setTimeout(() => {
  document.getElementById('loader').classList.add('hidden')
}, 800)
