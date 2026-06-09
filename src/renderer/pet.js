import { createPlayer } from './sprite-engine.js'
import { createStateMachine } from './state-machine.js'
import { createSpeechBubble } from './speech-bubble.js'
import { createEventHandler, createSleepChecker } from './event-handler.js'
import { createPermissionPopup } from './permission-popup.js'
import { createTimeAwareEngine } from './time-aware.js'

const DOUBLE_CLICK_MS = 300
const LONG_PRESS_MS = 600
const MOVE_THRESHOLD_PX = 5
const CLICK_RETURN_MS = 3000
const MAX_WIDTH = 400
const MAX_HEIGHT = 560
const MIN_WIDTH = 160
const MIN_HEIGHT = 224

const CUTE_MESSAGES = ['Hi! 👋', '别戳我~', '摸摸头~', 'Hello!', '嘿嘿~']
const EXCITED_MESSAGES = ['Woo!', '太开心!', 'Yay!', '蹦蹦跳~', 'Yeah!']
const EASTER_EGG_MESSAGES = ['你发现了秘密!', '长按大师!', '✨ Secret! ✨', '隐藏彩蛋~', 'Wow!']

function randomMessage(pool) {
  return pool[Math.floor(Math.random() * pool.length)]
}

function init() {
  const petSprite = document.getElementById('pet-sprite')
  const noPetMessage = document.getElementById('no-pet-message')

  const player = createPlayer(petSprite)
  const stateMachine = createStateMachine(player)
  const speechBubble = createSpeechBubble()
  const eventHandler = createEventHandler(stateMachine, speechBubble)
  const sleepChecker = createSleepChecker(stateMachine, speechBubble, eventHandler)
  const permissionPopup = createPermissionPopup()
  const timeAware = createTimeAwareEngine(stateMachine, speechBubble, player)

  window.petApi.onEvent((event) => {
    eventHandler.handleEvent(event)
    if (event.type === 'permission.replied' || event.type === 'question.replied' || event.type === 'question.rejected') {
      console.log('[pet:debug] Hiding popup for event:', event.type)
      permissionPopup.hide()
    }
  })

  let currentZoom = 1
  const petContainer = document.getElementById('pet-container')
  const resizeHandle = document.getElementById('resize-handle')
  const permissionPopupEl = document.getElementById('permission-popup')

  const interactiveEls = [petSprite, noPetMessage, permissionPopupEl]
  let clickThrough = true
  let isResizing = false
  document.addEventListener('mousemove', (e) => {
    if (isResizing) {
      if (clickThrough) {
        clickThrough = false
        window.petApi.setIgnoreMouseEvents(false)
      }
      return
    }
    let overInteractive = false
    for (const el of interactiveEls) {
      const rect = el.getBoundingClientRect()
      if (e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        overInteractive = true
        break
      }
    }
    if (!overInteractive) {
      const hr = resizeHandle.getBoundingClientRect()
      const pad = 50 * currentZoom
      if (e.clientX >= hr.left - pad && e.clientX <= hr.right + pad &&
          e.clientY >= hr.top - pad && e.clientY <= hr.bottom + pad) {
        overInteractive = true
      }
    }
    if (overInteractive && clickThrough) {
      clickThrough = false
      window.petApi.setIgnoreMouseEvents(false)
    } else if (!overInteractive && !clickThrough) {
      clickThrough = true
      window.petApi.setIgnoreMouseEvents(true)
    }
  })

  function updateScale() {
    currentZoom = window.innerWidth / 200
    document.documentElement.style.fontSize = (currentZoom * 100) + '%'
    updateHandlePosition()
  }

  function updateHandlePosition() {
    const petRightPct = (petSprite.offsetLeft + petSprite.offsetWidth) / petContainer.clientWidth * 100
    const petBottomPct = (petSprite.offsetTop + petSprite.offsetHeight) / petContainer.clientHeight * 100
    const gap = 1 + currentZoom * currentZoom
    resizeHandle.style.left = `calc(${petRightPct}% + ${gap}px)`
    resizeHandle.style.top = `calc(${petBottomPct}% + ${gap}px)`
  }

  let resizeHandleVisible = false
  function checkResizeHover(e) {
    if (resizeHandle.classList.contains('dragging')) return
    const handleRect = resizeHandle.getBoundingClientRect()
    const hx = handleRect.left + handleRect.width / 2
    const hy = handleRect.top + handleRect.height / 2
    const dx = e.clientX - hx
    const dy = e.clientY - hy
    const nearHandle = Math.sqrt(dx * dx + dy * dy) < 50 * currentZoom
    if (nearHandle !== resizeHandleVisible) {
      resizeHandleVisible = nearHandle
      resizeHandle.classList.toggle('near', nearHandle)
    }
  }
  document.addEventListener('mousemove', checkResizeHover)
  document.addEventListener('mouseleave', () => {
    resizeHandleVisible = false
    resizeHandle.classList.remove('near')
  })

  window.petApi.onPetData((data) => {
    player.setLoaded(true)
    petSprite.style.backgroundImage = `url('${data.spriteDataUrl}')`
    petSprite.style.display = 'block'
    noPetMessage.style.display = 'none'
    updateScale()
    player.play('idle')
    timeAware.showGreeting()
    timeAware.startPeriodicReminders()
  })

  window.petApi.onPermissionRequest((request) => {
    permissionPopup.show(request)
  })

  setTimeout(() => {
    if (!petSprite.style.backgroundImage) {
      petSprite.style.display = 'none'
      noPetMessage.style.display = 'block'
    }
  }, 3000)

  sleepChecker.start()

  const originalSetState = stateMachine.setState
  stateMachine.setState = function(newState) {
    originalSetState.call(this, newState)
    if (stateMachine.getCurrentState() === 'idle') {
      timeAware.startPeriodicReminders()
    } else {
      timeAware.stopPeriodicReminders()
    }
  }

  // ── Interruption Handling ──
  window.addEventListener('blur', () => {
    timeAware.stopPeriodicReminders()
  })

  window.addEventListener('resize', () => {
    updateScale()
  })

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      timeAware.stopPeriodicReminders()
    } else if (stateMachine.getCurrentState() === 'idle') {
      timeAware.startPeriodicReminders()
    }
  })

  let tapTimer = null
  let longPressTimer = null
  let longPressFired = false
  let mouseDownPos = null
  let isDragging = false
  let returnTimer = null

  function triggerTapAction(anim, messages) {
    const current = stateMachine.getCurrentState()
    if (current === 'waving' || current === 'failed') return
    player.play(anim)
    speechBubble.showText(randomMessage(messages))
    if (returnTimer) clearTimeout(returnTimer)
    returnTimer = setTimeout(() => {
      player.play(stateMachine.getPreviousState())
      returnTimer = null
    }, CLICK_RETURN_MS)
  }

  resizeHandle.addEventListener('mousedown', (e) => {
    e.stopPropagation()
    isResizing = true
    resizeHandle.classList.add('dragging')
    document.documentElement.classList.add('resizing')
    if (clickThrough) {
      clickThrough = false
      window.petApi.setIgnoreMouseEvents(false)
    }
    const startX = e.screenX
    const startY = e.screenY
    const startW = window.innerWidth
    const startH = window.innerHeight

    const onMove = (e) => {
      const newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + (e.screenX - startX)))
      const newH = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startH + (e.screenY - startY)))
      window.petApi.resizeWindow(newW, newH)
    }
    const onUp = () => {
      isResizing = false
      resizeHandle.classList.remove('dragging')
      document.documentElement.classList.remove('resizing')
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  })

  // Sprite-level interaction: tap (single/double/long-press) AND drag
  petSprite.addEventListener('mousedown', async (e) => {
    if (e.button !== 0) return
    longPressFired = false
    isDragging = false
    mouseDownPos = { x: e.clientX, y: e.clientY }
    const startScreenX = e.screenX
    const startScreenY = e.screenY
    const winPos = await window.petApi.getWindowPosition()
    const startWinX = winPos.x
    const startWinY = winPos.y

    longPressTimer = setTimeout(() => {
      longPressTimer = null
      longPressFired = true
      triggerTapAction('jumping', EASTER_EGG_MESSAGES)
    }, LONG_PRESS_MS)

    const onMouseMove = (e) => {
      if (!mouseDownPos) return
      const dx = e.clientX - mouseDownPos.x
      const dy = e.clientY - mouseDownPos.y
      if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD_PX) {
        if (longPressTimer) {
          clearTimeout(longPressTimer)
          longPressTimer = null
        }
        if (!isDragging) {
          isDragging = true
        }
        window.petApi.dragWindow(startWinX + (e.screenX - startScreenX), startWinY + (e.screenY - startScreenY))
      }
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)

      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
      if (!mouseDownPos) return
      mouseDownPos = null
      if (isDragging) return
      if (longPressFired) { longPressFired = false; return }
      if (tapTimer) {
        clearTimeout(tapTimer)
        tapTimer = null
        triggerTapAction('jumping', EXCITED_MESSAGES)
      } else {
        tapTimer = setTimeout(() => {
          tapTimer = null
          triggerTapAction('waving', CUTE_MESSAGES)
        }, DOUBLE_CLICK_MS)
      }
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
