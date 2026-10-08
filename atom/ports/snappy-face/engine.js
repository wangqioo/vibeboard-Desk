/**
 * Snappy Face - Animation Engine
 * 90s Nickelodeon-inspired AI Assistant Face
 * Version: 1.0.0
 * 
 * Usage:
 *   const face = new Snappy('container-id');
 *   face.setState('happy');
 */

class Snappy {
  constructor(container, options = {}) {
    // Configuration
    this.options = {
      size: options.size || 200,
      autoStart: options.autoStart !== false,
      blinkInterval: options.blinkInterval || 3000,
      randomBlinkVariance: options.randomBlinkVariance || 2000,
      ...options
    };

    // Get container element
    this.container = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;

    if (!this.container) {
      throw new Error('Snappy: Container not found');
    }

    // State management
    this.currentState = 'idle';
    this.isBlinking = false;
    this.isSpeaking = false;
    
    // Event listeners
    this.listeners = {};

    // Timers
    this.blinkTimer = null;
    this.speakTimer = null;

    // Initialize
    this.render();
    
    if (this.options.autoStart) {
      this.start();
    }
  }

  /**
   * Render the face HTML structure
   */
  render() {
    // Clear container
    this.container.innerHTML = '';
    this.container.classList.add('snappy-face-container');

    // Build face structure
    const html = `
      <div class="snappy-antenna"></div>
      <div class="snappy-face state-${this.currentState}" role="img" aria-label="Snappy AI Assistant Face">
        <div class="snappy-eyes">
          <div class="snappy-eye snappy-eye-left"></div>
          <div class="snappy-eye snappy-eye-right"></div>
        </div>
        <div class="snappy-mouth"></div>
        <div class="snappy-cheeks">
          <div class="snappy-cheek snappy-cheek-left"></div>
          <div class="snappy-cheek snappy-cheek-right"></div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    // Cache element references
    this.elements = {
      face: this.container.querySelector('.snappy-face'),
      leftEye: this.container.querySelector('.snappy-eye-left'),
      rightEye: this.container.querySelector('.snappy-eye-right'),
      mouth: this.container.querySelector('.snappy-mouth'),
      antenna: this.container.querySelector('.snappy-antenna')
    };

    // Apply custom size if specified
    if (this.options.size !== 200) {
      this.container.style.setProperty('--snappy-size', `${this.options.size}px`);
    }
  }

  /**
   * Start autonomous behaviors (blinking, etc.)
   */
  start() {
    this.startBlinking();
    this.emit('start');
  }

  /**
   * Stop all autonomous behaviors
   */
  stop() {
    this.stopBlinking();
    this.stopSpeaking();
    this.emit('stop');
  }

  /**
   * Change emotional/activity state
   * @param {string} state - One of: idle, thinking, speaking, happy, processing, listening, sleeping
   */
  setState(state) {
    const validStates = ['idle', 'thinking', 'speaking', 'happy', 'processing', 'listening', 'sleeping', 'love', 'surprised', 'sad', 'angry', 'excited', 'confused'];
    
    if (!validStates.includes(state)) {
      console.warn(`Snappy: Invalid state "${state}". Valid states:`, validStates);
      return;
    }

    const previousState = this.currentState;
    this.currentState = state;

    // Update face class
    this.elements.face.className = `snappy-face state-${state}`;

    // Update aria-label for accessibility
    this.elements.face.setAttribute('aria-label', `Snappy is ${state}`);

    // State-specific behaviors
    if (state === 'speaking') {
      this.startSpeaking();
    } else {
      this.stopSpeaking();
    }

    this.emit('stateChange', { state, previousState });
  }

  /**
   * Trigger a blink animation
   */
  blink() {
    if (this.isBlinking) return;

    this.isBlinking = true;
    
    // Add blink class to both eyes
    this.elements.leftEye.classList.add('blinking');
    this.elements.rightEye.classList.add('blinking');

    // Remove after animation completes
    setTimeout(() => {
      this.elements.leftEye.classList.remove('blinking');
      this.elements.rightEye.classList.remove('blinking');
      this.isBlinking = false;
      this.emit('blink');
    }, 150); // Match CSS animation duration
  }

  /**
   * Start periodic blinking
   */
  startBlinking() {
    if (this.blinkTimer) return;

    const scheduleNextBlink = () => {
      // Random interval for natural feel
      const variance = Math.random() * this.options.randomBlinkVariance;
      const delay = this.options.blinkInterval + variance - (this.options.randomBlinkVariance / 2);
      
      this.blinkTimer = setTimeout(() => {
        this.blink();
        scheduleNextBlink();
      }, delay);
    };

    scheduleNextBlink();
  }

  /**
   * Stop periodic blinking
   */
  stopBlinking() {
    if (this.blinkTimer) {
      clearTimeout(this.blinkTimer);
      this.blinkTimer = null;
    }
  }

  /**
   * Animate mouth for speaking
   * @param {string} text - Optional text to "speak" (determines duration)
   */
  speak(text = '') {
    this.setState('speaking');
    
    // If text provided, auto-stop after estimated duration
    if (text) {
      const wordsPerMinute = 150;
      const words = text.split(' ').length;
      const durationMs = (words / wordsPerMinute) * 60 * 1000;
      
      setTimeout(() => {
        this.setState('idle');
      }, durationMs);
    }
  }

  /**
   * Start speaking animation (looping)
   */
  startSpeaking() {
    if (this.isSpeaking) return;
    this.isSpeaking = true;
    // Animation is handled by CSS
  }

  /**
   * Stop speaking animation
   */
  stopSpeaking() {
    this.isSpeaking = false;
  }

  /**
   * Look in a direction (moves pupils within eyes)
   * @param {string} direction - One of: left, right, up, down, center
   */
  look(direction) {
    const validDirections = ['center', 'left', 'right', 'up', 'down', 
                            'up-left', 'up-right', 'down-left', 'down-right'];
    
    if (!validDirections.includes(direction)) {
      console.warn(`Snappy: Invalid direction "${direction}"`);
      return;
    }

    // Remove all look classes from both eyes
    const lookClasses = validDirections.map(d => `look-${d}`);
    this.elements.leftEye.classList.remove(...lookClasses);
    this.elements.rightEye.classList.remove(...lookClasses);

    // Add new direction class (unless center)
    if (direction !== 'center') {
      this.elements.leftEye.classList.add(`look-${direction}`);
      this.elements.rightEye.classList.add(`look-${direction}`);
    }
    
    this.emit('look', { direction });
  }

  /**
   * Event listener registration
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {function} callback - Callback to remove
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {*} data - Data to pass to listeners
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Snappy event error (${event}):`, error);
      }
    });
  }

  /**
   * Get current state
   * @returns {string} Current state name
   */
  getState() {
    return this.currentState;
  }

  /**
   * Clean up and destroy the face
   */
  destroy() {
    this.stop();
    this.container.innerHTML = '';
    this.listeners = {};
    this.emit('destroy');
  }
}

// Make available globally and as module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Snappy;
}
if (typeof window !== 'undefined') {
  window.Snappy = Snappy;
}
