export function installUtilityControls() {
  $("#touch-vtt-controls").remove()
  
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
        game.togglePause(!game.paused, true)
      })
      .appendTo(controls)
    }

  $("#controls").prepend(controls)
}