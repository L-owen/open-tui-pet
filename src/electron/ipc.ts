import { ipcMain, app } from "electron"
import type { BrowserWindow } from "electron"
import { PARENT_WATCH_INTERVAL, PARENT_DISCONNECT_GRACE } from "../constants.js"
import { log } from "../logger.js"

export function setupIpc(mainWindow: BrowserWindow): void {
  ipcMain.on("window-close", () => {
    if (mainWindow) mainWindow.close()
  })

  ipcMain.on("window-move", (_event, data: { x: number; y: number }) => {
    if (mainWindow) {
      mainWindow.setBounds({ x: Math.round(data.x), y: Math.round(data.y) })
    }
  })

  ipcMain.on("window-resize", (_event, data: { width: number; height: number }) => {
    if (mainWindow) {
      mainWindow.setBounds({
        width: Math.round(data.width),
        height: Math.round(data.height),
      })
    }
  })

  ipcMain.handle("get-window-position", () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds()
      return { x: bounds.x, y: bounds.y }
    }
    return { x: 0, y: 0 }
  })

  ipcMain.on("set-ignore-mouse-events", (_event, ignore: boolean) => {
    if (mainWindow) {
      mainWindow.setIgnoreMouseEvents(ignore, { forward: true })
    }
  })

  ipcMain.on("permission-reply", (_event, data: { requestID: string; reply: string }) => {
    log(`[electron:ipc] Permission reply from renderer: ${data.requestID} → ${data.reply}`)
    if (process.send) {
      process.send({ type: "permission-reply", data })
    }
  })
}

export function listenForParentEvents(mainWindow: BrowserWindow): void {
  log("[electron:ipc] Listening for events from parent process via IPC")

  process.on("message", (msg: any) => {
    if (msg?.type === "pet-event" && msg.event) {
      log(`[electron:ipc] Received event: ${msg.event.type}`)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("sse-event", msg.event)
        if (msg.event.type === "permission.replied" || msg.event.type === "permission.asked") {
          log(`[electron:ipc] Forwarding ${msg.event.type} to renderer via sse-event`)
        }
        if (msg.event.type === "permission.asked" && msg.event.properties) {
          log(`[electron:ipc] Forwarding permission request: ${msg.event.properties.id}`)
          mainWindow.webContents.send("permission-request", msg.event.properties)
        }
      }
    }
  })

  process.on("disconnect", () => {
    log("[electron:ipc] Parent disconnected, quitting in 3s")
    setTimeout(() => app.quit(), PARENT_DISCONNECT_GRACE)
  })
}

export function watchParent(parentPid: number | null): void {
  if (!parentPid) return
  const check = setInterval(() => {
    try {
      process.kill(parentPid, 0)
    } catch {
      clearInterval(check)
      log("[electron] Parent process died, quitting")
      app.quit()
    }
  }, PARENT_WATCH_INTERVAL)
  check.unref?.()
}
