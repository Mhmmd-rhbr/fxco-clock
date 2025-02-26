// Get shared market data and settings from chrome.storage
let marketData;
let currentSettings;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load market data and settings
    const result = await chrome.storage.sync.get(['marketData', 'forexTimeSettings']);
    marketData = result.marketData || {};
    currentSettings = result.forexTimeSettings || {};

    // Initialize UI only after we have the data
    initializeSettingsUI();
    setupSettingsEventListeners();
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
});

function initializeSettingsUI() {
  // Populate markets grid
  const marketsGrid = document.querySelector('.markets-grid');
  if (marketsGrid && Object.keys(marketData).length > 0) {
    Object.keys(marketData).forEach(market => {
      const checkbox = createMarketCheckbox(market);
      marketsGrid.appendChild(checkbox);
    });
  }

  // Apply current settings to UI elements
  applyCurrentSettings();
}

function createMarketCheckbox(market) {
  const div = document.createElement('div');
  div.className = 'market-checkbox';
  
  const id = market.toLowerCase().replace(/\s+/g, '-');
  
  div.innerHTML = `
    <input type="checkbox" id="${id}" 
           ${currentSettings.selectedMarkets.includes(market) ? 'checked' : ''}>
    <label for="${id}">${market}</label>
  `;
  
  return div;
}

function setupSettingsEventListeners() {
  // Back button
  document.getElementById('back-to-main').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });

  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.theme = btn.dataset.theme;
      applyCurrentSettings();
    });
  });

  // Save button
  document.getElementById('save-settings').addEventListener('click', saveSettings);

  // Add other event listeners for settings controls
  // ...
}

function applyCurrentSettings() {
  // Apply theme
  document.body.className = currentSettings.theme === 'light' ? 'light-theme' : '';
  
  // Update UI elements to reflect current settings
  // ...
}

async function saveSettings() {
  // Save settings to storage
  await chrome.storage.sync.set({ forexTimeSettings: currentSettings });
  
  // Notify popup to update
  chrome.runtime.sendMessage({ action: 'settingsUpdated' });
  
  // Show success message
  alert('Settings saved successfully!');
}
