// Import Firebase SDK components
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
  onSnapshot,
  addDoc
} from "firebase/firestore";
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getDatabase, ref, onValue, push } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDChyRMRZw13CIheI4_vd5bsrFLBprMC20",
  authDomain: "that-sky-calendar-ffd49.firebaseapp.com",
  projectId: "that-sky-calendar-ffd49",
  storageBucket: "that-sky-calendar-ffd49.appspot.com",
  messagingSenderId: "994867085966",
  appId: "1:994867085966:web:ea6d5b05bccb508eb73fdf",
  measurementId: "G-FXXSH6NS6Z",
};

// Initialize Firebase services
initializeApp(firebaseConfig);
const app = initializeApp(firebaseConfig);
const db = getFirestore();
const colRef = collection(db, "events");
const shardsCollection = collection(db, "shards");

// for push notif
const messaging = getMessaging(app);
const database = getDatabase();

async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BConeDXrXIm-QKaYoWthQG9PVrnOpjV4ABDHEO50d-DzdgCMCpiNOfHd2T5q6UQC6upzZylGDG-GBj-F_bR4Ic0'
      });
      console.log('FCM Token:', token);
      
      // Store token
      await storeUserToken(token);
      
      return token;
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
}

async function storeUserToken(token) {
  try {
    // Check if token already exists to prevent duplicates
    const tokensRef = collection(db, 'fcmTokens');
    const tokenQuery = query(tokensRef, where('token', '==', token));
    const querySnapshot = await getDocs(tokenQuery);
    
    if (querySnapshot.empty) {
      // Token doesn't exist, store it
      await addDoc(collection(db, 'fcmTokens'), {
        token: token,
        createdAt: serverTimestamp(),
        active: true,
        userAgent: navigator.userAgent,
        lastUsed: serverTimestamp()
      });
      console.log('New token stored successfully');
    } else {
      // Token exists, update lastUsed timestamp
      const existingDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'fcmTokens', existingDoc.id), {
        lastUsed: serverTimestamp(),
        active: true
      });
      console.log('Existing token updated');
    }
  } catch (error) {
    console.error('Error storing token:', error);
  }
}

function setupEventListener() {
  // Get timestamp of when user last checked (to avoid old notifications)
  const lastCheckTime = localStorage.getItem('lastEventCheck');
  const checkTime = lastCheckTime ? new Date(parseInt(lastCheckTime)) : new Date();
  
  // Query for events created after last check
  const eventsRef = collection(db, 'events');
  const recentEventsQuery = query(
    eventsRef, 
    where('createdAt', '>', checkTime),
    orderBy('createdAt', 'desc')
  );
  
  // Listen for new events in real-time
  onSnapshot(recentEventsQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const eventData = change.doc.data();
        const eventId = change.doc.id;
        
        // Show notification for new event (foreground only)
        showLocalNotification({
          id: eventId,
          title: eventData.title,
          description: eventData.description,
          date: eventData.date,
          ...eventData
        });
        
        // Update last check time
        localStorage.setItem('lastEventCheck', Date.now().toString());
      }
    });
  });
}

function showLocalNotification(event) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(`New Sky Event: ${event.title}`, {
      body: `${event.description} - ${event.date}`,
      icon: 'https://img.icons8.com/?size=100&id=61187&format=png&color=000000',
      tag: event.id,
      requireInteraction: true
    });
    
    notification.onclick = function() {
      window.focus();
      notification.close();
    };
  }
}

onMessage(messaging, (payload) => {
  console.log('Message received in foreground:', payload);
  
  const { title, body } = payload.notification;
  showLocalNotification({
    title: title,
    description: body,
    id: payload.data?.eventId || 'notification'
  });
});

onTokenRefresh(messaging, async () => {
  try {
    const newToken = await getToken(messaging, {
      vapidKey: 'Bg' // Replace with your actual VAPID key
    });
    console.log('Token refreshed:', newToken);
    await storeUserToken(newToken);
  } catch (error) {
    console.error('Error refreshing token:', error);
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  // Register service worker first
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered:', registration);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
  
  await requestNotificationPermission();
  setupEventListener();
  
  // Add subscribe button functionality
  const subscribeBtn = document.getElementById('subscribe-notifications');
  if (subscribeBtn) {
    subscribeBtn.addEventListener('click', async () => {
      const token = await requestNotificationPermission();
      if (token) {
        subscribeBtn.textContent = 'Notifications Enabled ✓';
        subscribeBtn.disabled = true;
      }
    });
  }
});

// Global variables
let allEvents = [];
let eventsByMonthYear = {};
let currentMonthYearIndex = 0;
let monthYearKeys = [];


// Initialize FullCalendar with event data
function initializeCalendar(eventsData) {
  const calendarEl = document.getElementById("calendar");

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    fixedWeekCount: false,
    aspectRatio: 1.35,
    height: "auto",
    events: eventsData,

    // Enhanced event display with time
    eventContent: function (info) {
      const iconPath = info.event.extendedProps.icon;
      if (iconPath) {
        return {
          html: `
            <div class="event-icon-container">
              <img src="${iconPath}" class="event-icon" alt="event icon" />
            </div>
          `,
        };
      } else {
        return {
          html: `
            <div class="event-content">
              <span class="fc-event-title">${info.event.title}</span>
            </div>
          `,
        };
      }
    },

    eventOrder: "start",
    eventClick: function (info) {
      openEventModal(info.event);
    },

    // Show different views based on your needs
    headerToolbar: {
      right: 'prev,next today',
    }
  });

  calendar.render();
  addCategoryFilter(calendar, eventsData);
  console.log(eventsData);
  
}

// Google calendar integration
function generateGoogleCalendarLink(event) {
  const maxDescriptionLength = 300;
  let description = event.extendedProps.description || "Join us in Sky!";
  if (description.length > maxDescriptionLength) {
    description = description.slice(0, maxDescriptionLength) + '...';
  }
  description = encodeURIComponent(description);

  const title = encodeURIComponent(event.title || "Sky Event");
  const location = encodeURIComponent("Sky: Children of the Light");

  const start = new Date(event.start).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = new Date(event.end).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${description}&location=${location}`;
}

function generateGoogleCalendarLink_previewPanel(event) {
  const maxDescriptionLength = 300;
  let description = event.description || "Join us in Sky!";
  if (description.length > maxDescriptionLength) {
    description = description.slice(0, maxDescriptionLength) + '...';
  }
  description = encodeURIComponent(description);

  const title = encodeURIComponent(event.title || "Sky Event");
  const location = encodeURIComponent("Sky: Children of the Light");

  const start = new Date(event.start).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = new Date(event.end).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${description}&location=${location}`;
}



// Add category filter to calendar
function addCategoryFilter(calendar, eventsData) {
  const categoryFilterDropdown = document.createElement("select");
  categoryFilterDropdown.id = "category-filter";
  categoryFilterDropdown.title = "category-filter";
  categoryFilterDropdown.innerHTML = `
    <option value="">All Categories</option>
    <option value="special-event">Special Events</option>
    <option value="shard">Shard</option>
    <option value="days-of-events">Days of Events</option>
    <option value="travelling-spirits">Travelling Spirits</option>
    <option value="seasons">Seasons</option>
    <option value="hide">Hide Shards</option>
  `;

  const calendarHeader = document.querySelector(".fc-toolbar-chunk:nth-child(2)");
  calendarHeader.appendChild(categoryFilterDropdown);

  categoryFilterDropdown.addEventListener("change", function () {
    const selectedCategory = this.value.toLowerCase();
    
    const filteredEvents = eventsData.filter((event) => {
      if (selectedCategory === "hide") {
        return !event.category || !event.category.toLowerCase().includes("shard");
      } else {
        if (event.category) {
          return event.category.toLowerCase() === selectedCategory || selectedCategory === "";
        } else {
          return selectedCategory === "";
        }
      }
    });
    
    calendar.removeAllEventSources();
    calendar.addEventSource(filteredEvents);
  });
}

// Format date range for display
function formatDateRange(start, end) {
  const startDate = moment(start);
  const endDate = moment(end);

  if (startDate.month() === endDate.month()) {
    return `${startDate.format("MMM DD")} - ${endDate.format("DD")}`;
  } else {
    return `${startDate.format("MMM DD")} - ${endDate.format("MMM DD")}`;
  }
}

// Calculate time remaining until event end
function calculateRemainingTime(end) {
  const now = new Date();
  const endTime = new Date(end);
  const diff = endTime - now;

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return `${days}D ${hours}H`;
}

// Calculate time until event start
function calculateTimeUntilStart(start) {
  const now = new Date();
  const startTime = new Date(start);
  const diff = startTime - now;

  if (diff <= 0) return "Started";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days === 0) {
    return `Starts in ${hours}H ${minutes}M`;
  } else {
    return `Starts in ${days}D ${hours}H ${minutes}M`;
  }
}

// Create an event card for the events list
function createEventCard(event) {
  const now = new Date();
  const start = new Date(event.start);
  const end = new Date(event.end);

  let timeInfo = "";
  if (event.category === "Recurring") {
    timeInfo = `Every ${event.recurringInterval || "0:30"}`;
  } else if (now < start) {
    timeInfo = calculateTimeUntilStart(start);
  } else if (now >= start && now <= end) {
    timeInfo = `Ends in: ${calculateRemainingTime(end)}`;
  } else {
    timeInfo = "Event ended";
  }

  const card = document.createElement("div");
  card.className = "event-card";
  card.dataset.eventId = event.id || generateEventId(event.title);

  card.innerHTML = `
    <img src="${event.image || "https://ik.imagekit.io/e3wiv79bq/Sky:%20Cotl/not%20available?updatedAt=1744181831782"}" alt="${event.title}">
    <div class="event-details">
        <h3>${event.title.replace(/^[\p{Emoji}\p{Extended_Pictographic}]+\s*/u, "")}</h3>
        <p>${formatDateRange(event.start, event.end)}</p>
        <p>${timeInfo}</p>
    </div>
    <div class="arrow">›</div>
  `;

  return card;
}

// Generate a unique ID for an event based on its title
function generateEventId(title) {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

// Organize events by month and year
function organizeEventsByMonthYear(events) {
  const eventsByMonthYear = {};

  events.forEach((event) => {
    const startDate = new Date(event.start);
    const monthYear = moment(startDate).format("MMMM YYYY");

    if (!eventsByMonthYear[monthYear]) {
      eventsByMonthYear[monthYear] = [];
    }

    eventsByMonthYear[monthYear].push(event);
  });

  return eventsByMonthYear;
}

// Find the current month index in the monthYearKeys array
function findCurrentMonthIndex(monthYearKeys) {
  const currentMonthYear = moment().format("MMMM YYYY");
  const index = monthYearKeys.indexOf(currentMonthYear);
  return index !== -1 ? index : 0;
}

// Function to update the month pagination
function updateMonthPagination() {
  const prevButton = document.getElementById("prev-month");
  const nextButton = document.getElementById("next-month");
  const monthYearSpan = document.getElementById("current-month-year");

  monthYearSpan.textContent = monthYearKeys[currentMonthYearIndex];
  prevButton.disabled = currentMonthYearIndex === 0;
  nextButton.disabled = currentMonthYearIndex === monthYearKeys.length - 1;
}

// Display events for the current month/year
function displayCurrentMonthEvents() {
  const currentMonthYear = monthYearKeys[currentMonthYearIndex];
  const eventsContainer = document.getElementById("all-events-content");
  eventsContainer.innerHTML = "";

  const monthDivider = document.createElement("div");
  monthDivider.className = "month-divider";
  eventsContainer.appendChild(monthDivider);

  const monthEvents = eventsByMonthYear[currentMonthYear] || [];

  if (monthEvents.length === 0) {
    const noEvents = document.createElement("div");
    noEvents.className = "no-events";
    noEvents.textContent = "No events for this month";
    eventsContainer.appendChild(noEvents);
  } else {
    monthEvents.forEach((event) => {
      const card = createEventCard(event);
      eventsContainer.appendChild(card);
    });
  }

  addEventListenersToCards();
}

// Filter events for different tabs (all, in-progress, upcoming)
function filterEvents() {
  const now = new Date();
  const activeTab = document.querySelector(".tab.active").dataset.tab;

  // Filter events by status
  const inProgress = allEvents.filter((event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    return now >= start && now <= end;
  });

  const upcoming = allEvents.filter((event) => {
    const start = new Date(event.start);
    return now < start;
  });

  // Handle tab display and content
  handleTabDisplay(activeTab, inProgress, upcoming);
}

// Handle tab display and content population
function handleTabDisplay(activeTab, inProgress, upcoming) {
  // Hide all tab panes first
  document.getElementById("in-progress").style.display = "none";
  document.getElementById("upcoming").style.display = "none";
  document.getElementById("all").style.display = "none";
  
  // Show and populate the active tab
  if (activeTab === "all") {
    document.getElementById("all").style.display = "block";
    
    // Setup month pagination
    eventsByMonthYear = organizeEventsByMonthYear(allEvents);
    monthYearKeys = Object.keys(eventsByMonthYear).sort((a, b) => {
      return moment(a, "MMMM YYYY").diff(moment(b, "MMMM YYYY"));
    });
    
    currentMonthYearIndex = findCurrentMonthIndex(monthYearKeys);
    updateMonthPagination();
    displayCurrentMonthEvents();
  } 
  else if (activeTab === "in-progress") {
    const tabPane = document.getElementById("in-progress");
    tabPane.style.display = "block";
    tabPane.innerHTML = "";
    
    if (inProgress.length === 0) {
      tabPane.innerHTML = '<div class="no-events">No events in progress</div>';
    } else {
      inProgress.forEach((event) => {
        const card = createEventCard(event);
        tabPane.appendChild(card);
      });
    }
    
    addEventListenersToCards();
  } 
  else if (activeTab === "upcoming") {
    const tabPane = document.getElementById("upcoming");
    tabPane.style.display = "block";
    tabPane.innerHTML = "";
    
    if (upcoming.length === 0) {
      tabPane.innerHTML = '<div class="no-events">No upcoming events</div>';
    } else {
      upcoming.forEach((event) => {
        const card = createEventCard(event);
        tabPane.appendChild(card);
      });
    }
    
    addEventListenersToCards();
  }
}

// Update the preview panel with event details
function updatePreviewPanel(event) {
  const previewPanel = document.querySelector(".preview-panel");

  if (!previewPanel) return;

  if (!event) {
    previewPanel.innerHTML = '<div class="loading">Select an event to view details</div>';
    return;
  }

  const start = formatDate_withTZ(event.start, "short");
  const end = formatDate_withTZ(event.end, "short");
  const dateRange = start + " - " + end;
  const title = event.title.replace(/^[\p{Emoji}\p{Extended_Pictographic}]+\s*/u, "");

  // Determine badge text based on category
  let badgeText = event.category || "EVENT";
  if (badgeText.toUpperCase().includes("DAY")) {
    badgeText = "DAYS OF";
  } else if (badgeText.toUpperCase().includes("SEASONS")) {
    badgeText = "SEASON";
  } else if (badgeText.toUpperCase().includes("TRAVELLING-SPIRITS")) {
    badgeText = "TS";
  } else if (badgeText.toUpperCase().includes("SPECIAL-EVENT")) {
    badgeText = "SPECIAL";
  }

  const calendarLink = generateGoogleCalendarLink_previewPanel(event);

  // Generate CTA button
  const ctaButtonHTML = event.blogUrl ?
    `<a id="modalCta" class="cta-btn" title="Sky Blog" href="${event.blogUrl}" target="_blank" rel="noopener noreferrer">
      Read More
    </a>` : '';

  // Create preview panel content
  previewPanel.innerHTML = `
    <div class="carousel">
      <div class="carousel-images-panel"></div>
      <button class="carousel-btn-panel prev">❮</button>
      <button class="carousel-btn-panel next">❯</button>
    </div>
    <div class="credits-section">
      <span class="credits-list">Credits: ${event.credits || "Kathy"}</span>
    </div>
    <div class="days-badge">${badgeText.toUpperCase()}</div>
    <h2>${title}</h2>
    <p class="date">${dateRange}</p>
    <p class="description">${event.description || "No description available"}</p>
    <div class="modal-cta-container">
      <a id="modalGoogleCalendar" class="cta-btn calendar-link-btn" title="Add to Google Calendar" href="${calendarLink}" rel="noopener noreferrer" target="_blank">
        Add to Google Calendar
      </a>
      ${ctaButtonHTML}
    </div>
  `;

  // Populate carousel with images
  populatePreviewCarousel(event);

  // Add carousel navigation event listeners
  document.querySelector(".carousel-btn-panel.prev").addEventListener("click", () => navigateCarouselPanel(-1));
  document.querySelector(".carousel-btn-panel.next").addEventListener("click", () => navigateCarouselPanel(1));
}

// Populate the preview carousel with images
function populatePreviewCarousel(event) {
  const carouselImagesContainer = document.querySelector(".carousel-images-panel");
  
  if (event.images) {
    // Create an array of image URLs
    const imageUrls = typeof event.images === "string" && event.images.includes(",")
      ? event.images.split(/,|\|/).map(url => url.trim())
      : Array.isArray(event.images) 
        ? event.images 
        : [event.images];

    imageUrls.forEach((imageUrl, index) => {
      const imgContainer = document.createElement("div");
      imgContainer.className = "image-container";
      
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = `${event.title} image ${index + 1}`;
      img.className = index === 0 ? "active" : "";
      
      // Add zoom button
      const zoomBtn = document.createElement("button");
      zoomBtn.className = "zoom-btn";
      zoomBtn.innerHTML = "⛶";
      zoomBtn.title = "Enlarge image";
      zoomBtn.onclick = () => openImageZoom(imageUrl, img.alt);

      imgContainer.appendChild(img);
      imgContainer.appendChild(zoomBtn);
      carouselImagesContainer.appendChild(imgContainer);
    });

    // Show/hide carousel controls based on image count
    const carouselBtns = document.querySelectorAll(".carousel-btn-panel");
    carouselBtns.forEach(btn => {
      btn.style.display = imageUrls.length > 1 ? "block" : "none";
    });
  } else {
    // Add placeholder image if no images provided
    const imgContainer = document.createElement("div");
    imgContainer.className = "image-container";
    
    const img = document.createElement("img");
    img.src = "https://ik.imagekit.io/e3wiv79bq/Sky:%20Cotl/not%20available?updatedAt=1744181831782";
    img.alt = "Event placeholder image";
    img.className = "active";
    
    const zoomBtn = document.createElement("button");
    zoomBtn.className = "zoom-btn";
    zoomBtn.innerHTML = "⛶";
    zoomBtn.title = "Enlarge image";
    zoomBtn.onclick = () => openImageZoom(imageUrl, img.alt);

    imgContainer.appendChild(img);
    imgContainer.appendChild(zoomBtn);
    carouselImagesContainer.appendChild(imgContainer);

    // Hide carousel controls
    document.querySelectorAll(".carousel-btn-panel").forEach(btn => {
      btn.style.display = "none";
    });
  }
}

// Navigate carousel in the preview panel
function navigateCarouselPanel(direction) {
  const imageContainers = document.querySelectorAll(".carousel-images-panel .image-container");
  if (imageContainers.length <= 1) return;

  let activeIndex = -1;
  imageContainers.forEach((container, index) => {
    const img = container.querySelector("img");
    if (img.classList.contains("active")) {
      activeIndex = index;
      img.classList.remove("active");
    }
  });

  if (activeIndex === -1) return;

  // Calculate new index with wraparound
  let newIndex = (activeIndex + direction + imageContainers.length) % imageContainers.length;
  const newImg = imageContainers[newIndex].querySelector("img");
  newImg.classList.add("active");
}

// Open image in zoom overlay
function openImageZoom(imageSrc, imageAlt) {
  let zoomOverlay = document.getElementById("imageZoomOverlay");
  if (!zoomOverlay) {
    zoomOverlay = createZoomOverlay();
  }
  
  const zoomImg = zoomOverlay.querySelector(".zoom-image");
  const zoomContainer = zoomOverlay.querySelector(".zoom-image-container");
  
  zoomImg.src = imageSrc;
  zoomImg.alt = imageAlt;
  
  // Reset zoom and position
  resetImageZoom(zoomContainer, zoomImg);
  
  // Show overlay
  zoomOverlay.style.display = "flex";
  document.body.style.overflow = "hidden";
  
  // Initialize zoom controls after image loads
  zoomImg.onload = () => {
    initializeZoomControls(zoomContainer, zoomImg);
    // Start with image fitted to container (original size)
    fitImageToContainer(zoomContainer, zoomImg);
  };
}

// Create zoom overlay element
function createZoomOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "imageZoomOverlay";
  overlay.className = "image-zoom-overlay";
  
  overlay.innerHTML = `
    <div class="zoom-container">
      <div class="zoom-header">
        <div class="zoom-controls">
          <button class="zoom-btn-control" id="zoomOut">−</button>
          <span class="zoom-level">100%</span>
          <button class="zoom-btn-control" id="zoomIn">+</button>
          <button class="zoom-btn-control" id="resetZoom">Reset</button>
        </div>
        <button class="zoom-close-btn">&times;</button>
      </div>
      <div class="zoom-instructions">
        Use mouse wheel to zoom • Click and drag to pan • Pinch to zoom on mobile
      </div>
      <div class="zoom-image-container">
        <img class="zoom-image" src="" alt="" />
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Add CSS styles
  addZoomStyles();
  
  // Add event listeners
  setupZoomEventListeners(overlay);
  
  return overlay;
}

// Add CSS styles for the zoom overlay
function addZoomStyles() {
  if (document.getElementById('zoomStyles')) return;
  
  const style = document.createElement('style');
  style.id = 'zoomStyles';
  style.textContent = `
    .image-zoom-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      backdrop-filter: blur(5px);
    }
    
    .zoom-container {
      width: 95%;
      height: 95%;
      display: flex;
      flex-direction: column;
      background: #1a1a1a;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .zoom-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      background: #2a2a2a;
      border-bottom: 1px solid #444;
    }
    
    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .zoom-btn-control {
      background: #4a4a4a;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      min-width: 40px;
      transition: background 0.2s;
    }
    
    .zoom-btn-control:hover {
      background: #5a5a5a;
    }
    
    .zoom-level {
      color: white;
      font-weight: bold;
      min-width: 50px;
      text-align: center;
    }
    
    .zoom-close-btn {
      background: #ff4444;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 20px;
      font-weight: bold;
    }
    
    .zoom-close-btn:hover {
      background: #ff6666;
    }
    
    .zoom-image-container {
      flex: 1;
      overflow: hidden;
      position: relative;
      cursor: grab;
      background: #1a1a1a;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .zoom-image-container:active {
      cursor: grabbing;
    }
    
    .zoom-image {
      max-width: 100%;
      max-height: 100%;
      transition: transform 0.1s ease-out;
      user-select: none;
      -webkit-user-drag: none;
      object-fit: contain;
    }
    
    /* Zoom button styles */
    .zoom-btn {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 10;
      backdrop-filter: blur(4px);
    }
    
    .zoom-btn:hover {
      background: rgba(0, 0, 0, 0.9);
      transform: scale(1.1);
    }
    
    .zoom-instructions {
      padding: 10px 20px;
      background: #2a2a2a;
      color: #ccc;
      text-align: center;
      font-size: 14px;
      border-top: 1px solid #444;
    }
    
    @media (max-width: 768px) {
      .zoom-container {
        width: 100%;
        height: 100%;
        border-radius: 0;
      }
      
      .zoom-controls {
        gap: 5px;
      }
      
      .zoom-btn-control {
        padding: 6px 10px;
        font-size: 14px;
        min-width: 35px;
      }
      
      .zoom-instructions {
        font-size: 12px;
        padding: 8px 15px;
      }
    }
  `;
  
  document.head.appendChild(style);
}

// Setup event listeners for zoom functionality
function setupZoomEventListeners(overlay) {
  const closeBtn = overlay.querySelector(".zoom-close-btn");
  closeBtn.onclick = closeImageZoom;
  
  // Close on overlay click
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeImageZoom();
    }
  };
  
  // Close on ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.style.display === "flex") {
      closeImageZoom();
    }
  });
}

// Initialize zoom controls for an image
function initializeZoomControls(container, img) {
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  
  document.getElementById('zoomIn').onclick = () => {
    scale = Math.min(scale * 1.2, 5); // Max 5x zoom
    updateImageTransform();
    updateZoomInfo(scale);
  };
  
  document.getElementById('zoomOut').onclick = () => {
    scale = Math.max(scale / 1.2, 0.1); // Min 0.1x zoom
    updateImageTransform();
    updateZoomInfo(scale);
  };
  
  document.getElementById('resetZoom').onclick = () => {
    fitImageToContainer(container, img);
  };
  
  // Mouse wheel zoom
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 0.1), 5);
    
    // Zoom towards mouse position
    const scaleDiff = newScale - scale;
    translateX -= (mouseX - translateX) * scaleDiff / scale;
    translateY -= (mouseY - translateY) * scaleDiff / scale;
    
    scale = newScale;
    updateImageTransform();
    updateZoomInfo(scale);
  });
  
  // Mouse drag to pan
  container.addEventListener('mousedown', startDrag);
  container.addEventListener('mousemove', drag);
  container.addEventListener('mouseup', endDrag);
  container.addEventListener('mouseleave', endDrag);
  
  // Touch events for mobile
  container.addEventListener('touchstart', handleTouchStart, { passive: false });
  container.addEventListener('touchmove', handleTouchMove, { passive: false });
  container.addEventListener('touchend', handleTouchEnd);
  
  let lastTouchDistance = 0;
  
  function startDrag(e) {
    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    container.style.cursor = 'grabbing';
  }
  
  function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateImageTransform();
  }
  
  function endDrag() {
    isDragging = false;
    container.style.cursor = 'grab';
  }
  
  function handleTouchStart(e) {
    if (e.touches.length === 2) {
      lastTouchDistance = getTouchDistance(e.touches);
    } else if (e.touches.length === 1) {
      startDrag({
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY
      });
    }
  }
  
  function handleTouchMove(e) {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      // Pinch to zoom
      const currentDistance = getTouchDistance(e.touches);
      if (lastTouchDistance > 0) {
        const scaleChange = currentDistance / lastTouchDistance;
        scale = Math.min(Math.max(scale * scaleChange, 0.1), 5);
        updateImageTransform();
        updateZoomInfo(scale);
      }
      lastTouchDistance = currentDistance;
    } else if (e.touches.length === 1 && isDragging) {
      // Single finger drag
      drag({
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
        preventDefault: () => {}
      });
    }
  }
  
  function handleTouchEnd() {
    endDrag();
    lastTouchDistance = 0;
  }
  
  function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  function updateImageTransform() {
    img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  }
  
  // Store functions for reset
  container._resetZoom = () => {
    fitImageToContainer(container, img);
  };
  
  container._updateScale = (newScale) => {
    scale = newScale;
  };
}

// Fit image to original size
function fitImageToContainer(container, img) {
  const containerRect = container.getBoundingClientRect();
  const imgRect = img.getBoundingClientRect();
  
  // Calculate scale to fit image in container
  const scaleX = img.naturalWidth;
  const scaleY = img.naturalHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size
  
  // Reset position and apply scale
  img.style.transform = `translate(0px, 0px) scale(${scale})`;
  
  // Update internal scale tracking
  if (container._updateScale) {
    container._updateScale(scale);
  }
  
  updateZoomInfo(scale);
}

// Reset image zoom to fit container
function resetImageZoom(container, img) {
  fitImageToContainer(container, img);
}

// Update zoom percentage display
function updateZoomInfo(scale) {
  const zoomLevel = document.querySelector('.zoom-level');
  if (zoomLevel) {
    zoomLevel.textContent = Math.round(scale * 100) + '%';
  }
}

// Close image zoom
function closeImageZoom() {
  const zoomOverlay = document.getElementById("imageZoomOverlay");
  if (zoomOverlay) {
    zoomOverlay.style.display = "none";
    document.body.style.overflow = "";
  }
}

// Add event listeners to event cards
function addEventListenersToCards() {
  const eventCards = document.querySelectorAll(".event-card");

  eventCards.forEach(card => {
    card.addEventListener("click", () => {
      // Remove active class from all cards
      document.querySelectorAll(".event-card").forEach(c => c.classList.remove("active"));
      
      // Add active class to clicked card
      card.classList.add("active");
      
      // Find the event data and update preview
      const eventId = card.dataset.eventId;
      const event = allEvents.find(e => (e.id || generateEventId(e.title)) === eventId);
      
      if (event) {
        updatePreviewPanel(event);
        console.log(event);
        
      }
    });
  });
}

// Fetch events from Firebase
function fetchEvents() {
  Promise.all([getDocs(query(colRef, orderBy("start", "asc")))])
    .then(([eventsSnapshot]) => {
      allEvents = [];

      const userTimezone = moment.tz.guess();

      eventsSnapshot.docs.forEach(doc => {
        const startRaw = doc.data().start;
        const endRaw = doc.data().end;
        const startTime = doc.data().startTime;

        let startMomentLA, endMomentLA;

        if (startTime) {
          startMomentLA = moment.tz(`${startRaw} ${startTime}`, "YYYY-MM-DD HH:mm", "America/Los_Angeles");
          const endTime = doc.data().endTime;
          if (endTime) {
            endMomentLA = moment.tz(`${endRaw} ${endTime}`, "YYYY-MM-DD HH:mm", "America/Los_Angeles");
          } else {
            endMomentLA = startMomentLA.clone().add(1, 'hour');
          }
        } else {
          // No time specified - all day event
          startMomentLA = moment.tz(startRaw, "America/Los_Angeles").startOf('day');
          endMomentLA = moment.tz(endRaw, "YYYY-MM-DD", "America/Los_Angeles").endOf('day');
        }
        const startLocalTime = startMomentLA.clone().tz(userTimezone);
        const endLocalTime = endMomentLA.clone().tz(userTimezone);

        const eventId = doc.id || generateEventId(doc.data().title);

        allEvents.push({
          id: eventId,
          title: doc.data().title,
          start: startLocalTime.toDate(),
          end: endLocalTime.toDate(),
          allDay: startTime,
          color: doc.data().color,
          description: doc.data().description,
          images: doc.data().images,
          blogUrl: doc.data().blogUrl,
          image: doc.data().image,
          credits: doc.data().credits,
          category: doc.data().category || "Default Category",
        });
      });

      processEvents();
    })
    .catch(error => {
      console.error("Error getting documents: ", error);
      const errorMessage = '<div class="no-events">Error loading events. Please try again later.</div>';
      document.getElementById("all-events-content").innerHTML = errorMessage;
      document.getElementById("in-progress-content").innerHTML = errorMessage;
      document.getElementById("upcoming-content").innerHTML = errorMessage;
    });
}

// Process events after fetching
function processEvents() {
  filterEvents();

  // Display first event in preview panel if available
  if (allEvents.length > 0) {
    updatePreviewPanel(allEvents[0]);

    // Set first card as active
    setTimeout(() => {
      const firstCard = document.querySelector(".event-card");
      if (firstCard) {
        firstCard.classList.add("active");
        const previewPanel = document.querySelector(".preview-panel");
        previewPanel.innerHTML = '<div class="loading">Select an event to view details</div>';
      }
    }, 0);
  }
}

// Show quick overview of events
function showQuickOverview(eventsData) {
  const eventModal = document.querySelector(".event-cards-overview");
  eventModal.innerHTML = "";

  const today = new Date();
  const ongoingEvents = [];
  const incomingEvents = [];

  // Separate events into ongoing and incoming
  eventsData.forEach(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    if (today >= eventStart && today <= eventEnd) {
      ongoingEvents.push(event);
    } else if (today < eventStart && today < eventEnd) {
      incomingEvents.push(event);
    }
  });

  // Display events in overview
  displayEventsOverview(ongoingEvents, eventModal);
  displayEventsOverview(incomingEvents, eventModal);
}

// Helper function to display events in the overview
function displayEventsOverview(eventsToDisplay, container) {
  if (eventsToDisplay.length === 0) return;
  
  eventsToDisplay.forEach(event => {
    // Create event card
    const eventModalCard = document.createElement("div");
    eventModalCard.classList.add("event-card-overview");
    eventModalCard.style.borderBottom = `4px solid ${event.color}`;
    eventModalCard.dataset.eventId = event.id;

    // Image holder
    const eventImageHolder = document.createElement("div");
    eventImageHolder.classList.add("event-image-overview");

    const eventImage = document.createElement("img");
    eventImage.classList.add("event-modal-card-img-overview");
    eventImage.src = event.image;
    eventImage.alt = event.title;
    eventImageHolder.appendChild(eventImage);
    eventModalCard.appendChild(eventImageHolder);

    // Event badge
    const eventBadge = document.createElement("div");
    eventBadge.classList.add("event-badge-overview");
    let badgeText = formatBadgeText(event.category);
    eventBadge.textContent = badgeText;
    eventModalCard.appendChild(eventBadge);

    // Event content container
    const eventContent = document.createElement("div");
    eventContent.classList.add("event-content-overview");

    // Title
    const eventTitle = document.createElement("h3");
    eventTitle.classList.add("event-title-overview");
    eventTitle.textContent = event.title.replace(/^[\p{Emoji}\p{Extended_Pictographic}]+\s*/u, "");
    eventContent.appendChild(eventTitle);

    // Date
    const eventDate = document.createElement("p");
    eventDate.classList.add("event-date-overview");
    
    // Format dates
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const startFormatted = startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    });
    const endFormatted = endDate.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    });

    eventDate.textContent = `${startFormatted} - ${endFormatted}`;
    eventContent.appendChild(eventDate);

    // Countdown
    const eventDates = document.createElement("p");
    eventDates.classList.add("event-countdown-overview");
    const uniqueId = `countdown-${event.title.replace(/ /g, "_")}`;
    eventDates.id = uniqueId;

    const timeUntilStart = event.start ? timeUntil(event.start) : 0;
    const startLabel = timeUntilStart <= 0 ? "Starts: Ongoing" : "Starts in: ";
    const endLabel = timeUntilStart <= 0 ? "Ends in: " : "Ends in: ";

    setTimeout(() => {
      updateCountdown(uniqueId, event.start, startLabel);
      if (timeUntilStart <= 0) {
        updateCountdown(uniqueId, event.end, endLabel);
      }
    }, 0);

    eventModalCard.addEventListener("click", function () {
      openEventModal({
        title: event.title,
        start: new Date(event.start),
        end: new Date(event.end),
        extendedProps: {
          credits: event.credits,
          description: event.description,
          blogUrl: event.blogUrl,
          images: event.images
        }
      });
    });

    eventContent.appendChild(eventDates);
    eventModalCard.appendChild(eventContent);
    container.appendChild(eventModalCard);
  });
}

// Format badge text based on category
function formatBadgeText(category) {
  let badgeText = category || "EVENT";
  if (badgeText.toUpperCase().includes("DAY")) {
    return "DAYS OF";
  } else if (badgeText.toUpperCase().includes("SEASONS")) {
    return "SEASON";
  } else if (badgeText.toUpperCase().includes("TRAVELLING-SPIRITS")) {
    return "TS";
  }
  else if (badgeText.toUpperCase().includes("SPECIAL-EVENT")) {
    return "SPECIAL";
  }
  return badgeText.toUpperCase();
}

// Calculate time until a target time
function timeUntil(targetTime) {
  const now = new Date();
  return targetTime - now;
}

// Update countdown timer
function updateCountdown(elementId, targetDate, label) {
  if (!targetDate) return;

  const countdownElement = document.getElementById(elementId);
  let intervalId = setInterval(function () {
    const distance = targetDate.getTime() - new Date().getTime();

    if (distance <= 0) {
      clearInterval(intervalId);
      countdownElement.textContent = `${label}Ongoing`;
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    let countdown = "";
    if (days > 0) countdown += `${days}d `;
    if (hours > 0) countdown += `${hours}h `;
    if (minutes > 0) countdown += `${minutes}m `;
    countdown += `${seconds}s`;

    countdownElement.textContent = `${label}${countdown}`;
  }, 1000);
}

function openEventModal(event) {
  const modal = document.getElementById("eventModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalDateStart = document.getElementById("modalStart");
  const modalDescription = document.getElementById("modalDescription");
  const modalCta = document.getElementById("modalCta");
  const modalGoogleCalendar = document.getElementById("modalGoogleCalendar");
  const carouselImagesContainer = document.querySelector(".carousel-images");
  const creditList = document.querySelector(".credits-list");

  let formattedStart, formattedEnd;

  formattedStart = formatDate_withTZ(event.start);
  formattedEnd = formatDate_withTZ(event.end);

  // Clear previous carousel images
  carouselImagesContainer.innerHTML = "";

  // Populate credits
  creditList.textContent = event.extendedProps.credits
    ? "Credits: " + event.extendedProps.credits
    : "Credits: We're working on gathering information for you. Check back soon!";

  // Clean title from emojis
  const title = event.title.replace(/^[\p{Emoji}\p{Extended_Pictographic}]+\s*/u, "");

  // Populate modal data
  modalTitle.textContent = title;
  modalDateStart.textContent = formattedStart + " - " + formattedEnd;

  modalDescription.innerHTML = event.extendedProps.description || 
    "The story behind this event is still unfolding...";

  const calendarLink = generateGoogleCalendarLink(event);
  modalGoogleCalendar.href = calendarLink;
  modalGoogleCalendar.target = "_blank";
  modalGoogleCalendar.rel = "noopener noreferrer";
  modalGoogleCalendar.textContent = "Add to Google Calendar";
  modalGoogleCalendar.classList.add("calendar-link-btn");

  // Set CTA link if available
  if (event.extendedProps.blogUrl) {
    modalCta.target = "_blank";
    modalCta.textContent = "Read More";
    modalCta.href = event.extendedProps.blogUrl;
    modalCta.style.display = "inline-block";
  } else {
    modalCta.style.display = "none";
  }

  // Add images to carousel
  populateModalCarousel(event);

  // Show the modal
  modal.style.display = "block";
}

// Populate the modal carousel with images
function populateModalCarousel(event) {
  const carouselImagesContainer = document.querySelector(".carousel-images");
  
  if (event.extendedProps.images) {
    // Create an array of image URLs
    const imageUrls = event.extendedProps.images.includes(",")
      ? event.extendedProps.images.split(/,|\|/).map(url => url.trim())
      : [event.extendedProps.images];

    imageUrls.forEach((imageUrl, index) => {
      const imgContainer = document.createElement("div");
      imgContainer.className = "image-container";
      
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = `${event.title} image ${index + 1}`;
      img.className = index === 0 ? "active" : "";
      
      // Add zoom button
      const zoomBtn = document.createElement("button");
      zoomBtn.className = "zoom-btn";
      zoomBtn.innerHTML = "⛶";
      zoomBtn.title = "Enlarge image";
      zoomBtn.onclick = () => openImageZoom(imageUrl, img.alt);

      imgContainer.appendChild(img);
      imgContainer.appendChild(zoomBtn);
      carouselImagesContainer.appendChild(imgContainer);
    });

    // Show/hide carousel controls
    const carouselBtns = document.querySelectorAll(".carousel-btn");
    carouselBtns.forEach(btn => {
      btn.style.display = imageUrls.length > 1 ? "block" : "none";
    });
  } else {
    // Add placeholder image
    const imgContainer = document.createElement("div");
    imgContainer.className = "image-container";
    
    const img = document.createElement("img");
    img.src = "https://ik.imagekit.io/e3wiv79bq/Sky:%20Cotl/not%20available?updatedAt=1744181831782";
    img.alt = "Event placeholder image";
    img.className = "active";
    
    const zoomBtn = document.createElement("button");
    zoomBtn.className = "zoom-btn";
    zoomBtn.innerHTML = "⛶";
    zoomBtn.title = "Enlarge image";
    zoomBtn.onclick = () => openImageZoom(imageUrl, img.alt);

    imgContainer.appendChild(img);
    imgContainer.appendChild(zoomBtn);
    carouselImagesContainer.appendChild(imgContainer);

    // Hide carousel controls
    document.querySelectorAll(".carousel-btn").forEach(btn => {
      btn.style.display = "none";
    });
  }
}

// Format date with timezone
function formatDate_withTZ(date, format) {
  const options = {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  const formattedDate = new Intl.DateTimeFormat("en-US", options).format(date);
  const timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return `${formattedDate}`;
}

// Navigate carousel in the modal
function navigateCarousel(direction) {
  const images = document.querySelectorAll(".carousel-images img");
  if (images.length <= 1) return;

  let activeIndex = -1;
  images.forEach((img, index) => {
    if (img.classList.contains("active")) {
      activeIndex = index;
      img.classList.remove("active");
    }
  });

  if (activeIndex === -1) return;

  // Calculate new index with wraparound
  let newIndex = (activeIndex + direction + images.length) % images.length;
  images[newIndex].classList.add("active");
}

function displayEventNotices(eventsData) {
  const noticeContainer = document.querySelector(".info-container");
  noticeContainer.innerHTML = "";

  const noticesSection = document.createElement("div");
  noticesSection.innerHTML = "<h2>Heads Up!</h2>";
  noticeContainer.appendChild(noticesSection);

  const today = new Date();
  const upcomingEvents = [];
  const endingEvents = [];
  const MAX_DAYS_AHEAD = 4;
  const MAX_EVENTS_TO_SHOW = 2;

  // Find events starting or ending soon
  eventsData.forEach((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    const daysUntilStart = Math.ceil((eventStart - today) / (1000 * 60 * 60 * 24));
    const daysUntilEnd = Math.ceil((eventEnd - today) / (1000 * 60 * 60 * 24));

    if (daysUntilStart > 0 && daysUntilStart <= MAX_DAYS_AHEAD) {
      event.daysUntil = daysUntilStart;
      upcomingEvents.push(event);
    }

    if (today >= eventStart && daysUntilEnd > 0 && daysUntilEnd <= MAX_DAYS_AHEAD) {
      event.daysUntil = daysUntilEnd;
      endingEvents.push(event);
    }
  });

  // Sort events by how soon they're starting/ending
  upcomingEvents.sort((a, b) => a.daysUntil - b.daysUntil);
  endingEvents.sort((a, b) => a.daysUntil - b.daysUntil);

  // Create notices for upcoming events
  if (upcomingEvents.length > 0) {
    upcomingEvents.slice(0, MAX_EVENTS_TO_SHOW).forEach((event) => {
      const noticeElement = createNoticeElement(
        event,
        "upcoming",
        "https://img.icons8.com/?size=100&id=FhnRPWu7HD5f&format=png&color=000000",
        "Coming Soon:",
        `begins in ${event.daysUntil} day${event.daysUntil > 1 ? "s" : ""}!`
      );
      noticeContainer.appendChild(noticeElement);
    });
  } else if (upcomingEvents.length === 0 && endingEvents.length === 0) {
    const noticeElement = createEmptyNoticeElement(
      "upcoming",
      "https://img.icons8.com/?size=100&id=3ovMFy5JDSWq&format=png&color=000000",
      "Relax! No events are starting or ending within the next 4 days."
    );
    noticeContainer.appendChild(noticeElement);
  }

  // Create notices for ending events
  if (endingEvents.length > 0) {
    endingEvents.slice(0, MAX_EVENTS_TO_SHOW).forEach((event) => {
      const noticeElement = createNoticeElement(
        event,
        "ending",
        "https://img.icons8.com/?size=100&id=Sd2tYsgMJNyn&format=png&color=000000",
        "Last Chance:",
        `ends in ${event.daysUntil} day${event.daysUntil > 1 ? "s" : ""}!`
      );
      noticeContainer.appendChild(noticeElement);
    });
  }

  // Hide container if no notices were created
  if (upcomingEvents.length === 0 && endingEvents.length === 0) {
    const headsUpSection = document.querySelector(".heads-up");
    if (headsUpSection) {
      headsUpSection.style.display = "none";
    }
  }
}

// Create a notice element for an event
function createNoticeElement(event, className, iconSrc, labelText, timeText) {
  const noticeDiv = document.createElement("div");
  noticeDiv.className = `event-notice ${className}`;

  noticeDiv.innerHTML = `
      <div class="notice-icon">
        <img src="${iconSrc}" alt="${className} event icon">
      </div>
      <div class="notice-text">
        <p><strong>${labelText}</strong> <u>${event.title}</u> ${timeText}</p>
      </div>
    `;

  return noticeDiv;
}

// Create an empty notice element when no events are found
function createEmptyNoticeElement(className, iconSrc, labelText) {
  const noticeDiv = document.createElement("div");
  noticeDiv.className = `event-notice ${className}`;

  noticeDiv.innerHTML = `
      <div class="notice-icon">
        <img src="${iconSrc}" alt="${className} event icon">
      </div>
      <div class="notice-text">
        <p>${labelText}</p>
      </div>
    `;
  return noticeDiv;
}

// Fetch events and shard events, then combine and initialize the calendar
Promise.all([getDocs(query(colRef, orderBy("start", "asc")))])
  .then(([eventsSnapshot]) => {
    const events = [];

    const moment = require("moment");
    require("moment-timezone");

    // Get the user's timezone once
    const userTimezone = moment.tz.guess();

    eventsSnapshot.docs.forEach((doc) => {
      const startRaw = doc.data().start;
      const endRaw = doc.data().end;
      const startTime = doc.data().startTime;

      let startMomentLA, endMomentLA;

      if (startTime) {
        startMomentLA = moment.tz(`${startRaw} ${startTime}`, "YYYY-MM-DD HH:mm", "America/Los_Angeles");
        const endTime = doc.data().endTime;
        if (endTime) {
          endMomentLA = moment.tz(`${endRaw} ${endTime}`, "YYYY-MM-DD HH:mm", "America/Los_Angeles");
        } else {
          endMomentLA = startMomentLA.clone().add(1, 'hour');
        }
      } else {
        // No time specified - all day event (your current logic)
        startMomentLA = moment.tz(startRaw, "America/Los_Angeles").startOf('day');
        endMomentLA = moment.tz(endRaw, "YYYY-MM-DD", "America/Los_Angeles").endOf('day');
      }
      const startLocalTime = startMomentLA.clone().tz(userTimezone);
      const endLocalTime = endMomentLA.clone().tz(userTimezone);

      const eventId = doc.id || generateEventId(doc.data().title);

      events.push({
        id: eventId,
        title: doc.data().title,
        start: startLocalTime.toDate(),
        end: endLocalTime.toDate(),
        allDay: startTime,
        color: doc.data().color,
        description: doc.data().description,
        images: doc.data().images,
        blogUrl: doc.data().blogUrl,
        image: doc.data().image,
        credits: doc.data().credits,
        category: doc.data().category || "Default Category",
      });
    });

    // Initialize FullCalendar with the processed events
    initializeCalendar(events);
    displayEventNotices(events);
    showQuickOverview(events);
  })
  .catch((error) => {
    console.error("Error getting documents: ", error);
  });


  document.addEventListener("DOMContentLoaded", function () {
    // Show overlay on page load
    setTimeout(function () {
      document.querySelector(".overlay").style.opacity = 0;
      setTimeout(function () {
        document.querySelector(".overlay").style.display = "none";
      }, 2500);
    }, 2500);
  
    var modal = document.getElementById("game-modal");
    var btn = document.getElementById("open-game-modal");
    var span = document.getElementsByClassName("close")[0];
    btn.onclick = function () {
      modal.style.display = "block";
    };

    span.onclick = function () {
      modal.style.display = "none";
    };
  
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    };
  
    // ============================================
    const tabs = document.querySelectorAll(".tab");
    const tabPanes = document.querySelectorAll(".tab-pane");
  
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        // Remove active class from all tabs
        tabs.forEach((t) => t.classList.remove("active"));
  
        // Add active class to clicked tab
        tab.classList.add("active");
  
        // Hide all tab panes
        tabPanes.forEach((pane) => (pane.style.display = "none"));
  
        // Show the corresponding tab pane
        const tabId = tab.dataset.tab;
        document.getElementById(tabId).style.display = "block";
  
        // If we switch tabs, make sure the content is up to date
        if (allEvents.length > 0) {
          filterEvents();
        }
      });
    });

    document.getElementById("prev-month").addEventListener("click", () => {
      if (currentMonthYearIndex > 0) {
        currentMonthYearIndex--;
        updateMonthPagination();
        displayCurrentMonthEvents();
      }
    });
    document.getElementById("next-month").addEventListener("click", () => {
      if (currentMonthYearIndex < monthYearKeys.length - 1) {
        currentMonthYearIndex++;
        updateMonthPagination();
        displayCurrentMonthEvents();
      }
    });
  
    // Initialize the events
    fetchEvents();
    tabPanes.forEach((pane) => {
      if (pane.id === document.querySelector(".tab.active").dataset.tab) {
        pane.style.display = "block";
      } else {
        pane.style.display = "none";
      }
    });

    const modalHTML = `<div id="eventModal" class="modal">
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <!-- Image Carousel -->
      <div class="carousel">
        <div class="carousel-images"></div>
        <button class="carousel-btn prev">❮</button>
        <button class="carousel-btn next">❯</button>
      </div>

      <div class="credits-section">
        <span class="credits-list">Credits: </span>
      </div>

      <h2 id="modalTitle"></h2>
      <div id="modalDates">
        <p id="modalStart"></p>
        <p id="modalEnd"></p>
      </div>
      <div id="modalDescription"></div>
      <div class="modal-cta-container">
        <a id="modalGoogleCalendar" class="cta-btn calendar-link-btn" title="Add to Google Calendar">
          Add to Google Calendar
        </a>
        <a id="modalCta" class="cta-btn" title="Sky Blog">
          Sky Blog
        </a>
      </div>
    </div>
    </div>`;
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    document.querySelector(".carousel-btn.prev").addEventListener("click", function () {
        navigateCarousel(-1);
    });
    document.querySelector(".carousel-btn.next").addEventListener("click", function () {
        navigateCarousel(1);
    });

    document.querySelector(".close-modal").addEventListener("click", function (event) {
        document.getElementById("eventModal").style.display = "none";
    });

    window.addEventListener("click", function (event) {
      const modal = document.getElementById("eventModal");
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });

    const modalCSS = `
      <style>
      .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.7);
        overflow-y: scroll;
        color: var(--dark-text);
      }

      .modal-content {
        background-color: white;
        margin: auto;
        padding: 20px;
        width: 80%;
        max-width: 600px;
        border-radius: 8px;
        position: relative;
        margin-top: 5%;
      }

      #modalDates {
        margin-bottom: 10px;
      }

      #modalDates p{
        font-size: 14px;
      }

      .close-modal {
        position: absolute;
        top: 10px;
        right: 15px;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
        z-index: 1000;
      }

      .credits-section {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
      }

      .camera-icon {
        width: 20px;
        height: 20px;
      }

      .credits-list{
        font-size: 12px;
      }

      .carousel {
        position: relative;
        width: 100%;
        margin-bottom: 20px;
      }

      .carousel-images {
        display: flex;
        overflow: hidden;
        width: 100%;
        height: auto;
        border-radius: 4px;
      }

      .carousel-images img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: none;
      }

      .carousel-images img.active {
        display: block;
      }

      .carousel-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0,0,0,0.5);
        color: white;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 18px;
        cursor: pointer;
      }

      .carousel-btn.prev {
        left: 10px;
      }

      .carousel-btn.next {
        right: 10px;
      }

      #modalTitle {
        margin-top: 15px;
        margin-bottom: 10px;
        font-size: 24px;
      }

      #modalDescription {
        margin-bottom: 20px;
        text-align: justify;
        font-size: 16px;
        line-height: 1.5;
      }

      .cta-btn {
        display: inline-block;
        padding: 10px 20px;
        background-color: var(--secondary-color);
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
        z-index: 1000;
        cursor: pointer;
        width: 100%;
        text-align: center;
      }

      .cta-btn:hover {
        background: #3367d6;
      }

      .modal-cta-container {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
        width: 100%;
      }

      .modal-cta-container .cta-btn {
        flex: 1;
        width: auto;
        text-align: center;
      }

      .calendar-link-btn {
        background: #4285F4;
      }

      .calendar-link-btn:hover {
        background: #3367d6;
      }

      </style>
    `;

    document.head.insertAdjacentHTML("beforeend", modalCSS);
});
