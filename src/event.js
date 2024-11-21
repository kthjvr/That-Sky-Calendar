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
  showOngoingEvents(events);  
  showIncomingEvents(events);
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
  nextButton.textContent = "Next";
  nextButton.addEventListener("click", () => {
    month = (month + 1) % 12; // Cycle through months
    updateSummary(eventsData, month);
  });

  const previousButton = document.createElement("button");
  previousButton.classList.add("back-btn")
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

function formatDate2(date, format) {
  const options = {
    month: 'long', 
    day: 'numeric',
    year: 'numeric',
  };
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

// function displayReminders(eventsData) {

//   const remindersContainer = document.getElementById("reminders");
//   remindersContainer.innerHTML = ''; 

//   // Get the current date and tomorrow's date
//   const today = new Date();
//   const tomorrow = new Date();
//   tomorrow.setDate(today.getDate() + 1);

//   // Filter events for ongoing and tomorrow's events
//   const ongoingEvents = eventsData.filter(event => {
//     const eventStart = new Date(event.start);
//     const eventEnd = new Date(event.end);
//     return today >= eventStart && today <= eventEnd;
//   });

//   // Filter events for tomorrow's events, excluding ongoing events
//   const tomorrowEvents = eventsData.filter(event => {
//     const eventStart = new Date(event.start);
//     const eventEnd = new Date(event.end);
//     return eventStart.getDate() === tomorrow.getDate() && eventStart.getMonth() === tomorrow.getMonth() && eventStart.getFullYear() === tomorrow.getFullYear() && !(today >= eventStart && today <= eventEnd); // Exclude ongoing events
//   });

//   // Date content --------------------------------------
//   const dateSection = document.createElement('div');
//   dateSection.classList.add('date-section');
//   const tdy = document.createElement('h3');
//   tdy.classList.add('todays');
//   tdy.textContent = "Today is";
//   dateSection.appendChild(tdy);
//   const month = document.createElement('h2');
//   month.classList.add('month');
//   month.textContent = today.toLocaleString('default', { month: 'long' });
//   dateSection.appendChild(month);
//   const day = document.createElement('h2');
//   day.classList.add('day');
//   day.textContent = today.getDate();
//   dateSection.appendChild(day);
//   remindersContainer.appendChild(dateSection);

//   // Reminder content --------------------------------------
//   const contentSection = document.createElement('div');
//   contentSection.classList.add('content-section');
//   // image3.src = "skid2.png"; // Replace with your actual image URL
//   // image3.alt = "Image 3";
//   // image3.classList.add('date-image-3');
//   // contentSection.appendChild(image3);

//   // Container for image and header
//   const headerContainer = document.createElement('div');
//   headerContainer.classList.add('header-container');
//   const header = document.createElement('h2');
//   header.textContent = "Heads Up, Skids!";
//   headerContainer.appendChild(header);
//   contentSection.appendChild(headerContainer)
//   remindersContainer.appendChild(contentSection);

//   // Display ongoing events
//   if (ongoingEvents.length > 0) {
//     const onMessage = document.createElement('p');
//     const onText = document.createElement('span');
//     onText.textContent = '[Today]';
//     onText.style.color = '#3D5300';
//     onText.style.fontWeight = 'bold'

//     onMessage.appendChild(onText);
//     onMessage.appendChild(document.createTextNode(' ')); 
//     onMessage.appendChild(document.createTextNode(ongoingEvents.map(event => event.title).join(', '))); 
//     contentSection.appendChild(onMessage);
//   }

//   // Display tomorrow's events
//   if (tomorrowEvents.length > 0) {
//     const tomMessage = document.createElement('p');
//     const tomText = document.createElement('span');
//     tomText.textContent = '[Tomorrow]';
//     tomText.style.color = '#556FB5';
//     tomText.style.fontWeight = 'bold'

//     tomMessage.appendChild(tomText);
//     tomMessage.appendChild(document.createTextNode(' ')); 
//     tomMessage.appendChild(document.createTextNode(tomorrowEvents.map(event => event.title).join(', '))); 
//     contentSection.appendChild(tomMessage);
//   }

//   // Filter events ending by tomorrow
//   const endingTomorrowEvents = eventsData.filter(event => {
//     const eventEnd = new Date(event.end);
//     return eventEnd.getDate() === tomorrow.getDate() && eventEnd.getMonth() === tomorrow.getMonth() && eventEnd.getFullYear() === tomorrow.getFullYear();
//   });

//   // If no reminders
//   if (ongoingEvents.length === 0 && tomorrowEvents.length === 0) {
//     const noReminders = document.createElement('p');
//     noReminders.textContent = "Take a break from the hustle and bustle. Enjoy your day!";
//     remindersContainer.appendChild(noReminders);
//   } else if (tomorrowEvents.length === 0){
//     const tomMessage = document.createElement('p');
//     const tomText = document.createElement('span');
//     tomText.textContent = '[Tomorrow]';
//     tomText.style.color = '#556FB5';
//     tomText.style.fontWeight = 'bold'

//     tomMessage.appendChild(tomText);
//     tomMessage.appendChild(document.createTextNode(' ')); 
//     tomMessage.appendChild(document.createTextNode("No new events starting tomorrow!")); 
//     contentSection.appendChild(tomMessage);
//   }

//   // Display events ending by tomorrow
//   if (endingTomorrowEvents.length > 0) {
//     const endingMessage = document.createElement('p');
//     const endingText = document.createElement('span');
//     endingText.textContent = '[Ending tomorrow]';
//     endingText.style.color = '#E4508F';
//     endingText.style.fontWeight = 'bold'

//     endingMessage.appendChild(endingText);
//     endingMessage.appendChild(document.createTextNode(' ')); 
//     endingMessage.appendChild(document.createTextNode(endingTomorrowEvents.map(event => event.title).join(', '))); 
//     contentSection.appendChild(endingMessage);
//   }

//   // Links --------------------------------------
//   const linksSection = document.createElement('div');
//   linksSection.classList.add('links-section');

//   // Title for links
//   const linksTitle = document.createElement('div');
//   linksTitle.classList.add('links-title');
//   const linksHeaderText = document.createElement('h4');
//   linksHeaderText.textContent = "Visit these sites for more info";
//   linksTitle.appendChild(linksHeaderText);
//   linksSection.appendChild(linksTitle);
//   const linkList = document.createElement('div');
//   linkList.classList.add('links-list');

//   const links = ['Shard', 'Clock', 'Planner', 'Wiki'];
//   const linkImages = [
//     "https://img.icons8.com/clouds/100/rhomboid-shape.png", // Shard image
//     "https://img.icons8.com/clouds/100/apple-clock.png", // Clock image
//     "https://img.icons8.com/clouds/100/planner.png", // Planner image
//     "https://img.icons8.com/clouds/100/fandom.png", // Wiki image
//   ];
//   const linkUrls = [
//     "https://sky-shards.pages.dev/en", // Shard URL
//     "https://sky-clock.netlify.app/", // Clock URL
//     "https://sky-planner.com/", // Planner URL
//     "https://sky-children-of-the-light.fandom.com/wiki/Sky:_Children_of_the_Light_Wiki", // Wiki URL
//   ];

//   links.forEach((link, index) => {
//     const linkContainer = document.createElement('div');
//     linkContainer.classList.add('link-container');

//     // Link element
//     const linkElement = document.createElement('a');
//     linkElement.href = linkUrls[index];
//     linkElement.classList.add('link');
//     linkElement.target = "_blank";

//     // Image
//     const linkImage = document.createElement('img');
//     linkImage.src = linkImages[index];
//     linkImage.alt = link;
//     linkImage.classList.add('link-image');
//     linkElement.appendChild(linkImage);

//     // Link text
//     const linkText = document.createElement('p');
//     linkText.classList.add('linkText');
//     linkText.textContent = link;
//     linkElement.appendChild(linkText);

//     linkContainer.appendChild(linkElement);
//     linkList.appendChild(linkContainer);
//   });

//   linksSection.appendChild(linkList);
//   remindersContainer.appendChild(linksSection);
// }