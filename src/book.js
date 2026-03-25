import * as THREE from 'three'

const PAGE_W = 0.5
const PAGE_H = PAGE_W * (16 / 9)
const SPINE_W = 0.03
const SEGMENTS_X = 20
const LEAF_Z_OFFSET = 0.002

function generateCoverTexture(title, color, isBack) {
  const canvas = document.createElement('canvas')
  canvas.width = 540
  canvas.height = 960
  const ctx = canvas.getContext('2d')

  const grad = ctx.createLinearGradient(0, 0, 0, 960)
  grad.addColorStop(0, color || '#1a0a2e')
  grad.addColorStop(1, '#000000')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 540, 960)

  // Decorative border
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 2
  ctx.strokeRect(40, 40, 460, 880)
  ctx.strokeRect(50, 50, 440, 860)

  // Title
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = '600 28px "Helvetica Neue", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '6px'

  if (isBack) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '300 14px "Helvetica Neue", sans-serif'
    ctx.fillText('GALLERY AR', 270, 480)
    ctx.font = '300 10px "Helvetica Neue", sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillText('XREAL EDITION', 270, 510)
  } else {
    ctx.fillText(title || 'GALLERY', 270, 420)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '300 13px "Helvetica Neue", sans-serif'
    ctx.fillText('INTERACTIVE ZINE', 270, 460)
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.font = '300 10px "Helvetica Neue", sans-serif'
    ctx.fillText('SWIPE TO FLIP PAGES', 270, 880)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function buildLeaf(frontTexture, backTexture, index, totalLeaves) {
  const leaf = new THREE.Group()

  // Front page - subdivided for curl deformation
  const frontGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, SEGMENTS_X, 1)
  const frontMat = new THREE.MeshStandardMaterial({
    map: frontTexture,
    side: THREE.FrontSide,
    roughness: 0.4,
    metalness: 0.0,
  })
  const frontMesh = new THREE.Mesh(frontGeo, frontMat)
  frontMesh.position.x = PAGE_W / 2
  leaf.add(frontMesh)

  // Back page - subdivided for curl deformation
  const backGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, SEGMENTS_X, 1)
  const backMat = new THREE.MeshStandardMaterial({
    map: backTexture,
    side: THREE.FrontSide,
    roughness: 0.4,
    metalness: 0.0,
  })
  const backMesh = new THREE.Mesh(backGeo, backMat)
  backMesh.rotation.y = Math.PI
  backMesh.position.x = PAGE_W / 2
  leaf.add(backMesh)

  // Store original vertex positions for curl deformation
  frontMesh.userData.origPositions = frontGeo.attributes.position.array.slice()
  backMesh.userData.origPositions = backGeo.attributes.position.array.slice()

  // Stack leaves with z-offset to avoid z-fighting when closed
  leaf.position.z = (totalLeaves - index) * LEAF_Z_OFFSET

  leaf.userData.leafIndex = index
  leaf.userData.frontMesh = frontMesh
  leaf.userData.backMesh = backMesh

  return leaf
}

function applyCurl(mesh, curlStrength) {
  const positions = mesh.geometry.attributes.position
  const orig = mesh.userData.origPositions
  const count = positions.count

  for (let i = 0; i < count; i++) {
    const ox = orig[i * 3]
    const oy = orig[i * 3 + 1]
    // t = 0 at spine edge, 1 at outer edge
    const t = (ox + PAGE_W / 2) / PAGE_W
    const curl = Math.sin(t * Math.PI) * curlStrength
    positions.setX(i, ox)
    positions.setY(i, oy)
    positions.setZ(i, curl)
  }
  positions.needsUpdate = true
  mesh.geometry.computeVertexNormals()
}

export function createBook(artTextures, galleryData) {
  const bookGroup = new THREE.Group()
  bookGroup.visible = false

  // Spine
  const spineGeo = new THREE.BoxGeometry(SPINE_W, PAGE_H, 0.03)
  const spineMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.3,
    metalness: 0.8,
  })
  const spineMesh = new THREE.Mesh(spineGeo, spineMat)
  spineMesh.position.x = -SPINE_W / 2
  bookGroup.add(spineMesh)

  // Build leaves
  // Pages: cover, 9 art pages, back cover = 12 faces needed
  // Leaves: ceil(12/2) = 6 leaves
  const coverFront = generateCoverTexture('GALLERY AR', galleryData[0]?.color)
  const coverBack = generateCoverTexture('', galleryData[0]?.color, true)

  const pageTextures = []
  // Front cover outside, front cover inside (page 1 art)
  pageTextures.push({ front: coverFront, back: artTextures[0] || coverFront })

  // Interior leaves: pairs of art pages
  for (let i = 1; i < artTextures.length; i += 2) {
    pageTextures.push({
      front: artTextures[i],
      back: artTextures[i + 1] || coverBack,
    })
  }

  // If odd number of art pages, add back cover leaf
  if (artTextures.length % 2 === 0) {
    pageTextures.push({ front: artTextures[artTextures.length - 1], back: coverBack })
  } else {
    // Last leaf already has back cover as its back
    // Add a final leaf for back cover
    pageTextures.push({ front: coverBack, back: coverBack })
  }

  const totalLeaves = pageTextures.length
  const leaves = []
  const leafAngles = []
  const targetAngles = []

  for (let i = 0; i < totalLeaves; i++) {
    const leaf = buildLeaf(pageTextures[i].front, pageTextures[i].back, i, totalLeaves)
    bookGroup.add(leaf)
    leaves.push(leaf)
    leafAngles.push(0)
    targetAngles.push(0)
  }

  // State
  let currentPage = 0
  let isDragging = false
  let dragLeafIndex = -1
  let dragStartX = 0
  let dragStartAngle = 0
  let isOpen = false
  let openProgress = 0
  let isClosing = false
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  // Page indicator
  const indicator = document.getElementById('book-page-indicator')
  const overlay = document.getElementById('book-overlay')

  function updatePageIndicator() {
    if (indicator) {
      const totalPages = artTextures.length + 2 // art pages + covers
      const displayPage = Math.min(currentPage * 2 + 1, totalPages)
      indicator.textContent = `${currentPage + 1} / ${totalLeaves}`
    }
  }

  function setPage(page) {
    currentPage = THREE.MathUtils.clamp(page, 0, totalLeaves)
    for (let i = 0; i < totalLeaves; i++) {
      targetAngles[i] = i < currentPage ? -Math.PI : 0
    }
    updatePageIndicator()
  }

  function updateLeafZOrder() {
    for (let i = 0; i < totalLeaves; i++) {
      const angle = leafAngles[i]
      if (angle < -Math.PI / 2) {
        // Flipped to left - stack in reverse order
        leaves[i].position.z = -(totalLeaves - i) * LEAF_Z_OFFSET
      } else {
        // On right side - stack normally
        leaves[i].position.z = (totalLeaves - i) * LEAF_Z_OFFSET
      }
    }
  }

  const bookInstance = {
    group: bookGroup,
    get isOpen() { return isOpen },

    open(camera) {
      isOpen = true
      isClosing = false
      openProgress = 0
      bookGroup.visible = true

      // Position book in front of camera
      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      const pos = camera.position.clone().add(dir.multiplyScalar(1.2))
      bookGroup.position.copy(pos)
      bookGroup.quaternion.copy(camera.quaternion)

      // Slightly tilt for better viewing angle
      bookGroup.rotateX(-0.15)

      bookGroup.scale.setScalar(0.01)
      setPage(0)

      if (overlay) overlay.style.display = 'flex'
      updatePageIndicator()
    },

    close() {
      isClosing = true
      if (overlay) overlay.style.display = 'none'
    },

    update(delta, elapsed) {
      if (!isOpen) return

      // Open animation
      if (!isClosing && openProgress < 1) {
        openProgress = Math.min(openProgress + delta * 2.5, 1)
        const ease = 1 - Math.pow(1 - openProgress, 3)
        bookGroup.scale.setScalar(ease)
      }

      // Close animation
      if (isClosing) {
        openProgress = Math.max(openProgress - delta * 3, 0)
        const ease = 1 - Math.pow(1 - openProgress, 3)
        bookGroup.scale.setScalar(ease)
        if (openProgress <= 0) {
          isOpen = false
          bookGroup.visible = false
          return
        }
      }

      // Animate leaf rotations toward targets
      for (let i = 0; i < totalLeaves; i++) {
        if (i === dragLeafIndex && isDragging) continue

        const diff = targetAngles[i] - leafAngles[i]
        if (Math.abs(diff) > 0.001) {
          leafAngles[i] += diff * 0.12
        } else {
          leafAngles[i] = targetAngles[i]
        }
      }

      // Apply rotations and curl
      for (let i = 0; i < totalLeaves; i++) {
        leaves[i].rotation.y = leafAngles[i]

        // Calculate curl strength - maximum at midpoint of flip
        const normalized = Math.abs(leafAngles[i] / Math.PI) // 0 to 1
        const curlStrength = Math.sin(normalized * Math.PI) * 0.06

        applyCurl(leaves[i].userData.frontMesh, curlStrength)
        applyCurl(leaves[i].userData.backMesh, curlStrength)
      }

      updateLeafZOrder()
    },

    handlePointerDown(e, camera) {
      if (!isOpen || isClosing) return false

      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1

      raycaster.setFromCamera(pointer, camera)
      const intersects = raycaster.intersectObject(bookGroup, true)

      if (intersects.length > 0) {
        // Determine if hit is on left or right half of book
        const localPoint = bookGroup.worldToLocal(intersects[0].point.clone())
        const hitRight = localPoint.x > 0

        if (hitRight && currentPage < totalLeaves) {
          // Grab the topmost right-side leaf
          dragLeafIndex = currentPage
        } else if (!hitRight && currentPage > 0) {
          // Grab the topmost left-side leaf to flip back
          dragLeafIndex = currentPage - 1
        } else {
          return false
        }

        isDragging = true
        dragStartX = e.clientX
        dragStartAngle = leafAngles[dragLeafIndex]
        return true
      }
      return false
    },

    handlePointerMove(e) {
      if (!isDragging || dragLeafIndex < 0) return false

      const deltaX = e.clientX - dragStartX
      const sensitivity = -Math.PI / (window.innerWidth * 0.35)
      let newAngle = dragStartAngle + deltaX * sensitivity

      newAngle = THREE.MathUtils.clamp(newAngle, -Math.PI, 0)
      leafAngles[dragLeafIndex] = newAngle

      return true
    },

    handlePointerUp(e) {
      if (!isDragging || dragLeafIndex < 0) return false

      const angle = leafAngles[dragLeafIndex]
      const startedFromRight = dragStartAngle > -Math.PI / 2

      if (startedFromRight) {
        // Flipping forward
        if (angle < -Math.PI / 3) {
          // Complete the flip
          targetAngles[dragLeafIndex] = -Math.PI
          currentPage = dragLeafIndex + 1
        } else {
          // Snap back
          targetAngles[dragLeafIndex] = 0
        }
      } else {
        // Flipping backward
        if (angle > -Math.PI * 2 / 3) {
          // Complete the flip back
          targetAngles[dragLeafIndex] = 0
          currentPage = dragLeafIndex
        } else {
          // Snap back to flipped
          targetAngles[dragLeafIndex] = -Math.PI
        }
      }

      isDragging = false
      dragLeafIndex = -1
      updatePageIndicator()
      return true
    },

    dispose() {
      leaves.forEach(leaf => {
        leaf.userData.frontMesh.geometry.dispose()
        leaf.userData.frontMesh.material.dispose()
        leaf.userData.backMesh.geometry.dispose()
        leaf.userData.backMesh.material.dispose()
      })
      spineMesh.geometry.dispose()
      spineMat.dispose()
    },
  }

  return bookInstance
}
