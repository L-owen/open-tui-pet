import { homedir } from "os"
import { dirname, join } from "path"
import { existsSync } from "fs"
import { fileURLToPath } from "url"

const home = homedir()
const __dirname = dirname(fileURLToPath(import.meta.url))

function resolvePetDir(): string {
  const candidates = [
    join(home, ".config", "deveco", "pets"),
    join(home, ".config", "opencode", "pets"),
  ]
  for (const dir of candidates) {
    if (existsSync(dir)) return dir
  }
  return candidates[0]
}

/** Pet root directory — all pet-related files live here */
export const PET_DIR = resolvePetDir()

export const BUNDLED_PETS_DIR = join(__dirname, "pets")

/** Pet resource search paths, ordered by priority (first = highest) */
export const PET_SEARCH_PATHS = [
  PET_DIR,
  join(home, ".petdex", "pets"),
  BUNDLED_PETS_DIR,
] as const

/** Log file path */
export const LOG_FILE = join(PET_DIR, "pet.log")

/** Pet config file path (persists selected pet) */
export const CONFIG_FILE = join(PET_DIR, "pet-config.json")

/** Window dimensions */
export const WINDOW_WIDTH = 200
export const WINDOW_HEIGHT = 280

/** Standup window dimensions */
export const STANDUP_WINDOW_WIDTH = 420
export const STANDUP_WINDOW_HEIGHT = 520

/** Window offset from screen edge */
export const WINDOW_MARGIN = 20

/** Parent process health check interval (ms) */
export const PARENT_WATCH_INTERVAL = 2000

/** Grace period after parent disconnect before quit (ms) */
export const PARENT_DISCONNECT_GRACE = 3000

/** Idle timeout before pet goes to sleep (ms) */
export const SLEEP_TIMEOUT = 5 * 60 * 1000

/** Sleep check interval (ms) */
export const SLEEP_CHECK_INTERVAL = 30_000

/** Debounce interval for saving window position (ms) */
export const POSITION_SAVE_DEBOUNCE_MS = 500

/** Minimum window size for resize */
export const WINDOW_MIN_WIDTH = 160
export const WINDOW_MIN_HEIGHT = 224

/** Maximum window size for resize */
export const WINDOW_MAX_WIDTH = 400
export const WINDOW_MAX_HEIGHT = 560

/** Tray icon (16x16 transparent PNG) */
export const TRAY_ICON_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWklEQVQ4T2NkoBAwUqifYdAY8B8I/v9ngOwCZWJkZPzPwMDwn5GRsQ9IAsQZGRn/MDIy/gcJgA0gZPzPwMDwn5GR8T8jI+OfoZrKlGZkZPzPyMj4n5GR8T8jI+N/BkoYgI0F8n8ZKgYgZ2Rk/M/IyPgfkZEBAP6FZ2RkZPzPyMhIJmRkZPwDABwWFkYpF7FnAAAAAElFTkSuQmCC"
