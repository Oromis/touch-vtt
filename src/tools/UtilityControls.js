import {getSetting, PAUSE_BUTTON_SETTING} from "../config/TouchSettings"

export function installUtilityControls() {
  const controlsId = game.release.generation < 13 ? "controls" : "scene-controls"

  document.querySelector("#touch-vtt-controls")?.remove()
  const controls = document.createElement("div")
  controls.id = "touch-vtt-controls"
  controls.classList.toggle("hidden", !getSetting(PAUSE_BUTTON_SETTING))

  if (game.user.isGM) {
    // Pause button
    const pauseButton = document.createElement("button")    
    const pauseIcon = document.createElement("i")
    pauseIcon.classList.add("fas", game.paused ? "fa-play" : "fa-pause")
    pauseIcon.id = "touch-vtt-togglepause"
    pauseButton.appendChild(pauseIcon)
    pauseButton.addEventListener("click", () => {
      if (game.paused) {
        pauseIcon.classList.replace("fa-play", "fa-pause")
      } else {
        pauseIcon.classList.replace("fa-pause", "fa-play")
      }
      game.togglePause(!game.paused, {broadcast: true})
    })
    controls.appendChild(pauseButton)
  }

  document.getElementById(controlsId).prepend(controls)
}

export function toggleUtilityControls(enabled) {
  $("#touch-vtt-controls").toggleClass("hidden", !enabled)
}