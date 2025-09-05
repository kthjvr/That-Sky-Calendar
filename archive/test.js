// ================== FIREBASE INIT ==================
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your Firebase config (replace with your actual keys)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore collection reference
const colRef = collection(db, "events");

// ================== FIREBASE + UTILITIES ==================
import { 
  doc, getDoc, updateDoc, serverTimestamp, 
  query, where, orderBy, limit, getDocs 
} from "firebase/firestore";

let allEvents = [];
let noteWidget;

// ================== CACHING ==================
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

// ================== EVENT FETCHING (OPTIMIZED) ==================
class OptimizedEventManager {
  constructor() {
    this.cacheManager = new FirebaseCacheManager();
    this.eventCache = null;
    this.lastFetchTime = 0;
    this.fetchInterval = 5 * 60 * 1000;
    this.isOnline = navigator.onLine;
    this.setupNetworkListeners();
  }

  setupNetworkListeners() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.fetchEventsIfNeeded(true);
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.fetchEventsIfNeeded();
      }
    });
  }

  async fetchEventsIfNeeded(forceRefresh = false) {
    const now = Date.now();
    const cacheKey = "events_data";

    if (!forceRefresh && this.eventCache && (now - this.lastFetchTime) < this.fetchInterval) {
      console.log("Using cached events data");
      return this.eventCache;
    }

    const cachedData = this.cacheManager.get(cacheKey);
    if (!forceRefresh && cachedData && this.isOnline) {
      console.log("Using memory cached events");
      this.eventCache = cachedData;
      return cachedData;
    }

    if (!this.isOnline && this.eventCache) {
      console.log("Offline: using existing cache");
      return this.eventCache;
    }

    try {
      console.log("Fetching fresh events data from Firebase");
      const events = await this.fetchEventsFromFirebase();

      this.eventCache = events;
      this.lastFetchTime = now;
      this.cacheManager.set(cacheKey, events, this.fetchInterval);

      return events;
    } catch (error) {
      console.error("Error fetching events:", error);
      if (this.eventCache) {
        console.log("Error occurred: using cached events");
        return this.eventCache;
      }
      throw error;
    }
  }

  async fetchEventsFromFirebase() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const eventsQuery = query(
      colRef,
      where("start", ">=", thirtyDaysAgo.toISOString().split("T")[0]),
      orderBy("start", "desc"),
      limit(50)
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
        startLA = dayjs.tz(`${startRaw} ${startTime}`, "YYYY-MM-DD HH:mm", "America/Los_Angeles");
        const endTime = doc.data().endTime;
        if (endTime) {
          endLA = dayjs.tz(`${endRaw} ${endTime}`, "YYYY-MM-DD HH:mm", "America/Los_Angeles");
        } else {
          endLA = startLA.add(1, "hour");
        }
        startLocal = startLA.tz(userTimezone);
        endLocal = endLA.tz(userTimezone);
      } else {
        startLA = dayjs.tz(startRaw, "America/Los_Angeles").startOf("day");
        endLA = dayjs.tz(endRaw, "America/Los_Angeles").endOf("day");
        startLocal = startLA.tz(userTimezone).startOf("day");
        endLocal = endLA.tz(userTimezone).startOf("day");
      }

      if (!startLocal.isValid() || !endLocal.isValid()) {
        console.warn("Skipping invalid event:", { id: doc.id, startRaw, endRaw, startTime });
        return null;
      }

      const eventId = doc.id || this.generateEventId(doc.data().title);

      return {
        id: eventId,
        title: doc.data().title,
        start: startLA.toDate(),
        end: endLA.toDate(),
        allDay: !startTime,
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
        spiritCount: doc.data().spiritCount,
      };
    } catch (error) {
      console.warn("Error processing event:", doc.id, error);
      return null;
    }
  }

  generateEventId(title) {
    return title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  }
}

const optimizedEventManager = new OptimizedEventManager();
window.optimizedEventManager = optimizedEventManager;


// ================== SKY EVENTS MANAGER (UI + PAGINATION) ==================
class SkyEventsManager {
  constructor() {
    this.events = [];
    this.allEvents = [];
    this.favorites = JSON.parse(localStorage.getItem("skyEventsFavorites") || "[]");
    this.currentFilter = "all";
    this.searchTerm = "";
    this.countdownIntervals = new Map();
    this.calendar = null;

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

  setEventsData(eventsData) {
    this.allEvents = eventsData;
    this.events = this.convertFirebaseEventsToCardFormat(eventsData);
    this.filterEvents();
    this.renderCurrentPage();
  }

  convertFirebaseEventsToCardFormat(firebaseEvents) {
    const events = firebaseEvents.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description || "",
      category: event.category || "special",
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

    return events.sort((a, b) => new Date(b.start) - new Date(a.start));
  }

  filterEvents() {
    this.filteredEvents = this.events.filter(event => {
      const now = new Date();
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);

      const isActive = now >= startDate && now <= endDate;
      const isUpcoming = now <= startDate;

      const matchesFilter =
        this.currentFilter === "all" ||
        this.currentFilter === event.category ||
        (this.currentFilter === "favorites" && this.favorites.includes(event.id)) ||
        (this.currentFilter === "in-progress" && isActive) ||
        (this.currentFilter === "coming-soon" && isUpcoming);

      const searchLower = this.searchTerm.toLowerCase();
      const matchesSearch = this.searchTerm === "" ||
        event.title.toLowerCase().includes(searchLower);

      return matchesFilter && matchesSearch;
    });

    this.currentPage = 1;
  }

  getCurrentPageEvents() {
    const startIndex = (this.currentPage - 1) * this.eventsPerPage;
    return this.filteredEvents.slice(startIndex, startIndex + this.eventsPerPage);
  }

  getTotalPages() {
    return Math.ceil(this.filteredEvents.length / this.eventsPerPage);
  }

  renderCurrentPage() {
    const eventsGrid = document.getElementById("eventsGrid");
    if (!eventsGrid) return;

    eventsGrid.innerHTML = "";
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

    setTimeout(() => this.startCountdowns(), 50);
  }

  createEventCard(event) {
    const card = document.createElement("div");
    card.className = `event-list-card ${event.category}`;
    card.dataset.eventId = event.id;

    const now = new Date();
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);

    const isActive = now >= startDate && now <= endDate;
    const isUpcoming = now < startDate;
    const hasEnded = now > endDate;

    let statusClass = "ended";
    let statusText = "Event Ended";

    if (isActive) {
      statusClass = "active";
      statusText = "Active Now";
    } else if (isUpcoming) {
      statusClass = "upcoming";
      statusText = "Coming Soon";
    }

    card.innerHTML = `
      <div class="event-list-content">
        <div class="event-list-badge">
          <span class="event-list-badge-item">${event.category}</span>
          <div class="event-list-status ${statusClass}">${statusText}</div>
        </div>
        <h3 class="event-list-title">${event.title}</h3>
        <div class="event-list-dates">${this.formatDateRange(startDate, endDate)}</div>
        <div class="event-list-actions">
          <button type="button" class="event-list-btn event-list-btn-primary" 
            onclick="openEventModal(${JSON.stringify(event).replace(/"/g, "&quot;")})">
            View Details
          </button>
          <button type="button" class="event-list-btn event-list-btn-secondary event-list-favorite-btn" data-event-id="${event.id}">
            ❤
          </button>
        </div>
      </div>
    `;
    return card;
  }

  formatDateRange(startDate, endDate) {
    const start = this.formatDate(startDate);
    const end = this.formatDate(endDate);

    if (startDate.getMonth() === endDate.getMonth() &&
        startDate.getFullYear() === endDate.getFullYear()) {
      const month = startDate.toLocaleDateString("en-US", { month: "short" });
      return `${month} ${startDate.getDate()} - ${endDate.getDate()}, ${startDate.getFullYear()}`;
    }

    return `${start} - ${end}`;
  }

  formatDate(date) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  setupEventListeners() {
    document.addEventListener("input", (e) => {
      if (e.target.id === "eventListSearch" || e.target.classList.contains("event-list-search-input")) {
        this.searchTerm = e.target.value.toLowerCase();
        this.filterEvents();
        this.renderCurrentPage();
      }
    });

    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("event-list-filter-btn")) {
        this.handleFilterClick(e.target);
      }

      if (e.target.closest(".event-list-favorite-btn")) {
        this.handleFavoriteClick(e.target.closest(".event-list-favorite-btn"));
      }

      if (e.target.classList.contains("pagination-btn")) {
        const page = parseInt(e.target.dataset.page);
        if (page && page !== this.currentPage) {
          this.currentPage = page;
          this.renderCurrentPage();
        }
      }

      if (e.target.classList.contains("pagination-prev") && this.currentPage > 1) {
        this.currentPage--;
        this.renderCurrentPage();
      }

      if (e.target.classList.contains("pagination-next") && this.currentPage < this.getTotalPages()) {
        this.currentPage++;
        this.renderCurrentPage();
      }
    });
  }

  handleFilterClick(button) {
    document.querySelectorAll(".event-list-filter-btn").forEach(btn =>
      btn.classList.remove("active")
    );
    button.classList.add("active");
    this.currentFilter = button.dataset.filter;
    this.filterEvents();
    this.renderCurrentPage();
  }

  handleFavoriteClick(button) {
    const eventId = button.dataset.eventId;
    const index = this.favorites.indexOf(eventId);

    if (index > -1) {
      this.favorites.splice(index, 1);
      button.classList.remove("favorited");
    } else {
      this.favorites.push(eventId);
      button.classList.add("favorited");
    }

    localStorage.setItem("skyEventsFavorites", JSON.stringify(this.favorites));
    this.updateFavoriteButton(button, eventId);
  }

  updateFavoriteButton(button, eventId) {
    const isFavorited = this.favorites.includes(eventId);
    button.classList.toggle("favorited", isFavorited);
  }

  showEmptyState() {
    const eventsGrid = document.getElementById("eventsGrid");
    if (!eventsGrid) return;

    let emptyMessage = `
      <div class="event-list-empty-message">
        <h3>No events found</h3>
        <p>Try adjusting your search terms or filters</p>
      </div>
    `;

    eventsGrid.innerHTML = emptyMessage;
  }

  updateFavoriteButtons() {
    document.querySelectorAll(".event-list-favorite-btn").forEach(button => {
      const eventId = button.dataset.eventId;
      if (this.favorites.includes(eventId)) {
        button.classList.add("favorited");
      }
    });
  }

  createPaginationContainer() {
    let paginationContainer = document.querySelector(".event-list-pagination");
    if (!paginationContainer) {
      paginationContainer = document.createElement("div");
      paginationContainer.className = "event-list-pagination";
      const eventsGrid = document.getElementById("eventsGrid");
      if (eventsGrid && eventsGrid.parentNode) {
        eventsGrid.parentNode.insertBefore(paginationContainer, eventsGrid.nextSibling);
      }
    }
  }

  updatePagination() {
    const paginationContainer = document.querySelector(".event-list-pagination");
    if (!paginationContainer) return;

    const totalPages = this.getTotalPages();
    if (totalPages <= 1) {
      paginationContainer.innerHTML = "";
      return;
    }

    let paginationHtml = `
      <button type="button" class="pagination-btn pagination-prev" ${this.currentPage === 1 ? "disabled" : ""}>Prev</button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      paginationHtml += `
        <button type="button" class="pagination-btn ${i === this.currentPage ? "active" : ""}" data-page="${i}">
          ${i}
        </button>
      `;
    }

    paginationHtml += `
      <button type="button" class="pagination-btn pagination-next" ${this.currentPage === totalPages ? "disabled" : ""}>Next</button>
    `;

    paginationContainer.innerHTML = paginationHtml;
  }

  startCountdowns() {
    this.countdownIntervals.forEach(interval => clearInterval(interval));
    this.countdownIntervals.clear();

    const countdownElements = document.querySelectorAll(".event-list-countdown");
    countdownElements.forEach(countdown => {
      const targetDate = countdown.dataset.targetDate;
      const eventCard = countdown.closest(".event-list-card");
      if (!targetDate || !eventCard) return;

      const eventId = eventCard.dataset.eventId;
      const interval = setInterval(() => this.updateCountdown(countdown, targetDate), 1000);
      this.countdownIntervals.set(eventId, interval);
      this.updateCountdown(countdown, targetDate);
    });
  }

  updateCountdown(element, targetDateStr) {
    const now = Date.now();
    const targetDate = new Date(targetDateStr).getTime();
    const distance = targetDate - now;

    if (distance < 0) {
      element.textContent = "Event Ended";
      element.className = "event-list-countdown event-list-countdown-ended";
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    element.textContent = `${days}D ${hours}H ${minutes}M`;
  }
}

// ================== NOTE WIDGET (OPTIMIZED) ==================
class OptimizedNoteWidget {
  constructor(firestoreDb) {
    this.db = firestoreDb;
    this.cacheManager = new FirebaseCacheManager();
    this.checkInterval = 2 * 60 * 1000;
    this.init();
  }

  init() {
    this.elements = {
      sticker: document.getElementById("noteSticker"),
      content: document.getElementById("noteContent"),
      message: document.getElementById("noteMessage"),
      typeIcon: document.getElementById("noteTypeIcon"),
      typeText: document.getElementById("noteTypeText"),
      timestamp: document.getElementById("noteTimestamp")
    };

    this.startPolling();
  }

  startPolling() {
    this.checkForNotes();
    this.pollInterval = setInterval(() => {
      if (document.visibilityState === "visible") this.checkForNotes();
    }, this.checkInterval);
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
        this.cacheManager.set(cacheKey, noteData, 60000);
        this.handleNoteData(noteData);
      } else {
        this.hide();
      }
    } catch (error) {
      console.error("Error fetching note:", error);
    }
  }

  handleNoteData(noteData) {
    if (noteData.isActive) {
      this.displayNote(noteData);
    } else {
      this.hide();
    }
  }

  displayNote(noteData) {
    if (this.elements.message) this.elements.message.textContent = noteData.message || "";
    if (this.elements.typeText) this.elements.typeText.textContent = noteData.type || "Note";
    if (this.elements.sticker) this.elements.sticker.style.display = "block";
  }

  hide() {
    if (this.elements.sticker) this.elements.sticker.style.display = "none";
  }
}

// ================== NOTE ACTIONS ==================
window.updateNote = async function (type, message, priority) {
  if (!db) return console.error("Firebase not initialized");
  try {
    const noteDocRef = doc(db, "updateNotes", "note#1");
    const updateData = { isActive: true, createdAt: serverTimestamp(), type, message, priority };
    await updateDoc(noteDocRef, updateData);
    console.log("Note updated successfully");
  } catch (error) {
    console.error("Error updating note:", error);
  }
};

window.hideNote = async function () {
  if (!db) return console.error("Firebase not initialized");
  try {
    const noteDocRef = doc(db, "updateNotes", "note#1");
    await updateDoc(noteDocRef, { isActive: false });
    console.log("Note hidden successfully");
  } catch (error) {
    console.error("Error hiding note:", error);
  }
};

// ================== INITIALIZATION ==================
async function initializeApp() {
  try {
    const events = await optimizedEventManager.fetchEventsIfNeeded();
    allEvents = events;

    window.skyEventsManager?.setEventsData(events);
    initializeCalendar(events);
    displayEventNotices(events);
    showQuickOverview(events);
  } catch (error) {
    console.error("Error initializing app:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
  if (typeof db !== "undefined") noteWidget = new OptimizedNoteWidget(db);
  window.skyEventsManager = new SkyEventsManager();
});

// ================== PERIODIC REFRESH ==================
function setupPeriodicRefresh() {
  // Refresh data every 10 minutes when page is visible
  setInterval(async () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      try {
        const events = await optimizedEventManager.fetchEventsIfNeeded();
        
        if (window.skyEventsManager) {
          window.skyEventsManager.setEventsData(events);
        }

        if (typeof updateCalendarEvents === "function") {
          updateCalendarEvents(events);
        }

        console.log("Data refreshed successfully");
      } catch (error) {
        console.error("Background refresh failed:", error);
      }
    }
  }, 10 * 60 * 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  setupPeriodicRefresh();
});



































