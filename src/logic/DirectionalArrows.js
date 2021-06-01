import {wrapMethod} from '../utils/Injection'
import {MODULE_NAME} from '../config/ModuleConstants'
import {DIRECTIONAL_ARROWS_ON, DIRECTIONAL_ARROWS_SETTING} from '../config/TouchSettings'

export function initDirectionalArrows() {
  if (tokenHudExists()) {
    wrapMethod('TokenHUD.prototype.activateListeners', function (originalMethod, html, ...args) {
      const superResult = originalMethod(html, ...args)
      if (areDirectionalArrowsEnabled()) {
        injectArrowHtml(html)
      }
      return superResult
    })
  }
}

function injectArrowHtml(html) {
  const leftColumn = html.find('.col.left')
  const middleColumn = html.find('.col.middle')
  const rightColumn = html.find('.col.right')

  addArrow(middleColumn, 0)
  addArrow(rightColumn, 45)
  addArrow(rightColumn, 90)
  addArrow(rightColumn, 135)
  addArrow(middleColumn, 180)
  addArrow(leftColumn, 225)
  addArrow(leftColumn, 270)
  addArrow(leftColumn, 315)
}

function addArrow(parent, angle) {
  const title = game.i18n.localize(`TOUCHVTT.Rotate${angle}`)
  const arrow = $(
    `<div class="control-icon directional-arrow directional-arrow-${angle}" data-action="rotate-${angle}" title="${title}">
      <i class="fas fa-chevron-up"></i>
    </div>`
  )
  arrow.on('click', () => {
    if (canvas.hud.token.object != null) {
      const activeToken = getActiveToken()
      if (activeToken != null) {
        activeToken.rotate((angle + 180) % 360)
      }
    }
  })
  parent.prepend(arrow)
}

function tokenHudExists() {
  return typeof TokenHUD === 'function' &&
    typeof TokenHUD.prototype === 'object' &&
    typeof TokenHUD.prototype.activateListeners === 'function'
}

function getActiveToken() {
  return canvas && canvas.hud && canvas.hud.token && canvas.hud.token.object
}

function areDirectionalArrowsEnabled() {
  return game.settings.get(MODULE_NAME, DIRECTIONAL_ARROWS_SETTING) === DIRECTIONAL_ARROWS_ON
}
