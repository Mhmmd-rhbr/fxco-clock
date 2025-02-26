// Market data with opening and closing times (24-hour format)
const marketData = {
  'Sydney': { open: '02:30', close: '08:30', timezoneName: 'Australia/Sydney' },
  'Tokyo': { open: '03:30', close: '09:30', timezoneName: 'Asia/Tokyo' },
  'Shanghai': { open: '05:00', close: '10:30', timezoneName: 'Asia/Shanghai' },
  'Hong Kong': { open: '05:00', close: '11:30', timezoneName: 'Asia/Hong_Kong' },
  'Mumbai': { open: '07:15', close: '13:30', timezoneName: 'Asia/Kolkata' },
  'Frankfurt': { open: '11:30', close: '20:00', timezoneName: 'Europe/Berlin' },
  'London': { open: '11:30', close: '20:00', timezoneName: 'Europe/London' },
  'New York': { open: '18:00', close: '00:30', timezoneName: 'America/New_York' },
  'Chicago': { open: '18:00', close: '00:30', timezoneName: 'America/Chicago' },
  'Toronto': { open: '18:00', close: '00:30', timezoneName: 'America/Toronto' },
  'Singapore': { open: '05:00', close: '12:00', timezoneName: 'Asia/Singapore' },
  'Sydney Futures': { open: '01:00', close: '07:00', timezoneName: 'Australia/Sydney' }
};

// Default settings
const defaultSettings = {
  theme: 'dark',
  timezone: 'Asia/Tehran',
  clockFormat: 'ddd, D MMM YYYY HH:mm:ss z',
  marketHoursFormat: '24h',
  marketMode: 'exchanges',
  selectedMarkets: ['Sydney', 'Tokyo', 'Shanghai', 'Hong Kong', 'Mumbai', 'Frankfurt', 'London', 'New York'],
  notifications: {
    marketOpen: false,
    marketClose: false
  }
};

// Current settings initialized with defaults
let currentSettings = { ...defaultSettings };

// Current simulation time (null means using real time)
let simulationTime = null;

// Initialize DOM elements
document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  loadSettings();
  
  // Initialize UI
  initializeUI();
  
  // Set up event listeners
  setupEventListeners();
  
  // Start the clock
  updateClock();
  setInterval(updateClock, 1000);
  
  // Update market status table
  updateMarketTable();
  
  // Update visualizer
  updateVisualizer();
  
  // Update every minute for visualizer
  setInterval(updateVisualizer, 60000);
});

// Load settings from Chrome storage
function loadSettings() {
  chrome.storage.sync.get(['forexTimeSettings'], (result) => {
    if (result.forexTimeSettings) {
      currentSettings = { ...defaultSettings, ...result.forexTimeSettings };
    }
    
    // Apply settings to UI
    applySettings();
  });
}

// Save settings to Chrome storage
function saveSettings() {
  chrome.storage.sync.set({ forexTimeSettings: currentSettings }, () => {
    console.log('Settings saved');
    
    // Show success message
    const saveBtn = document.getElementById('save-settings');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '✓ Saved';
    saveBtn.disabled = true;
    
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }, 2000);
  });
}

// Apply current settings to UI
function applySettings() {
  // Apply theme
  document.body.className = currentSettings.theme === 'light' ? 'light-theme' : '';
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === currentSettings.theme);
  });
  
  // Apply timezone
  document.getElementById('timezone-select').value = currentSettings.timezone;
  document.getElementById('timezone-display').textContent = currentSettings.timezone;
  
  // Apply clock format
  document.getElementById('clock-format').value = currentSettings.clockFormat;
  
  // Apply market hours format
  document.querySelectorAll('.hours-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.hours === currentSettings.marketHoursFormat);
  });
  
  // Apply market mode
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === currentSettings.marketMode);
  });
  
  // Apply selected markets
  Object.keys(marketData).forEach(market => {
    const id = market.toLowerCase().replace(/\s+/g, '-');
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.checked = currentSettings.selectedMarkets.includes(market);
    }
  });
  
  // Apply notification settings
  if (currentSettings.notifications) {
    document.getElementById('notify-market-open').checked = currentSettings.notifications.marketOpen;
    document.getElementById('notify-market-close').checked = currentSettings.notifications.marketClose;
  }
  
  // Update the table with new settings
  updateMarketTable();
  
  // Update visualizer
  updateVisualizer();
}

// Initialize UI components
function initializeUI() {
  // Initialize simulate time inputs with current date/time
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().substring(0, 5);
  
  document.getElementById('simulate-date').value = dateStr;
  document.getElementById('simulate-time').value = timeStr;
  
  // Set theme based on system preference if set to auto
  if (currentSettings.theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.className = prefersDark ? '' : 'light-theme';
  }
}

// Set up event listeners for all interactive elements
function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      
      // Update active tab
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show corresponding content
      document.querySelectorAll('.tab-container').forEach(container => {
        container.classList.remove('active');
      });
      
      document.getElementById(`${tabId}-tab`).classList.add('active');
      
      // Update visualizer if selected
      if (tabId === 'visualizer') {
        updateVisualizer();
      }
    });
  });
  
  // Market search
  document.getElementById('market-search').addEventListener('input', (e) => {
    const searchText = e.target.value.toLowerCase();
    const tableRows = document.querySelectorAll('#market-table-body tr');
    
    tableRows.forEach(row => {
      const marketName = row.querySelector('td:first-child').textContent.toLowerCase();
      if (marketName.includes(searchText)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  });
  
  // Reset simulation button
  document.getElementById('reset-simulation').addEventListener('click', () => {
    simulationTime = null;
    
    // Update current time display
    updateClock();
    
    // Update market table
    updateMarketTable();
    
    // Update visualizer
    updateVisualizer();
  });
  
  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.theme = btn.dataset.theme;
      applySettings();
    });
  });
  
  // Timezone select
  document.getElementById('timezone-select').addEventListener('change', (e) => {
    currentSettings.timezone = e.target.value;
    document.getElementById('timezone-display').textContent = e.target.value;
    updateClock();
    updateMarketTable();
    updateVisualizer();
  });
  
  // Clock format input
  document.getElementById('clock-format').addEventListener('change', (e) => {
    currentSettings.clockFormat = e.target.value;
    updateClock();
  });
  
  // Market hours format buttons
  document.querySelectorAll('.hours-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.marketHoursFormat = btn.dataset.hours;
      applySettings();
    });
  });
  
  // Market mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.marketMode = btn.dataset.mode;
      applySettings();
    });
  });
  
  // Market checkboxes
  document.querySelectorAll('.market-checkbox input').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const marketName = checkbox.nextElementSibling.textContent;
      
      if (checkbox.checked && !currentSettings.selectedMarkets.includes(marketName)) {
        currentSettings.selectedMarkets.push(marketName);
      } else if (!checkbox.checked && currentSettings.selectedMarkets.includes(marketName)) {
        currentSettings.selectedMarkets = currentSettings.selectedMarkets.filter(m => m !== marketName);
      }
      
      updateMarketTable();
      updateVisualizer();
    });
  });
  
  // Select/Deselect all markets
  document.getElementById('select-all-markets').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.market-checkbox input');
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
    });
    
    currentSettings.selectedMarkets = Object.keys(marketData);
    updateMarketTable();
    updateVisualizer();
  });
  
  document.getElementById('deselect-all-markets').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.market-checkbox input');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    
    currentSettings.selectedMarkets = [];
    updateMarketTable();
    updateVisualizer();
  });
  
  // Notification settings
  document.getElementById('notify-market-open').addEventListener('change', (e) => {
    currentSettings.notifications = currentSettings.notifications || {};
    currentSettings.notifications.marketOpen = e.target.checked;
  });
  
  document.getElementById('notify-market-close').addEventListener('change', (e) => {
    currentSettings.notifications = currentSettings.notifications || {};
    currentSettings.notifications.marketClose = e.target.checked;
  });
  
  // Save button
  document.getElementById('save-settings').addEventListener('click', () => {
    saveSettings();
  });
  
  // Discard button
  document.getElementById('discard-settings').addEventListener('click', () => {
    loadSettings();
  });
  
  // Default button
  document.getElementById('default-settings').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      currentSettings = { ...defaultSettings };
      applySettings();
    }
  });
  
  // Simulate time inputs
  document.getElementById('simulate-date').addEventListener('change', updateSimulationTime);
  document.getElementById('simulate-time').addEventListener('change', updateSimulationTime);
}

// Update simulation time based on inputs
function updateSimulationTime() {
  const simulateDate = document.getElementById('simulate-date').value;
  const simulateTime = document.getElementById('simulate-time').value;
  
  if (simulateDate && simulateTime) {
    simulationTime = new Date(`${simulateDate}T${simulateTime}`);
    
    // Update displays
    updateClock();
    updateMarketTable();
    updateVisualizer();
  }
}

// Update the clock display based on current settings
function updateClock() {
  const clockElement = document.getElementById('current-time');
  const now = simulationTime || new Date();
  
  // Format the date according to the current format setting
  // This is a simple implementation - in a production environment, use a library like moment.js
  const options = { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: currentSettings.timezone,
    timeZoneName: 'short'
  };
  
  clockElement.textContent = now.toLocaleString('en-US', options);
  
  // If simulation is active, add visual indicator
  if (simulationTime) {
    clockElement.classList.add('simulated-time');
  } else {
    clockElement.classList.remove('simulated-time');
  }
}

// Update the market status table
function updateMarketTable() {
  const tableBody = document.getElementById('market-table-body');
  tableBody.innerHTML = '';
  
  // Get current time or simulated time
  const currentTime = simulationTime || new Date();
  
  // Sort markets by opening time
  const sortedMarkets = [...currentSettings.selectedMarkets].sort((a, b) => {
    if (!marketData[a] || !marketData[b]) return 0;
    return marketData[a].open.localeCompare(marketData[b].open);
  });
  
  // Create rows for each selected market
  sortedMarkets.forEach(marketName => {
    if (marketData[marketName]) {
      const market = marketData[marketName];
      const row = document.createElement('tr');
      
      // Get market open/close times
      const { isOpen, formattedOpenTime, formattedCloseTime } = getMarketStatus(
        market, 
        currentTime, 
        currentSettings.timezone, 
        currentSettings.marketHoursFormat,
        currentSettings.marketMode
      );
      
      // Add classes to highlight open markets
      if (isOpen) {
        row.classList.add('open-market');
      }
      
      // Create table cells
      row.innerHTML = `
        <td>${marketName}</td>
        <td>${formattedOpenTime}</td>
        <td>${formattedCloseTime}</td>
        <td class="${isOpen ? 'status-open' : 'status-closed'}">${isOpen ? 'Open' : 'Close'}</td>
      `;
      
      tableBody.appendChild(row);
    }
  });
}

// Update the visualizer tab
function updateVisualizer() {
  updateTimelineVisualizer();
  updateOverlapChart();
}

// Update the timeline visualizer
function updateTimelineVisualizer() {
  const timelineContainer = document.getElementById('markets-timeline');
  timelineContainer.innerHTML = '';
  
  // Get current time or simulated time
  const currentTime = simulationTime || new Date();
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  
  // Update current time marker in visualizer
  document.getElementById('visualizer-time').textContent = 
    `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')} ${currentSettings.timezone}`;
  
  // Calculate current time position (as percentage across the 24-hour timeline)
  const currentTimePercentage = ((currentHour * 60 + currentMinute) / (24 * 60)) * 100;
  
  // Set position of current time marker
  const timelineMarker = document.getElementById('timeline-current-marker');
  timelineMarker.style.left = `${currentTimePercentage}%`;
  
  // Create timeline rows for each selected market
  currentSettings.selectedMarkets.forEach(marketName => {
    if (marketData[marketName]) {
      const market = marketData[marketName];
      
      // Parse open/close hours into minutes from start of day
      const [openHour, openMinute] = market.open.split(':').map(Number);
      const [closeHour, closeMinute] = market.close.split(':').map(Number);
      
      const openMinutes = openHour * 60 + openMinute;
      let closeMinutes = closeHour * 60 + closeMinute;
      
      // Handle overnight markets
      if (closeMinutes < openMinutes) {
        closeMinutes += 24 * 60; // Add 24 hours
      }
      
      // Calculate percentages for positioning
      const startPercentage = (openMinutes / (24 * 60)) * 100;
      const endPercentage = (closeMinutes / (24 * 60)) * 100;
      const width = endPercentage - startPercentage;
      
      // Create the market timeline row
      const marketRow = document.createElement('div');
      marketRow.className = 'market-timeline-row';
      
      marketRow.innerHTML = `
        <div class="market-timeline-label">${marketName}</div>
        <div class="market-timeline-bar-container">
          <div class="market-timeline-bar" style="left: ${startPercentage}%; width: ${width}%;"></div>
        </div>
      `;
      
      timelineContainer.appendChild(marketRow);
    }
  });
}

// Update the overlap chart
function updateOverlapChart() {
  const overlapChart = document.getElementById('overlap-chart');
  overlapChart.innerHTML = '';
  
  // Create hour lines
  const hourLines = document.createElement('div');
  hourLines.className = 'hour-lines';
  
  for (let hour = 0; hour < 24; hour++) {
    const hourLine = document.createElement('div');
    hourLine.className = 'hour-line';
    hourLine.style.left = `${(hour / 24) * 100}%`;
    hourLines.appendChild(hourLine);
  }
  
  overlapChart.appendChild(hourLines);
  
  // Calculate market overlaps for each hour
  const hourlyOverlaps = [];
  
  for (let hour = 0; hour < 24; hour++) {
    let marketsOpen = 0;
    
    currentSettings.selectedMarkets.forEach(marketName => {
      if (marketData[marketName]) {
        const market = marketData[marketName];
        
        // Parse open/close hours
        const [openHour, openMinute] = market.open.split(':').map(Number);
        const [closeHour, closeMinute] = market.close.split(':').map(Number);
        
        // Check if market is open during this hour
        if (closeHour < openHour) {
          // Overnight market
          if (hour >= openHour || hour < closeHour) {
            marketsOpen++;
          }
        } else {
          // Regular market
          if (hour >= openHour && hour < closeHour) {
            marketsOpen++;
          }
        }
      }
    });
    
    hourlyOverlaps.push(marketsOpen);
  }
  
  // Create overlap bars
  const maxOverlap = Math.max(...hourlyOverlaps, 1);
  const barWidth = 100 / 24;
  
  for (let hour = 0; hour < 24; hour++) {
    const overlap = hourlyOverlaps[hour];
    const height = (overlap / maxOverlap) * 100;
    
    let colorClass = 'overlap-low';
    if (overlap >= maxOverlap * 0.7) {
      colorClass = 'overlap-high';
    } else if (overlap >= maxOverlap * 0.4) {
      colorClass = 'overlap-medium';
    }
    
    const overlapBar = document.createElement('div');
    overlapBar.className = `overlap-bar ${colorClass}`;
    overlapBar.style.left = `${hour * barWidth}%`;
    overlapBar.style.width = `${barWidth}%`;
    overlapBar.style.height = `${height}%`;
    
    if (overlap > 0) {
      overlapBar.textContent = overlap;
    }
    
    overlapChart.appendChild(overlapBar);
  }
}

// Helper function to determine if a market is open and format the times
function getMarketStatus(market, currentTime, timezone, format, mode) {
  // Parse market hours
  const [openHour, openMinute] = market.open.split(':').map(Number);
  const [closeHour, closeMinute] = market.close.split(':').map(Number);
  
  // Create Date objects for market open and close times
  const marketOpenTime = new Date(currentTime);
  marketOpenTime.setHours(openHour, openMinute, 0, 0);
  
  const marketCloseTime = new Date(currentTime);
  marketCloseTime.setHours(closeHour, closeMinute, 0, 0);
  
  // Handle overnight markets (close time is earlier than open time)
  if (marketCloseTime < marketOpenTime) {
    marketCloseTime.setDate(marketCloseTime.getDate() + 1);
  }
  
  // Check if market is currently open
  const isOpen = currentTime >= marketOpenTime && currentTime < marketCloseTime;
  
  // Format the times based on user preference
  let formattedOpenTime = formatTime(openHour, openMinute, format);
  let formattedCloseTime = formatTime(closeHour, closeMinute, format);
  
  return {
    isOpen,
    formattedOpenTime,
    formattedCloseTime
  };
}

// Format time according to user preference
function formatTime(hours, minutes, format) {
  if (format === '12h') {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  } else {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}

// Check if we need to send notifications
setInterval(() => {
  if (!currentSettings.notifications) return;
  if (!currentSettings.notifications.marketOpen && !currentSettings.notifications.marketClose) return;
  
  // Only check with real time, not simulation
  if (simulationTime) return;
  
  const now = new Date();
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  
  currentSettings.selectedMarkets.forEach(marketName => {
    if (marketData[marketName]) {
      const market = marketData[marketName];
      
      // Parse open/close times
      const [openHour, openMinute] = market.open.split(':').map(Number);
      const [closeHour, closeMinute] = market.close.split(':').map(Number);
      
      const openMinuteOfDay = openHour * 60 + openMinute;
      const closeMinuteOfDay = closeHour * 60 + closeMinute;
      
      // Check for market opening
      if (currentSettings.notifications.marketOpen && 
          currentMinute === openMinuteOfDay) {
        showNotification(
          'Market Opening', 
          `${marketName} market is now open`
        );
      }
      
      // Check for market closing
      if (currentSettings.notifications.marketClose && 
          currentMinute === closeMinuteOfDay) {
        showNotification(
          'Market Closing', 
          `${marketName} market is now closing`
        );
      }
    }
  });
}, 60000); // Check every minute

// Function to show notifications
function showNotification(title, message) {
  // Check if the browser supports notifications
  if ('Notification' in window) {
    // Check if permission is already granted
    if (Notification.permission === 'granted') {
      new Notification(title, { 
        body: message,
        icon: 'icons/icon128.png'
      });
    }
    // Otherwise, ask for permission
    else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, {
            body: message,
            icon: 'icons/icon128.png'
          });
        }
      });
    }
  }
  
  // Fallback to alert if notifications aren't available or permitted
  if (Notification.permission !== 'granted') {
    alert(`${title}: ${message}`);
  }
}