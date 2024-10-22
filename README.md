# RelationMap AI Chrome Extension

A Chrome extension that uses Chrome's built-in AI APIs to analyze webpage content and generate visual relationship diagrams using Excalidraw.

## Prerequisites

### 1. Install Chrome Canary

Chrome's built-in AI features are currently only available in Chrome Canary (or Dev channel). Here's how to set it up:

1. Download Chrome Canary:
   - Windows: [Download Chrome Canary](https://www.google.com/chrome/canary/)
   - macOS: [Download Chrome Canary](https://www.google.com/chrome/canary/)
   - Linux: Use Chrome Dev channel instead, as Canary isn't available for Linux

2. Verify your version is 128.0.6545.0 or newer:
   - Open Chrome Canary
   - Go to `chrome://version`
   - Check the version number in the first line

### 2. System Requirements for AI Features

Your system must meet these requirements to run Chrome's AI features:

- **Operating System**:
  - Windows 10/11, or
  - macOS 13 (Ventura) or newer
  - Linux (specific requirements TBD)

- **Storage**:
  - At least 22 GB free space on the volume containing your Chrome profile
  - Note: The model will be deleted if available space falls below 10 GB

- **GPU**:
  - Integrated GPU or discrete GPU
  - Minimum 4 GB Video RAM

- **Network**:
  - Non-metered internet connection for model download

### 3. Enable Chrome AI Features

1. In Chrome Canary, go to `chrome://flags/#optimization-guide-on-device-model`
   - Set to "Enabled BypassPerfRequirement"

2. Go to `chrome://flags/#prompt-api-for-gemini-nano`
   - Set to "Enabled"

3. Restart Chrome Canary

4. Verify AI features are available:
   - Open DevTools Console (F12)
   - Run: `(await ai.languageModel.capabilities()).available`
   - Should return "readily"

5. If needed, force model download:
   - Run in Console: `await ai.languageModel.create()`
   - Restart Chrome
   - Go to `chrome://components`
   - Check that "Optimization Guide On Device Model" shows version ≥ 2024.5.21.1031
   - If no version listed, click "Check for update"

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/relationmap-ai.git
cd relationmap-ai
```

2. Install dependencies:
```bash
# If you're using npm
npm install

# If you're using yarn
yarn install
```

3. Load the extension in Chrome Canary:
   - Go to `chrome://extensions`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the extension directory

## Project Structure

```
relationmap-ai/
├── manifest.json        # Extension manifest
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic and AI integration
└── content.js          # Content script for page analysis
```

## Usage

1. Click the extension icon in Chrome's toolbar
2. Click "Analyze Page & Create Diagram"
3. Wait for the AI to analyze the page content
4. The generated relationship diagram will appear in Excalidraw

## Development Tips

### Testing AI Features

- Check AI availability:
```javascript
const capabilities = await self.ai.languageModel.capabilities();
console.log(capabilities);
```

- Test basic prompting:
```javascript
const session = await self.ai.languageModel.create();
const response = await session.prompt("Hello, what's the weather?");
console.log(response);
```

- Monitor token usage:
```javascript
console.log(`Tokens remaining: ${session.tokensLeft}/${session.maxTokens}`);
```

### Common Issues

1. **"AI Not Available" Error**:
   - Verify Chrome version is correct
   - Check that flags are enabled
   - Ensure system meets requirements
   - Try restarting Chrome

2. **Model Download Issues**:
   - Check `chrome://components` for model status
   - Ensure sufficient disk space
   - Verify network connection is not metered

3. **Token Limits**:
   - Max 1024 tokens per prompt
   - Session can retain last 4096 tokens
   - Monitor token usage via session stats

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Additional Resources

- [Chrome's Built-in AI Documentation](https://developer.chrome.com/docs/ai/built-in)
- [Excalidraw Documentation](https://docs.excalidraw.com)
- [Chrome Extension Development Guide](https://developer.chrome.com/docs/extensions/mv3/getstarted/)

## Troubleshooting

If you encounter issues:

1. Check the Console (F12) for error messages
2. Verify your Chrome version and flags
3. Look for model status in `chrome://components`
4. Check system requirements
5. Try restarting Chrome
6. Clear browser data and reload extension

For persistent issues:
- File a bug report with:
  - Chrome version
  - System specs
  - Error messages
  - Steps to reproduce