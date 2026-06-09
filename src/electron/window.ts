import { screen, BrowserWindow, app } from "electron"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_MARGIN, WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT, WINDOW_MAX_WIDTH, WINDOW_MAX_HEIGHT, POSITION_SAVE_DEBOUNCE_MS } from "../constants.js"
import { log } from "../logger.js"
import { readConfig, saveConfig } from "../config.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function createWindow(
  rendererPath: string,
  onContextMenu?: () => void,
): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  const defaultX = screenWidth - WINDOW_WIDTH - WINDOW_MARGIN
  const defaultY = screenHeight - WINDOW_HEIGHT - WINDOW_MARGIN

  let x = defaultX
  let y = defaultY

  const config = readConfig()
  const savedX = config.windowX
  const savedY = config.windowY

  if (
    typeof savedX === "number" &&
    typeof savedY === "number" &&
    !isNaN(savedX) &&
    !isNaN(savedY)
  ) {
    const display = screen.getDisplayNearestPoint({ x: savedX, y: savedY })
    const { x: bx, y: by, width: bw, height: bh } = display.bounds
    if (savedX >= bx && savedX < bx + bw && savedY >= by && savedY < by + bh) {
      x = savedX
      y = savedY
      log(`[electron] Restoring window position from config: (${x}, ${y})`)
    } else {
      log(`[electron] Saved position (${savedX}, ${savedY}) is off-screen, using default`)
    }
  }

  const winWidth = config.windowWidth ?? WINDOW_WIDTH
  const winHeight = config.windowHeight ?? WINDOW_HEIGHT

  log(`[electron] Creating window at (${x}, ${y}), screen: ${screenWidth}x${screenHeight}, size: ${winWidth}x${winHeight}`)

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    maxWidth: WINDOW_MAX_WIDTH,
    maxHeight: WINDOW_MAX_HEIGHT,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const htmlPath = join(rendererPath, "index.html")
  log(`[electron] Loading HTML: ${htmlPath}`)

  mainWindow.loadFile(htmlPath).then(() => {
    log("[electron] HTML loaded successfully")
  }).catch((err: Error) => {
    log(`[electron] Failed to load HTML: ${err.message}`)
  })

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    log(`[electron] Page load failed: ${errorCode} ${errorDescription}`)
  })

  mainWindow.webContents.on("console-message", (_event, level, message) => {
    log(`[electron:renderer:${level}] ${message}`)
  })

  if (onContextMenu) {
    mainWindow.webContents.on("context-menu", () => {
      onContextMenu()
    })
  }

  mainWindow.on("closed", () => {
    log("[electron] Window closed")
    mainWindow = null
  })

  mainWindow.on("move", () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      if (!mainWindow) return
      const bounds = mainWindow.getBounds()
      const config = readConfig()
      config.windowX = bounds.x
      config.windowY = bounds.y
      config.windowWidth = bounds.width
      config.windowHeight = bounds.height
      saveConfig(config)
    }, POSITION_SAVE_DEBOUNCE_MS)
  })

  mainWindow.setIgnoreMouseEvents(true, { forward: true })

  if (process.platform === "darwin") {
    app.dock?.hide()
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  }

  if (process.platform === "win32") {
    mainWindow.setSkipTaskbar(true)
  }

  return mainWindow
}
