# Changelog

All notable changes to Snappy will be documented in this file.

## [1.1.0] - 2026-01-26

### Added
- **TUI Companion Mode** - New `companion.html` for visual feedback alongside `clawdbot tui`
  - Eyes follow mouse
  - Reacts to activity (typing, clicks, focus)
  - Connection status indicator
  - Auto-sleep after inactivity
  - Zero input required
- **TUI_COMPANION.md** - Complete guide for companion mode
- HTTP API integration using OpenAI-compatible endpoint
- Automatic emotion detection from AI response text
- System message for better AI responses
- Improved command execution flow

### Changed
- **Primary use case is now TUI companion mode** (was standalone face)
- Migrated from WebSocket to HTTP API for Clawdbot integration
- Updated README to emphasize companion mode
- Reorganized QUICKSTART to start with companion mode
- Simplified CLAWDBOT_SETUP to HTTP API only
- Renamed `index.html` to `component-demo.html`
- New `index.html` as landing page for GitHub Pages
- Updated all documentation for clarity and accuracy

### Removed
- WebSocket integration code (replaced with HTTP API)
- `CLAWDBOT_INTEGRATION.md` (outdated WebSocket docs)
- Redundant configuration options
- `ws` variable and connection management

### Fixed
- Pupil blinking animation (pupils now hide when eyes close)
- Text positioning (moved to 8% from top to avoid overlap)
- Emotion detection accuracy for command results
- Connection handling and error recovery

### Documentation
- Moved `FULLSCREEN_GUIDE.md` to `docs/`
- Updated README with TUI companion focus
- Streamlined QUICKSTART for faster setup
- Cleaned up CLAWDBOT_SETUP to remove obsolete info
- Added comprehensive TUI_COMPANION guide

## [1.0.0] - 2026-01-26

### Added
- Initial release of Snappy (renamed from brainsy-face)
- Core animation engine with 13 emotion states
- Eye tracking system that follows mouse cursor
- Natural blinking animations
- Fullscreen demo with chat interface
- Component demo for embedding
- Professional documentation and guides
- MIT License

### Features
- **Emotions**: idle, happy, sad, angry, excited, surprised, thinking, confused, speaking, listening, sleeping, processing, love
- **Eye Control**: 9 directional looks (left, right, up, down, diagonals, center)
- **Animations**: Blink, speak, bounce, wiggle, heartbeat
- **Accessibility**: ARIA labels, reduced motion support
- **Responsive**: Mobile-friendly with breakpoints
- **Zero Dependencies**: Pure vanilla JavaScript

### Documentation
- README.md - Overview and quick start
- QUICKSTART.md - 60-second setup guide
- EMOTIONS_GUIDE.md - Emotion states reference
- CLAWDBOT_SETUP.md - AI integration guide
- CONTRIBUTING.md - Contribution guidelines
- docs/API.md - Complete API reference
- docs/DESIGN_SPEC.md - Technical design document

### Examples
- `face.html` - Fullscreen interactive demo
- `component-demo.html` - Component examples
- `chat.html` - Chat interface
- `chat-simple.html` - Simplified chat

## [0.9.0] - 2026-01-25

### Added
- Initial beta release as brainsy-face
- Basic emotion system
- Eye tracking prototype
- WebSocket Clawdbot integration (deprecated in 1.1.0)

### Changed
- Reorganized documentation structure
- Improved pupil animations
- Fixed text/eye overlap issues

---

**Current Focus**: TUI companion mode for `clawdbot tui` users.
