/** Discovered pet on disk */
export interface PetInfo {
  slug: string
  dir: string
  name: string
}

/** Persisted user config */
export interface PetConfig {
  selectedPet: string
  windowX?: number
  windowY?: number
  windowWidth?: number
  windowHeight?: number
}

/** Pet data sent to renderer via IPC */
export interface PetData {
  spriteDataUrl: string
  name: string
  slug: string
}

/** Environment variables passed from plugin to electron process */
export interface PetEnv {
  PET_RENDERER_PATH: string
  PET_PARENT_PID: string
  PET_LOG_FILE: string
  PET_ALL_PETS: string
  PET_SELECTED: string
  PET_CONFIG_FILE: string
}

/** DevEco session event forwarded to electron */
export interface PetEvent {
  type: string
  properties?: Record<string, unknown>
}
