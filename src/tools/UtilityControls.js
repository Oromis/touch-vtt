export function installUtilityControls() {
  var controls = $("<div>")
    .attr("id", "touch-vtt-controls")

  // Pause button (GM only)
  if (game.user.isGM) {
    $("<button>")
      .append($("<i>").addClass("fas").addClass(game.paused ? "fa-play" : "fa-pause"))
      .attr("id", "touch-vtt-togglepause")
      .click(function() {
        if (game.paused) {
          $(this).find("i").removeClass("fa-play").addClass("fa-pause")
        } else {
          $(this).find("i").removeClass("fa-pause").addClass("fa-play")
        }
          game.togglePause()
        })
      .appendTo(controls)
    }

  $("#logo").after(controls)
}