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
  initializeCalendar(allEvents);
  showIncomingEvents(events);
})
.catch(error => {
  console.error("Error getting documents: ", error);
}); 

function showIncomingEvents(eventsData) {
  const today = new Date();
  const incomingEvents = [];

  eventsData.forEach(event => {
    const eventStart = new Date(event.start);
    if (today < eventStart) {
      incomingEvents.push(event);
    }
  });

  // Display incoming events
  const eventModalContainer = document.querySelector('.event-modal-container');
  const eventModal = document.querySelector('.event-modal');
  if (incomingEvents.length > 0) {
    incomingEvents.forEach(event => {
      // Create the event modal card
      const eventModalCard = document.createElement('div');
      eventModalCard.classList.add('event-modal-card');
  
      // Create the event icon (you can adjust the src)
      const eventLine = document.createElement('div');
      eventLine.classList.add('event-line');
      eventLine.style.backgroundColor = event.color; // Set the background color
      eventModalCard.appendChild(eventLine);
  
      // Create the event details
      const eventDetails = document.createElement('div');
      eventDetails.classList.add('event-details');
  
      // Create the event title
      const eventTitle = document.createElement('h3');
      eventTitle.classList.add('event-modal-card-title');
      eventTitle.textContent = event.title;
      eventDetails.appendChild(eventTitle);
  
      // Create the event start and end dates
      const eventDates = document.createElement('p');
      eventDates.classList.add('event-modal-card-text');
      const formattedStart = formatDate(event.start, 'MMM dd yyyy hh:mm a');
      const formattedEnd = formatDate(event.end, 'MMM dd yyyy hh:mm a');
      eventDates.textContent = `${formattedStart} - ${formattedEnd}`;
      eventDetails.appendChild(eventDates);
  
      // Append the details to the event card
      eventModalCard.appendChild(eventDetails);
  
      // Append the event card to the event modal
      eventModal.appendChild(eventModalCard);
    });
  } else {
    const noIncomingEvents = document.createElement('p');
    noIncomingEvents.textContent = "There are no incoming events.";
    incomingContainer.appendChild(noIncomingEvents);
  }
}

function formatDate(date, format) {
  const options = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit', 
    minute: 'numeric',
    hour12: true, 
  };
  return new Intl.DateTimeFormat('en-US', options).format(date);
}