export class TouchVTTMouseInteractionManager {
    constructor(object, layer, permissions={}, callbacks={}, options={}) {
      this.object = object;
      this.layer = layer;
      this.permissions = permissions;
      this.callbacks = callbacks;
  
      /**
       * Interaction options which configure handling workflows
       * @type {{target: PIXI.DisplayObject, dragResistance: number}}
       */
      this.options = options;
  
      /**
       * The current interaction state
       * @type {number}
       */
      this.state = this.states.NONE;
  
      /**
       * Bound interaction data object to populate with custom data.
       * @type {Object<any>}
       */
      this.interactionData = {};
  
      /**
       * The drag handling time
       * @type {number}
       */
      this.dragTime = 0;
  
      /**
       * The time of the last left-click event
       * @type {number}
       */
      this.lcTime = 0;
  
      /**
       * The time of the last right-click event
       * @type {number}
       */
      this.rcTime = 0;
  
      /**
       * A flag for whether we are right-click dragging
       * @type {boolean}
       */
      this._dragRight = false;
  
      /**
       * An optional ControlIcon instance for the object
       * @type {ControlIcon}
       */
      this.controlIcon = this.options.target ? this.object[this.options.target] : undefined;
  
      /**
       * The view id pertaining to the PIXI Application.
       * If not provided, default to canvas.app.view.id
       * @type {ControlIcon}
       */
      const app = this.options.application ?? canvas.app;
      this.viewId = app.view.id;
    }
  
    /**
     * Bound handlers which can be added and removed
     * @type {Object<Function>}
     */
    #handlers = {};
  
    /**
     * Enumerate the states of a mouse interaction workflow.
     * 0: NONE - the object is inactive
     * 1: HOVER - the mouse is hovered over the object
     * 2: CLICKED - the object is clicked
     * 3: DRAG - the object is being dragged
     * 4: DROP - the object is being dropped
     * @enum {number}
     */
    static INTERACTION_STATES = {
      NONE: 0,
      HOVER: 1,
      CLICKED: 2,
      DRAG: 3,
      DROP: 4
    };
  
    /**
     * Enumerate the states of handle outcome.
     * -2: SKIPPED - the handler has been skipped by previous logic
     * -1: DISALLOWED - the handler has dissallowed further process
     *  1: REFUSED - the handler callback has been processed and is refusing further process
     *  2: ACCEPTED - the handler callback has been processed and is accepting further process
     * @enum {number}
     */
    static _HANDLER_OUTCOME = {
      SKIPPED: -2,
      DISALLOWED: -1,
      REFUSED: 1,
      ACCEPTED: 2
    };
  
    /**
     * The number of milliseconds of mouse click depression to consider it a long press.
     * @type {number}
     */
    static LONG_PRESS_DURATION_MS = 99999999;
  
    /**
     * Global timeout for the long-press event.
     * @type {number|null}
     */
    static longPressTimeout = null;
  
    /* -------------------------------------------- */
  
    /**
     * Get the target.
     * @type {PIXI.DisplayObject}
     */
    get target() {
      return this.options.target ? this.object[this.options.target] : this.object;
    }
  
    /**
     * Is this mouse manager in a dragging state?
     * @type {boolean}
     */
    get isDragging() {
      return this.state >= this.states.DRAG;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Activate interactivity for the handled object
     */
    activate() {
  
      // Remove existing listeners
      this.state = this.states.NONE;
      this.target.removeAllListeners();
  
      // Create bindings for all handler functions
      this.#handlers = {
        mouseover: this.#handleMouseOver.bind(this),
        mouseout: this.#handleMouseOut.bind(this),
        mousedown: this.#handleMouseDown.bind(this),
        rightdown: this.#handleRightDown.bind(this),
        mousemove: this.#handleMouseMove.bind(this),
        mouseup: this.#handleMouseUp.bind(this),
        contextmenu: this.#handleDragCancel.bind(this)
      };
  
      // Activate hover events to start the workflow
      this.#activateHoverEvents();
  
      // Set the target as interactive
      this.target.eventMode = "static";
      return this;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Test whether the current user has permission to perform a step of the workflow
     * @param {string} action     The action being attempted
     * @param {Event|PIXI.FederatedEvent} event The event being handled
     * @returns {boolean}         Can the action be performed?
     */
    can(action, event) {
      const fn = this.permissions[action];
      if ( typeof fn === "boolean" ) return fn;
      if ( fn instanceof Function ) return fn.call(this.object, game.user, event);
      return true;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Execute a callback function associated with a certain action in the workflow
     * @param {string} action     The action being attempted
     * @param {Event|PIXI.FederatedEvent} event The event being handled
     * @param {...*} args         Additional callback arguments.
     * @returns {boolean}         A boolean which may indicate that the event was handled by the callback.
     *                            Events which do not specify a callback are assumed to have been handled as no-op.
     */
    callback(action, event, ...args) {
      const fn = this.callbacks[action];
      if ( fn instanceof Function ) {
        this.#assignInteractionData(event);
        return fn.call(this.object, event, ...args) ?? true;
      }
      return true;
    }
  
    /* -------------------------------------------- */
  
    /**
     * A reference to the possible interaction states which can be observed
     * @returns {Object<string, number>}
     */
    get states() {
      return this.constructor.INTERACTION_STATES;
    }
  
    /* -------------------------------------------- */
  
    /**
     * A reference to the possible interaction states which can be observed
     * @returns {Object<string, number>}
     */
    get handlerOutcomes() {
      return this.constructor._HANDLER_OUTCOME;
    }
  
    /* -------------------------------------------- */
    /*  Listener Activation and Deactivation        */
    /* -------------------------------------------- */
  
    /**
     * Activate a set of listeners which handle hover events on the target object
     */
    #activateHoverEvents() {
      // Disable and re-register mouseover and mouseout handlers
      this.target.off("pointerover", this.#handlers.mouseover).on("pointerover", this.#handlers.mouseover);
      this.target.off("pointerout", this.#handlers.mouseout).on("pointerout", this.#handlers.mouseout);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Activate a new set of listeners for click events on the target object.
     */
    #activateClickEvents() {
      this.#deactivateClickEvents();
      this.target.on("pointerdown", this.#handlers.mousedown);
      this.target.on("pointerup", this.#handlers.mouseup);
      //this.target.on("mouseupoutside", this.#handlers.mouseup);
      this.target.on("pointerupoutside", this.#handlers.mouseup);
      this.target.on("rightdown", this.#handlers.rightdown);
      this.target.on("rightup", this.#handlers.mouseup);
      this.target.on("rightupoutside", this.#handlers.mouseup);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Deactivate event listeners for click events on the target object.
     */
    #deactivateClickEvents() {
      this.target.off("pointerdown", this.#handlers.mousedown);
      this.target.off("pointerup", this.#handlers.mouseup);
      //this.target.off("mouseupoutside", this.#handlers.mouseup);
      this.target.off("pointerupoutside", this.#handlers.mouseup);
      this.target.off("rightdown", this.#handlers.rightdown);
      this.target.off("rightup", this.#handlers.mouseup);
      this.target.off("rightupoutside", this.#handlers.mouseup);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Activate events required for handling a drag-and-drop workflow
     */
    #activateDragEvents() {
      this.#deactivateDragEvents();
      this.layer.on("pointermove", this.#handlers.mousemove);
      if ( !this._dragRight ) {
        canvas.app.view.addEventListener("contextmenu", this.#handlers.contextmenu, {capture: true});
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Deactivate events required for handling drag-and-drop workflow.
     * @param {boolean} [silent]      Set to true to activate the silent mode.
     */
    #deactivateDragEvents(silent) {
      this.layer.off("pointermove", this.#handlers.mousemove);
      canvas.app.view.removeEventListener("contextmenu", this.#handlers.contextmenu, {capture: true});
    }
  
    /* -------------------------------------------- */
    /*  Hover In and Hover Out                      */
    /* -------------------------------------------- */
  
    /**
     * Handle mouse-over events which activate downstream listeners and do not stop propagation.
     * @param {PIXI.FederatedEvent} event
     */
    #handleMouseOver(event) {
      // Verify if the event can be handled
      const action = "hoverIn";
      if ( (this.state !== this.states.NONE) || !(event.nativeEvent.target.id === this.viewId) ) {
        return this.#debug(action, event, this.handlerOutcomes.SKIPPED);
      }
      if ( !this.can(action, event) ) return this.#debug(action, event, this.handlerOutcomes.DISALLOWED);
  
      // Invoke the callback function
      const handled = this.callback(action, event);
      if ( !handled ) return this.#debug(action, event, this.handlerOutcomes.REFUSED);
  
      // Advance the workflow state and activate click events
      this.state = Math.max(this.state || 0, this.states.HOVER);
      this.#activateClickEvents();
      return this.#debug(action, event);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle mouse-out events which terminate hover workflows and do not stop propagation.
     * @param {PIXI.FederatedEvent} event
     */
    #handleMouseOut(event) {
      if ( event.pointerType === "touch" ) return; // Ignore Touch events
      const action = "hoverOut";
      if ( (this.state !== this.states.HOVER) || !(event.nativeEvent.target.id === this.viewId) ) {
        return this.#debug(action, event, this.handlerOutcomes.SKIPPED);
      }
      if ( !this.can(action, event) ) return this.#debug(action, event, this.handlerOutcomes.DISALLOWED);
  
      // Was the mouse-out event handled by the callback?
      if ( this.callback(action, event) === false ) return this.#debug(action, event, this.handlerOutcomes.REFUSED);
  
      // Downgrade the workflow state and deactivate click events
      if ( this.state === this.states.HOVER ) {
        this.state = this.states.NONE;
        this.#deactivateClickEvents();
      }
      return this.#debug(action, event);
    }
  
    /* -------------------------------------------- */
    /*  Left Click and Double Click                 */
    /* -------------------------------------------- */
  
    /**
     * Handle mouse-down events which activate downstream listeners.
     * Stop further propagation only if the event is allowed by either single or double-click.
     * @param {PIXI.FederatedEvent} event
     */
    #handleMouseDown(event) {
      if ( event.button !== 0 ) return; // Only support standard left-click
      if ( ![this.states.HOVER, this.states.CLICKED, this.states.DRAG].includes(this.state) ) return;
  
      // Determine double vs single click
      const now = Date.now();
      const isDouble = (now - this.lcTime) <= 250;
      this.lcTime = now;
  
      // Set the origin point from layer local position
      this.interactionData.origin = event.getLocalPosition(this.layer);
  
      // Activate a timeout to detect long presses
      if ( !isDouble ) {
        clearTimeout(this.constructor.longPressTimeout);
        this.constructor.longPressTimeout = setTimeout(() => {
          this.#handleLongPress(event, this.interactionData.origin);
        }, MouseInteractionManager.LONG_PRESS_DURATION_MS);
      }
  
      // Dispatch to double and single-click handlers
      if ( isDouble && this.can("clickLeft2", event) ) return this.#handleClickLeft2(event);
      else return this.#handleClickLeft(event);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle mouse-down which trigger a single left-click workflow.
     * @param {PIXI.FederatedEvent} event
     */
    #handleClickLeft(event) {
      const action = "clickLeft";
      if ( !this.can(action, event) ) return this.#debug(action, event, this.handlerOutcomes.DISALLOWED);
      this._dragRight = false;
  
      // Was the left-click event handled by the callback?
      if ( this.callback(action, event) === false ) return this.#debug(action, event, this.handlerOutcomes.REFUSED);
  
      // Upgrade the workflow state and activate drag event handlers
      if ( this.state === this.states.HOVER ) this.state = this.states.CLICKED;
      canvas.currentMouseManager = this;
      if ( (this.state < this.states.DRAG) && this.can("dragStart", event) ) this.#activateDragEvents();
      return this.#debug(action, event);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle mouse-down which trigger a single left-click workflow.
     * @param {PIXI.FederatedEvent} event
     */
    #handleClickLeft2(event) {
      const action = "clickLeft2";
      if ( this.callback(action, event) === false ) return this.#debug(action, event, this.handlerOutcomes.REFUSED);
      return this.#debug(action, event);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle a long mouse depression to trigger a long-press workflow.
     * @param {PIXI.FederatedEvent}   event   The mousedown event.
     * @param {PIXI.Point}            origin  The original canvas co-ordinates of the mouse click
     */
    #handleLongPress(event, origin) {
      const action = "longPress";
      if ( this.callback(action, event, origin) === false ) {
        return this.#debug(action, event, this.handlerOutcomes.REFUSED);
      }
      return this.#debug(action, event);
    }
  
    /* -------------------------------------------- */
    /*  Right Click and Double Click                */
    /* -------------------------------------------- */
  
    /**
     * Handle right-click mouse-down events.
     * Stop further propagation only if the event is allowed by either single or double-click.
     * @param {PIXI.FederatedEvent} event
     */
    #handleRightDown(event) {
      if ( ![this.states.HOVER, this.states.CLICKED, this.states.DRAG].includes(this.state) ) return;
      if ( event.button !== 2 ) return; // Only support standard left-click
  
      // Determine double vs single click
      const now = Date.now();
      const isDouble = (now - this.rcTime) <= 250;
      this.rcTime = now;
  
      // Update event data
      this.interactionData.origin = event.getLocalPosition(this.layer);
  
      // Dispatch to double and single-click handlers
      if ( isDouble && this.can("clickRight2", event) ) return this.#handleClickRight2(event);
      else return this.#handleClickRight(event);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle single right-click actions.
     * @param {PIXI.FederatedEvent} event
     */
    #handleClickRight(event) {
      const action = "clickRight";
      if ( !this.can(action, event) ) return this.#debug(action, event, this.handlerOutcomes.DISALLOWED);
      this._dragRight = true;
  
      // Was the right-click event handled by the callback?
      if ( this.callback(action, event) === false ) return this.#debug(action, event, this.handlerOutcomes.REFUSED);
  
      // Upgrade the workflow state and activate drag event handlers
      if ( this.state === this.states.HOVER ) this.state = this.states.CLICKED;
      canvas.currentMouseManager = this;
      if ( (this.state < this.states.DRAG) && this.can("dragRight", event) ) this.#activateDragEvents();
      return this.#debug(action, event);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle double right-click actions.
     * @param {PIXI.FederatedEvent} event
     */
    #handleClickRight2(event) {
      const action = "clickRight2";
      if ( this.callback(action, event) === false ) return this.#debug(action, event, this.handlerOutcomes.REFUSED);
      return this.#debug(action, event);
    }
  
    /* -------------------------------------------- */
    /*  Drag and Drop                               */
    /* -------------------------------------------- */
  
    /**
     * Handle mouse movement during a drag workflow
     * @param {PIXI.FederatedEvent} event
     */
    #handleMouseMove(event) {
      if ( ![this.states.CLICKED, this.states.DRAG].includes(this.state) ) return;
  
      // Limit dragging to 60 updates per second
      const now = Date.now();
      if ( (now - this.dragTime) < canvas.app.ticker.elapsedMS ) return;
      this.dragTime = now;
  
      // Update interaction data
      const data = this.interactionData;
      data.destination = event.getLocalPosition(this.layer);
  
      // Handling rare case when origin is not defined
      // FIXME: The root cause should be identified and this code removed
      if ( data.origin === undefined ) data.origin = new PIXI.Point().copyFrom(data.destination);
  
      // Begin a new drag event
      if ( this.state === this.states.CLICKED ) {
        const dx = data.destination.x - data.origin.x;
        const dy = data.destination.y - data.origin.y;
        const dz = Math.hypot(dx, dy);
        const r = this.options.dragResistance || (canvas.dimensions.size / 4);
        if ( dz >= r ) {
          return this.#handleDragStart(event);
        }
      }
  
      // Continue a drag event
      else return this.#handleDragMove(event);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle the beginning of a new drag start workflow, moving all controlled objects on the layer
     * @param {PIXI.FederatedEvent} event
     */
    #handleDragStart(event) {
      clearTimeout(this.constructor.longPressTimeout);
      const action = this._dragRight ? "dragRightStart" : "dragLeftStart";
      if ( !this.can(action, event) ) return this.#debug(action, event, this.handlerOutcomes.DISALLOWED);
      const handled = this.callback(action, event);
      if ( handled ) this.state = this.states.DRAG;
      return this.#debug(action, event, handled ? this.handlerOutcomes.ACCEPTED : this.handlerOutcomes.REFUSED);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle the continuation of a drag workflow, moving all controlled objects on the layer
     * @param {PIXI.FederatedEvent} event
     */
    #handleDragMove(event) {
      clearTimeout(this.constructor.longPressTimeout);
      const action = this._dragRight ? "dragRightMove" : "dragLeftMove";
      if ( !this.can(action, event) ) return this.#debug(action, event, this.handlerOutcomes.DISALLOWED);
      const handled = this.callback(action, event);
      if ( handled ) this.state = this.states.DRAG;
      return this.#debug(action, event, handled ? this.handlerOutcomes.ACCEPTED : this.handlerOutcomes.REFUSED);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle mouse up events which may optionally conclude a drag workflow
     * @param {PIXI.FederatedEvent} event
     */
    #handleMouseUp(event) {
      if (ui.controls.activeControl == "walls" && event.nativeEvent instanceof Touch) {
        return true;
      }

      clearTimeout(this.constructor.longPressTimeout);
      // If this is a touch hover event, treat it as a drag
      if ( (this.state === this.states.HOVER) && (event.pointerType === "touch") ) {
        this.state = this.states.DRAG;
      }
  
      // Save prior state
      const priorState = this.state;
  
      // Update event data
      this.interactionData.destination = event.getLocalPosition(this.layer);
  
      // Handling of a degenerate case:
      // When the manager is in a clicked state and that the button is released in another object
      const emulateHoverOut = (this.state === this.states.CLICKED) && !event.defaultPrevented
        && (event.target !== this.object) && (event.target?.parent !== this.object);
      if ( emulateHoverOut ) {
        event.stopPropagation();
        this.state = this.states.HOVER;
        this.#deactivateClickEvents();
        this.#handleMouseOut(event);
      }
  
      if ( this.state >= this.states.DRAG ) {
        event.stopPropagation();
        if ( event.type.startsWith("right") && !this._dragRight ) return;
        this.#handleDragDrop(event);
      }
  
      // Continue a multi-click drag workflow
      if ( event.defaultPrevented ) {
        this.state = priorState;
        return this.#debug("mouseUp", event, this.handlerOutcomes.SKIPPED);
      }
  
      // Cancel the workflow
      return this.#handleDragCancel(event);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle the conclusion of a drag workflow, placing all dragged objects back on the layer
     * @param {PIXI.FederatedEvent} event
     */
    #handleDragDrop(event) {
      const action = this._dragRight ? "dragRightDrop" : "dragLeftDrop";
      if ( !this.can(action, event) ) return this.#debug(action, event, this.handlerOutcomes.DISALLOWED);
  
      // Was the drag-drop event handled by the callback?
      if ( this.callback(action, event) === false ) return this.#debug(action, event, this.handlerOutcomes.DISALLOWED);
  
      // Update the workflow state
      this.state = this.states.DROP;
      return this.#debug(action, event);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle the cancellation of a drag workflow, resetting back to the original state
     * @param {PIXI.FederatedEvent} event
     */
    #handleDragCancel(event) {
      this.cancel(event);
    }
  
    /* -------------------------------------------- */
  
    /**
     * A public method to handle directly an event into this manager, according to its type.
     * Note: drag events are not handled.
     * @param {PIXI.FederatedEvent} event
     * @returns {boolean} Has the event been processed?
     */
    handleEvent(event) {
      switch ( event.type ) {
        case "pointerover":
          this.#handleMouseOver(event);
          break;
        case "pointerout":
          this.#handleMouseOut(event);
          break;
        case "pointerup":
          this.#handleMouseUp(event);
          break;
        case "pointerdown":
          if ( event.button === 2 ) this.#handleRightDown(event);
          else this.#handleMouseDown(event);
          break;
        default:
          return false;
      }
      return true;
    }
  
    /* -------------------------------------------- */
  
    /**
     * A public method to cancel a current interaction workflow from this manager.
     * @param {PIXI.FederatedEvent} event     The event that initiates the cancellation
     */
    cancel(event) {
      const action = this._dragRight ? "dragRightCancel" : "dragLeftCancel";
      const endState = this.state;
      if ( endState <= this.states.HOVER ) return this.#debug(action, event, this.handlerOutcomes.SKIPPED);
  
      // Dispatch a cancellation callback
      if ( endState >= this.states.DRAG ) {
        if ( this.callback(action, event) === false ) return this.#debug(action, event, this.handlerOutcomes.REFUSED);
      }
  
      // Continue a multi-click drag workflow if the default event was prevented in the callback
      if ( event.defaultPrevented ) {
        this.state = this.states.DRAG;
        return this.#debug(action, event, this.handlerOutcomes.SKIPPED);
      }
  
      // Reset the interaction data and state and deactivate drag events
      this.interactionData = {};
      this.state = this.states.HOVER;
      canvas.currentMouseManager = null;
      this.#deactivateDragEvents();
      return this.#debug(action, event);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Display a debug message in the console (if mouse interaction debug is activated).
     * @param {string} action                                   Which action to display?
     * @param {Event|PIXI.FederatedEvent} event                 Which event to display?
     * @param {number} [outcome=this.handlerOutcomes.ACCEPTED]  The handler outcome.
     */
    #debug(action, event, outcome=this.handlerOutcomes.ACCEPTED) {
      if ( CONFIG.debug.mouseInteraction ) {
        const name = this.object.constructor.name;
        const targetName = event.target?.constructor.name;
        const {eventPhase, type, button} = event;
        const state = Object.keys(this.states)[this.state.toString()];
        let msg = `${name} | ${action} | state:${state} | target:${targetName} | phase:${eventPhase} | type:${type} | `
        + `btn:${button} | skipped:${outcome <= -2} | allowed:${outcome > -1} | handled:${outcome > 1}`;
        console.debug(msg);
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Reset the mouse manager.
     * @param {object} [options]
     * @param {boolean} [options.interactionData=true]    Reset the interaction data?
     * @param {boolean} [options.state=true]              Reset the state?
     */
    reset({interactionData=true, state=true}={}) {
      if ( CONFIG.debug.mouseInteraction ) {
        console.debug(`${this.object.constructor.name} | Reset | interactionData:${interactionData} | state:${state}`);
      }
      if ( interactionData ) this.interactionData = {};
      if ( state ) this.state = MouseInteractionManager.INTERACTION_STATES.NONE;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Assign the interaction data to the event.
     * @param {PIXI.FederatedEvent} event
     */
    #assignInteractionData(event) {
      this.interactionData.object = this.object;
      event.interactionData = this.interactionData;
  
      // Add deprecated event data references
      for ( const k of Object.keys(this.interactionData) ) {
        if ( event.hasOwnProperty(k) ) continue;
        /**
         * @deprecated since v11
         * @ignore
         */
        Object.defineProperty(event, k, {
          get() {
            const msg = `event.data.${k} is deprecated in favor of event.interactionData.${k}.`;
            foundry.utils.logCompatibilityWarning(msg, {since: 11, until: 12});
            return this.interactionData[k];
          },
          set(value) {
            const msg = `event.data.${k} is deprecated in favor of event.interactionData.${k}.`;
            foundry.utils.logCompatibilityWarning(msg, {since: 11, until: 12});
            this.interactionData[k] = value;
          }
        });
      }
    }
  }