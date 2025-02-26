# Forex Market Time Tracker Chrome Extension

A Chrome extension that displays forex market opening and closing times across major financial centers worldwide. Easily track when different markets are open and configure various display options to suit your needs.

## Features

- Real-time display of forex market hours and status
- Support for multiple financial centers (Sydney, Tokyo, Shanghai, Hong Kong, Mumbai, Frankfurt, London, New York)
- Customizable timezone settings
- Light, dark, and auto themes
- 12/24-hour time format options
- Ability to simulate different times to check market status
- Customizable market selection
- Persistent settings that save between sessions

## Installation

### From Source Code

1. Clone or download this repository to your local machine
2. Open Google Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the folder containing the extension files
5. The extension should now appear in your extensions list
6. Click the extension icon in your browser toolbar to open the interface

## Usage

### Main Panel

The main panel displays:
- Current date and time in your selected timezone
- A table showing opening and closing times for selected financial markets
- The current status of each market (Open/Closed)
- A simulation tool to check market status at different times

### Settings Panel

Click the gear icon (⚙️) to access settings:

- **Theme**: Choose between Light, Dark, or Auto (follows system preference)
- **Timezone**: Select your preferred timezone for date/time display
- **Clock Format**: Customize the format of the displayed time
- **Market Hours Format**: Choose between 12-hour or 24-hour time format
- **Market Mode**: Choose between standard stock exchange hours or 8 AM to 5 PM
- **Markets**: Select which financial centers to display in the table
- **Save/Discard/Default**: Buttons to manage your settings

## Customization

### Adding More Timezones

To add more timezone options:
1. Open `popup.html`
2. Find the `<select id="timezone-select">` element
3. Add new `<option>` tags with the desired timezone values

### Modifying Market Hours

To change the opening/closing times for markets:
1. Open `popup.js`
2. Find the `marketData` object at the top of the file
3. Modify the `open` and `close` values for any market

## Files Overview

- `manifest.json`: Extension configuration
- `popup.html`: Main user interface
- `popup.js`: Core functionality and market data
- `styles.css`: Styling for light and dark themes
- `background.js`: Background initialization and event handling
- `icons/`: Extension icons in various sizes

## Folder Structure

```
forex-market-time/
├── manifest.json
├── popup.html
├── popup.js
├── styles.css
├── background.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Creating Icons

For the extension to display properly, you'll need to create icon files in the following sizes:
- 16x16 pixels (icon16.png)
- 48x48 pixels (icon48.png)
- 128x128 pixels (icon128.png)

Place these files in an `icons` folder within your extension directory.

## Contributing

Contributions are welcome! Feel free to submit pull requests with improvements or additional features.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- This extension was inspired by the need for traders to quickly check market hours across different time zones
- Special thanks to all who contributed ideas and feedback