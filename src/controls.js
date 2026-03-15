import * as THREE from 'three'

export function setupControls(camera, domElement) {
  // Custom orbital controls — lightweight, no external dependency
  const state = {
    isDragging: false,
    previousMouse: { x: 0, y: 0 },
    spherical: new THREE.Spherical(8, Math.PI / 2.2, 0),
    target: new THREE.Vector3(0, 1.4, 0),
    damping: { theta: 0, phi: 0, radius: 0 },
    autoRotate: true,
    autoRotateSpeed: 0.15,
  }

  function updateCamera() {
    const pos = new THREE.Vector3().setFromSpherical(state.spherical)
    camera.position.copy(state.target).add(pos)
    camera.lookAt(state.target)
  }

  updateCamera()

  // Mouse events
  domElement.addEventListener('pointerdown', (e) => {
    state.isDragging = true
    state.previousMouse.x = e.clientX
    state.previousMouse.y = e.clientY
    state.autoRotate = false
  })

  domElement.addEventListener('pointermove', (e) => {
    if (!state.isDragging) return
    const dx = e.clientX - state.previousMouse.x
    const dy = e.clientY - state.previousMouse.y
    state.damping.theta -= dx * 0.005
    state.damping.phi -= dy * 0.005
    state.previousMouse.x = e.clientX
    state.previousMouse.y = e.clientY
  })

  domElement.addEventListener('pointerup', () => {
    state.isDragging = false
    // Resume auto-rotate after 3 seconds
    setTimeout(() => {
      if (!state.isDragging) state.autoRotate = true
    }, 3000)
  })

  domElement.addEventListener('wheel', (e) => {
    state.damping.radius += e.deltaY * 0.005
  }, { passive: true })

  // Touch support (Beam Pro)
  let touchStartDist = 0
  domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      state.isDragging = true
      state.previousMouse.x = e.touches[0].clientX
      state.previousMouse.y = e.touches[0].clientY
      state.autoRotate = false
    } else if (e.touches.length === 2) {
      touchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
    }
  }, { passive: true })

  domElement.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && state.isDragging) {
      const dx = e.touches[0].clientX - state.previousMouse.x
      const dy = e.touches[0].clientY - state.previousMouse.y
      state.damping.theta -= dx * 0.005
      state.damping.phi -= dy * 0.005
      state.previousMouse.x = e.touches[0].clientX
      state.previousMouse.y = e.touches[0].clientY
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      state.damping.radius -= (dist - touchStartDist) * 0.01
      touchStartDist = dist
    }
  }, { passive: true })

  domElement.addEventListener('touchend', () => {
    state.isDragging = false
    setTimeout(() => {
      if (!state.isDragging) state.autoRotate = true
    }, 3000)
  })

  return {
    update(delta) {
      // Auto rotation
      if (state.autoRotate) {
        state.damping.theta += state.autoRotateSpeed * 0.016
      }

      // Apply damping
      state.spherical.theta += state.damping.theta * 0.08
      state.spherical.phi += state.damping.phi * 0.08
      state.spherical.radius += state.damping.radius * 0.08

      // Clamp
      state.spherical.phi = THREE.MathUtils.clamp(state.spherical.phi, 0.3, Math.PI - 0.3)
      state.spherical.radius = THREE.MathUtils.clamp(state.spherical.radius, 3, 15)

      // Decay damping
      state.damping.theta *= 0.92
      state.damping.phi *= 0.92
      state.damping.radius *= 0.88

      updateCamera()
    }
  }
}
