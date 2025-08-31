# Contributing to DAWSheet

Thank you for your interest in contributing to DAWSheet! This document provides guidelines for contributing to the project.

## 🎯 Project Vision

DAWSheet aims to make music creation and live performance more accessible by bridging Google Sheets with real-time MIDI/audio control. We welcome contributions that align with this vision.

## 🤝 How to Contribute

### Reporting Issues
- Check existing issues before creating a new one
- Use clear, descriptive titles
- Include steps to reproduce bugs
- Provide system information (OS, Java version, etc.)

### Suggesting Features
- Describe the feature and its use case
- Explain how it fits with DAWSheet's goals
- Consider backward compatibility

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**
4. **Test thoroughly**
5. **Commit with clear messages**
6. **Push and create a Pull Request**

## 🏗️ Development Setup

### Prerequisites
- Java 17+
- Node.js 16+
- Google Cloud account
- Git

### Local Development
```bash
# Clone your fork
git clone https://github.com/yourusername/dawsheet.git
cd dawsheet

# Set up environment
cp apps/proxy-java/.env.example apps/proxy-java/.env
# Edit .env with your settings

# Install tools
npm install -g @google/clasp

# Run the proxy
cd apps/proxy-java
./gradlew run

# Deploy Apps Script (in another terminal)
cd apps/gas
clasp push
```

## 📝 Code Guidelines

### Java (Proxy)
- Follow Java naming conventions
- Add JavaDoc for public methods
- Use descriptive variable names
- Include unit tests for new features

### Google Apps Script
- Use JSDoc comments
- Handle errors gracefully
- Test manually in Google Sheets
- Keep functions focused and small

### JSON Schemas
- Follow JSON Schema draft-07
- Include examples and descriptions
- Validate with test data
- Update documentation when schemas change

## 🧪 Testing

### Java Proxy
```bash
cd apps/proxy-java
./gradlew test
```

### Apps Script
- Test manually in Google Sheets
- Verify MIDI output
- Check error handling

### Integration Testing
- Test full Sheet → Pub/Sub → Java → MIDI flow
- Verify with different note formats
- Test error conditions

## 📋 Pull Request Guidelines

- Use descriptive PR titles
- Reference related issues
- Include testing instructions
- Update documentation if needed
- Ensure CI passes

## 🎨 Areas for Contribution

### Core Development
- MIDI/OSC protocol improvements
- Performance optimizations
- Error handling enhancements
- New command types

### Music Theory
- Chord recognition algorithms
- Scale detection
- Progression suggestions
- Music notation parsing

### User Experience
- Google Sheets UI improvements
- Documentation and tutorials
- Example songs and templates
- Mobile optimization

### Integration
- DAW-specific adapters (Ableton, Logic, etc.)
- Hardware controller support
- External API integrations
- Plugin ecosystem

## 📚 Resources

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Google Cloud Pub/Sub](https://cloud.google.com/pubsub/docs)
- [MIDI Specification](https://www.midi.org/specifications)
- [Project Architecture](docs/DAWSHEET_PRD.md)

## 🎵 Music Industry Standards

When contributing music-related features:
- Follow MIDI standards and conventions
- Support common music notation
- Consider accessibility for different skill levels
- Test with real musical scenarios

## 💬 Community

- Be respectful and inclusive
- Help others learn and contribute
- Share your musical creations using DAWSheet
- Provide constructive feedback

## 📄 License

By contributing to DAWSheet, you agree that your contributions will be licensed under the same MIT License that covers the project.

---

**Happy Contributing! 🎶**

Let's build something amazing for the music community together!