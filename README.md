# TouchVTT

Introduces touch screen support to FoundryVTT. If you have a tablet, a PC or a TV equipped with a 
touch screen and want to play on FoundryVTT, this module is for you!

Features:
 - Use two-finger pinching and panning gestures to zoom and pan the map. Panning can be turned off for this gesture 
   in the settings (use three fingers to pan if you change this).
 - Move tokens by dragging them with your finger - just as you would with the mouse
 - Move three fingers around on the canvas to pan the scene - no zooming in this mode.
 - Rotate tokens using the (optional) directional buttons added to the token right-click menu (HUD)
 - Need to right-click to access the corresponding functionality on a game world entity? Just long-press (0.5s) 
    with your finger.
 - Move windows around and interact with their content intuitively
 - Removing measurement templates usually requires you to press the DELETE key on your keyboard. TouchVTT 
    adds an eraser tool to the measurement templates menu that can be used with touch controls. First tap 
    the eraser tool, then tap the template you want to remove.
 - Additional wall placement tools that work with touch controls

Primary use cases:
 - You and your group play in person and you want to use Foundry to visualize gameplay - just put a touchscreen 
   device in the middle of the table, install TouchVTT and you'll be good to go!
 - You like playing on your couch where a touch device is just so much more convenient than a laptop

### Compatibility with other modules

This module changes the behavior of several aspects of FoundryVTT by overriding many methods (especially wall and 
measurement controls at the moment). I implemented all that with compatibility to other modules in mind by using 
[libWrapper](https://foundryvtt.com/packages/lib-wrapper/). If you experience any issues that could stem from module 
incompatibility, please install and activate libWrapper. 

The [Lock View](https://foundryvtt.com/packages/LockView/) module is supported. Touch zooming and panning is disabled 
when those features are locked in "Lock View".

### Changelog

- **1.5.1:** Fixed players being able to rotate their token while the game is paused. Moved enlarge buttons feature from wall tools menu to module settings.
- **1.5.0:** Added arrow buttons to the token HUD, allowing touchscreen users to rotate their token (long-press the token to activate the HUD). Added missing translation files.
- **1.4.0:** Added snap-to-grid toggle for token movement controls
- **1.3.1:** Fixed bug with compatibility between TouchVTT and LockView
- **1.3.0:** Added setting to split zoom and pan gestures. 3 and 4 finger gestures now always pan the map. Added compatibility with [Lock View](https://foundryvtt.com/packages/LockView/).
- **1.2.3:** Added support for module compatibility library [libWrapper](https://foundryvtt.com/packages/lib-wrapper/)
- **1.2.0:** Added support for wall tools
- **1.1.0:** Added touch support for measurement templates
- **1.0.0:** Initial release. Zooming & panning with 2 fingers, token movement

### About

Disclaimer: I also made the "Touch20" browser extension for Roll20, TouchVTT is my contribution to FoundryVTT.

Feel free to suggest features and report bugs via Github issues!

If you want to show your support for my work financially, feel free to donate via PayPal - it's greatly appreciated! 

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=JTE9BL67E6TUL&source=url)
