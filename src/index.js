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

      start.setHours(15, start.getMinutes(), start.getSeconds(), 0);
      end.setHours(14, 59, start.getSeconds(), 0);
    
      // Format the adjusted times using toLocaleString
      let formattedStartTime = start.toLocaleString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
        timeZone: userTimezone,
      });

      let formattedEndTime = end.toLocaleString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
        timeZone: userTimezone,
      });

      // Extract hours, minutes, and seconds from the formatted strings
      const [hours, minutes, seconds] = formattedStartTime.split(':').map(Number);
      start.setHours(hours, minutes, seconds, 0);

      console.log(start);
      

      const [endHours, endMinutes, endSeconds] = formattedEndTime.split(':').map(Number);
      end.setHours(endHours, endMinutes, endSeconds, 0);
      

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


  // function getFormattedDateTime(timezone) {
  //   // Create a Date object for the current time
  //   const now = new Date();
  //   console.log(now)
  
  //   // Get the offset for the specified timezone in minutes
  //   const offsetMinutes = now.getTimezoneOffset();
  
  //   // Adjust the time based on the offset
  //   const adjustedTime = new Date(now.getTime() + offsetMinutes);
  
  //   // Format the date and time
  //   const formattedDateTime = adjustedTime.toLocaleString('en-US', {
  //     hour: 'numeric',
  //     minute: 'numeric',
  //     hour12: true,
  //     timeZone: timezone,
  //   });
  
  //   return formattedDateTime;
  // }
  
  // // Example usage:
  // const philippinesTime = getFormattedDateTime('Asia/Manila');
  // const indonesiaTime = getFormattedDateTime('Asia/Jakarta');
  
  // console.log('Philippines:', philippinesTime);
  // console.log('Indonesia:', indonesiaTime);

  


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

  // Date content --------------------------------------
    const dateSection = document.createElement('div');
    dateSection.classList.add('date-section');

        // Image 1
        const image1 = document.createElement('img');
        image1.src = "skid1.png"; // Replace with your actual image URL
        image1.alt = "Image 1";
        image1.classList.add('date-image-1');
        dateSection.appendChild(image1);
    
        // Image 2
        const image2 = document.createElement('img');
        image2.src = "skid3.png"; // Replace with your actual image URL
        image2.alt = "Image 2";
        image2.classList.add('date-image-2');
        dateSection.appendChild(image2);

        const month = document.createElement('h2');
        month.classList.add('month');
        month.textContent = today.toLocaleString('default', { month: 'long' });
        dateSection.appendChild(month);

        const day = document.createElement('h2');
        day.classList.add('day');
        day.textContent = today.getDate();
        dateSection.appendChild(day);

        remindersContainer.appendChild(dateSection);

    // Reminder content --------------------------------------
    const contentSection = document.createElement('div');
    contentSection.classList.add('content-section');

    const image3 = document.createElement('img');
    image3.src = "skid2.png"; // Replace with your actual image URL
    image3.alt = "Image 3";
    image3.classList.add('date-image-3');
    contentSection.appendChild(image3);

    // Container for image and header
    const headerContainer = document.createElement('div');
    headerContainer.classList.add('header-container');

    // Image
    const image = document.createElement('img');
    image.src = "https://img.icons8.com/matisse/100/alarm.png"; // Replace with your actual image URL
    image.alt = "Alarm Icon";
    image.classList.add('header-image');
    headerContainer.appendChild(image);

    // header
    const header = document.createElement('h2');
    header.textContent = "Heads Up, Skids!";
    headerContainer.appendChild(header);
    contentSection.appendChild(headerContainer)
    remindersContainer.appendChild(contentSection);

  // Display ongoing events
  if (ongoingEvents.length > 0) {
    const ongoingMessage = document.createElement('p');
    ongoingMessage.textContent = `${ongoingEvents.map(event => event.title).join(', ')} is in full swing!`;
    contentSection.appendChild(ongoingMessage)
  }

  // Display tomorrow's events
  if (tomorrowEvents.length > 0) {
    const tomorrowMessage = document.createElement('p');
    tomorrowMessage.textContent = `Don't miss out on the ${tomorrowEvents.map(event => event.title).join(', ')} starting tomorrow!`;
    contentSection.appendChild(tomorrowMessage);
  }

  // If no reminders
  if (ongoingEvents.length === 0 && tomorrowEvents.length === 0) {
    const noReminders = document.createElement('p');
    noReminders.textContent = "Take a break from the hustle and bustle. Enjoy your day!!";
    remindersContainer.appendChild(noReminders);
  }

// Links
const linksSection = document.createElement('div');
linksSection.classList.add('links-section');

const image4 = document.createElement('img');
image4.src = "skid4.png"; // Replace with your actual image URL
image4.alt = "Image 4";
image4.classList.add('date-image-4');
linksSection.appendChild(image4);

const image5 = document.createElement('img');
image5.src = "skid5.png"; // Replace with your actual image URL
image5.alt = "Image 5";
image5.classList.add('date-image-5');
linksSection.appendChild(image5);

// Title for links
const linksTitle = document.createElement('div');
linksTitle.classList.add('links-title');

const linksHeaderText = document.createElement('h4');
linksHeaderText.textContent = "Visit these sites for more info";

linksTitle.appendChild(linksHeaderText);
linksSection.appendChild(linksTitle);

const linkList = document.createElement('div');
linkList.classList.add('links-list');

const links = ['Shard', 'Clock', 'Planner', 'Wiki'];
const linkImages = [
  "https://img.icons8.com/clouds/100/rhomboid-shape.png", // Shard image
  "https://img.icons8.com/clouds/100/apple-clock.png", // Clock image
  "https://img.icons8.com/clouds/100/planner.png", // Planner image
  "https://img.icons8.com/clouds/100/fandom.png", // Wiki image
];
const linkUrls = [
  "#", // Shard URL
  "#", // Clock URL
  "#", // Planner URL
  "#", // Wiki URL
];

links.forEach((link, index) => {
  const linkContainer = document.createElement('div');
  linkContainer.classList.add('link-container');

  // Link element
  const linkElement = document.createElement('a');
  linkElement.href = linkUrls[index]; // Set the URL for the link
  linkElement.classList.add('link');

  // Image
  const linkImage = document.createElement('img');
  linkImage.src = linkImages[index];
  linkImage.alt = link;
  linkImage.classList.add('link-image');
  linkElement.appendChild(linkImage);

  // Link text
  const linkText = document.createElement('p');
  linkText.classList.add('linkText');
  linkText.textContent = link;
  linkElement.appendChild(linkText);

  linkContainer.appendChild(linkElement);
  linkList.appendChild(linkContainer);
});

linksSection.appendChild(linkList);
remindersContainer.appendChild(linksSection);
}