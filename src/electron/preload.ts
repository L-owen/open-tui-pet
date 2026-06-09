import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("petApi", {
  closeWindow: () => ipcRenderer.send("window-close"),

  dragWindow: (x: number, y: number) => ipcRenderer.send("window-move", { x, y }),

  resizeWindow: (width: number, height: number) => ipcRenderer.send("window-resize", { width, height }),

  setIgnoreMouseEvents: (ignore: boolean) => ipcRenderer.send("set-ignore-mouse-events", ignore),

  getWindowPosition: (): Promise<{ x: number; y: number }> =>
    ipcRenderer.invoke("get-window-position"),

  onEvent: (callback: (event: any) => void) => {
    ipcRenderer.on("sse-event", (_event, data) => callback(data))
  },

  onPetData: (callback: (data: { spriteDataUrl: string; name: string }) => void) => {
    ipcRenderer.on("pet-data", (_event, data) => callback(data))
  },

  onPermissionRequest: (callback: (data: any) => void) => {
    ipcRenderer.on("permission-request", (_event, data) => callback(data))
  },

  replyPermission: (data: { requestID: string; reply: string }) => {
    ipcRenderer.send("permission-reply", data)
  },
})
