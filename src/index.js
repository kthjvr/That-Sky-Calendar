// Import Firebase SDK components
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

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
const db = getFirestore();
const colRef = collection(db, "events");
const shardsCollection = collection(db, "shards");

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
    eventContent: function (info) {
      const iconPath = info.event.extendedProps.icon;
      if (iconPath) {
        return {
          html: `
            <div class="event-icon-container">
              <img src="${iconPath}" class="event-icon" alt="sky: cotl, shards" />
            </div>
          `,
        };
      } else {
        return {
          html: `<span class="fc-event-title">${info.event.title}</span>`,
        };
      }
    },
    eventOrder: "description",
    eventClick: function (info) {
      openEventModal(info.event);
    },
  });
  calendar.render();

  // Add category filter dropdown
  addCategoryFilter(calendar, eventsData);
}

// Add category filter to calendar
function addCategoryFilter(calendar, eventsData) {
  const categoryFilterDropdown = document.createElement("select");
  categoryFilterDropdown.id = "category-filter";
  categoryFilterDropdown.title = "category-filter";
  categoryFilterDropdown.innerHTML = `
    <option value="">All Categories</option>
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

  const start = new Date(event.start);
  const end = new Date(event.end);
  const dateRange = formatDateRange(start, end);
  const title = event.title.replace(/^[\p{Emoji}\p{Extended_Pictographic}]+\s*/u, "");

  // Determine badge text based on category
  let badgeText = event.category || "EVENT";
  if (badgeText.toUpperCase().includes("DAY")) {
    badgeText = "DAYS OF";
  } else if (badgeText.toUpperCase().includes("SEASONS")) {
    badgeText = "SEASON";
  } else if (badgeText.toUpperCase().includes("TRAVELLING-SPIRITS")) {
    badgeText = "TS";
  }

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
    <div class="days-badge">${badgeText}</div>
    <h2>${title}</h2>
    <p class="date">${dateRange}</p>
    <p class="description">${event.description || "No description available"}</p>
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
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = `${event.title} image ${index + 1}`;
      img.className = index === 0 ? "active" : "";
      carouselImagesContainer.appendChild(img);
    });

    // Show/hide carousel controls based on image count
    const carouselBtns = document.querySelectorAll(".carousel-btn-panel");
    carouselBtns.forEach(btn => {
      btn.style.display = imageUrls.length > 1 ? "block" : "none";
    });
  } else {
    // Add placeholder image if no images provided
    const img = document.createElement("img");
    img.src = "https://ik.imagekit.io/e3wiv79bq/Sky:%20Cotl/not%20available?updatedAt=1744181831782";
    img.alt = "Event placeholder image";
    img.className = "active";
    carouselImagesContainer.appendChild(img);

    // Hide carousel controls
    document.querySelectorAll(".carousel-btn-panel").forEach(btn => {
      btn.style.display = "none";
    });
  }
}

// Navigate carousel in the preview panel
function navigateCarouselPanel(direction) {
  const images = document.querySelectorAll(".carousel-images-panel img");
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
      }
    });
  });
}

// Fetch events from Firebase
function fetchEvents() {
  Promise.all([getDocs(query(colRef, orderBy("start", "asc")))])
    .then(([eventsSnapshot]) => {
      allEvents = [];

      // Process events from the 'events' collection
      eventsSnapshot.docs.forEach(doc => {
        const start = new Date(doc.data().start);
        const end = new Date(doc.data().end);

        // Get the user's timezone
        const userTimezone = moment.tz.guess();

        // Convert times to moment objects (already in LA time)
        const startMoment = moment(start).tz("America/Los_Angeles");
        const endMoment = moment(end).tz("America/Los_Angeles");

        // Set the times properly
        startMoment.hour(24).minute(0).second(0);
        endMoment.hour(23).minute(59).second(59);

        // Convert to user's timezone
        const startLocalTime = startMoment.clone().tz(userTimezone);
        const endLocalTime = endMoment.clone().tz(userTimezone);

        // Create a unique ID for the event
        const eventId = doc.id || generateEventId(doc.data().title);

        allEvents.push({
          id: eventId,
          title: doc.data().title,
          start: startLocalTime.toDate(),
          end: endLocalTime.toDate(),
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
  return badgeText;
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

// Open event modal with detailed information
function openEventModal(event) {
  const modal = document.getElementById("eventModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalDateStart = document.getElementById("modalStart");
  const modalDateEnd = document.getElementById("modalEnd");
  const modalDescription = document.getElementById("modalDescription");
  const modalCta = document.getElementById("modalCta");
  const carouselImagesContainer = document.querySelector(".carousel-images");
  const creditList = document.querySelector(".credits-list");

  const formattedStart = formatDate_withTZ(event.start, "short");
  const formattedEnd = formatDate_withTZ(event.end, "short");

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
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = `${event.title} image ${index + 1}`;
      img.className = index === 0 ? "active" : "";
      carouselImagesContainer.appendChild(img);
    });

    // Show/hide carousel controls
    const carouselBtns = document.querySelectorAll(".carousel-btn");
    carouselBtns.forEach(btn => {
      btn.style.display = imageUrls.length > 1 ? "block" : "none";
    });
  } else {
    // Add placeholder image
    const img = document.createElement("img");
    img.src = "https://ik.imagekit.io/e3wiv79bq/Sky:%20Cotl/not%20available?updatedAt=1744181831782";
    img.alt = "Event placeholder image";
    img.className = "active";
    carouselImagesContainer.appendChild(img);

    // Hide carousel controls
    document.querySelectorAll(".carousel-btn").forEach(btn => {
      btn.style.display = "none";
    });
  }
}

// Format date with timezone
function formatDate_withTZ(date, format) {
  const options = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "numeric",
    hour12: true,
  };
  const formattedDate = new Intl.DateTimeFormat("en-US", options).format(date);
  const timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return `${formattedDate} (${timezoneName})`;
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

    // Process events from the 'events' collection
    eventsSnapshot.docs.forEach((doc) => {
      const start = new Date(doc.data().start);
      const end = new Date(doc.data().end);

      const moment = require("moment");
      require("moment-timezone");

      // Get the user's timezone
      const userTimezone = moment.tz.guess();
      // console.log("User's Timezone:", userTimezone);

      // Convert start and end times to moment objects (already in LA time)
      const startMoment = moment(start).tz("America/Los_Angeles");
      const endMoment = moment(end).tz("America/Los_Angeles");

      // Set the start time to 12:00 AM PDT
      startMoment.hour(24).minute(0).second(0);

      // Set the end time to 23:59 in LA
      endMoment.hour(23).minute(59).second(59);

      // Convert the LA times to the user's timezone``
      const startLocalTime = startMoment.clone().tz(userTimezone);
      const endLocalTime = endMoment.clone().tz(userTimezone);

      // Convert back to Date objects
      const formattedStartDate = startLocalTime.toDate();
      const formattedEndDate = endLocalTime.toDate();

      // Create a unique ID for the event
      const eventId = doc.id || generateEventId(doc.data().title);

      events.push({
        id: eventId,
        title: doc.data().title,
        start: formattedStartDate,
        end: formattedEndDate,
        color: doc.data().color,
        description: doc.data().description,
        images: doc.data().images,
        blogUrl: doc.data().blogUrl,
        image: doc.data().image,
        credits: doc.data().credits,
        category: doc.data().category || "Default Category",
      });
    });

    // Initialize FullCalendar with the combined events
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
      }, 500);
    }, 500);
  
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
      <a id="modalCta" class="cta-btn" title="Sky Blog">
      </a>
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
      </style>
    `;

    document.head.insertAdjacentHTML("beforeend", modalCSS);
});
  