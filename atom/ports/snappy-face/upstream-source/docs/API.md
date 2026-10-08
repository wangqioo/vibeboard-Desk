# API Reference

Complete API documentation for Brainsy Face.

## Constructor

### `new BrainsyFace(container, options)`

Creates a new Brainsy Face instance.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `container` | `string \| HTMLElement` | Yes | Container element ID or DOM element |
| `options` | `object` | No | Configuration options |

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `size` | `number` | `200` | Face size in pixels |
| `autoStart` | `boolean` | `true` | Start animations automatically |
| `blinkInterval` | `number` | `3000` | Base time between blinks (ms) |
| `randomBlinkVariance` | `number` | `2000` | Random variance for blink timing (ms) |

**Example:**

```javascript
const face = new BrainsyFace('my-container', {
  size: 300,
  autoStart: true,
  blinkInterval: 4000
});
```

---

## Methods

### `setState(state)`

Change the emotional/activity state of the face.

**Parameters:**
- `state` (string) - One of: `'idle'`, `'thinking'`, `'speaking'`, `'happy'`, `'processing'`, `'listening'`

**Example:**

```javascript
face.setState('happy');
```

**State Descriptions:**

| State | Description | Visual Changes |
|-------|-------------|----------------|
| `idle` | Default calm state | Normal eyes, slight smile, slow antenna pulse |
| `thinking` | Contemplative mode | Eyes look up-right, antenna rapid pulse |
| `speaking` | Active conversation | Animated mouth, normal eyes |
| `happy` | Excited/pleased | Wide eyes, big smile, cheek blush, bounce |
| `processing` | Loading/working | Spinner replaces eyes, straight mouth |
| `listening` | Attentive mode | Slightly larger eyes, small mouth |

---

### `blink()`

Trigger a single blink animation.

**Example:**

```javascript
face.blink();
```

---

### `speak(text)`

Animate the face speaking. If text is provided, the speaking state will auto-stop after an estimated duration based on word count.

**Parameters:**
- `text` (string, optional) - Text content to determine speaking duration

**Example:**

```javascript
// Manual control
face.speak();

// Auto-duration
face.speak("Hello! How are you today?");
// Will speak for ~2 seconds, then return to idle
```

**Duration Calculation:**
- Assumes 150 words per minute
- Formula: `(wordCount / 150) * 60 * 1000` ms

---

### `look(direction)`

Make the eyes look in a specific direction.

**Parameters:**
- `direction` (string) - One of: `'left'`, `'right'`, `'up'`, `'down'`, `'center'`, `'up-left'`, `'up-right'`, `'down-left'`, `'down-right'`

**Example:**

```javascript
face.look('up');
face.look('center'); // Return to center
```

---

### `start()`

Start autonomous behaviors (automatic blinking).

**Example:**

```javascript
face.start();
```

---

### `stop()`

Stop all autonomous behaviors.

**Example:**

```javascript
face.stop();
```

---

### `destroy()`

Clean up the face instance and remove all DOM elements and event listeners.

**Example:**

```javascript
face.destroy();
```

---

## Event System

### `on(event, callback)`

Register an event listener.

**Parameters:**
- `event` (string) - Event name
- `callback` (function) - Handler function

**Available Events:**

| Event | Data | Description |
|-------|------|-------------|
| `start` | `undefined` | Fired when `start()` is called |
| `stop` | `undefined` | Fired when `stop()` is called |
| `stateChange` | `{ state, previousState }` | Fired when state changes |
| `blink` | `undefined` | Fired after each blink completes |
| `look` | `{ direction }` | Fired when look direction changes |
| `destroy` | `undefined` | Fired when instance is destroyed |

**Example:**

```javascript
face.on('stateChange', ({ state, previousState }) => {
  console.log(`Changed from ${previousState} to ${state}`);
});

face.on('blink', () => {
  console.log('Blinked!');
});
```

---

### `off(event, callback)`

Remove an event listener.

**Parameters:**
- `event` (string) - Event name
- `callback` (function) - Handler function to remove

**Example:**

```javascript
function handleBlink() {
  console.log('Blink!');
}

face.on('blink', handleBlink);
// Later...
face.off('blink', handleBlink);
```

---

### `emit(event, data)`

Emit a custom event (advanced usage).

**Parameters:**
- `event` (string) - Event name
- `data` (any) - Data to pass to listeners

---

### `getState()`

Get the current state.

**Returns:** `string` - Current state name

**Example:**

```javascript
const currentState = face.getState();
console.log(currentState); // e.g., "happy"
```

---

## CSS Customization

Override these CSS variables to customize appearance:

```css
:root {
  /* Colors */
  --brainsy-primary: #00CED1;     /* Main cyan/teal */
  --brainsy-secondary: #FF6B9D;   /* Pink accent */
  --brainsy-bg: #2A2D3A;          /* Face background */
  --brainsy-accent: #FFD700;      /* Yellow/gold accent */
  --brainsy-white: #FFFFFF;
  --brainsy-gray: #E0E0E0;
  
  /* Dimensions */
  --brainsy-size: 200px;
  --brainsy-eye-size: 30px;
  --brainsy-eye-spacing: 60px;
  --brainsy-antenna-height: 40px;
  --brainsy-antenna-tip: 12px;
  
  /* Timing */
  --brainsy-blink-duration: 150ms;
  --brainsy-transition-duration: 300ms;
  
  /* Animation Easing */
  --brainsy-ease: cubic-bezier(0.4, 0.0, 0.2, 1);
  --brainsy-bounce: cubic-bezier(0.68, -0.55, 0.27, 1.55);
}
```

**Example - Purple Theme:**

```css
:root {
  --brainsy-primary: #9C27B0;
  --brainsy-secondary: #FF4081;
  --brainsy-bg: #1A1A2E;
}
```

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required Features:**
- CSS Custom Properties
- CSS Animations & Transitions
- ES6 JavaScript (Classes, Arrow Functions, etc.)

---

## TypeScript Definitions

```typescript
interface BrainsyFaceOptions {
  size?: number;
  autoStart?: boolean;
  blinkInterval?: number;
  randomBlinkVariance?: number;
}

type BrainsyFaceState = 
  | 'idle' 
  | 'thinking' 
  | 'speaking' 
  | 'happy' 
  | 'processing' 
  | 'listening';

type BrainsyFaceLookDirection = 
  | 'left' 
  | 'right' 
  | 'up' 
  | 'down' 
  | 'center'
  | 'up-left'
  | 'up-right'
  | 'down-left'
  | 'down-right';

type BrainsyFaceEvent = 
  | 'start' 
  | 'stop' 
  | 'stateChange' 
  | 'blink' 
  | 'look' 
  | 'destroy';

interface BrainsyFaceEventData {
  stateChange: { state: BrainsyFaceState; previousState: BrainsyFaceState };
  look: { direction: BrainsyFaceLookDirection };
}

declare class BrainsyFace {
  constructor(container: string | HTMLElement, options?: BrainsyFaceOptions);
  
  setState(state: BrainsyFaceState): void;
  blink(): void;
  speak(text?: string): void;
  look(direction: BrainsyFaceLookDirection): void;
  start(): void;
  stop(): void;
  destroy(): void;
  
  on<E extends BrainsyFaceEvent>(
    event: E,
    callback: (data: E extends keyof BrainsyFaceEventData 
      ? BrainsyFaceEventData[E] 
      : undefined) => void
  ): void;
  
  off<E extends BrainsyFaceEvent>(
    event: E,
    callback: Function
  ): void;
  
  getState(): BrainsyFaceState;
}
```

---

## Advanced Examples

### React Hook

```jsx
import { useEffect, useRef } from 'react';
import BrainsyFace from './brainsy-face.js';

function useBrainsyFace(options = {}) {
  const containerRef = useRef(null);
  const faceRef = useRef(null);
  
  useEffect(() => {
    if (containerRef.current && !faceRef.current) {
      faceRef.current = new BrainsyFace(containerRef.current, options);
    }
    
    return () => {
      if (faceRef.current) {
        faceRef.current.destroy();
        faceRef.current = null;
      }
    };
  }, []);
  
  return { containerRef, face: faceRef.current };
}

// Usage
function App() {
  const { containerRef, face } = useBrainsyFace({ size: 250 });
  
  return (
    <div>
      <div ref={containerRef} />
      <button onClick={() => face?.setState('happy')}>
        Make Happy
      </button>
    </div>
  );
}
```

### Vue Composable

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import BrainsyFace from './brainsy-face.js';

const containerRef = ref(null);
let face = null;

onMounted(() => {
  face = new BrainsyFace(containerRef.value, { size: 250 });
});

onUnmounted(() => {
  face?.destroy();
});

const setState = (state) => {
  face?.setState(state);
};
</script>

<template>
  <div>
    <div ref="containerRef"></div>
    <button @click="setState('happy')">Make Happy</button>
  </div>
</template>
```

### With Speech Recognition

```javascript
const face = new BrainsyFace('container');
const recognition = new webkitSpeechRecognition();

recognition.continuous = true;

recognition.onstart = () => {
  face.setState('listening');
};

recognition.onresult = (event) => {
  const transcript = event.results[event.results.length - 1][0].transcript;
  face.speak(transcript);
};

recognition.onend = () => {
  face.setState('idle');
};

recognition.start();
```

---

## Performance Tips

1. **Avoid Frequent State Changes**: State transitions trigger animations. Limit state changes to meaningful events.

2. **Use `look()` for Quick Feedback**: Eye movements are lighter than full state changes.

3. **Batch Updates**: If changing multiple properties, consider adding a custom method rather than multiple calls.

4. **Clean Up**: Always call `destroy()` when removing the face from the DOM.

5. **Reduce Motion**: The CSS automatically respects `prefers-reduced-motion` media query.

---

For more examples, see the `/examples` directory in the repository.
