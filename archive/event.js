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

// get collection reference
const colRef = collection(db, 'events')


// Fetch events and shard events, then combine and initialize the calendar
Promise.all([
  getDocs(query(colRef, orderBy("start", "asc"))), 
])
.then(([eventsSnapshot]) => {
  const events = [];

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
  const allEvents = [...events];

  showOngoingEvents(events);  
  showIncomingEvents(events);
  updateSummary(events);
})
.catch(error => {
  console.error("Error getting documents: ", error);
}); 

function updateSummary(eventsData, month = new Date().getMonth()) {

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

  // Create a set to store colors
  const uniqueColors = new Set();
  let hasEvents = false;

  eventsData.forEach(event => {
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

  eventsData.forEach(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    if (today >= eventStart && today <= eventEnd) {
      ongoingEvents.push(event);
    }
  });

  // Display ongoing events
  const eventModalContainer = document.querySelector('.on-event-modal-container');
  const eventModal = document.querySelector('.on-event-modal');
  if (ongoingEvents.length > 0) {
    ongoingEvents.forEach(event => {
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
    const noOngoingEvents = document.createElement('p');
    noOngoingEvents.textContent = "There are no ongoing events.";
    ongoingContainer.appendChild(noOngoingEvents);
  }
}

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