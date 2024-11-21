// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDChyRMRZw13CIheI4_vd5bsrFLBprMC20",
    authDomain: "that-sky-calendar-ffd49.firebaseapp.com",
    projectId: "that-sky-calendar-ffd49",
    storageBucket: "that-sky-calendar-ffd49.appspot.com",
    messagingSenderId: "994867085966",
    appId: "1:994867085966:web:ea6d5b05bccb508eb73fdf",
    measurementId: "G-FXXSH6NS6Z"
};

// initialize firebase app
initializeApp(firebaseConfig)

// initialize services
const db = getFirestore()
const storage = getStorage();

// get collection reference
const colRef = collection(db, 'events')

// Get the list element by start date order
const q = query(colRef, orderBy("start", "asc"));
const shardsCollection = collection(db, 'shards');

// Function to initialize FullCalendar
function initializeCalendar(eventsData) {
  var calendarEl = document.getElementById('calendar');

  var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    aspectRatio: 1.8,
    events: eventsData,
    eventContent: function(info) {
      var iconPath = info.event.extendedProps.icon;
      if (iconPath) {
        return {
          html: `
            <div class="event-icon-container">
              <img src="${iconPath}" class="event-icon" />
            </div>
          `
        };
      } else {
        // If no icon is provided, render the default title and time
        return {
          html: `<span class="fc-event-title">${info.event.title}</span>`
        };
      }
    },
    eventOrder: "description",
  });
  calendar.render();

  // fiter
  const categoryFilterDropdown = document.createElement('select');
  categoryFilterDropdown.id = 'category-filter';
  categoryFilterDropdown.innerHTML = `
    <option value="">All Categories</option>
    <option value="shard">Shard</option>
    <option value="days-of-events">Days of Events</option>
    <option value="travelling-spirits">Travelling Spirits</option>
    <option value="seasons">Seasons</option>
    <option value="hide">Hide Shards</option>
  `;
  const calendarHeader = document.querySelector('.fc-toolbar-chunk:nth-child(2)'); 
  calendarHeader.appendChild(categoryFilterDropdown); 

  categoryFilterDropdown.addEventListener('change', function() {
    const selectedCategory = this.value.toLowerCase();
    console.log(selectedCategory);

    const filteredEvents = eventsData.filter(event => {
      if (selectedCategory === 'hide') { 
        return !event.category || !event.category.toLowerCase().includes('shard'); 
      } else {
        if (event.category) { 
          return event.category.toLowerCase() === selectedCategory || selectedCategory === '';
        } else {
          return selectedCategory === ''; 
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
  getDocs(shardsCollection) 
])
.then(([eventsSnapshot, shardsSnapshot]) => {
  const events = [];
  const shardEvents = [];

  // Process shard events from the 'shards' collection
  shardsSnapshot.docs.forEach((doc,shardIndex) => {
    const title = doc.data().title;
    const color = doc.data().color;
    const datesString  = doc.data().dates;
    const imageURL = doc.data().image;

    const dates = datesString.split(',').map(date => parseInt(date.trim())); 
    const month = doc.data().month;

    dates.forEach(date => {
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
        className: doc.data().image ? 'has-image' : '',
        category: doc.data().category || 'Default Category' 
      });
    });
  });

  // Process events from the 'events' collection
  eventsSnapshot.docs.forEach(doc => {
    const start = new Date(doc.data().start);
    const end = new Date(doc.data().end);

    const moment = require('moment');
    require('moment-timezone');
  
    // Get the user's timezone
    const userTimezone = moment.tz.guess();
    console.log("User's Timezone:", userTimezone);
  
    // Convert start and end times to moment objects (already in LA time)
    const startMoment = moment(start).tz('America/Los_Angeles');
    const endMoment = moment(end).tz('America/Los_Angeles');
  
    // Set the start time to 1:00 AM PDT
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
      image: doc.data().image,
      category: doc.data().category || 'Default Category',
    });
  });

  // Combine events and shard events
  const allEvents = [...shardEvents, ...events];

  // Initialize FullCalendar with the combined events
  // initializeCalendar(allEvents);
  // showOngoingEvents(events);  
  // showIncomingEvents(events);
  updateSummary(events);
  displayReminders(allEvents);
})
.catch(error => {
  console.error("Error getting documents: ", error);
}); 

function updateSummary(eventsData, month = new Date().getMonth()) {
  const eventModalContainer = document.querySelector('.sum-event-modal-container');
  const eventModal = document.querySelector('.sum-event-modal');

  const legendContainer =  document.querySelector('.sum-event-modal');
  legendContainer.innerHTML = ""; 

  // Create heading and button container
  const headingContainer = document.createElement("div");
  headingContainer.classList.add("summary-heading");
  const heading = document.createElement("h2");
  const monthName = new Date(new Date().getFullYear(), month).toLocaleString('en-US', { month: 'long' });
  heading.textContent = `${monthName} Events`;
  headingContainer.appendChild(heading);
  const buttonContainer = document.createElement("div");
  buttonContainer.classList.add("buttons");

  // Add next and previous buttons
  const nextButton = document.createElement("button");
  nextButton.classList.add("next-btn")
  nextButton.textContent = ">";
  nextButton.addEventListener("click", () => {
    month = (month + 1) % 12; // Cycle through months
    updateSummary(eventsData, month);
  });

  const previousButton = document.createElement("button");
  previousButton.classList.add("back-btn")
  previousButton.textContent = "<";
  previousButton.addEventListener("click", () => {
    month = (month - 1 + 12) % 12; // Cycle through months
    updateSummary(eventsData, month);
  });

  buttonContainer.appendChild(previousButton);
  buttonContainer.appendChild(nextButton);

  headingContainer.appendChild(buttonContainer);
  legendContainer.appendChild(headingContainer);

  const filteredEvents = eventsData.filter(event => event.category === 'travelling-spirits');

  // Create a set to store colors
  const uniqueColors = new Set();
  let hasEvents = false;
  let activeItem = null;

  filteredEvents.forEach(event => {
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
    uniqueColors.forEach(color => {
      const legendItem = document.createElement('div');
      legendItem.classList.add('event-modal-card');

      // Create the event icon
      const legendIcon = document.createElement('div');
      legendIcon.classList.add('event-line');
      legendIcon.style.backgroundColor = color; 
      legendItem.appendChild(legendIcon);
    
      // Create the event details
      const eventDetails = document.createElement('div');
      eventDetails.classList.add('event-details');
    
      // Create the event title
      const legendText = document.createElement('p');
      legendText.classList.add('sum-event-modal-card-title');
      legendText.textContent = eventsData.title;
      eventDetails.appendChild(legendText);

      // Find the event with the matching color and use its title
      const matchingEvent = eventsData.find(event => event.color === color);
      if (matchingEvent) {
        // Convert strings to Date objects
        const startDate = new Date(matchingEvent.start);
        const endDate = new Date(matchingEvent.end);

        // Format the dates
        const formattedStartDate = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const formattedEndDate = endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

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

      legendItem.addEventListener('click', () => {
        const imageModal = document.getElementById('imageModal');
        imageModal.innerHTML = '';
        const image = document.createElement('img');
        image.src = matchingEvent.image;
        image.alt = "Sky: Cotl, travelling spirit";
        imageModal.appendChild(image);
        imageModal.style.display = 'block'; 
      });
    });
  } else {
    // Display "No events found" message if no events exist for the month
    const noEventsMessage = document.createElement("p");
    noEventsMessage.textContent = "No events found for this month.";
    legendContainer.appendChild(noEventsMessage);
  }
}