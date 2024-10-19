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

// get collection data
getDocs(colRef)
    .then((snapshot) => {
        let events = []
        snapshot.docs.forEach((doc) => {
            events.push({ ...doc.data(), id: doc.id})
        })
    })
    .catch(err => {
        console.log(err.message);
    })

// Get the list element by start date order
const q = query(colRef, orderBy("start", "asc"));

// ============ this is for calendar====================================================

var test = []; // Initialize the array as empty

// Function to initialize FullCalendar
function initializeCalendar(eventsData) {
  var calendarEl = document.getElementById('calendar');

  var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    aspectRatio: 1.8,
    eventDidMount: function(info) {
        var tooltip = new Tooltip(info.el, {
          title: info.event.extendedProps.description,
          placement: 'top',
          trigger: 'hover',
          container: 'body'
        });
      },
    events: eventsData,
    timeZone: 'Asia/Manila', // Set the time zone to PST
    timeFormat: '',       // Hide the time display for events
  });
  calendar.render();
}

// Fetch documents from the collection
getDocs(q)
  .then(snapshot => {
    snapshot.docs.forEach(doc => {
      const title = doc.data().title;
      const start = doc.data().start; 
      const end = doc.data().end;   
      const color = doc.data().color;
      const description = doc.data().description;
      const image = doc.data().image;

      // Assuming start and end are in YYYY-MM-DD format
      const startDate = new Date(doc.data().start);
      const endDate = new Date(doc.data().end);

      // Apply PST time (3 PM PST = 11 PM UTC)
      startDate.setHours(15, 0, 0); // 3 PM
      endDate.setHours(14, 59, 0); // 2:59 PM

      // Add the event to the test array
      test.push({
        title: title,
        start: startDate, // Store start in UTC
        end: endDate, // Store end in UTC
        color: color,
        description: description,
        image: image
      });
    });

    // Initialize FullCalendar after eventsData is populated
    initializeCalendar(test); 
    updateLegend(test); 
    updateSummary(test);
    showOngoingAndIncomingEvents(test);
  })
  .catch(error => {
    console.error("Error getting documents: ", error);
  });

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

    const legendIcon = document.createElement("div");
    legendIcon.classList.add("legend-icon");
    legendIcon.style.backgroundColor = color;

    const legendText = document.createElement("div");
    legendText.classList.add("legend-text");

    // Find the event with the matching color and use its title
    const matchingEvent = eventsData.find(event => event.color === color);
    if (matchingEvent) {
      legendText.textContent = matchingEvent.title;
    } else {
      legendText.textContent = "Unknown Event"; // handle the case where no matching event is found
    }

    legendItem.appendChild(legendIcon);
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