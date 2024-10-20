// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, getDoc, onSnapshot, doc, query, orderBy } from "firebase/firestore";
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

// Get the list element by start date order
const q = query(colRef, orderBy("start", "asc"));
const shardsCollection = collection(db, 'shards');

// ============ this is for calendar====================================================

var test = []; // Initialize the array as empty

// Function to initialize FullCalendar
function initializeCalendar(eventsData) {
  var calendarEl = document.getElementById('calendar');

  var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    aspectRatio: 1.8,
    events: eventsData,
    timeFormat: '', 
    eventDidMount: function(info) {
      var tooltip = new Tooltip(info.el, {
        title: info.event.extendedProps.description,
        placement: 'top',
        trigger: 'hover',
        container: 'body'
      });

      var iconPath = info.event.extendedProps.icon;
      if (iconPath) {
        var icon = document.createElement('img');
        icon.src = iconPath;
        icon.classList.add('event-icon'); // Optional: Add a class for styling
    
        // Remove default event title and content:
        info.el.querySelector('.fc-event-title').remove();
        info.el.querySelector('.fc-event-time').remove();
        info.el.style.backgroundColor = 'transparent';
        const eventEl = info.el;
        eventEl.style.top = '-25px'; // Adjust top position
        eventEl.style.height = '15px';
    
        // Append the icon to the event element:
        info.el.appendChild(icon);
      }
    },
    eventOrder: "description"
  });
  calendar.render();
}

// Fetch events and shard events, then combine and initialize the calendar
Promise.all([
  getDocs(query(colRef, orderBy("start", "asc"))), // Fetch events
  getDocs(shardsCollection) // Fetch shards,
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

      dates.forEach(date => {
        const startDate = new Date(`2024-10-${date}`);
        const endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);

        // Apply PST time 
        startDate.setHours(15, 0, 0);
        endDate.setHours(14, 59, 0);
        const priority = doc.data().priority;
        shardEvents.push({
          title: title,
          start: startDate,
          end: endDate,
          color: color,
          description: ``,
          icon: imageURL,
        });
      });
    });

    // Process events from the 'events' collection
    eventsSnapshot.docs.forEach(doc => {
      const start = new Date(doc.data().start);
      const end = new Date(doc.data().end);

      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Adjust start and end times to user's timezone
      start.setHours(15, start.getMinutes(), start.getSeconds(), 0, userTimezone);
      end.setHours(14, 59, start.getSeconds(), 0, userTimezone);

      events.push({
        title: doc.data().title,
        start: start,
        end: end,
        color: doc.data().color,
        description: doc.data().description,
        image: doc.data().image,
      });
    });

    // Combine events and shard events
    const allEvents = [...shardEvents, ...events,];

    // Initialize FullCalendar with the combined events
    initializeCalendar(allEvents);
    updateLegend(allEvents);
    updateSummary(events);
    showOngoingAndIncomingEvents(events);
    displayReminders(allEvents);
  })
  .catch(error => {
    console.error("Error getting documents: ", error);
  }); 

// // Fetch documents from the collection and initialize the calendar
// getDocs(q)
//   .then(snapshot => {
//     snapshot.docs.forEach(doc => {
//       const title = doc.data().title;
//       const start = doc.data().start; 
//       const end = doc.data().end;   
//       const color = doc.data().color;
//       const description = doc.data().description;
//       const image = doc.data().image;

//       // Assuming start and end are in YYYY-MM-DD format
//       const startDate = new Date(doc.data().start);
//       const endDate = new Date(doc.data().end);

//       // Apply PST time (3 PM PST = 11 PM UTC)
//       startDate.setHours(15, 0, 0); // 3 PM
//       endDate.setHours(14, 59, 0); // 2:59 PM

//       // Add the event to the test array
//       test.push({
//         title: title,
//         start: startDate, // Store start in UTC
//         end: endDate, // Store end in UTC
//         color: color,
//         description: description,
//         image: image
//       });
//     });

//     // Initialize FullCalendar after eventsData is populated
//     initializeCalendar(test); 
//     updateLegend(test); 
//     updateSummary(test);
//     showOngoingAndIncomingEvents(test);
//     displayReminders(test);
//   })
//   .catch(error => {
//     console.error("Error getting documents: ", error);
//   });

  // Function to update the legend
  function updateLegend(eventsData) {
    const legendContainer = document.getElementById("legends");
    legendContainer.innerHTML = "<h2>Legends</h2>"; 
  
    // Create a set to store colors
    const uniqueColors = new Set();
    eventsData.forEach(event => {
      uniqueColors.add(event.color);
    });
  
    // Create legend items for each color
    uniqueColors.forEach(color => {
      const legendItem = document.createElement("div");
      legendItem.classList.add("legend-item");
  
      // Find the event with the matching color
      const matchingEvent = eventsData.find(event => event.color === color);
  
      // Check if it's a shard event
      if (matchingEvent && matchingEvent.icon) { // Assuming you have an 'icon' property for shard events
        const legendIcon = document.createElement("img"); // Create an image element
        legendIcon.classList.add("legend-icon");
        legendIcon.src = matchingEvent.icon; // Set the image source
        legendItem.appendChild(legendIcon);
      } else {
        // Create a colored square for non-shard events
        const legendIcon = document.createElement("div");
        legendIcon.classList.add("legend-icon");
        legendIcon.style.backgroundColor = color;
        legendItem.appendChild(legendIcon);
      }
  
      const legendText = document.createElement("div");
      legendText.classList.add("legend-text");
      legendText.textContent = matchingEvent ? matchingEvent.title : "Unknown Event";
      legendItem.appendChild(legendText);
      legendContainer.appendChild(legendItem);
    });
  }

function updateSummary(eventsData) {
  const legendContainer = document.getElementById("summary");
  legendContainer.innerHTML = "<h2>Summary</h2>";

  // Create a set to store colors
  const uniqueColors = new Set();
  eventsData.forEach(event => {
    uniqueColors.add(event.color);
  });

  // Create legend items for each color
  uniqueColors.forEach(color => {
    const legendItem = document.createElement("div");
    legendItem.classList.add("sum-item");

    const legendIcon = document.createElement("div");
    legendIcon.classList.add("sum-icon");
    legendIcon.style.backgroundColor = color;

    const legendText = document.createElement("div");
    legendText.classList.add("sum-text");

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
        legendText.style.textDecorationThickness = "3px";
        legendText.style.textDecorationColor = "black"; // Change to red color
      }

      // Add formatted dates to the legend text
      legendText.textContent = `${matchingEvent.title} 
                              (${formattedStartDate} - ${formattedEndDate})`;
    } else {
      legendText.textContent = "Unknown Event"; // handle the case where no matching event is found
    }

    legendItem.appendChild(legendIcon);
    legendItem.appendChild(legendText);
    legendContainer.appendChild(legendItem);
  });
}

function showOngoingAndIncomingEvents(eventsData) {
  const today = new Date();
  const ongoingEvents = [];
  const incomingEvents = [];

  eventsData.forEach(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    if (today >= eventStart && today <= eventEnd) {
      ongoingEvents.push(event);
    } else if (today < eventStart) {
      incomingEvents.push(event);
    }
  });

  // Display ongoing events
  const ongoingContainer = document.getElementById("ongoing");
        
  if (ongoingEvents.length > 0) {
    ongoingEvents.forEach(event => {
      const eventItem = document.createElement('p');

      // Format start and end dates in 12-hour format with AM/PM
      const formattedStart = formatDate(event.start, 'MMM dd yyyy hh:mm a');
      const formattedEnd = formatDate(event.end, 'MMM dd yyyy hh:mm a');

      eventItem.textContent = `${event.title} (${formattedStart} - ${formattedEnd})`;
      ongoingContainer.appendChild(eventItem);
    });
  } else {
    const noOngoingEvents = document.createElement('p');
    noOngoingEvents.textContent = "There are no ongoing events.";
    ongoingContainer.appendChild(noOngoingEvents);
  }

  // Display incoming events
  const incomingContainer = document.getElementById("incoming");
  if (incomingEvents.length > 0) {
    incomingEvents.forEach(event => {
      const eventItem = document.createElement('p');

      // Format start and end dates in 12-hour format with AM/PM
      const formattedStart = formatDate(event.start, 'MMM dd yyyy hh:mm a');
      const formattedEnd = formatDate(event.end, 'MMM dd yyyy hh:mm a');

      eventItem.textContent = `${event.title} (${formattedStart} - ${formattedEnd})`;
      incomingContainer.appendChild(eventItem);
    });
  } else {
    const noIncomingEvents = document.createElement('p');
    noIncomingEvents.textContent = "There are no incoming events.";
    incomingContainer.appendChild(noIncomingEvents);
  }
}

// Helper function to format dates
function formatDate(date, format) {
  const options = {
    month: 'short', // MMM for short month names
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric', // h for 12-hour format
    minute: 'numeric',
    hour12: true, // Include AM/PM
  };
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

// Function to display reminders
function displayReminders(eventsData) {
  // Get the reminders container
  const remindersContainer = document.getElementById("reminders");
  remindersContainer.innerHTML = ''; // Clear previous reminders

  // Get the current date and tomorrow's date
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  // Filter events for ongoing and tomorrow's events
  const ongoingEvents = eventsData.filter(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return today >= eventStart && today <= eventEnd;
  });

  // Filter events for tomorrow's events, excluding ongoing events
  const tomorrowEvents = eventsData.filter(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return eventStart.getDate() === tomorrow.getDate() && eventStart.getMonth() === tomorrow.getMonth() && eventStart.getFullYear() === tomorrow.getFullYear() && !(today >= eventStart && today <= eventEnd); // Exclude ongoing events
  });

  const header = document.createElement('h2');
  header.textContent = `Remiders:`;
  remindersContainer.appendChild(header);

  // Display ongoing events
  if (ongoingEvents.length > 0) {
    const ongoingMessage = document.createElement('p');
    ongoingMessage.textContent = `You have ongoing events: ${ongoingEvents.map(event => event.title).join(', ')}`;
    remindersContainer.appendChild(ongoingMessage);
  }

  // Display tomorrow's events
  if (tomorrowEvents.length > 0) {
    const tomorrowMessage = document.createElement('p');
    tomorrowMessage.textContent = `Don't forget, you have events starting tomorrow: ${tomorrowEvents.map(event => event.title).join(', ')}`;
    remindersContainer.appendChild(tomorrowMessage);
  }

  // If no reminders
  if (ongoingEvents.length === 0 && tomorrowEvents.length === 0) {
    const noReminders = document.createElement('p');
    noReminders.textContent = "No reminders for today or tomorrow. Enjoy your day!";
    remindersContainer.appendChild(noReminders);
  }
}