# Visual Preview

## Brainsy Face States

Below are ASCII representations of each emotional state:

### Idle (Default)
```
     [·]
      |
  ╭───────╮
  │  ●  ● │  <- Calm eyes
  │       │
  │   ⌣   │  <- Slight smile
  ╰───────╯
```
*Soft blinking, gentle antenna pulse*

---

### Happy
```
     [✨]
      |
  ╭───────╮
  │  ◉  ◉ │  <- Wide eyes
  │ ○   ○ │  <- Blushing cheeks
  │   ⌣⌣  │  <- Big smile
  ╰───────╯
```
*Bright antenna, bounce animation*

---

### Thinking
```
     [💡]
      |
  ╭───────╮
  │    ●● │  <- Eyes look up-right
  │       │
  │   ⌣   │  <- Slight asymmetric smile
  ╰───────╯
```
*Rapid antenna pulsing*

---

### Speaking
```
     [·]
      |
  ╭───────╮
  │  ●  ● │  <- Normal eyes
  │       │
  │   ◯   │  <- Animated mouth (open/close)
  ╰───────╯
```
*Mouth animates in loop*

---

### Listening
```
     [·]
      |
  ╭───────╮
  │  ◉  ◉ │  <- Attentive (slightly larger)
  │       │
  │   ⌣   │  <- Small relaxed mouth
  ╰───────╯
```
*Steady antenna pulse*

---

### Processing
```
     [·]
      |
  ╭───────╮
  │   ⟳   │  <- Spinner (replaces eyes)
  │       │
  │   ─   │  <- Straight mouth
  ╰───────╯
```
*Spinner rotates, rapid antenna blink*

---

## Color Palette

```
Primary (Cyan):    ████  #00CED1
Secondary (Pink):  ████  #FF6B9D
Background:        ████  #2A2D3A
Accent (Yellow):   ████  #FFD700
```

---

## Animation Examples

### Blink Sequence
```
Normal:  ●  →  Squash:  ▬  →  Normal:  ●
```
*Duration: 150ms total*

### State Transition
```
Idle ──(300ms)──> Happy
 ●●               ◉◉
 ⌣                ⌣⌣
                  ○ ○
```
*Smooth cubic-bezier easing*

---

## Real Screenshot

![Brainsy Face Preview](./preview.gif)
*(Coming soon: Actual animated GIF)*

---

## Try It Live

Open `index.html` in your browser to see Brainsy in action!

Or visit the [Live Demo](https://brainsy-face-demo.vercel.app) _(coming soon)_
