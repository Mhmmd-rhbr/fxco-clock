// Initialize extension when installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Forex Market Time Tracker extension installed');
  
  // Initialize default settings if not already set
  chrome.storage.sync.get(['forexTimeSettings'], (result) => {
    if (!result.forexTimeSettings) {
      // Default settings
      const defaultSettings = {
        theme: 'dark',
        timezone: 'Asia/Tehran',
        clockFormat: 'ddd, D MMM YYYY HH:mm:ss z',
        marketHoursFormat: '24h',
        marketMode: 'exchanges',
        selectedMarkets: [
          'Sydney', 
          'Tokyo', 
          'Shanghai', 
          'Hong Kong', 
          'Mumbai', 
          'Frankfurt', 
          'London', 
          'New York'
        ],
        notifications: {
          marketOpen: false,
          marketClose: false
        }
      };
      
      // Save default settings
      chrome.storage.sync.set({ forexTimeSettings: defaultSettings }, () => {
        console.log('Default settings initialized');
      });
    }
  });
  
  // Request notification permission if notifications are enabled
  if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getServerTime') {
    // This would fetch the current server time from a reliable time service
    // For this example, we'll just use the local time
    sendResponse({ time: new Date().toISOString() });
  } else if (message.action === 'sendNotification') {
    // Handle notification request from popup
    chrome.notifications.create('', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: message.title,
      message: message.message,
      priority: 1
    });
    sendResponse({ success: true });
  }
  return true; // Required for async sendResponse
});

// Setup alarm for checking market status every 5 minutes
chrome.alarms.create('checkMarketStatus', { periodInMinutes: 5 });

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkMarketStatus') {
    // Check for market status changes and handle notifications
    checkMarketStatusForNotifications();
  }
});

// Function to check market status and send notifications if needed
function checkMarketStatusForNotifications() {
  chrome.storage.sync.get(['forexTimeSettings'], (result) => {
    if (!result.forexTimeSettings) return;
    
    const settings = result.forexTimeSettings;
    
    // Skip if notifications are disabled
    if (!settings.notifications || 
        (!settings.notifications.marketOpen && !settings.notifications.marketClose)) {
      return;
    }
    
    // Get the market data from a centralized place
    // This is a simplified version - the full data would be in sync with the popup.js
    const marketData = {
      'Sydney': { open: '02:30', close: '08:30' },
      'Tokyo': { open: '03:30', close: '09:30' },
      'Shanghai': { open: '05:00', close: '10:30' },
      'Hong Kong': { open: '05:00', close: '11:30' },
      'Mumbai': { open: '07:15', close: '13:30' },
      'Frankfurt': { open: '11:30', close: '20:00' },
      'London': { open: '11:30', close: '20:00' },
      'New York': { open: '18:00', close: '00:30' }
    };
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Check each selected market for opening/closing events
    settings.selectedMarkets.forEach(marketName => {
      if (marketData[marketName]) {
        const market = marketData[marketName];
        
        // Parse open/close times
        const [openHour, openMinute] = market.open.split(':').map(Number);
        const [closeHour, closeMinute] = market.close.split(':').map(Number);
        
        // Check if market just opened
        if (settings.notifications.marketOpen && 
            currentHour === openHour && 
            Math.abs(currentMinute - openMinute) < 3) {
          sendMarketNotification(marketName, 'open');
        }
        
        // Check if market just closed
        if (settings.notifications.marketClose && 
            currentHour === closeHour && 
            Math.abs(currentMinute - closeMinute) < 3) {
          sendMarketNotification(marketName, 'close');
        }
      }
    });
  });
}

// Function to send market notifications
function sendMarketNotification(marketName, eventType) {
  const title = eventType === 'open' ? 'Market Opening' : 'Market Closing';
  const message = eventType === 'open' 
    ? `${marketName} market is now open` 
    : `${marketName} market is now closing`;
  
  chrome.notifications.create('', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: 1
  });
}