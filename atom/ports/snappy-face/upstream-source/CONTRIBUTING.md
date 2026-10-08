# Contributing to Brainsy Face

Thank you for your interest in contributing to Brainsy Face! 🤖

## How to Contribute

### Reporting Issues

Found a bug or have a feature request? Please:
1. Check existing issues first
2. Create a new issue with a clear title and description
3. Include code examples or screenshots when relevant
4. Tag appropriately (`bug`, `enhancement`, `documentation`, etc.)

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-new-state
   ```
3. **Make your changes**
   - Follow existing code style
   - Test thoroughly
   - Update documentation
4. **Commit with clear messages**
   ```bash
   git commit -m "Add: New 'excited' emotional state with bounce animation"
   ```
5. **Push and create a PR**
   ```bash
   git push origin feature/amazing-new-state
   ```

### Code Style

- **JavaScript**: ES6+, clear variable names, JSDoc comments for public methods
- **CSS**: BEM-like naming, CSS variables for customization
- **HTML**: Semantic, accessible markup

### Testing Checklist

Before submitting a PR, verify:
- [ ] Works in Chrome, Firefox, Safari
- [ ] Mobile responsive
- [ ] Respects `prefers-reduced-motion`
- [ ] No console errors
- [ ] Documentation updated
- [ ] Examples still work

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/brainsy-face.git
cd brainsy-face

# Open the demo
open index.html

# Or serve locally
python3 -m http.server 8080
# Visit http://localhost:8080
```

## Ideas for Contributions

### New Features
- **More Emotional States**: surprised, sad, sleeping, angry
- **Sound Effects**: Beeps and boops for state changes
- **Particle Effects**: Sparkles, stars, thought bubbles
- **Customizable Accessories**: Hats, glasses, different antenna styles
- **Voice Sync**: Lip-sync mouth to audio input
- **Weather Modes**: React to weather data

### Improvements
- **Performance**: Optimize animations for low-end devices
- **Accessibility**: Enhanced screen reader support, keyboard navigation
- **TypeScript**: Add TypeScript definitions file
- **Framework Adapters**: Official React/Vue/Svelte components
- **Themes**: Pre-built color themes (dark mode, retro terminal, etc.)

### Documentation
- **Video Tutorials**: How to integrate, customize, etc.
- **CodePen Examples**: Interactive examples
- **Blog Posts**: Creative use cases
- **Translations**: Translate docs to other languages

## Code of Conduct

- Be respectful and constructive
- Welcome newcomers
- Focus on the idea, not the person
- Keep discussions on-topic

## Questions?

Open a discussion thread or reach out via issues. We're here to help!

---

**Built with ❤️ by the Brainsy community**
