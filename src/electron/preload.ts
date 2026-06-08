import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("petApi", {
  closeWindow: () => ipcRenderer.send("window-close"),

  dragWindow: (x: number, y: number) => ipcRenderer.send("window-move", { x, y }),

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
