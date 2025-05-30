// Import the functions you need from the SDKs you need
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

// initialize firebase app
initializeApp(firebaseConfig);

// initialize services
const db = getFirestore();

// get collection reference
const colRef = collection(db, "events");
const shardsCollection = collection(db, "shards");

// Function to initialize FullCalendar
function initializeCalendar(eventsData) {
  var calendarEl = document.getElementById("calendar");

  var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    fixedWeekCount: false,
    aspectRatio: 1.35,
    height: "auto",
    events: eventsData,
    eventContent: function (info) {
      var iconPath = info.event.extendedProps.icon;
      if (iconPath) {
        return {
          html: `
            <div class="event-icon-container">
              <img src="${iconPath}" class="event-icon" alt="sky: cotl, shards" />
            </div>
          `,
        };
      } else {
        // If no icon is provided, render the default title and time
        return {
          html: `<span class="fc-event-title">${info.event.title}</span>`,
        };
      }
    },
    eventOrder: "description",
    eventClick: function(info) {
      openEventModal(info.event);
    }
  });
  calendar.render();

  // filter
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
  const calendarHeader = document.querySelector(
    ".fc-toolbar-chunk:nth-child(2)"
  );
  calendarHeader.appendChild(categoryFilterDropdown);

  categoryFilterDropdown.addEventListener("change", function () {
    const selectedCategory = this.value.toLowerCase();
    // console.log(selectedCategory);

    const filteredEvents = eventsData.filter((event) => {
      if (selectedCategory === "hide") {
        return (
          !event.category || !event.category.toLowerCase().includes("shard")
        );
      } else {
        if (event.category) {
          return (
            event.category.toLowerCase() === selectedCategory ||
            selectedCategory === ""
          );
        } else {
          return selectedCategory === "";
        }
      }
    });
    calendar.removeAllEventSources();
    calendar.addEventSource(filteredEvents);
  });
  
}

// Fetch events and shard events, then combine and initialize the calendar
Promise.all([
  getDocs(query(colRef, orderBy("start", "asc"))),
  getDocs(shardsCollection),
])
  .then(([eventsSnapshot, shardsSnapshot]) => {
    const events = [];
    const shardEvents = [];

    // Process shard events from the 'shards' collection
    shardsSnapshot.docs.forEach((doc, shardIndex) => {
      const title = doc.data().title;
      const color = doc.data().color;
      const datesString = doc.data().dates;
      const imageURL = doc.data().image;

      const dates = datesString.split(",").map((date) => parseInt(date.trim()));
      const month = doc.data().month;

      dates.forEach((date) => {
        const startDate = new Date(`2024-${month}-${date}`);
        const endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);

        // Apply PST time
        startDate.setHours(17, 30, 0); // 5:30 PM

        shardEvents.push({
          title: title,
          start: startDate,
          end: endDate,
          color: color,
          description: ``,
          icon: imageURL,
          className: doc.data().image ? "has-image" : "",
          category: doc.data().category || "Default Category",
        });
      });
    });

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

      events.push({
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

    // Combine events and shard events
    const allEvents = [...shardEvents, ...events];

    // Initialize FullCalendar with the combined events
    initializeCalendar(allEvents);
    updateSummary(events);
    showOngoingEvents(events);
    showIncomingEvents(events);
    updateSpirits(events);
    showQuickOverview(events);
    displayEventNotices(events);
    // console.log(events);
  })
  .catch((error) => {
    console.error("Error getting documents: ", error);
  });

function updateSummary(eventsData, month = new Date().getMonth()) {
  const legendContainer = document.querySelector(".sum-event-modal");
  legendContainer.innerHTML = "";

  // Create heading and button container
  const headingContainer = document.createElement("div");
  headingContainer.classList.add("summary-heading");
  const heading = document.createElement("h2");
  const monthName = new Date(new Date().getFullYear(), month).toLocaleString(
    "en-US",
    { month: "long" }
  );
  heading.textContent = `${monthName} Events`;
  headingContainer.appendChild(heading);
  const buttonContainer = document.createElement("div");
  buttonContainer.classList.add("buttons");

  // Add next and previous buttons
  const nextButton = document.createElement("button");
  nextButton.classList.add("next-btn");
  nextButton.textContent = "Next";
  nextButton.addEventListener("click", () => {
    month = (month + 1) % 12; // Cycle through months
    updateSummary(eventsData, month);
  });

  const previousButton = document.createElement("button");
  previousButton.classList.add("back-btn");
  previousButton.textContent = "Previous";
  previousButton.addEventListener("click", () => {
    month = (month - 1 + 12) % 12; // Cycle through months
    updateSummary(eventsData, month);
  });

  buttonContainer.appendChild(previousButton);
  buttonContainer.appendChild(nextButton);

  headingContainer.appendChild(buttonContainer);
  legendContainer.appendChild(headingContainer);

  // Create a set to store colors
  const uniqueColors = new Set();
  let hasEvents = false;

  eventsData.forEach((event) => {
    // Convert strings to Date objects
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);

    // Check if the event falls within the specified month
    if (startDate.getMonth() === month || endDate.getMonth() === month) {
      uniqueColors.add(event.color);
      hasEvents = true; // Set flag to true if an event is found
    }
  });

  // Create legend items for each color
  if (hasEvents) {
    uniqueColors.forEach((color) => {
      const legendItem = document.createElement("div");
      legendItem.classList.add("event-modal-card");
      legendItem.style.borderLeft = `4px solid ${color}`;

      // Create the event icon
      const legendIcon = document.createElement("div");
      legendIcon.classList.add("event-line");
      legendIcon.style.backgroundColor = color;
      legendItem.appendChild(legendIcon);

      // Create the event details
      const eventDetails = document.createElement("div");
      eventDetails.classList.add("event-details");

      // Create the event title
      const legendText = document.createElement("p");
      legendText.classList.add("sum-event-modal-card-title");
      legendText.textContent = eventsData.title;
      eventDetails.appendChild(legendText);

      // Find the event with the matching color and use its title
      const matchingEvent = eventsData.find((event) => event.color === color);
      if (matchingEvent) {
        // Convert strings to Date objects
        const startDate = new Date(matchingEvent.start);
        const endDate = new Date(matchingEvent.end);

        // Format the dates
        const formattedStartDate = startDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        const formattedEndDate = endDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        // Check if the event has ended
        const today = new Date();
        if (today > endDate) {
          legendText.style.textDecoration = "line-through";
          legendText.style.textDecorationThickness = "2px";
          legendText.style.textDecorationColor = "black";
        }

        // Add formatted dates to the legend text
        legendText.innerHTML = `
        <div class="event-details">
          <h3 class="event-modal-card-title">${matchingEvent.title}</h3>
          <p class="event-modal-card-text">${formattedStartDate} - ${formattedEndDate}</p>
        </div>`;
      } else {
        legendText.textContent = "Unknown Event"; // handle the case where no matching event is found
      }

      legendItem.appendChild(legendIcon);
      legendItem.appendChild(legendText);
      legendContainer.appendChild(legendItem);
    });
  } else {
    // Display "No events found" message if no events exist for the month
    const noEventsMessage = document.createElement("p");
    noEventsMessage.textContent = "No events found for this month.";
    legendContainer.appendChild(noEventsMessage);
  }
}

function showOngoingEvents(eventsData) {
  const today = new Date();
  const ongoingEvents = [];

  eventsData.forEach((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    if (today >= eventStart && today <= eventEnd) {
      ongoingEvents.push(event);
    }
  });

  // Display ongoing events
  const eventModalContainer = document.querySelector(
    ".on-event-modal-container"
  );
  const eventModal = document.querySelector(".on-event-modal");
  if (ongoingEvents.length > 0) {
    ongoingEvents.forEach((event) => {
      // Create the event modal card
      const eventModalCard = document.createElement("div");
      eventModalCard.classList.add("on-event-modal-card");
      eventModalCard.style.borderLeft = `4px solid ${event.color}`;

      // Create the event icon (you can adjust the src)
      const eventLine = document.createElement("div");
      eventLine.classList.add("event-line");
      eventLine.style.backgroundColor = event.color; // Set the background color
      eventModalCard.appendChild(eventLine);

      // Create the event details
      const eventDetails = document.createElement("div");
      eventDetails.classList.add("event-details");

      // Create the event title
      const eventTitle = document.createElement("h3");
      eventTitle.classList.add("event-modal-card-title");
      eventTitle.textContent = event.title;
      eventDetails.appendChild(eventTitle);

      // Create the event start and end dates
      const eventDates = document.createElement("p");
      eventDates.classList.add("event-modal-card-text");
      const formattedStart = formatDate(event.start, "MMM dd yyyy hh:mm a");
      const formattedEnd = formatDate(event.end, "MMM dd yyyy hh:mm a");
      eventDates.textContent = `${formattedStart} - ${formattedEnd}`;
      eventDetails.appendChild(eventDates);

      // Append the details to the event card
      eventModalCard.appendChild(eventDetails);

      // Append the event card to the event modal
      eventModal.appendChild(eventModalCard);
    });
  } else {
    const noOngoingEvents = document.createElement("p");
    noOngoingEvents.textContent = "There are no ongoing events.";
    ongoingContainer.appendChild(noOngoingEvents);
  }
}

function showIncomingEvents(eventsData) {
  const today = new Date();
  const incomingEvents = [];

  eventsData.forEach((event) => {
    const eventStart = new Date(event.start);
    if (today < eventStart) {
      incomingEvents.push(event);
    }
  });

  // Display incoming events
  const eventModalContainer = document.querySelector(".event-modal-container");
  const eventModal = document.querySelector(".event-modal");
  if (incomingEvents.length > 0) {
    incomingEvents.forEach((event) => {
      // Create the event modal card
      const eventModalCard = document.createElement("div");
      eventModalCard.classList.add("event-modal-card");
      eventModalCard.style.borderLeft = `4px solid ${event.color}`;

      // Create the event icon (you can adjust the src)
      const eventLine = document.createElement("div");
      eventLine.classList.add("event-line");
      eventLine.style.backgroundColor = event.color; // Set the background color
      eventModalCard.appendChild(eventLine);

      // Create the event details
      const eventDetails = document.createElement("div");
      eventDetails.classList.add("event-details");

      // Create the event title
      const eventTitle = document.createElement("h3");
      eventTitle.classList.add("event-modal-card-title");
      eventTitle.textContent = event.title;
      eventDetails.appendChild(eventTitle);

      // Create the event start and end dates
      const eventDates = document.createElement("p");
      eventDates.classList.add("event-modal-card-text");
      const formattedStart = formatDate(event.start, "MMM dd yyyy hh:mm a");
      const formattedEnd = formatDate(event.end, "MMM dd yyyy hh:mm a");
      eventDates.textContent = `${formattedStart} - ${formattedEnd}`;
      eventDetails.appendChild(eventDates);

      // Append the details to the event card
      eventModalCard.appendChild(eventDetails);

      // Append the event card to the event modal
      eventModal.appendChild(eventModalCard);
    });
  } else {
    const noIncomingEvents = document.createElement("p");
    noIncomingEvents.textContent = "There are no incoming events.";
    incomingContainer.appendChild(noIncomingEvents);
  }
}

function formatDate(date, format) {
  const options = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "numeric",
    hour12: true,
  };
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

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

  // Get GMT offset and location name
  const timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone; // Get timezone name

  // Construct the final string
  return `${formattedDate} (${timezoneName})`;
}

function updateSpirits(eventsData, month = new Date().getMonth()) {
  const legendContainer = document.querySelector(".ts-event-modal");
  legendContainer.innerHTML = "";

  // Create heading and button container
  const headingContainer = document.createElement("div");
  headingContainer.classList.add("summary-heading");
  const heading = document.createElement("h2");
  const monthName = new Date(new Date().getFullYear(), month).toLocaleString(
    "en-US",
    { month: "long" }
  );
  heading.textContent = `${monthName} Traveling Spirits`;
  headingContainer.appendChild(heading);
  const buttonContainer = document.createElement("div");
  buttonContainer.classList.add("buttons");

  // Add next and previous buttons
  const nextButton = document.createElement("button");
  nextButton.classList.add("next-btn");
  nextButton.textContent = "Next";
  nextButton.addEventListener("click", () => {
    month = (month + 1) % 12; // Cycle through months
    updateSpirits(eventsData, month);
  });

  const previousButton = document.createElement("button");
  previousButton.classList.add("back-btn");
  previousButton.textContent = "Previous";
  previousButton.addEventListener("click", () => {
    month = (month - 1 + 12) % 12; // Cycle through months
    updateSpirits(eventsData, month);
  });

  buttonContainer.appendChild(previousButton);
  buttonContainer.appendChild(nextButton);

  headingContainer.appendChild(buttonContainer);
  legendContainer.appendChild(headingContainer);

  const filteredEvents = eventsData.filter(
    (event) => event.category === "travelling-spirits"
  );

  // Create a set to store colors
  const uniqueColors = new Set();
  let hasEvents = false;
  let activeItem = null;

  filteredEvents.forEach((event) => {
    // Convert strings to Date objects
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);

    // Check if the event falls within the specified month
    if (startDate.getMonth() === month || endDate.getMonth() === month) {
      uniqueColors.add(event.color);
      hasEvents = true; // Set flag to true if an event is found
    }
  });

  // Create legend items for each color
  if (hasEvents) {
    uniqueColors.forEach((color) => {
      const legendItem = document.createElement("div");
      legendItem.classList.add("event-modal-card");
      legendItem.style.borderLeft = `4px solid ${color}`;

      // Create the event icon
      const legendIcon = document.createElement("div");
      legendIcon.classList.add("event-line");
      legendIcon.style.backgroundColor = color;
      legendItem.appendChild(legendIcon);

      // Create the event details
      const eventDetails = document.createElement("div");
      eventDetails.classList.add("event-details");

      // Create the event title
      const legendText = document.createElement("p");
      legendText.classList.add("sum-event-modal-card-title");
      legendText.textContent = eventsData.title;
      eventDetails.appendChild(legendText);

      // Find the event with the matching color and use its title
      const matchingEvent = eventsData.find((event) => event.color === color);
      if (matchingEvent) {
        // Convert strings to Date objects
        const startDate = new Date(matchingEvent.start);
        const endDate = new Date(matchingEvent.end);

        // Format the dates
        const formattedStartDate = startDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        const formattedEndDate = endDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        // Check if the event has ended
        const today = new Date();
        if (today > endDate) {
          legendText.style.textDecoration = "line-through";
          legendText.style.textDecorationThickness = "2px";
          legendText.style.textDecorationColor = "black";
        }

        // Add formatted dates to the legend text
        legendText.innerHTML = `
        <div class="event-details">
          <h3 class="event-modal-card-title">${matchingEvent.title}</h3>
          <p class="event-modal-card-text">${formattedStartDate} - ${formattedEndDate}</p>
        </div>`;
      } else {
        legendText.textContent = "Unknown Event"; // handle the case where no matching event is found
      }

      legendItem.appendChild(legendIcon);
      legendItem.appendChild(legendText);
      legendContainer.appendChild(legendItem);

      legendItem.addEventListener("click", () => {
        const imageModal = document.getElementById("imageModal");
        imageModal.innerHTML = "";
        const image = document.createElement("img");
        image.src = matchingEvent.image;
        image.alt = "Sky: Cotl, travelling spirit";
        imageModal.appendChild(image);
        imageModal.style.display = "block";
      });
    });
  } else {
    // Display "No events found" message if no events exist for the month
    const noEventsMessage = document.createElement("p");
    noEventsMessage.textContent = "No events found for this month.";
    legendContainer.appendChild(noEventsMessage);
  }
}

function timeUntil(targetTime) {
  const now = new Date();
  const timeDiff = targetTime - now;
  return timeDiff;
}

// Function to display events with countdown
function showNewsEvents(eventsData) {
  const eventModal = document.querySelector(".event-cards");
  // eventModal.innerHTML = ''; // Clear previous content

  const today = new Date();
  const ongoingEvents = [];
  const incomingEvents = [];

  eventsData.forEach((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    if (today >= eventStart && today <= eventEnd) {
      ongoingEvents.push(event);
    } else if (today < eventStart && today < eventEnd) {
      //Check if event is in the future
      incomingEvents.push(event);
    }
  });

  function displayEvents(eventsToDisplay) {
    if (eventsToDisplay.length > 0) {
      eventsToDisplay.forEach((event) => {
        const eventModalCard = document.createElement("div");
        eventModalCard.classList.add("event-card");
        eventModalCard.style.borderBottom = `4px solid ${event.color}`;
        
        const eventImageHolder = document.createElement("div");
        eventImageHolder.classList.add("event-image");

        const eventImage = document.createElement("img");
        eventImage.classList.add("event-modal-card-img");
        eventImage.src = event.image;
        eventImageHolder.appendChild(eventImage);

        const eventBadge = document.createElement("div");
        eventBadge.classList.add("event-badge");
        eventBadge.textContent = event.category;

        const eventContent = document.createElement("div");
        eventContent.classList.add("event-content");
        
        const eventTitle = document.createElement("h3");
        eventTitle.classList.add("event-title");
        eventTitle.textContent = event.title;
        eventContent.appendChild(eventTitle);

        const eventDates = document.createElement("p");
        eventDates.classList.add("event-modal-card-text");
        const uniqueId = `countdown-${event.title.replace(/ /g, "_")}`;
        eventDates.id = uniqueId;

        const timeUntilStart = event.start ? timeUntil(event.start) : 0;
        const timeUntilEnd = event.end ? timeUntil(event.end) : 0;

        const startLabel =
          timeUntilStart <= 0 ? "Starts: Ongoing" : "Starts in: ";
        const endLabel = timeUntilStart <= 0 ? "Ends in: " : "Ends in: "; //Correct label

        setTimeout(() => {
          updateCountdown(uniqueId, event.start, startLabel); //Correct label
          if (timeUntilStart <= 0) {
            //Only update end countdown if started
            updateCountdown(uniqueId, event.end, endLabel);
          }
        }, 0);

        eventDetails.appendChild(eventDates);
        eventModalCard.appendChild(eventDetails);
        eventModal.appendChild(eventModalCard);
      });
    } else {
      const noEventsMessage = document.createElement("p");
      noEventsMessage.textContent = "There are no events.";
      eventModal.appendChild(noEventsMessage);
    }
  }

  // Display ongoing and incoming events
  displayEvents(ongoingEvents);
  displayEvents(incomingEvents);
}

// Function to update the countdown (timer effect)
function updateCountdown(elementId, targetDate, label) {
  if (!targetDate) return;

  const countdownElement = document.getElementById(elementId);
  let intervalId = setInterval(function () {
    const distance = targetDate.getTime() - new Date().getTime();

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    let countdown = "";
    if (days > 0) countdown += `${days}d `;
    if (hours > 0) countdown += `${hours}h `;
    if (minutes > 0) countdown += `${minutes}m `;
    countdown += `${seconds}s`;

    if (distance <= 0) {
      clearInterval(intervalId);
      countdownElement.textContent = `${label}Ongoing`;
    } else {
      countdownElement.textContent = `${label}${countdown}`;
    }
  }, 1000);
}

function displayEventNotices(eventsData) {
  const noticeContainer = document.querySelector(".event-notices");

  const eventNotices = document.querySelector(".event-notices");
  eventNotices.innerHTML = "";

  const noticesSection = document.createElement("div");
  noticesSection.innerHTML = `
      <h2 class="event-notice-title">Heads Up!</h2>
  `;
  eventNotices.appendChild(noticesSection);

  const today = new Date();
  const upcomingEvents = [];
  const endingEvents = [];

  // Find events starting or ending soon (within 4 days)
  eventsData.forEach((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    // Calculate days difference
    const daysUntilStart = Math.ceil(
      (eventStart - today) / (1000 * 60 * 60 * 24)
    );
    const daysUntilEnd = Math.ceil((eventEnd - today) / (1000 * 60 * 60 * 24));

    // Check if event is starting within 4 days but hasn't started yet
    if (daysUntilStart > 0 && daysUntilStart <= 4) {
      event.daysUntil = daysUntilStart;
      upcomingEvents.push(event);
    }

    // Check if event is ongoing and ending within 4 days
    if (today >= eventStart && daysUntilEnd > 0 && daysUntilEnd <= 4) {
      event.daysUntil = daysUntilEnd;
      endingEvents.push(event);
    }
  });

  // Sort events by how soon they're starting/ending
  upcomingEvents.sort((a, b) => a.daysUntil - b.daysUntil);
  endingEvents.sort((a, b) => a.daysUntil - b.daysUntil);

  // Create notices for upcoming events
  if (upcomingEvents.length > 0) {
    upcomingEvents.slice(0, 2).forEach((event) => {
      // Show up to 2 upcoming events
      const noticeElement = createNoticeElement(
        event,
        "upcoming",
        "https://img.icons8.com/?size=100&id=FhnRPWu7HD5f&format=png&color=000000",
        "Coming Soon:",
        `begins in ${event.daysUntil} day${event.daysUntil > 1 ? "s" : ""}!`
      );
      eventNotices.appendChild(noticeElement);
    });
  } else if (upcomingEvents.length === 0){
    const noticeElement = createNoticeElement_empty(
      "upcoming",
      "https://img.icons8.com/?size=100&id=3ovMFy5JDSWq&format=png&color=000000",
      "Relax! No events are starting or ending within the next 4 days.",
    );
    eventNotices.appendChild(noticeElement);
  }

  // Create notices for ending events
  if (endingEvents.length > 0) {
    endingEvents.slice(0, 2).forEach((event) => {
      // Show up to 2 ending events
      const noticeElement = createNoticeElement(
        event,
        "ending",
        "https://img.icons8.com/?size=100&id=Sd2tYsgMJNyn&format=png&color=000000",
        "Last Chance:",
        `ends in ${event.daysUntil} day${event.daysUntil > 1 ? "s" : ""}!`
      );
      eventNotices.appendChild(noticeElement);
    });
  }

  // If no notices were created, hide the container
  if (upcomingEvents.length === 0 && endingEvents.length === 0) {
    const headsUpSection = document.querySelector(".heads-up");
    if (headsUpSection) {
      headsUpSection.style.display = "none";
    }
  }
}

// Helper function to create a notice element
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

function createNoticeElement_empty(className, iconSrc, labelText) {
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

document.addEventListener("DOMContentLoaded", function () {
  // Create mobile menu button for small screens
  if (window.innerWidth <= 480) {
    const mobileMenuButton = document.createElement("div");
    mobileMenuButton.className = "mobile-menu-button";
    mobileMenuButton.innerHTML = "<span></span>";
    document.body.appendChild(mobileMenuButton);

    // Add event listener to mobile menu button
    mobileMenuButton.addEventListener("click", function () {
      const sidebar = document.querySelector(".sidebar");
      const content = document.querySelector(".content");
      const footer = document.querySelector("footer");

      this.classList.toggle("active");
      sidebar.classList.toggle("active");
      content.classList.toggle("sidebar-open");
      footer.classList.toggle("sidebar-open");
    });
  }

  // Make sure footer position is at the bottom of the page
  function adjustFooter() {
    const footer = document.querySelector("footer");
    const content = document.querySelector(".content");
    const lastCloud = document.querySelector(".cloud:last-of-type");

    if (lastCloud && footer) {
      const lastCloudBottom = lastCloud.getBoundingClientRect().bottom;
      const viewportHeight = window.innerHeight;

      if (lastCloudBottom < viewportHeight) {
        footer.style.position = "relative";
      } else {
        footer.style.position = "relative";
      }
    }
  }

  // Call on page load and resize
  window.addEventListener("load", adjustFooter);
  window.addEventListener("resize", adjustFooter);

  // Add active class to sidebar items on click
  const sidebarItems = document.querySelectorAll(".sidebar-item");
  sidebarItems.forEach((item) => {
    item.addEventListener("click", function () {
      // Remove active class from all items
      sidebarItems.forEach((i) => i.classList.remove("active"));
      // Add active class to clicked item
      this.classList.add("active");

      // On mobile, close the sidebar after clicking a menu item
      if (window.innerWidth <= 480) {
        const sidebar = document.querySelector(".sidebar");
        const content = document.querySelector(".content");
        const footer = document.querySelector("footer");
        const mobileMenuButton = document.querySelector(".mobile-menu-button");

        sidebar.classList.remove("active");
        content.classList.remove("sidebar-open");
        footer.classList.remove("sidebar-open");
        mobileMenuButton.classList.remove("active");
      }
    });
  });

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();

      const targetId = this.getAttribute("href").substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  // Show overlay on page load
  setTimeout(function () {
    document.querySelector(".overlay").style.opacity = 0;
    setTimeout(function () {
      document.querySelector(".overlay").style.display = "none";
    }, 500);
  }, 500);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("animation-zoom");
        return;
      }
      entry.target.classList.remove("animation-zoom");
    });
  });

  const squares = document.querySelectorAll(".zoom");
  squares.forEach((element) => observer.observe(element));

  var modal = document.getElementById("game-modal");

  // Get the button that opens the modal
  var btn = document.getElementById("open-game-modal");

  // Get the <span> element that closes the modal
  var span = document.getElementsByClassName("close")[0];

  // When the user clicks on the button, open the modal
  btn.onclick = function() {
    modal.style.display = "block";
  }

  // When the user clicks on <span> (x), close the modal
  span.onclick = function() {
    modal.style.display = "none";
  }

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  }
});


// for event pop up
const modalHTML = `
<div id="eventModal" class="modal">
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
</div>
`;
document.body.insertAdjacentHTML('beforeend', modalHTML);

function openEventModal(event) {
  const modal = document.getElementById('eventModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalDateStart = document.getElementById('modalStart');
  const modalDateEnd = document.getElementById('modalEnd');
  const modalDescription = document.getElementById('modalDescription');
  const modalCta = document.getElementById('modalCta');
  const carouselImagesContainer = document.querySelector('.carousel-images');
  const creditList = document.querySelector(".credits-list");

  const date = new Date();
  const formattedStart = formatDate_withTZ(event.start, "short");
  const formattedEnd = formatDate_withTZ(event.end, "short");

  // Clear previous carousel images
  carouselImagesContainer.innerHTML = '';
  // console.log("Event extended props:", event.extendedProps); for debugging

  // Populate modal with event data
  if (event.extendedProps.credits) {
    creditList.textContent = "Credits: "+event.extendedProps.credits;
  } else {
    creditList.textContent = "Credits: We're working on gathering information for you. Check back soon!";
  }
  
  const title = event.title.replace(/^[\p{Emoji}\p{Extended_Pictographic}]+\s*/u, '');
  modalTitle.textContent = title;
  modalDateStart.textContent = formattedStart+ " - " +formattedEnd;
  modalDescription.innerHTML = event.extendedProps.description || 'The story behind this event is still unfolding...';

  // Set CTA link
  if (event.extendedProps.blogUrl) {
    modalCta.target = '_blank';
    modalCta.textContent = 'Read More';
    modalCta.href = event.extendedProps.blogUrl;
    modalCta.style.display = 'inline-block';
  } else {
    modalCta.style.display = 'none';
  }

  // Add images to carousel if available
  if (event.extendedProps.images) {
    // Create an array of image URLs (handle both string and array input)
    const imageUrls = event.extendedProps.images.includes(',')
    ? event.extendedProps.images.split(/,|\|/).map(url => url.trim())
    : [event.extendedProps.images];

    imageUrls.forEach((imageUrl, index) => {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = `${event.title} image ${index + 1}`;
      img.className = index === 0 ? 'active' : '';
      carouselImagesContainer.appendChild(img);
    });

    // Show carousel controls if multiple images
    const carouselBtns = document.querySelectorAll('.carousel-btn');
    carouselBtns.forEach(btn => {
      btn.style.display = imageUrls.length > 1 ? 'block' : 'none';
    });
  } else {
    // If no images, add a placeholder
    const img = document.createElement('img');
    img.src = 'https://ik.imagekit.io/e3wiv79bq/Sky:%20Cotl/not%20available?updatedAt=1744181831782';
    img.alt = 'Event placeholder image';
    img.className = 'active';
    carouselImagesContainer.appendChild(img);

    // Hide carousel controls
    document.querySelectorAll('.carousel-btn').forEach(btn => {
      btn.style.display = 'none';
    });
  }

  // Show the modal
  modal.style.display = 'block';
}

// set up carousel navigation
document.querySelector('.carousel-btn.prev').addEventListener('click', function() {
  navigateCarousel(-1);
});

document.querySelector('.carousel-btn.next').addEventListener('click', function() {
  navigateCarousel(1);
});

function navigateCarousel(direction) {
  const images = document.querySelectorAll('.carousel-images img');
  if (images.length <= 1) return;

  let activeIndex = -1;
  images.forEach((img, index) => {
    if (img.classList.contains('active')) {
      activeIndex = index;
      img.classList.remove('active');
    }
  });

  if (activeIndex === -1) return;

  // Calculate new index with wraparound
  let newIndex = (activeIndex + direction + images.length) % images.length;
  images[newIndex].classList.add('active');
}

document.querySelector('.close-modal').addEventListener('click', function(event) {
  document.getElementById('eventModal').style.display = 'none';
});

window.addEventListener('click', function(event) {
  const modal = document.getElementById('eventModal');
  if (event.target === modal) {
    modal.style.display = 'none';
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
  background-color:rgb(16, 167, 236);
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
  z-index: 1000;
  cursor: pointer;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', modalCSS);

// ================================================
