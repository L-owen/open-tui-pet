import { app, Menu, BrowserWindow } from "electron"
import type { Tray, MenuItemConstructorOptions } from "electron"
import { readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { createWindow, getMainWindow } from "./window.js"
import { createTray, rebuildMenus, buildPetSubmenu } from "./tray.js"
import { setupIpc, listenForParentEvents, watchParent } from "./ipc.js"
import { loadPetData } from "./pet-loader.js"
import { readGitLog } from "./git-reader.js"
import { readConfig, saveConfig } from "../config.js"
import { log } from "../logger.js"
import { STANDUP_WINDOW_WIDTH, STANDUP_WINDOW_HEIGHT } from "../constants.js"
import type { PetInfo } from "../types.js"

app.disableHardwareAcceleration()
const __dirname = dirname(fileURLToPath(import.meta.url))
const RENDERER_PATH = process.env.PET_RENDERER_PATH ?? join(__dirname, "..", "renderer")
const ALL_PETS: PetInfo[] = (() => {
  try { return JSON.parse(process.env.PET_ALL_PETS ?? "[]") } catch { return [] }
})()
let selectedSlug = process.env.PET_SELECTED ?? ""
const PARENT_PID = process.env.PET_PARENT_PID ? parseInt(process.env.PET_PARENT_PID, 10) : null
let tray: Tray | null = null
let standupWindow: BrowserWindow | null = null

async function openStandupWindow() {
  if (standupWindow && !standupWindow.isDestroyed()) {
    standupWindow.focus()
    return
  }

  const cwd = process.env.PET_CWD || process.cwd()
  const data = await readGitLog(cwd)

  let html: string
  try {
    html = readFileSync(join(RENDERER_PATH, "standup.html"), "utf-8")
  } catch (err: any) {
    log(`[electron] Failed to read standup.html: ${err.message}`)
    return
  }

  html = html.replace("{{DATA_PLACEHOLDER}}", JSON.stringify(data))

  standupWindow = new BrowserWindow({
    width: STANDUP_WINDOW_WIDTH,
    height: STANDUP_WINDOW_HEIGHT,
    title: `Standup Summary - ${data.date}`,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  standupWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html))

  standupWindow.on("closed", () => {
    standupWindow = null
  })

  log("[electron] Standup window opened")
}

function sendPetData(slug: string) {
  const pet = ALL_PETS.find(p => p.slug === slug)
  if (!pet) return
  const win = getMainWindow()
  const petData = loadPetData(pet.dir)
  if (petData && win && !win.isDestroyed()) {
    log(`[electron] Sending pet data: ${petData.name}`)
    win.webContents.send("pet-data", petData)
  }
}

function switchPet(slug: string) {
  if (slug === selectedSlug) return
  if (!ALL_PETS.find(p => p.slug === slug)) { log(`[electron] Pet not found: ${slug}`); return }
  selectedSlug = slug
  const config = readConfig()
  config.selectedPet = slug
  saveConfig(config)
  log(`[electron] Switched to pet: ${slug}`)
  sendPetData(slug)
  if (tray) rebuildMenus(tray, getMainWindow(), ALL_PETS, selectedSlug, openStandupWindow)
}

app.whenReady().then(() => {
  log("[electron] App ready")
  if (process.platform === "darwin") app.dock?.hide()
  if (process.platform === "win32") app.setAppUserModelId("deveco.pet.hidden")
  const mainWindow = createWindow(RENDERER_PATH, () => {
    const template: MenuItemConstructorOptions[] = [
      buildPetSubmenu(ALL_PETS, selectedSlug, switchPet),
      { type: "separator" },
      { label: "Hide Pet", click: () => getMainWindow()?.hide() },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]
    Menu.buildFromTemplate(template).popup({ window: mainWindow })
  })
  tray = createTray(mainWindow, ALL_PETS, selectedSlug, switchPet, openStandupWindow)
  setupIpc(mainWindow)
  listenForParentEvents(mainWindow)
  watchParent(PARENT_PID)
  mainWindow.webContents.on("did-finish-load", () => {
    if (selectedSlug) sendPetData(selectedSlug)
    else log("[electron] No pet selected or no pets available")
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    const mainWin = getMainWindow()
    if (mainWin && !mainWin.isDestroyed()) {
      log("[electron] Standup window closed, pet still running")
      return
    }
    log("[electron] All windows closed, quitting")
    app.quit()
  }
})
app.on("before-quit", () => {
  log("[electron] Before quit")
  const win = getMainWindow()
  if (win) win.close()
})
