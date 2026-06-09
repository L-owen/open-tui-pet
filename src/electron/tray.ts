import { Tray, Menu, nativeImage, app, BrowserWindow } from "electron"
import type { MenuItemConstructorOptions } from "electron"
import { TRAY_ICON_DATA } from "../constants.js"
import type { PetInfo } from "../types.js"
import { log } from "../logger.js"

let switchPetCallback: ((slug: string) => void) | null = null

export function buildPetSubmenu(
  allPets: PetInfo[],
  selectedSlug: string,
  onSwitchPet: (slug: string) => void,
): MenuItemConstructorOptions {
  if (allPets.length <= 1) {
    return { label: "Switch Pet", enabled: false }
  }

  return {
    label: "Switch Pet",
    submenu: allPets.map(pet => ({
      label: pet.name,
      type: "radio" as const,
      checked: pet.slug === selectedSlug,
      click: () => onSwitchPet(pet.slug),
    })),
  }
}

export function rebuildMenus(
  tray: Tray,
  mainWindow: BrowserWindow | null,
  allPets: PetInfo[],
  selectedSlug: string,
  onStandup?: () => void,
): void {
  const contextMenu = Menu.buildFromTemplate([
    { label: `Current: ${allPets.find(p => p.slug === selectedSlug)?.name ?? "None"}`, enabled: false },
    { type: "separator" },
    buildPetSubmenu(allPets, selectedSlug, switchPetCallback ?? (() => {})),
    { type: "separator" },
    { label: "Standup Summary", click: () => onStandup?.() },
    { type: "separator" },
    { label: "Show Pet", click: () => mainWindow?.show() },
    { label: "Hide Pet", click: () => mainWindow?.hide() },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ])
  tray.setContextMenu(contextMenu)
  tray.setToolTip(`DevEco Pet - ${allPets.find(p => p.slug === selectedSlug)?.name ?? "No pet"}`)
}

export function createTray(
  mainWindow: BrowserWindow,
  allPets: PetInfo[],
  selectedSlug: string,
  onSwitchPet: (slug: string) => void,
  onStandup?: () => void,
): Tray {
  switchPetCallback = onSwitchPet

  const icon = nativeImage.createFromDataURL(TRAY_ICON_DATA)
  const tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)

  rebuildMenus(tray, mainWindow, allPets, selectedSlug, onStandup)

  tray.on("double-click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) mainWindow.hide()
      else mainWindow.show()
    }
  })

  log("[electron] System tray created")
  return tray
}
