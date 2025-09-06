// Import Firebase SDK components
import { initializeApp } from "firebase/app";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch,
  serverTimestamp,
  increment,
  getDocs,
  getDoc,
  getFirestore,
  setDoc
} from "firebase/firestore";

// Day.js imports
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const userTimezone = dayjs.tz.guess();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase services
initializeApp(firebaseConfig);
const db = getFirestore();
const colRef = collection(db, "events");

// Global variables
let allEvents = [];
let eventsByMonthYear = {};
let currentMonthYearIndex = 0;
let monthYearKeys = [];

// Optimized Firebase Implementation with Caching and Efficient Reads

// 1. IMPLEMENT CLIENT-SIDE CACHING
class FirebaseCacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }

  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + ttl);
  }

  get(key) {
    if (this.cache.has(key)) {
      const expiry = this.cacheExpiry.get(key);
      if (Date.now() < expiry) {
        return this.cache.get(key);
      } else {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
    return null;
  }

  clear() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

// EVENT FETCHING WITH PAGINATION
class OptimizedEventManager {
  constructor() {
    this.cacheManager = new FirebaseCacheManager();
    this.fetchInterval = 5 * 60 * 1000; // 5 minutes
    this.isOnline = navigator.onLine;
    this.setupNetworkListeners();
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      // Refresh data when coming back online
      this.fetchEventsIfNeeded(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Page visibility API to pause fetching when tab is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.fetchEventsIfNeeded();
      }
    });
  }

  async fetchEventsIfNeeded(forceRefresh = false) {
    const now = Date.now();
    
    const cacheKey = 'events_data';
    const cachedData = this.cacheManager.get(cacheKey);

    if (!forceRefresh && cachedData) {
      console.log('Using cached events data');
      return cachedData;
    }

    if (!forceRefresh && cachedData && this.isOnline) {
      console.log('Using memory cached events');
      this.eventCache = cachedData;
      return cachedData;
    }

    if (!this.isOnline) {
      const cachedData = this.cacheManager.get('events_data');
      if (cachedData) {
        console.log('Offline: using cached data');
        return cachedData;
      }
    }

    try {
      console.log('Fetching fresh events data from Firebase');
      const events = await this.fetchEventsFromFirebase();
      
      this.cacheManager.set(cacheKey, events, this.fetchInterval);
      
      return events;
    } catch (error) {
      console.error('Error fetching events:', error);
      
      if (this.eventCache) {
        console.log('Error occurred: using cached events');
        return this.eventCache;
      }
      
      throw error;
    }
  }

  async fetchEventsFromFirebase() {
    // Use query optimization - only fetch events from last 30 days to future
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 60);
    
    const eventsQuery = query(
      colRef,
      where("start", ">=", thirtyDaysAgo.toISOString().split('T')[0]), // Only recent/future events
      orderBy("start", "desc"),
      limit(50) // Limit initial load
    );

    const snapshot = await getDocs(eventsQuery);
    const events = [];

    snapshot.docs.forEach((doc) => {
      const eventData = this.processEventData(doc);
      if (eventData) {
        events.push(eventData);
      }
    });

    return events;
  }

  processEventData(doc) {
    const startRaw = (doc.data().start || "").trim();
    const endRaw = (doc.data().end || "").trim();
    const startTime = doc.data().startTime;

    let startLA, endLA, startLocal, endLocal;

    try {
      if (startTime) {
        // Timed event
        startLA = dayjs.tz(
          `${startRaw} ${startTime}`,
          "YYYY-MM-DD HH:mm",
          "America/Los_Angeles"
        );

        const endTime = doc.data().endTime;
        if (endTime) {
          endLA = dayjs.tz(
            `${endRaw} ${endTime}`,
            "YYYY-MM-DD HH:mm",
            "America/Los_Angeles"
          );
        } else {
          endLA = startLA.add(1, "hour");
        }

        startLocal = startLA.tz(userTimezone);
        endLocal = endLA.tz(userTimezone);
      } else {
        startLA = dayjs.tz(startRaw, "America/Los_Angeles").startOf("day");
        endLA = dayjs.tz(endRaw, "America/Los_Angeles").endOf("day");

        const startInUserTZ = startLA.tz(userTimezone);
        const endInUserTZ = endLA.tz(userTimezone);

        startLocal = startInUserTZ.startOf("day");
        endLocal = endInUserTZ.startOf("day");
      }

      // Validate dates
      if (!startLocal.isValid() || !endLocal.isValid()) {
        console.warn("Skipping invalid event:", {
          id: doc.id,
          startRaw,
          endRaw,
          startTime,
        });
        return null;
      }

      const eventId = doc.id || this.generateEventId(doc.data().title);

      return {
        id: eventId,
        title: doc.data().title,
        start: startLA.toDate(),
        end: endLA.toDate(),
        allDay: false,
        color: doc.data().color,
        description: doc.data().description,
        images: doc.data().images,
        blogUrl: doc.data().blogUrl,
        image: doc.data().image,
        credits: doc.data().credits,
        category: doc.data().category || "special",
        emote: doc.data().emote,
        memoryType: doc.data().memoryType,
        location: doc.data().location,
        realm: doc.data().realm,
        note: doc.data().note,
        spiritCount: doc.data().spiritCount
      };
    } catch (error) {
      console.warn("Error processing event:", doc.id, error);
      return null;
    }
  }

  generateEventId(title) {
    return title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  }
}

// NOTE WIDGET WITH REDUCED LISTENERS
// ___________________________ OPTIMIZED STICKER NOTES ___________________________
class OptimizedNoteWidget {
  constructor(firestoreDb) {
    this.db = firestoreDb;
    this.isExpanded = false;
    this.isVisible = false;
    this.elements = {};
    this.pollInterval = null;
    this.cacheManager = new FirebaseCacheManager();
    this.checkInterval = 2 * 60 * 1000; // Poll every 2 minutes
    this.init();
  }

  init() {
    this.elements = {
      sticker: document.getElementById("noteSticker"),
      content: document.getElementById("noteContent"),
      message: document.getElementById("noteMessage"),
      typeIcon: document.getElementById("noteTypeIcon"),
      typeText: document.getElementById("noteTypeText"),
      timestamp: document.getElementById("noteTimestamp"),
    };

    this.setupEventListeners();
    this.startListening();
  }

  setupEventListeners() {
    document.addEventListener("click", (e) => {
      if (this.isExpanded && this.elements.sticker && !this.elements.sticker.contains(e.target)) {
        this.collapse();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isExpanded) {
        this.collapse();
      }
    });

    const prevBtn = document.getElementById("prevNote");
    const nextBtn = document.getElementById("nextNote");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => this.showPrevNote());
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => this.showNextNote());
    }
  }

  showPrevNote() {
    if (!this.notes || this.notes.length === 0) return;
    this.currentNoteIndex = (this.currentNoteIndex - 1 + this.notes.length) % this.notes.length;
    this.displayNote(this.notes[this.currentNoteIndex]);
  }

  showNextNote() {
    if (!this.notes || this.notes.length === 0) return;
    this.currentNoteIndex = (this.currentNoteIndex + 1) % this.notes.length;
    this.displayNote(this.notes[this.currentNoteIndex]);
  }

  startListening() {
    const notesColRef = collection(this.db, "updateNotes");

    this.unsubscribe = onSnapshot(notesColRef, (snapshot) => {
      const notes = [];
      snapshot.forEach((doc) => {
        if (doc.exists()) {
          const data = doc.data();
          if (this.shouldShowNote(data)) {
            notes.push({ id: doc.id, ...data });
          }
        }
      });

      if (notes.length > 0) {
        this.handleMultipleNotes(notes);
      } else {
        this.hide();
      }
    }, (error) => {
      console.error("Error listening to notes:", error);
    });
  }

  handleMultipleNotes(notes) {
    this.notes = notes;        
    this.currentNoteIndex = 0;
    this.displayNote(this.notes[this.currentNoteIndex]);
  }



  async checkForNotes() {
    const cacheKey = "note_data";
    const cachedNote = this.cacheManager.get(cacheKey);
    if (cachedNote) {
      this.handleNoteData(cachedNote);
      return;
    }

    try {
      const noteDocRef = doc(this.db, "updateNotes", "note#1");
      const docSnapshot = await getDoc(noteDocRef);

      if (docSnapshot.exists()) {
        const noteData = docSnapshot.data();
        this.cacheManager.set(cacheKey, noteData, 60000); // cache for 1 min
        this.handleNoteData(noteData);
      } else {
        this.hide();
      }
    } catch (error) {
      console.error("Error fetching note:", error);
    }
  }

  handleNoteData(noteData) {
    if (this.shouldShowNote(noteData)) {
      this.displayNote(noteData);
    } else {
      this.hide();
    }
  }

  shouldShowNote(noteData) {
    if (!noteData.isActive) return false;

    if (noteData.expiresAt) {
      const now = new Date();
      const expiresAt = noteData.expiresAt.toDate
        ? noteData.expiresAt.toDate()
        : new Date(noteData.expiresAt);
      if (now > expiresAt) return false;
    }

    return true;
  }

  displayNote(noteData) {
    const typeInfo = this.getTypeInfo(noteData.type);

    if (this.elements.typeIcon) this.elements.typeIcon.textContent = typeInfo.icon;
    if (this.elements.typeText) this.elements.typeText.textContent = typeInfo.title;
    if (this.elements.message) this.elements.message.textContent = noteData.message || "";

    if (this.elements.timestamp) {
      this.elements.timestamp.textContent = this.formatTimestamp(noteData.createdAt);
    }

    this.updateTriggerStyle(typeInfo.color, noteData.priority);
    this.show();
  }

  show() {
    if (!this.elements.sticker) return;
    this.elements.sticker.style.display = "block";
    this.isVisible = true;

    requestAnimationFrame(() => {
      this.elements.sticker.style.opacity = "0";
      this.elements.sticker.style.transform = "translateY(20px) scale(0.8)";

      setTimeout(() => {
        this.elements.sticker.style.transition = "all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)";
        this.elements.sticker.style.opacity = "1";
        this.elements.sticker.style.transform = "translateY(0) scale(1)";
      }, 50);
    });
  }

  hide() {
    if (!this.isVisible || !this.elements.sticker) return;
    this.collapse();

    setTimeout(() => {
      this.elements.sticker.style.transition = "all 0.3s ease-out";
      this.elements.sticker.style.opacity = "0";
      this.elements.sticker.style.transform = "translateY(20px) scale(0.8)";

      setTimeout(() => {
        this.elements.sticker.style.display = "none";
        this.isVisible = false;
      }, 300);
    }, 100);
  }

  toggle() {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  expand() {
    if (!this.isVisible || !this.elements.content) return;
    this.isExpanded = true;
    this.elements.content.classList.add("show");
  }

  collapse() {
    this.isExpanded = false;
    if (this.elements.content) {
      this.elements.content.classList.remove("show");
    }
  }

  getTypeInfo(type) {
    const types = {
      update: { icon: "✨", title: "Update", color: "#ff6b6b" },
      correction: { icon: "📝", title: "Correction", color: "#f39c12" },
      delay: { icon: "⏰", title: "Notice", color: "#3498db" },
      personal: { icon: "💙", title: "Personal Note", color: "#9b59b6" },
      celebration: { icon: "🎉", title: "Celebration", color: "#2ecc71" },
      alert: { icon: "⚠️", title: "Alert", color: "#e74c3c" },
      info: { icon: "ℹ️", title: "Info", color: "#17a2b8" },
    };
    return types[type] || types.update;
  }

  updateTriggerStyle(color, priority = "normal") {
    if (!this.elements.sticker) return;
    const trigger = this.elements.sticker.querySelector(".note-trigger");
    if (!trigger) return;

    let finalColor = color;
    if (priority === "high") {
      finalColor = this.brightenColor(color, 20);
    } else if (priority === "low") {
      finalColor = this.darkenColor(color, 20);
    }

    trigger.style.background = `linear-gradient(135deg, ${finalColor} 0%, ${this.darkenColor(finalColor, 10)} 100%)`;
    trigger.style.boxShadow = `0 6px 20px ${finalColor}40, 0 2px 8px rgba(0, 0, 0, 0.1)`;

    if (priority === "high") {
      trigger.classList.add("pulse-high-priority");
    } else {
      trigger.classList.remove("pulse-high-priority");
    }
  }

  brightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      "#" +
      (0x1000000 +
        (R < 255 ? R : 255) * 0x10000 +
        (G < 255 ? G : 255) * 0x100 +
        (B < 255 ? B : 255))
        .toString(16)
        .slice(1)
    );
  }

  darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = ((num >> 8) & 0x00ff) - amt;
    const B = (num & 0x0000ff) - amt;
    return (
      "#" +
      (0x1000000 +
        (R < 1 ? 0 : R) * 0x10000 +
        (G < 1 ? 0 : G) * 0x100 +
        (B < 1 ? 0 : B))
        .toString(16)
        .slice(1)
    );
  }

  formatTimestamp(timestamp) {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

let noteWidget;
document.addEventListener("DOMContentLoaded", () => {
  if (typeof db !== "undefined") {
    noteWidget = new OptimizedNoteWidget(db);
  } else {
    console.error("Firebase db not found. Make sure Firebase is initialized first.");
  }
});

// Global helpers (same API as before)
window.toggleNote = function () {
  if (noteWidget) {
    noteWidget.toggle();
  }
};

window.updateNote = async function (type, message, priority) {
  if (!db) {
    console.error("Firebase not initialized");
    return;
  }

  try {
    const noteDocRef = doc(db, "updateNotes", "note#1");
    const updateData = {
      isActive: true,
      createdAt: serverTimestamp(),
      createdBy: "admin",
    };

    if (type !== undefined) updateData.type = type;
    if (message !== undefined) updateData.message = message;
    if (priority !== undefined) updateData.priority = priority;

    await updateDoc(noteDocRef, updateData);
    console.log("Note updated successfully");
  } catch (error) {
    console.error("Error updating note:", error);
  }
};

window.hideNote = async function () {
  if (!db) {
    console.error("Firebase not initialized");
    return;
  }

  try {
    const noteDocRef = doc(db, "updateNotes", "note#1");
    await updateDoc(noteDocRef, { isActive: false });
    console.log("Note hidden successfully");
  } catch (error) {
    console.error("Error hiding note:", error);
  }
};

// MAIN INITIALIZATION
const optimizedEventManager = new OptimizedEventManager();

// Replace your existing Promise.all fetch with this optimized version
async function initializeMain() {
  try {
    console.log('Initializing optimized app...');
    
    const events = await optimizedEventManager.fetchEventsIfNeeded();
    
    console.log(`Loaded ${events.length} events from cache/Firebase`);
    
    // Store globally
    allEvents = events;
    
    // Pass to manager
    window.skyEventsManager?.setEventsData(events);
    
    // Render calendar
    initializeCalendar(events);
    displayEventNotices(events);
    showQuickOverview(events);
    
  } catch (error) {
    console.error("Error initializing app: ", error);
    handleInitializationError();
  }
}

function handleInitializationError() {
  const eventsGrid = document.getElementById("eventsGrid");
  if (eventsGrid) {
    eventsGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
        <div class="empty-state-icon" style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
        <div class="empty-state-text" style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Failed to load events</div>
        <div class="empty-state-subtext" style="color: var(--color-text-muted);">Please check your connection and try again.</div>
        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
      </div>
    `;
  }
}

// PERIODIC REFRESH SETUP
function setupPeriodicRefresh() {
  // Refresh data every 10 minutes when page is visible
  setInterval(async () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      try {
        const events = await optimizedEventManager.fetchEventsIfNeeded();
        
        // Update displays if data changed
        if (window.skyEventsManager) {
          window.skyEventsManager.setEventsData(events);
        }
        
        // Update calendar if initialized
        if (typeof updateCalendarEvents === 'function') {
          updateCalendarEvents(events);
        }
        
        console.log('Data refreshed successfully');
      } catch (error) {
        console.error('Background refresh failed:', error);
      }
    }
  }, 10 * 60 * 1000); // 10 minutes
}

function cleanupPeriodicRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeMain();
  setupPeriodicRefresh();
  
  // Initialize optimized note widget
  if (typeof db !== 'undefined') {
    noteWidget = new OptimizedNoteWidget(db);
  }
});

// Export for use in other parts of your application
window.optimizedEventManager = optimizedEventManager;

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
              <img src="${iconPath}" class="event-icon" alt="event icon" loading="lazy"/>
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
  // console.log(eventsData);
}

// Add category filter to calendar
function addCategoryFilter(calendar, eventsData) {
  const categoryFilterDropdown = document.createElement("select");
  categoryFilterDropdown.id = "category-filter";
  categoryFilterDropdown.title = "category-filter";
  categoryFilterDropdown.innerHTML = `
        <option class='category-filter-option' value="">All Categories</option>
        <option class='category-filter-option' value="special-event">Special Events</option>
        <option class='category-filter-option' value="days-of-events">Days of Events</option>
        <option class='category-filter-option' value="travelling-spirits">Travelling Spirits</option>
        <option class='category-filter-option' value="seasons">Seasons</option>
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
        <img src="${iconSrc}" alt="${className} event icon" loading="lazy" >
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
        <img src="${iconSrc}" alt="${className} event icon" loading="lazy" >
      </div>
      <div class="notice-text">
        <p>${labelText}</p>
      </div>
    `;
  return noticeDiv;
}

// ___________________________QUICK OVERVIEW_____________________________________
function showQuickOverview(events) {
  const container = document.getElementById('event-cards-container');

  if (!container) {
    console.warn('Quick overview container not found');
    return;
  }

  // Clear loading state
  container.innerHTML = '';

  // Filter events for quick overview (upcoming and current events)
  const currentDate = new Date();
  const relevantEvents = events
    .filter(event => {
      const eventEnd = new Date(event.end);
      return eventEnd >= currentDate; // Show current and future events
    })
    .slice(0, 6); // Limit to 6 cards for quick overview

  // Handle single card layout
  if (relevantEvents.length === 1) {
    container.classList.add('single-card');
  } else {
    container.classList.remove('single-card');
  }

  if (relevantEvents.length === 0) {
    // Show empty state
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🌟</div>
        <div class="empty-state-text">No upcoming events</div>
        <div class="empty-state-subtext">Check back soon for new Sky events!</div>
      </div>
    `;
    return;
  }

  relevantEvents.forEach((event, index) => {
    const eventCard = createEventCard(event);
    // Stagger animation
    eventCard.style.animationDelay = `${index * 0.1}s`;
    container.appendChild(eventCard);
  });

  // console.log(`Displayed ${relevantEvents.length} events in quick overview`);
}

// Function to create individual event card
function createEventCard(event) {
  const card = document.createElement('div');
  card.className = 'event-card';
  card.setAttribute('data-event-id', event.id);

  // Determine event status
  const currentDate = new Date();
  const startDate = new Date(event.start);
  const endDate = new Date(event.end);

  let eventStatus = '';
  if (currentDate < startDate) {
    eventStatus = 'upcoming';
  } else if (currentDate >= startDate && currentDate <= endDate) {
    eventStatus = 'ongoing';
  } else {
    eventStatus = 'past';
  }

  card.classList.add(eventStatus);
  card.style.borderBottom = `4px solid ${event.color}`;

  // Get badge info based on category
  const badgeInfo = getBadgeInfo(event.category);

  // Format date range
  const dateRange = formatDateRange(startDate, endDate);

  // Get countdown info
  const countdownInfo = getCountdownInfo(startDate, endDate, currentDate);

  if (event.title.includes("Traveling Spirit:")) {
    event.title = event.title.replace("Traveling Spirit:", "TS:");
  }

  if (event.title.includes("Traveling Spirits")) {
    event.title = event.title.replace("Traveling Spirits", "TS");
  }

  card.innerHTML = `
    <div class="event-image-container">
      ${event.image ?
      `<img src="${event.image}" alt="${event.title}" loading="lazy" class="event-image" onerror="this.parentElement.innerHTML='<div class=\\"event-image-placeholder\\">🌟</div>` :
      `<div class="event-image-placeholder">🌟</div>`
    }
      <div class="event-badge ${badgeInfo.class}">${badgeInfo.text}</div>
    </div>
    <div class="event-content-overview">
      <h3 class="event-title">${event.title.replace(/^[\p{Emoji}\p{Extended_Pictographic}]+\s*/u, "")}</h3>
      <div class="event-date">${dateRange}</div>
      <div class="event-countdown ${countdownInfo.class}">
        <div class="countdown-label">${countdownInfo.label}</div>
        <div class="countdown-time">${countdownInfo.time}</div>
      </div>
    </div>
  `;

  // Add click event to open event modal (if you have one)
  card.addEventListener('click', () => {
    if (typeof openEventModal === 'function') {
      openEventModal(event);
    } else {
      // console.log('Event clicked:', event.title);
    }
  });

  return card;
}

// Helper function to get badge information
function getBadgeInfo(category) {
  const categoryLower = category?.toLowerCase() || '';

  if (categoryLower.includes('traveling') || categoryLower.includes('ts')) {
    return { class: 'ts', text: 'TS' };
  } else if (categoryLower.includes('season')) {
    return { class: 'season', text: 'SEASON' };
  } else if (categoryLower.includes('special')) {
    return { class: 'special', text: 'SPECIAL' };
  } else {
    return { class: 'special', text: 'EVENT' };
  }
}

// Helper function to format date range
function formatDateRange(startDate, endDate) {
  const options = { month: 'short', day: 'numeric' };
  const start = startDate.toLocaleDateString('en-US', options);
  const end = endDate.toLocaleDateString('en-US', options);

  // If same month, show "Jan 15 - 22"
  if (startDate.getMonth() === endDate.getMonth()) {
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const month = startDate.toLocaleDateString('en-US', { month: 'short' });
    return `${month} ${startDay} - ${endDay}`;
  }

  return `${start} - ${end}`;
}

// Helper function to get countdown information
function getCountdownInfo(startDate, endDate, currentDate) {
  const msInDay = 24 * 60 * 60 * 1000;
  const msInHour = 60 * 60 * 1000;
  const msInMinute = 60 * 1000;

  let timeDiff, label, className;

  if (currentDate < startDate) {
    // Event hasn't started yet
    timeDiff = startDate - currentDate;
    label = 'Starts in';
    className = 'starting';
  } else if (currentDate >= startDate && currentDate <= endDate) {
    // Event is ongoing
    timeDiff = endDate - currentDate;
    label = 'Ends in';
    className = 'ending';
  } else {
    // Event has ended
    return {
      class: 'ended',
      label: 'Event',
      time: 'Ended'
    };
  }

  // Calculate time components
  const days = Math.floor(timeDiff / msInDay);
  const hours = Math.floor((timeDiff % msInDay) / msInHour);
  const minutes = Math.floor((timeDiff % msInHour) / msInMinute);

  let timeString = '';
  if (days > 0) {
    timeString = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    timeString = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    timeString = `${minutes}m`;
  } else {
    timeString = 'Now';
  }

  return {
    class: className,
    label: label,
    time: timeString
  };
}

// Utility function to generate event ID if missing
function generateEventId(title) {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
}

// Update countdowns every minute
let countdownInterval = setInterval(() => {
  const cards = document.querySelectorAll('.event-card-list');
  if (cards.length === 0) {
    return;
  }

  cards.forEach(card => {
    const eventId = card.getAttribute('data-event-id');
    const event = allEvents.find(e => e.id === eventId);
    if (event) {
      const currentDate = new Date();
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      const countdownInfo = getCountdownInfo(startDate, endDate, currentDate);

      const countdownElement = card.querySelector('.event-countdown');
      const labelElement = card.querySelector('.countdown-label');
      const timeElement = card.querySelector('.countdown-time');

      if (countdownElement && labelElement && timeElement) {
        countdownElement.className = `event-countdown ${countdownInfo.class}`;
        labelElement.textContent = countdownInfo.label;
        timeElement.textContent = countdownInfo.time;
      }
    }
  });
}, 60000); // Update every minute

// Clean up interval when page unloads
window.addEventListener('beforeunload', () => {
  cleanupPeriodicRefresh();
  cleanupCountdown();
});

function cleanupCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}


// Debug function to check if Quick Overview is working
// window.debugQuickOverview = function() {
//   console.log('All Events:', allEvents);
//   console.log('Container exists:', !!document.getElementById('event-cards-container'));
//   const currentDate = new Date();
//   const relevantEvents = allEvents.filter(event => {
//     const eventEnd = new Date(event.end);
//     return eventEnd >= currentDate;
//   });
//   console.log('Relevant Events:', relevantEvents);
// };


// ___________________________EVENT MODAL_____________________________________

let currentMediaIndex = 0;
let currentMediaItems = [];

function openEventModal(event) {
  const modal = document.getElementById('eventModal');
  const modalImageContainer = document.getElementById('modalImageContainer');
  const modalBadge = document.getElementById('modalBadge');
  const modalTitle = document.getElementById('modalTitle');
  const modalDescription = document.getElementById('modalDescription');
  const modalNote = document.getElementById('modalNote');
  const modalShareBtn = document.getElementById('modalShareBtn');
  const modalCalendarBtn = document.getElementById('modalCalendarBtn');

  // Set up media carousel
  setupMediaCarousel(event, modalImageContainer);

  // Set badge
  const category = event.category || (event.extendedProps && event.extendedProps.category) || 'special';
  const badgeInfo = getBadgeInfo(category);
  modalBadge.textContent = badgeInfo.text;
  modalBadge.className = `modal-badge ${badgeInfo.class}`;

  // Set title (clean up TS prefixes)
  let cleanTitle = event.title || '';
  cleanTitle = cleanTitle.replace("Traveling Spirit:", "TS:");
  cleanTitle = cleanTitle.replace("Traveling Spirits", "TS");
  cleanTitle = cleanTitle.replace(/^[\p{Emoji}\p{Extended_Pictographic}]+\s*/u, "");
  modalTitle.textContent = cleanTitle;

  // Set quick info summary
  setQuickInfoSummary(event);

  // Set description
  const description = event.description ||
    (event.extendedProps && event.extendedProps.description);

  if (description && description.trim()) {
    modalDescription.innerHTML = `
            <div class="description-title">Description</div>
            <div class="description-content">${description}</div>
        `;
  } else {
    modalDescription.innerHTML = `
            <div class="description-title">Description</div>
            <div class="description-content na">Information will be updated as it becomes available.</div>
        `;
  }

  // Set note/reminder
  const note = event.note || (event.extendedProps && event.extendedProps.note);
  if (note && note.trim()) {
    modalNote.innerHTML = `
            <div class="note-title">Note</div>
            <div class="modalnote-content">${note}</div>
        `;
    modalNote.style.display = 'block';
  } else {
    modalNote.innerHTML = `
            <div class="note-title">Reminder</div>
            <div class="modal-note-content">Event details are subject to change. Please check back for updates.</div>
        `;
    modalNote.style.display = 'block';
  }

  // Set action buttons
  modalShareBtn.onclick = () => shareEvent(event);
  modalCalendarBtn.onclick = () => addToGoogleCalendar(event);

  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function setupMediaCarousel(event, container) {
  // Enhanced media collection to handle both your current format and future video additions
  currentMediaItems = collectMediaItems(event);
  currentMediaIndex = 0;

  // console.log('Setting up carousel with media items:', currentMediaItems); // Debug log

  if (currentMediaItems.length === 0) {
    // No media available
    container.innerHTML = '<div class="modal-image-placeholder">🌟</div>';
    return;
  }

  if (currentMediaItems.length === 1) {
    // Single media item
    const mediaItem = currentMediaItems[0];
    const mediaHtml = createMediaElement(mediaItem, event.title, true);
    container.innerHTML = `
          ${mediaHtml}
          <div class="media-controls">
            <button type="button" class="media-control-btn" onclick="downloadMedia('${mediaItem.url.replace(/'/g, "\\'")}')" title="Download">
              💾
            </button>
            <button type="button" class="media-control-btn" onclick="openZoomModal('${mediaItem.url.replace(/'/g, "\\'")}', '${mediaItem.type}')" title="View Full Size">
              🔍
            </button>
          </div>
        `;
    return
  }

  let carouselHTML = `
        <div class="media-carousel">
            <div class="media-slides" id="mediaSlides">
    `;

  currentMediaItems.forEach((mediaItem, index) => {
    const mediaHtml = createMediaElement(mediaItem, event.title, index === 0);
    carouselHTML += `<div class="media-slide">${mediaHtml}</div>`;
  });

  carouselHTML += `
            </div>
            <button type="button" class="carousel-nav prev" onclick="prevMedia()" id="prevBtn">‹</button>
            <button type="button" class="carousel-nav next" onclick="nextMedia()" id="nextBtn">›</button>
            <div class="media-controls">
                <button type="button" class="media-control-btn" onclick="downloadCurrentMedia()" title="Download">
                    💾
                </button>
                <button type="button" class="media-control-btn" onclick="openCurrentMediaZoom()" title="View Full Size">
                    🔍
                </button>
            </div>
            <div class="carousel-indicators" id="carouselIndicators">
    `;

  currentMediaItems.forEach((_, index) => {
    carouselHTML += `<div class="carousel-indicator ${index === 0 ? 'active' : ''}" onclick="goToMedia(${index})"></div>`;
  });

  carouselHTML += `
            </div>
            <div class="media-counter">
                <span id="mediaCounter">1 / ${currentMediaItems.length}</span>
            </div>
        </div>
    `;

  container.innerHTML = carouselHTML;
  updateCarouselButtons();
}

function normalizeToArray(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;

  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return [];

    // If the string looks like JSON array, try parsing
    if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith('"') && s.endsWith('"'))) {
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed : [s];
      } catch (_) {
        // Fall through to string splitting
      }
    }

    // Split on commas/newlines/pipes; trim and keep non-empty
    return s.split(/[,|\n]/).map(v => v.trim()).filter(Boolean);
  }

  // Sometimes a single object with { url } sneaks in
  if (typeof input === "object" && input.url) return [input.url];
  return [];
}

function canonicalKey(url) {
  try {
    const u = new URL(url, window.location.href);
    // Ignore query/hash so the same ImageKit asset with different ?updatedAt dedupes
    return `${u.origin}${u.pathname}`;
  } catch {
    return (url || "").split("?")[0];
  }
}

function uniqueUrls(urls) {
  const out = [];
  const seen = new Set();
  for (const item of urls) {
    const u = typeof item === "string" ? item : item?.url;
    if (!u) continue;
    const key = canonicalKey(u);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(u);
    }
  }
  return out;
}

function collectMediaItems(event) {
  const items = [];
  const props = event.extendedProps || {};

  // console.log('Collecting media from event:', event); // Debug log

  // Use gallery images for modal (not thumbnail images)
  const rawImages = event.images ?? props.images ?? [];
  const imageUrls = uniqueUrls(normalizeToArray(rawImages));

  // console.log('Raw images:', rawImages); // Debug log
  // console.log('Processed image URLs:', imageUrls); // Debug log

  for (const url of imageUrls) {
    items.push({
      url,
      type: determineMediaType(url),
      source: "gallery"
    });
  }

  // Videos
  const rawVideos = event.videos ?? props.videos ?? [];
  const videoUrls = uniqueUrls(normalizeToArray(rawVideos));
  for (const url of videoUrls) {
    items.push({
      url,
      type: "video",
      source: "video"
    });
  }

  // Mixed media
  const rawMedia = event.media ?? props.media ?? [];
  const mediaList = normalizeToArray(rawMedia).map(m => (typeof m === "string" ? { url: m } : m));
  for (const m of mediaList) {
    const url = m?.url;
    if (!url) continue;
    const type = m.type || determineMediaType(url);
    if (!items.some(it => canonicalKey(it.url) === canonicalKey(url))) {
      items.push({
        url,
        type,
        source: "media"
      });
    }
  }

  // console.log('Final collected media items:', items); // Debug log
  return items;
}

function determineMediaType(url) {
  const urlLower = url.toLowerCase();

  // Video file extensions
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.m4v', '.3gp'];
  if (videoExtensions.some(ext => urlLower.includes(ext))) {
    return 'video';
  }

  // Animated image extensions (treat as video for controls)
  if (urlLower.includes('.gif') || urlLower.includes('.webp')) {
    return 'animated-image';
  }

  // Default to image
  return 'image';
}

// Create appropriate media element based on type
function createMediaElement(mediaItem, altText, shouldAutoplay = false) {
  const { url, type } = mediaItem;
  const safeUrl = url.replace(/'/g, '&#39;').replace(/"/g, '&quot;');

  switch (type) {
    case 'video':
      return `
                <video class="modal-video" ${shouldAutoplay ? 'controls autoplay muted loop' : 'controls muted'}>
                    <source src="${safeUrl}" type="${getVideoMimeType(url)}">
                    Your browser does not support the video tag.
                </video>
            `;

    case 'animated-image':
      return `
                <img loading="lazy"  src="${safeUrl}" alt="${altText}" class="modal-image animated-image"
                     onclick="openZoomModal('${safeUrl}', '${type}')"
                     onerror="this.parentElement.innerHTML='<div class=&quot;media-error&quot;>Failed to load media</div>'">
            `;

    default:
      return `
                <img loading="lazy" src="${safeUrl}" alt="${altText}" class="modal-image"
                     onclick="openZoomModal('${safeUrl}', '${type}')"
                     onerror="this.parentElement.innerHTML='<div class=&quot;media-error&quot;>Failed to load image</div>'">
            `;
  }
}

function prevMedia() {
  if (currentMediaIndex > 0) {
    currentMediaIndex--;
    updateCarousel();
  }
}

function nextMedia() {
  if (currentMediaIndex < currentMediaItems.length - 1) {
    currentMediaIndex++;
    updateCarousel();
  }
}

function goToMedia(index) {
  if (index >= 0 && index < currentMediaItems.length) {
    currentMediaIndex = index;
    updateCarousel();
  }
}

function updateCarousel() {
  const slides = document.getElementById('mediaSlides');
  if (!slides) return;

  // Update slide position
  slides.style.transform = `translateX(-${currentMediaIndex * 100}%)`;

  // Update indicators
  const indicators = document.querySelectorAll('.carousel-indicator');
  indicators.forEach((indicator, index) => {
    indicator.classList.toggle('active', index === currentMediaIndex);
  });

  // Update media counter
  const mediaCounter = document.getElementById('mediaCounter');
  if (mediaCounter) {
    mediaCounter.textContent = `${currentMediaIndex + 1} / ${currentMediaItems.length}`;
  }

  // Handle video/media playback
  handleMediaPlayback();

  // Update navigation buttons
  updateCarouselButtons();
}

function handleMediaPlayback() {
  // Pause all videos first
  document.querySelectorAll('.modal-video').forEach(video => {
    video.pause();
  });

  // Play current video if it exists
  const currentSlide = document.querySelectorAll('.media-slide')[currentMediaIndex];
  if (currentSlide) {
    const currentVideo = currentSlide.querySelector('.modal-video');
    if (currentVideo) {
      currentVideo.play().catch(() => {
        // Auto-play failed, which is normal in many browsers
        // console.log('Auto-play prevented by browser');
      });
    }
  }
}

function updateCarouselButtons() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (prevBtn) {
    prevBtn.disabled = currentMediaIndex === 0;
    prevBtn.style.opacity = currentMediaIndex === 0 ? '0.5' : '1';
  }
  if (nextBtn) {
    nextBtn.disabled = currentMediaIndex === currentMediaItems.length - 1;
    nextBtn.style.opacity = currentMediaIndex === currentMediaItems.length - 1 ? '0.5' : '1';
  }
}

function downloadCurrentMedia() {
  if (currentMediaItems[currentMediaIndex]) {
    downloadMedia(currentMediaItems[currentMediaIndex].url);
  }
}

function openCurrentMediaZoom() {
  if (currentMediaItems[currentMediaIndex]) {
    const item = currentMediaItems[currentMediaIndex];
    openZoomModal(item.url, item.type);
  }
}

function getVideoMimeType(url) {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('.mp4')) return 'video/mp4';
  if (urlLower.includes('.webm')) return 'video/webm';
  if (urlLower.includes('.ogg')) return 'video/ogg';
  if (urlLower.includes('.mov')) return 'video/quicktime';
  if (urlLower.includes('.avi')) return 'video/x-msvideo';
  return 'video/mp4'; // default
}

function downloadMedia(url) {
  // Enhanced download with better ImageKit support
  let downloadUrl = url;

  // For ImageKit URLs, add download parameter
  if (url.includes('imagekit.io')) {
    const separator = url.includes('?') ? '&' : '?';
    downloadUrl = `${url}${separator}ik-attachment=true`;
  }

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = getFilenameFromUrl(url);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';

  // Add to DOM temporarily
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getFilenameFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop();
    return filename || `sky-media-${Date.now()}`;
  } catch (e) {
    return `sky-media-${Date.now()}`;
  }
}

function openZoomModal(mediaUrl, mediaType = null) {
  let zoomModal = document.getElementById('zoomModal');

  if (!zoomModal) {
    // Create zoom modal if it doesn't exist
    zoomModal = document.createElement('div');
    zoomModal.id = 'zoomModal';
    zoomModal.className = 'zoom-modal';
    document.body.appendChild(zoomModal);
  }

  const type = mediaType || determineMediaType(mediaUrl);
  const safeUrl = mediaUrl.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
  let zoomContent;

  switch (type) {
    case 'video':
      zoomContent = `
                <div class="zoom-content">
                    <video class="zoom-video" controls autoplay muted loop>
                        <source src="${safeUrl}" type="${getVideoMimeType(mediaUrl)}">
                        Your browser does not support the video tag.
                    </video>
                    <div class="zoom-controls">
                        <button type="button" class="zoom-btn" onclick="downloadMedia('${safeUrl}')" title="Download">
                            💾
                        </button>
                        <button type="button" class="zoom-btn" onclick="closeZoomModal()" title="Close">
                            ✕
                        </button>
                    </div>
                </div>
            `;
      break;

    case 'animated-image':
      zoomContent = `
                <div class="zoom-content">
                    <img loading="lazy"  src="${safeUrl}" alt="Zoomed animated image" class="zoom-image">
                    <div class="zoom-controls">
                        <button type="button" class="zoom-btn" onclick="downloadMedia('${safeUrl}')" title="Download">
                            💾
                        </button>
                        <button type="button" class="zoom-btn" onclick="closeZoomModal()" title="Close">
                            ✕
                        </button>
                    </div>
                </div>
            `;
      break;

    default: // 'image'
      zoomContent = `
                <div class="zoom-content">
                    <img loading="lazy"  src="${safeUrl}" alt="Zoomed media" class="zoom-image">
                    <div class="zoom-controls">
                        <button type="button" class="zoom-btn" onclick="downloadMedia('${safeUrl}')" title="Download">
                            💾
                        </button>
                        <button type="button" class="zoom-btn" onclick="closeZoomModal()" title="Close">
                            ✕
                        </button>
                    </div>
                </div>
            `;
  }

  zoomModal.innerHTML = zoomContent;
  zoomModal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Close on click outside
  zoomModal.onclick = (e) => {
    if (e.target === zoomModal) {
      closeZoomModal();
    }
  };
}

function closeZoomModal() {
  const zoomModal = document.getElementById('zoomModal');
  if (zoomModal) {
    // Pause any videos in zoom modal
    const zoomVideo = zoomModal.querySelector('.zoom-video');
    if (zoomVideo) {
      zoomVideo.pause();
    }

    zoomModal.classList.remove('active');
    if (!document.getElementById('eventModal').classList.contains('active')) {
      document.body.style.overflow = '';
    }
  }
}

function setQuickInfoSummary(event) {
  const quickInfoContainer = document.getElementById('quickInfoSummary');

  // Get event data with fallbacks
  const startDate = new Date(event.start);
  const endDate = new Date(event.end || event.start);
  const dateRange = formatDateRange(startDate, endDate);

  // Extract extended properties with better fallback handling
  const props = event.extendedProps || {};
  
  // Helper function to get property from either direct event or extendedProps
  const getProp = (propName) => {
    return event[propName] || props[propName] || null;
  };

  const category = getProp('category') || 'special';

  let infoItems = [];

  // Base info for all events
  infoItems.push({ icon: '📅', label: 'Date:', value: dateRange });

  // Event-specific information based on category
  if (category === 'travelling-spirits') {
    // Single Traveling Spirit
    const realm = getProp('realm');
    const location = getProp('location');
    const memoryType = getProp('memoryType');
    const emote = getProp('emote');

    infoItems.push(
      { icon: '🌍', label: 'Realm:', value: realm || 'To be announced' },
      { icon: '📌', label: 'Location:', value: location || 'To be announced' },
      { icon: '🎭', label: 'Memory Type:', value: memoryType || 'N/A' },
      { icon: '🕊️', label: 'Emote:', value: emote || 'N/A' }
    );
    
  } else if (category === 'seasons') {
    // Seasonal Events
    const seasonType = getProp('seasonType');
    const spiritCount = getProp('spiritCount');
    const duration = getProp('duration');
    const specialItems = getProp('specialItems');

    infoItems.push(
      { icon: '👥', label: 'Spirits:', value: spiritCount || 'To be announced' },
    );
  } else if (category === 'days-of-events') {
    const location = getProp('location');
    infoItems.push(
      { icon: '📌', label: 'Location:', value: location || 'To be announced' },
    );
  } else if (category === 'special-events') {
    // Special Events (Days of Events, etc.)
    const eventType = getProp('eventType');
    const activities = getProp('activities');
    const rewards = getProp('rewards');
    const requirements = getProp('requirements');

    infoItems.push(
      { icon: '🎉', label: 'Event Type:', value: eventType || 'Special Event' },
      { icon: '🎯', label: 'Activities:', value: activities || 'To be announced' },
      { icon: '🎁', label: 'Rewards:', value: rewards || 'To be announced' },
      { icon: '📋', label: 'Requirements:', value: requirements || 'None specified' }
    );
  } else if (category === 'group_ts' || event.title.toLowerCase().includes('traveling spirits')) {
    // Group of Traveling Spirits
    const spiritCount = getProp('spiritCount');
    const realms = getProp('realms');
    const duration = getProp('duration');

    infoItems.push(
      { icon: '👥', label: 'Spirit Count:', value: spiritCount || 'To be announced' },
      { icon: '🌍', label: 'Realms:', value: realms || 'Multiple realms' },
      { icon: '⏱️', label: 'Duration:', value: duration || 'To be announced' },
    );
  } else {
    // Default/Generic events
    const eventType = getProp('eventType');
    const location = getProp('location');

    infoItems.push(
      { icon: '🎯', label: 'Event Type:', value: eventType || 'General Event' },
      { icon: '📌', label: 'Location:', value: location || 'To be announced' }
    );
  }

  let infoHTML = '<div class="quick-info-title">Quick Info Summary</div>';

  infoItems.forEach(item => {
    const isNA = !item.value || item.value === 'N/A' || item.value === 'To be announced' || item.value === 'None specified';
    const valueClass = isNA ? 'info-value na' : 'info-value';

    infoHTML += `
            <div class="info-item">
                <span class="info-icon">${item.icon}</span>
                <span class="info-label">${item.label}</span>
                <span class="${valueClass}">${item.value}</span>
            </div>
        `;
  });

  quickInfoContainer.innerHTML = infoHTML;
}

function closeEventModal() {
  const modal = document.getElementById('eventModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';

  // Pause any playing videos when modal closes
  modal.querySelectorAll('.modal-video').forEach(video => {
    video.pause();
  });
}

function shareEvent(event) {
  const shareData = {
    title: event.title,
    text: `Check out this Sky: Children of the Light event: ${event.title}`,
    url: window.location.href
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    navigator.share(shareData).catch(() => {
      // Fallback if share fails
      fallbackShare(event);
    });
  } else {
    // Fallback: copy to clipboard
    fallbackShare(event);
  }
}

function fallbackShare(event) {
  const shareText = `${event.title}\n${formatDateRange(new Date(event.start), new Date(event.end || event.start))}\n${window.location.href}`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareText).then(() => {
      showNotification('Event details copied to clipboard!');
    }).catch(() => {
      fallbackCopyToClipboard(shareText);
    });
  } else {
    fallbackCopyToClipboard(shareText);
  }
}

function addToGoogleCalendar(event) {
  const startDate = new Date(event.start);
  const endDate = new Date(event.end || event.start);

  // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ)
  const formatGoogleDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const startStr = formatGoogleDate(startDate);
  const endStr = formatGoogleDate(endDate);

  // Clean title
  let cleanTitle = event.title.replace("Traveling Spirit:", "TS:");
  cleanTitle = cleanTitle.replace("Traveling Spirits", "TS");
  cleanTitle = cleanTitle.replace(/^[\p{Emoji}\p{Extended_Pictographic}]+\s*/u, "");

  // Prepare description
  const props = event.extendedProps || {};
  let details = `Sky: Children of the Light Event\n\n`;

  if (props.realm || event.realm) {
    details += `Realm: ${props.realm || event.realm}\n`;
  }
  if (props.location || event.location) {
    details += `Location: ${props.location || event.location}\n`;
  }
  if (props.memoryType || event.memoryType) {
    details += `Memory Type: ${props.memoryType || event.memoryType}\n`;
  }
  if (props.emote || event.emote) {
    details += `Emote: ${props.emote || event.emote}\n`;
  }

  if (event.description || (props.description)) {
    details += `\nDescription:\n${event.description || props.description}`;
  }

  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(cleanTitle)}` +
    `&dates=${startStr}/${endStr}` +
    `&details=${encodeURIComponent(details)}` +
    `&location=${encodeURIComponent('Sky: Children of the Light')}`;

  window.open(googleCalendarUrl, '_blank');
}

function fallbackCopyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand('copy');
    showNotification('Event details copied to clipboard!');
  } catch (err) {
    showNotification('Unable to copy to clipboard');
  } finally {
    document.body.removeChild(textArea);
  }
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 0.9rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: opacity 0.3s ease;
    `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
  // Close modal button
  const closeBtn = document.getElementById('closeModal');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeEventModal);
  }

  // Close modal when clicking overlay
  const modalOverlay = document.getElementById('eventModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        closeEventModal();
      }
    });
  }

  // Close on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const eventModal = document.getElementById('eventModal');
      const zoomModal = document.getElementById('zoomModal');

      if (zoomModal && zoomModal.classList.contains('active')) {
        closeZoomModal();
      } else if (eventModal && eventModal.classList.contains('active')) {
        closeEventModal();
      }
    }
  });

  // Keyboard navigation for carousel
  document.addEventListener('keydown', (e) => {
    const eventModal = document.getElementById('eventModal');
    if (eventModal && eventModal.classList.contains('active')) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevMedia();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextMedia();
      }
    }
  });
});

// Global function exports for onclick handlers
window.openEventModal = openEventModal;
window.closeEventModal = closeEventModal;
window.downloadMedia = downloadMedia;
window.openZoomModal = openZoomModal;
window.nextMedia = nextMedia;
window.prevMedia = prevMedia;
window.goToMedia = goToMedia;
window.downloadCurrentMedia = downloadCurrentMedia;
window.openCurrentMediaZoom = openCurrentMediaZoom;
window.closeZoomModal = closeZoomModal;


// ___________________________EVENT LIST WITH PAGINATION_____________________________________

class SkyEventsManager {
  constructor() {
    this.events = [];
    this.allEvents = [];
    this.favorites = JSON.parse(localStorage.getItem('skyEventsFavorites') || '[]');
    this.currentFilter = 'all';
    this.searchTerm = '';
    this.countdownIntervals = new Map();
    this.calendar = null;

    // Pagination properties
    this.currentPage = 1;
    this.eventsPerPage = 6;
    this.filteredEvents = [];

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.initializeFilters();
    this.createPaginationContainer();
  }

  // Method to be called after your Firebase data loads
  setEventsData(eventsData) {
    // console.log('Setting events data:', eventsData.length, 'events'); // Debug log
    this.allEvents = eventsData;
    this.events = this.convertFirebaseEventsToCardFormat(eventsData);
    this.filterEvents();
    this.renderCurrentPage();
  }

  // Convert your Firebase event format to card display format
  convertFirebaseEventsToCardFormat(firebaseEvents) {
    const events = firebaseEvents.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      category: event.category || 'special',
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      color: event.color,
      image: event.image,
      images: event.images,
      blogUrl: event.blogUrl,
      credits: event.credits,
      emote: event.emote,
      realm: event.realm,
      location: event.location,
      memoryType: event.memoryType,
      note: event.note,
      spiritCount: event.spiritCount
    }));

    // Sort events by start date (latest first)
    return events.sort((a, b) => {
      const dateA = new Date(a.start);
      const dateB = new Date(b.start);
      return dateB - dateA;
    });
  }

  // Filter events based on current filter and search term
  filterEvents() {
    this.filteredEvents = this.events.filter(event => {
      const now = new Date();
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);

      const isActive = now >= startDate && now <= endDate;
      const isUpcoming = now <= startDate;

      const matchesFilter =
        this.currentFilter === 'all' ||
        this.currentFilter === event.category ||
        (this.currentFilter === 'favorites' && this.favorites.includes(event.id)) ||
        (this.currentFilter === 'in-progress' && isActive) ||
        (this.currentFilter === 'coming-soon' && isUpcoming);

      const searchLower = this.searchTerm.toLowerCase();
      const matchesSearch = this.searchTerm === '' ||
        event.title.toLowerCase().includes(searchLower);

      return matchesFilter && matchesSearch;
    });

    this.currentPage = 1;
  }



  // Get events for current page
  getCurrentPageEvents() {
    const startIndex = (this.currentPage - 1) * this.eventsPerPage;
    const endIndex = startIndex + this.eventsPerPage;
    return this.filteredEvents.slice(startIndex, endIndex);
  }

  // Get total pages
  getTotalPages() {
    return Math.ceil(this.filteredEvents.length / this.eventsPerPage);
  }

  // Render current page events
  renderCurrentPage() {
    const eventsGrid = document.getElementById('eventsGrid');
    if (!eventsGrid) return;

    eventsGrid.innerHTML = ''; // Clear existing cards

    const currentPageEvents = this.getCurrentPageEvents();

    if (currentPageEvents.length === 0) {
      this.showEmptyState();
      this.updatePagination();
      return;
    }

    currentPageEvents.forEach(event => {
      const eventCard = this.createEventCard(event);
      eventsGrid.appendChild(eventCard);
    });

    this.updateFavoriteButtons();
    this.updatePagination();

    // Start countdowns after DOM is fully updated
    setTimeout(() => {
      this.startCountdowns();
    }, 50);
  }

  createEventCard(event) {
    const card = document.createElement('div');
    card.className = `event-list-card ${event.category}`;
    card.dataset.eventId = event.id;
    card.dataset.category = event.category;

    const now = new Date();
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);

    const isActive = now >= startDate && now <= endDate;
    const isUpcoming = now < startDate;
    const hasEnded = now > endDate;

    const badge = this.getCategoryBadge(event.category);
    const icon = this.getCategoryIcon(event.category);

    // Determine status
    let statusClass = 'ended';
    let statusText = 'Event Ended';

    if (isActive) {
      statusClass = 'active';
      statusText = 'Active Now';
    } else if (isUpcoming) {
      statusClass = 'upcoming';
      statusText = 'Coming Soon';
    } else if (event.recurring) {
      statusClass = 'recurring';
      statusText = 'Recurring';
    }

    card.innerHTML = `
      <div class="event-list-icon">
        ${icon}
      </div>
      
      <div class="event-list-content">
        <div class="event-list-badge">
          <span class="event-list-badge-item ${event.category}-badge">${badge}</span>
          <div class="event-list-status ${statusClass}">${statusText}</div>
        </div>
        <h3 class="event-list-title">${event.title}</h3>
        <div class="event-list-dates">${this.formatDateRange(startDate, endDate)}</div>
        
        <div class="event-list-actions">
          <button type="button" class="event-list-btn event-list-btn-primary" onclick="openEventModal(${JSON.stringify(event).replace(/"/g, '&quot;')})">
            View Details
          </button>
          <button type="button" class="event-list-btn event-list-btn-secondary event-list-favorite-btn" data-event-id="${event.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    return card;
  }

  formatDateRange(startDate, endDate) {
    const start = this.formatDate(startDate);
    const end = this.formatDate(endDate);

    // If same month, show "Jun 18 - 25, 2025"
    if (startDate.getMonth() === endDate.getMonth() &&
      startDate.getFullYear() === endDate.getFullYear()) {
      const startDay = startDate.getDate();
      const endDay = endDate.getDate();
      const month = startDate.toLocaleDateString('en-US', { month: 'short' });
      const year = startDate.getFullYear();

      if (startDay === endDay) {
        return `${month} ${startDay}, ${year}`;
      }
      return `${month} ${startDay} - ${endDay}, ${year}`;
    }

    // Different months: "Jun 18, 2025 - Jul 18, 2025"
    return `${start} - ${end}`;
  }

  getCategoryBadge(category) {
    const badges = {
      "seasons": 'Season',
      "travelling-spirits": 'Traveling Spirit',
      "special-event": 'Special Event',
      "days-of-events": 'Days of Event',
      default: 'Event'
    };
    return badges[category] || badges.default;
  }

  getCategoryIcon(category) {
    const icons = {
      "seasons": `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L15.5 8.5L22 12L15.5 15.5L12 22L8.5 15.5L2 12L8.5 8.5L12 2Z"/>
      </svg>`,
      "travelling-spirits": `<svg width="24" height="24" viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M24 4L29 14L44 24L29 34L24 44L19 34L4 24L19 14L24 4Z"/>
          <path d="M12 6L14 10L18 12L14 14L12 18L10 14L6 12L10 10L12 6Z"/>
          <path d="M36 30L38 34L42 36L38 38L36 42L34 38L30 36L34 34L36 30Z"/>
        </svg>`,
      "special-event": `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="9" y="10" width="6" height="12" rx="1"/>
            <path d="M12 2C13.2 4 14 5.5 14 7C14 8.66 13 10 12 10C11 10 10 8.66 10 7C10 5.5 10.8 4 12 2Z"/>
          </svg>`,
      "days-of-events": `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H18V1H16V3H8V1H6V3H5C3.89 3 3.01 3.9 3.01 5L3 19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19Z"/>
      </svg>`,
      default: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L15.5 8.5L22 12L15.5 15.5L12 22L8.5 15.5L2 12L8.5 8.5L12 2Z"/>
      </svg>`
    };
    return icons[category] || icons.default;
  }

  generateCountdownHtml(event, isActive, isUpcoming, hasEnded) {
    if (hasEnded) {
      return `
        <div class="event-list-countdown event-list-countdown-ended">
          <div class="event-list-countdown-content">
            <div class="event-list-countdown-header">Event</div>
            <div class="event-list-countdown-time">Ended</div>
          </div>
        </div>
      `;
    }

    const targetDate = isActive ? event.end : event.start;
    const countdownClass = isActive ? 'event-list-countdown-active' : 'event-list-countdown-upcoming';
    const headerText = isActive ? 'Ends In' : 'Starts In';

    return `
      <div class="event-list-countdown ${countdownClass}" data-target-date="${targetDate}">
        <div class="event-list-countdown-content">
          <div class="event-list-countdown-header">${headerText}</div>
          <div class="event-list-countdown-time">--D --H --M</div>
        </div>
      </div>
    `;
  }

  formatDate(date) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: date.getHours() !== 0 ? 'numeric' : undefined,
      minute: date.getHours() !== 0 ? '2-digit' : undefined
    });
  }

  setupEventListeners() {
    document.addEventListener('input', (e) => {
      if (e.target.id === 'eventListSearch' || e.target.classList.contains('event-list-search-input')) {
        // console.log('Search input detected:', e.target.value); // Debug log
        this.searchTerm = e.target.value.toLowerCase();
        this.filterEvents();
        this.renderCurrentPage(); // This will automatically restart countdowns
      }
    });

    // Filter buttons and other event listeners
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('event-list-filter-btn')) {
        this.handleFilterClick(e.target);
      }

      if (e.target.closest('.event-list-favorite-btn')) {
        this.handleFavoriteClick(e.target.closest('.event-list-favorite-btn'));
      }

      // Pagination buttons
      if (e.target.classList.contains('pagination-btn')) {
        const page = parseInt(e.target.dataset.page);
        if (page && page !== this.currentPage) {
          this.currentPage = page;
          this.renderCurrentPage();
          // Restart countdowns after pagination
          setTimeout(() => {
            this.startCountdowns();
          }, 100);
        }
      }

      if (e.target.classList.contains('pagination-prev')) {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.renderCurrentPage();
          setTimeout(() => {
            this.startCountdowns();
          }, 100);
        }
      }

      if (e.target.classList.contains('pagination-next')) {
        if (this.currentPage < this.getTotalPages()) {
          this.currentPage++;
          this.renderCurrentPage();
          setTimeout(() => {
            this.startCountdowns();
          }, 100);
        }
      }
    });

    // Theme toggle
    const themeToggle = document.querySelector('.event-list-theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', this.toggleTheme);
    }
  }

  handleFilterClick(button) {
    // Remove active class from all filter buttons
    document.querySelectorAll('.event-list-filter-btn').forEach(btn =>
      btn.classList.remove('active')
    );

    // Add active class to clicked button
    button.classList.add('active');

    // Update current filter
    this.currentFilter = button.dataset.filter;
    this.filterEvents();
    this.renderCurrentPage();

    // Restart countdowns after a brief delay to ensure DOM is updated
    setTimeout(() => {
      this.startCountdowns();
    }, 100);
  }

  handleFavoriteClick(button) {
    const eventId = button.dataset.eventId;
    const index = this.favorites.indexOf(eventId);

    if (index > -1) {
      this.favorites.splice(index, 1);
      button.classList.remove('favorited');
    } else {
      this.favorites.push(eventId);
      button.classList.add('favorited');
    }

    localStorage.setItem('skyEventsFavorites', JSON.stringify(this.favorites));
    this.updateFavoriteButton(button, eventId);
  }

  updateFavoriteButton(button, eventId) {
    const isFavorited = this.favorites.includes(eventId);
    button.classList.toggle('favorited', isFavorited);

    button.style.transform = 'scale(1.2)';
    setTimeout(() => {
      button.style.transform = '';
    }, 150);
  }

  showEmptyState() {
    const eventsGrid = document.getElementById('eventsGrid');
    if (!eventsGrid) return;

    let emptyMessage = `
      <div class="event-list-empty-message">
        <div class="empty-state">
    `;

    if (this.searchTerm) {
      emptyMessage += `
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <h3>No events found</h3>
        <p>Try adjusting your search terms or filters</p>
      `;
    } else if (this.currentFilter === 'favorites') {
      emptyMessage += `
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <h3>No favorite events</h3>
        <p>Start adding events to your favorites by clicking the heart icon</p>
      `;
    } else {
      emptyMessage += `
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12,2L13.5,7.5L19,9L13.5,10.5L12,16L10.5,10.5L5,9L10.5,7.5L12,2Z"/>
        </svg>
        <h3>No events in this category</h3>
        <p>Try selecting a different filter</p>
      `;
    }

    emptyMessage += `
        </div>
      </div>
    `;

    eventsGrid.innerHTML = emptyMessage;
  }

  updateFavoriteButtons() {
    document.querySelectorAll('.event-list-favorite-btn').forEach(button => {
      const eventId = button.dataset.eventId;
      if (this.favorites.includes(eventId)) {
        button.classList.add('favorited');
      }
    });
  }

  // Pagination Methods
  createPaginationContainer() {
    let paginationContainer = document.querySelector('.event-list-pagination');
    if (!paginationContainer) {
      paginationContainer = document.createElement('div');
      paginationContainer.className = 'event-list-pagination';

      const eventsGrid = document.getElementById('eventsGrid');
      if (eventsGrid && eventsGrid.parentNode) {
        eventsGrid.parentNode.insertBefore(paginationContainer, eventsGrid.nextSibling);
      }
    }
  }

  updatePagination() {
    const paginationContainer = document.querySelector('.event-list-pagination');
    if (!paginationContainer) return;

    const totalPages = this.getTotalPages();

    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let paginationHtml = `
      <div class="pagination-info">
        Showing ${((this.currentPage - 1) * this.eventsPerPage) + 1}-${Math.min(this.currentPage * this.eventsPerPage, this.filteredEvents.length)} of ${this.filteredEvents.length} events
      </div>
      <div class="pagination-controls">
        <button type="button" class="pagination-btn pagination-prev" ${this.currentPage === 1 ? 'disabled' : ''}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,18 9,12 15,6"></polyline>
          </svg>
          Previous
        </button>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      paginationHtml += `<button type="button" class="pagination-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        paginationHtml += `<span class="pagination-ellipsis">...</span>`;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `
        <button type="button" class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">
          ${i}
        </button>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHtml += `<span class="pagination-ellipsis">...</span>`;
      }
      paginationHtml += `<button type="button" class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    paginationHtml += `
        <button type="button" class="pagination-btn pagination-next" ${this.currentPage === totalPages ? 'disabled' : ''}>
          Next
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9,18 15,12 9,6"></polyline>
          </svg>
        </button>
      </div>
    `;

    paginationContainer.innerHTML = paginationHtml;
  }

  initializeFilters() {
    // Create filter buttons if they don't exist
    let filtersContainer = document.querySelector('.event-list-filters');
    if (!filtersContainer) {
      filtersContainer = document.createElement('div');
      filtersContainer.className = 'event-list-filters';

      const eventsGrid = document.getElementById('eventsGrid');
      if (eventsGrid) {
        eventsGrid.parentNode.insertBefore(filtersContainer, eventsGrid);
      }
    }

    const filters = [
      { key: 'all', label: 'All Events' },
      { key: 'seasons', label: 'Seasons' },
      { key: 'travelling-spirits', label: 'Traveling Spirits' },
      { key: 'special-event', label: 'Special Events' },
      { key: 'days-of-events', label: 'Days of Events' },
      { key: 'favorites', label: 'Favorites' },
      { key: 'in-progress', label: 'In Progress' },
      { key: 'coming-soon', label: 'Coming Soon' }
    ];

    filtersContainer.innerHTML = filters.map(filter =>
      `<button type="button" class="event-list-filter-btn ${filter.key === 'all' ? 'active' : ''}" data-filter="${filter.key}">
        ${filter.label}
      </button>`
    ).join('');
  }



  startCountdowns() {
    // console.log('Starting countdowns...'); // Debug log

    // Clear existing intervals
    this.countdownIntervals.forEach(interval => clearInterval(interval));
    this.countdownIntervals.clear();

    const countdownElements = document.querySelectorAll('.event-list-countdown');
    // console.log('Found countdown elements:', countdownElements.length); // Debug log

    countdownElements.forEach(countdown => {
      if (countdown.classList.contains('event-list-countdown-ended')) return;

      const eventCard = countdown.closest('.event-list-card');
      if (!eventCard) return;

      const eventId = eventCard.dataset.eventId;
      const targetDate = countdown.dataset.targetDate;

      // console.log(`Setting up countdown for event ${eventId} with target date ${targetDate}`); // Debug log

      if (targetDate && eventId) {
        const interval = setInterval(() => {
          this.updateCountdown(countdown, targetDate);
        }, 1000);

        this.countdownIntervals.set(eventId, interval);

        // Update immediately
        this.updateCountdown(countdown, targetDate);
      }
    });

    // console.log('Active countdown intervals:', this.countdownIntervals.size); // Debug log
  }

  updateCountdown(element, targetDateStr) {
    const now = new Date().getTime();
    const targetDate = new Date(targetDateStr).getTime();
    const distance = targetDate - now;

    if (distance < 0) {
      element.innerHTML = `
        <div class="event-list-countdown-content">
          <div class="event-list-countdown-header">Event</div>
          <div class="event-list-countdown-time">Ended</div>
        </div>
      `;
      element.className = 'event-list-countdown event-list-countdown-ended';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    const timeElement = element.querySelector('.event-list-countdown-time');

    if (timeElement) {
      // Format the time as "XD XH XM"
      const timeText = `${days}D ${hours}H ${minutes}M`;
      timeElement.textContent = timeText;
    }
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('skyEventsTheme', newTheme);
  }

  // Notification System
  setupNotifications() {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }

  scheduleEventNotification(event, minutesBefore = 30) {
    const eventTime = new Date(event.startDate || event.nextOccurrence);
    const notificationTime = new Date(eventTime.getTime() - (minutesBefore * 60 * 1000));
    const now = new Date();

    if (notificationTime > now) {
      const timeUntilNotification = notificationTime.getTime() - now.getTime();

      setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification(`Sky COTL Event Reminder`, {
            body: `${event.title} starts in ${minutesBefore} minutes!`,
            icon: '/favicon.ico',
            badge: '/favicon.ico'
          });
        }
      }, timeUntilNotification);
    }
  }

  // Utility Methods
  destroy() {
    // Clean up intervals
    this.countdownIntervals.forEach(interval => clearInterval(interval));
    this.countdownIntervals.clear();

    if (this.calendar) {
      this.calendar.destroy();
    }
  }
}

// Initialize the events manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Load saved theme
  const savedTheme = localStorage.getItem('skyEventsTheme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Initialize events manager
  window.skyEventsManager = new SkyEventsManager();

  // Create search input if it doesn't exist - ensure this runs after manager is created
  setTimeout(() => {
    if (!document.getElementById('eventListSearch')) {
      const searchContainer = document.createElement('div');
      searchContainer.className = 'event-list-search-container';
      searchContainer.innerHTML = `
        <input 
          type="text" 
          id="eventListSearch" 
          class="event-list-search-input" 
          placeholder="Search events..." 
          aria-label="Search events"
        >
      `;

      const eventsGrid = document.getElementById('eventsGrid');
      if (eventsGrid) {
        eventsGrid.parentNode.insertBefore(searchContainer, eventsGrid);
        // console.log('Search input created successfully'); // Debug log
      }
    } else {
      // console.log('Search input already exists'); // Debug log
    }
  }, 100);
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SkyEventsManager;
}


// ___________________________STICKER NOTES_____________________________________
window.toggleNote = function () {
  if (noteWidget) {
    noteWidget.toggle();
  }
};

window.updateNote = async function (type, message, priority) {
  if (!db) {
    console.error('Firebase not initialized');
    return;
  }

  try {
    const noteDocRef = doc(db, 'updateNotes', 'note#1');
    const updateData = {
      isActive: true,
      createdAt: serverTimestamp(),
      createdBy: 'admin'
    };

    if (type !== undefined) updateData.type = type;
    if (message !== undefined) updateData.message = message;
    if (priority !== undefined) updateData.priority = priority;

    await updateDoc(noteDocRef, updateData);
    console.log('Note updated successfully');
  } catch (error) {
    console.error('Error updating note:', error);
  }
};

window.hideNote = async function () {
  if (!db) {
    console.error('Firebase not initialized');
    return;
  }

  try {
    const noteDocRef = doc(db, 'updateNotes', 'note#1');
    await updateDoc(noteDocRef, {
      isActive: false
    });
    console.log('Note hidden successfully');
  } catch (error) {
    console.error('Error hiding note:', error);
  }
};