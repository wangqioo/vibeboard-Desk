# 🎭 Emotions Guide

All the emotions Face can express!

---

## Available Emotions

### 😊 Happy (default positive)
**Trigger words:** hello, great, awesome, cool, nice

**Appearance:**
- Normal eyes
- Wide smile (curved down)
- Orange background
- Bounces once

**Use for:** Greetings, positive responses, agreement

---

### 😲 Surprised
**Trigger words:** wow, really, no way

**Appearance:**
- Wide eyes
- Round O mouth
- Orange background
- Squash & stretch animation

**Use for:** Unexpected information, excitement, shock

---

### 😴 Sleeping
**Trigger:** 30 seconds of inactivity

**Appearance:**
- Eyes closed (horizontal lines)
- Small straight mouth
- Breathing background animation
- No pupils visible

**Use for:** Idle state, standby

---

### 😢 Sad
**Trigger words:** sad, cry, upset, sorry

**Appearance:**
- Slightly smaller eyes
- Upside-down smile (frown)
- Blue-ish background (#8B9DC3)
- Slower movements

**Use for:** Sympathetic responses, apologies, bad news

---

### 😠 Angry
**Trigger words:** angry, mad, annoyed

**Appearance:**
- Angled eyes (eyebrows effect)
- Straight intense mouth
- Red-ish background (#D95B43)
- Shaking animation

**Use for:** Frustration, disagreement, strong emotions

---

### 😕 Confused
**Trigger words:** ?, confused, what, huh

**Appearance:**
- Asymmetric eyes (one bigger)
- Tilted sideways mouth
- Orange background
- One eye slightly lower

**Use for:** Questions, unclear input, need clarification

---

### 🤩 Excited
**Trigger words:** !, wow, amazing, incredible

**Appearance:**
- HUGE eyes
- HUGE smile
- Bright yellow background (#FFD93D)
- Wiggling & pulsing animations
- Everything bounces

**Use for:** Big news, enthusiasm, celebration

---

### 🤔 Thinking
**Trigger words:** think, wonder, why, hmm

**Appearance:**
- Eyes look upward
- Small straight mouth
- Orange background
- Contemplative pose

**Use for:** Processing, considering, before responding

---

### 💗 Love
**Trigger words:** love, heart, ❤

**Appearance:**
- Heart-shaped eyes (pink gradient)
- Big smile (pink border)
- Pink background (#FFCCE5)
- Heartbeat animation
- No pupils (hearts replace eyes)

**Use for:** Affection, appreciation, positive vibes

---

### 💬 Talking
**Default for responses**

**Appearance:**
- Normal eyes
- Animated mouth (opens/closes)
- Orange background
- Continuous mouth movement

**Use for:** Speaking, delivering responses

---

## Emotion Detection

Face automatically detects emotion from your text:

| You say... | Face shows... |
|------------|---------------|
| "I'm sad" | 😢 Sad |
| "I'm angry!" | 😠 Angry |
| "I love you" | 💗 Love |
| "What?" | 😕 Confused |
| "WOW!!!" | 🤩 Excited |
| "Let me think" | 🤔 Thinking |
| "Hello!" | 😊 Happy |

**Emotion keywords are case-insensitive!**

---

## Testing Emotions

**Try these phrases:**

```
Type: "I'm feeling sad today"
Face: Shows sad blue face with frown

Type: "I LOVE THIS!"
Face: Shows pink heart eyes

Type: "Wait, what???"
Face: Shows confused asymmetric eyes

Type: "THAT'S AMAZING!!!"
Face: Shows excited yellow face, wiggling

Type: "I'm so angry right now"
Face: Shows red angry face, shakes

Type: "Hmm, let me think..."
Face: Shows thinking face, eyes up
```

---

## Background Colors

Each emotion has a unique color:

| Emotion | Color | Hex |
|---------|-------|-----|
| Happy/Default | Orange | #FF8C42 |
| Sad | Blue-gray | #8B9DC3 |
| Angry | Red | #D95B43 |
| Excited | Yellow | #FFD93D |
| Love | Pink | #FFCCE5 |
| Others | Orange | #FF8C42 |

**Colors transition smoothly** (0.8s ease)

---

## Animations

### Movement Animations
- **Bounce** - Happy (0.6s)
- **Squash & Stretch** - Surprised (0.6s)
- **Shake** - Angry (0.5s, left-right)
- **Wiggle** - Excited (0.4s, rotation)
- **Heartbeat** - Love (0.8s, scale pulse)

### Background Animations
- **Breathe** - Sleeping (4s pulse)
- **Pulse** - Excited (0.6s color shift)

### Eye/Mouth Animations
- **Blink** - All states (0.15s, random intervals)
- **Talk** - Talking (0.5s mouth loop)
- **Looking** - Idle (4s wander pattern)

---

## For Developers

### Triggering Emotions Manually

```javascript
setState('happy');     // Happy face
setState('sad');       // Sad face  
setState('angry');     // Angry face
setState('confused');  // Confused face
setState('excited');   // Excited face
setState('thinking');  // Thinking face
setState('love');      // Love/heart eyes
setState('talking');   // Talking (animated mouth)
setState('surprised'); // Surprised
setState('sleeping');  // Sleeping
setState('idle');      // Reset to default
```

### Adding Custom Emotions

1. **Add CSS for the emotion** in `face.html`
2. **Add case in setState()** function
3. **Add trigger keywords** in getMockResponse()

**Example:**
```css
.eye.yourEmotion { /* eye style */ }
.mouth.yourEmotion { /* mouth style */ }
body.yourEmotion { /* background */ }
```

```javascript
case 'yourEmotion':
  body.classList.add('yourEmotion');
  leftEye.classList.add('yourEmotion');
  rightEye.classList.add('yourEmotion');
  mouth.classList.add('yourEmotion');
  break;
```

---

## Tips

💡 **Combine emotions with text** for best effect  
💡 **Emotions auto-return to idle** after showing response  
💡 **Multiple exclamation marks** = more excited  
💡 **Questions** usually trigger confused or thinking  
💡 **Use emotion keywords** for specific expressions  

---

**Made with 🧠 by Brainsy**
