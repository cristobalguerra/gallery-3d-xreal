import * as THREE from 'three'

/**
 * AR environment — minimal, no floor/grid.
 * Only subtle ambient particles that blend with reality.
 */
export function createEnvironment(scene) {
  // Sparse floating particles — very subtle for AR
  const particleCount = 80
  const positions = new Float32Array(particleCount * 3)

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 6
    positions[i * 3 + 1] = Math.random() * 3 + 0.3
    positions[i * 3 + 2] = (Math.random() - 0.5) * 6
  }

  const particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const particleMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.008,
    transparent: true,
    opacity: 0.3,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const particles = new THREE.Points(particleGeo, particleMat)
  particles.name = 'particles'
  scene.add(particles)
}
