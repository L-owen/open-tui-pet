const MORNING_MESSAGES = ['早上好！☀️', 'Good morning!', '新的一天~', 'Morning! 🌅', '起床啦~']
const AFTERNOON_MESSAGES = ['下午好！', 'Good afternoon!', '继续加油~', 'Afternoon! ☕', '下午茶时间~']
const EVENING_MESSAGES = ['晚上好！', 'Good evening!', '辛苦了一天~', 'Evening! 🌙', '放松一下~']
const NIGHT_MESSAGES = ['夜深了...', 'Late night! 🌃', '早点休息~', '该睡觉了...', 'Night night~']

const PERIOD_CONFIG = {
  morning:   { messages: MORNING_MESSAGES,   animation: 'waving' },
  afternoon: { messages: AFTERNOON_MESSAGES, animation: 'jumping' },
  evening:   { messages: EVENING_MESSAGES,   animation: 'idle' },
  night:     { messages: NIGHT_MESSAGES,     animation: 'idle' },
}

const REMINDER_INTERVAL_MS = 30 * 60 * 1000
const GREETING_RETURN_MS = 3000

function getTimePeriod() {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 23) return 'evening'
  return 'night'
}

export function createTimeAwareEngine(stateMachine, speechBubble, player) {
  let intervalId = null
  let returnTimer = null

  function showGreeting() {
    const currentState = stateMachine.getCurrentState()
    if (currentState === 'failed' || currentState === 'waving') return

    const period = getTimePeriod()
    const config = PERIOD_CONFIG[period]
    const message = config.messages[Math.floor(Math.random() * config.messages.length)]

    player.play(config.animation)
    speechBubble.showText(message)

    if (returnTimer) clearTimeout(returnTimer)
    returnTimer = setTimeout(() => {
      player.play('idle')
      returnTimer = null
    }, GREETING_RETURN_MS)
  }

  function startPeriodicReminders() {
    if (intervalId) return
    intervalId = setInterval(showGreeting, REMINDER_INTERVAL_MS)
  }

  function stopPeriodicReminders() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    if (returnTimer) {
      clearTimeout(returnTimer)
      returnTimer = null
    }
  }

  return { showGreeting, startPeriodicReminders, stopPeriodicReminders }
}
