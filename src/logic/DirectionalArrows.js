import {wrapMethod} from "../utils/Injection"
import {getSetting, DIRECTIONAL_ARROWS_ON, DIRECTIONAL_ARROWS_SETTING} from "../config/TouchSettings"

export function initDirectionalArrows() {
  if (tokenHudExists()) {
    const tokenHUDPath = game.release.generation < 13 ? "TokenHUD" : "foundry.applications.hud.TokenHUD"
    wrapMethod(`${tokenHUDPath}.prototype.activateListeners`, function (originalMethod, html, ...args) {
      const superResult = originalMethod(html, ...args)
      if (areDirectionalArrowsEnabled() && !getActiveToken()?.document?.lockRotation) {
        injectArrowHtml(html)
      }
      return superResult
    })
  }
}

function injectArrowHtml(html) {
  const leftColumn = html.find(".col.left")
  const middleColumn = html.find(".col.middle")
  const rightColumn = html.find(".col.right")

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
  arrow.on("click", () => {
    const activeToken = getActiveToken()
    if (canControl(activeToken)) {
      activeToken.rotate((angle + 180) % 360)
    }
  })
  parent.prepend(arrow)
}

function tokenHudExists() {
  const tokenHud = game.release.generation < 13 ? TokenHUD : foundry.applications.hud.TokenHUD
  return typeof tokenHud === "function" &&
    typeof tokenHud.prototype === "object" &&
    typeof tokenHud.prototype.activateListeners === "function"
}

function getActiveToken() {
  return canvas && canvas.hud && canvas.hud.token && canvas.hud.token.object
}

function areDirectionalArrowsEnabled() {
  return getSetting(DIRECTIONAL_ARROWS_SETTING) === DIRECTIONAL_ARROWS_ON
}

function canControl(token) {
  return token != null &&
    typeof token._canDrag === "function" &&
    token._canDrag()
}
