import * as THREE from 'three'

export function createEnvironment(scene) {
  // ── Floor (reflective, dark) ───────────────────────────────
  const floorGeo = new THREE.CircleGeometry(20, 64)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x080810,
    metalness: 0.9,
    roughness: 0.2,
  })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.5
  scene.add(floor)

  // ── Floating particles ─────────────────────────────────────
  const particleCount = 600
  const positions = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30
    positions[i * 3 + 1] = Math.random() * 10
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30
    sizes[i] = Math.random() * 2 + 0.5
  }

  const particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  const particleMat = new THREE.PointsMaterial({
    color: 0x444466,
    size: 0.02,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const particles = new THREE.Points(particleGeo, particleMat)
  particles.name = 'particles'
  scene.add(particles)

  // ── Ambient grid lines on floor ────────────────────────────
  const gridHelper = new THREE.GridHelper(30, 60, 0x111122, 0x0a0a15)
  gridHelper.position.y = -0.49
  gridHelper.material.transparent = true
  gridHelper.material.opacity = 0.3
  scene.add(gridHelper)
}
