import * as THREE from 'three'

/**
 * WebXR setup for Xreal Air / Air 2 Pro + Beam Pro
 *
 * Xreal glasses with Beam Pro support WebXR through Nebula (Android).
 * The Beam Pro acts as a 6DoF controller and the glasses as immersive display.
 *
 * To use:
 * 1. Connect Xreal glasses to Beam Pro
 * 2. Open Nebula browser
 * 3. Navigate to this page
 * 4. Tap "Enter XR"
 */
export function setupXR(renderer, scene, camera) {
  const xrButton = document.getElementById('xr-button')

  if (!navigator.xr) {
    console.log('WebXR not available')
    return
  }

  // Check for immersive-vr support (Xreal via Nebula)
  navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
    if (supported) {
      xrButton.style.display = 'block'
      xrButton.textContent = 'Enter XR'
      setupXRButton(renderer, scene, camera, 'immersive-vr')
    }
  }).catch(() => {})

  // Also check immersive-ar for AR passthrough
  navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
    if (supported && xrButton.style.display === 'none') {
      xrButton.style.display = 'block'
      xrButton.textContent = 'Enter AR'
      setupXRButton(renderer, scene, camera, 'immersive-ar')
    }
  }).catch(() => {})
}

function setupXRButton(renderer, scene, camera, mode) {
  const xrButton = document.getElementById('xr-button')
  let currentSession = null

  xrButton.addEventListener('click', async () => {
    if (currentSession) {
      currentSession.end()
      return
    }

    try {
      const sessionInit = {
        optionalFeatures: [
          'local-floor',
          'bounded-floor',
          'hand-tracking',
          'layers',
        ]
      }

      if (mode === 'immersive-ar') {
        // AR mode — transparent background for passthrough
        scene.background = null
        renderer.setClearAlpha(0)
      }

      const session = await navigator.xr.requestSession(mode, sessionInit)
      session.addEventListener('end', () => {
        currentSession = null
        xrButton.textContent = `Enter ${mode === 'immersive-ar' ? 'AR' : 'XR'}`
        // Restore background
        scene.background = new THREE.Color(0x050508)
        renderer.setClearAlpha(1)
      })

      renderer.xr.setSession(session)
      currentSession = session
      xrButton.textContent = 'Exit XR'

      // Set reference space — local-floor works best with Xreal
      const refSpace = await session.requestReferenceSpace('local-floor')
      renderer.xr.setReferenceSpace(refSpace)

    } catch (err) {
      console.error('Failed to start XR session:', err)
    }
  })
}
