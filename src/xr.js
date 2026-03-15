import * as THREE from 'three'

/**
 * WebXR AR setup for Xreal Air / Air 2 Pro + Beam Pro
 *
 * AR-first: frames float in the real world visible through the Xreal glasses.
 * The Beam Pro acts as controller, glasses show transparent AR overlay.
 *
 * Supports:
 * - immersive-ar (preferred — real passthrough AR)
 * - immersive-vr (fallback — VR mode)
 * - hit-test (tap to place gallery in your space)
 */
export function setupAR(renderer, scene, camera, frameGroup) {
  const arButton = document.getElementById('xr-button')
  const state = {
    mode: null,
    session: null,
    hitTestSource: null,
    placed: false,
    reticle: null,
  }

  if (!navigator.xr) {
    console.log('WebXR not available — using flat mode')
    return state
  }

  // Create reticle for placement
  const reticleGeo = new THREE.RingGeometry(0.1, 0.12, 32)
  reticleGeo.rotateX(-Math.PI / 2)
  const reticleMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  })
  state.reticle = new THREE.Mesh(reticleGeo, reticleMat)
  state.reticle.visible = false
  state.reticle.matrixAutoUpdate = false
  scene.add(state.reticle)

  // Initially hide frames until placed in AR
  frameGroup.visible = true

  // Check AR support first, then VR as fallback
  navigator.xr.isSessionSupported('immersive-ar').then((arSupported) => {
    if (arSupported) {
      state.mode = 'immersive-ar'
      arButton.style.display = 'block'
      arButton.textContent = 'Enter AR'
      setupButton(renderer, scene, camera, frameGroup, state)
      return
    }

    // Fallback to VR
    return navigator.xr.isSessionSupported('immersive-vr').then((vrSupported) => {
      if (vrSupported) {
        state.mode = 'immersive-vr'
        arButton.style.display = 'block'
        arButton.textContent = 'Enter VR'
        setupButton(renderer, scene, camera, frameGroup, state)
      }
    })
  }).catch(() => {})

  return state
}

function setupButton(renderer, scene, camera, frameGroup, state) {
  const arButton = document.getElementById('xr-button')

  arButton.addEventListener('click', async () => {
    if (state.session) {
      state.session.end()
      return
    }

    try {
      const isAR = state.mode === 'immersive-ar'

      const requiredFeatures = ['local-floor']
      const optionalFeatures = ['bounded-floor', 'hand-tracking', 'layers']

      if (isAR) {
        requiredFeatures.push('hit-test')
        optionalFeatures.push('dom-overlay', 'light-estimation')
      }

      const sessionInit = {
        requiredFeatures,
        optionalFeatures,
      }

      // DOM overlay for AR UI
      if (isAR && document.getElementById('ar-overlay')) {
        sessionInit.domOverlay = { root: document.getElementById('ar-overlay') }
      }

      const session = await navigator.xr.requestSession(state.mode, sessionInit)

      // AR-specific setup
      if (isAR) {
        scene.background = null
        renderer.setClearAlpha(0)

        // Hide frames until user places them
        frameGroup.visible = false
        state.placed = false

        // Setup hit testing
        try {
          const viewerSpace = await session.requestReferenceSpace('viewer')
          state.hitTestSource = await session.requestHitTestSource({ space: viewerSpace })
        } catch (e) {
          console.warn('Hit test not available, placing immediately')
          frameGroup.visible = true
          state.placed = true
        }
      }

      session.addEventListener('end', () => {
        state.session = null
        state.hitTestSource = null
        state.placed = false
        state.reticle.visible = false
        arButton.textContent = `Enter ${isAR ? 'AR' : 'VR'}`

        // Restore for flat mode
        frameGroup.visible = true
        renderer.setClearAlpha(0)
      })

      // Handle select (tap) — place gallery or interact
      session.addEventListener('select', () => {
        if (!state.placed && state.reticle.visible) {
          // Place the gallery at reticle position
          const pos = new THREE.Vector3()
          const quat = new THREE.Quaternion()
          state.reticle.matrix.decompose(pos, quat, new THREE.Vector3())

          frameGroup.position.copy(pos)
          frameGroup.visible = true
          state.placed = true
          state.reticle.visible = false

          // Pulse animation on placement
          frameGroup.scale.setScalar(0.01)
          animateScale(frameGroup, 1.0)
        }
      })

      await renderer.xr.setSession(session)
      state.session = session
      arButton.textContent = isAR ? 'Exit AR' : 'Exit VR'

      // Reference space
      const refSpace = await session.requestReferenceSpace('local-floor')
      renderer.xr.setReferenceSpace(refSpace)

      // AR frame callback for hit testing
      if (isAR) {
        renderer.setAnimationLoop((timestamp, frame) => {
          if (!state.placed && frame && state.hitTestSource) {
            const hitResults = frame.getHitTestResults(state.hitTestSource)
            if (hitResults.length > 0) {
              const hit = hitResults[0]
              const refSpace = renderer.xr.getReferenceSpace()
              const pose = hit.getPose(refSpace)
              if (pose) {
                state.reticle.visible = true
                state.reticle.matrix.fromArray(pose.transform.matrix)
              }
            } else {
              state.reticle.visible = false
            }
          }

          // Continue with main render
          const elapsed = performance.now() / 1000
          updateARFrames(frameGroup, elapsed, state)
          renderer.render(scene, camera)
        })
      }

    } catch (err) {
      console.error('Failed to start XR session:', err)
      // Fallback: just show frames without XR
      frameGroup.visible = true
    }
  })
}

function updateARFrames(frameGroup, elapsed, state) {
  if (!state.placed) return

  frameGroup.children.forEach((frame) => {
    if (!frame.userData.isFrame) return

    const baseY = frame.userData.baseY
    const phase = frame.userData.phase
    const speed = frame.userData.floatSpeed

    frame.position.y = baseY + Math.sin(elapsed * speed + phase) * 0.04
  })
}

function animateScale(obj, targetScale) {
  const startScale = obj.scale.x
  const startTime = performance.now()
  const duration = 800 // ms

  function tick() {
    const progress = Math.min((performance.now() - startTime) / duration, 1)
    // Ease out elastic
    const ease = 1 - Math.pow(1 - progress, 3)
    const scale = startScale + (targetScale - startScale) * ease
    obj.scale.setScalar(scale)

    if (progress < 1) {
      requestAnimationFrame(tick)
    }
  }
  tick()
}
