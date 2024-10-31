import {getSetting, EASY_TARGET_OFF, EASY_TARGET_SETTING, EASY_TARGET_SINGLE} from '../config/TouchSettings'

export function callbackForEasyTarget(event, events) {
  if (event == "clickLeft") {
    const token = events[0].target
    if (isEasyTargetEnabled() && isSelectToolActive() && token instanceof CONFIG.Token.objectClass && isUnownedToken(token.mouseInteractionManager, event)) {
      // The user usually cannot click this token => we'll select it
      targetToken(token)
    }
  }
}

function targetToken(token) {
  const releaseOthers = getSettingValue() === EASY_TARGET_SINGLE
  token.setTarget(!token.isTargeted, { releaseOthers })
}

function getSettingValue() {
  return getSetting(EASY_TARGET_SETTING)
}

function isEasyTargetEnabled() {
  return getSettingValue() !== EASY_TARGET_OFF
}

function isSelectToolActive() {
  return game.activeTool === 'select'
}

function isUnownedToken(mouseInteractionManager, event) {
  return typeof mouseInteractionManager.can === 'function' && !mouseInteractionManager.can('clickLeft', event)
}
