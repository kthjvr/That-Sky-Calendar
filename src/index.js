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

// ============ this is for calendar====================================================


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
  `;
  const calendarHeader = document.querySelector('.fc-toolbar-chunk:nth-child(2)'); 
  calendarHeader.appendChild(categoryFilterDropdown); 

  categoryFilterDropdown.addEventListener('change', function() {
    const selectedCategory = this.value.toLowerCase();
    console.log(selectedCategory);

    const filteredEvents = eventsData.filter(event => {
      if (event.category) { 
        return event.category.toLowerCase() === selectedCategory || selectedCategory === '';
      } else {
        return selectedCategory === ''; 
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
  showOngoingAndIncomingEvents(events);
  updateLegend(allEvents);
  updateSummary(events);
  displayReminders(allEvents);
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
    // Check if the event falls within the current month
    const eventStartDate = new Date(event.start);
    const eventEndDate = new Date(event.end);
    const currentMonth = new Date().getMonth();
    if (eventStartDate.getMonth() === currentMonth || eventEndDate.getMonth() === currentMonth) {
      uniqueColors.add(event.color);
    }
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

function updateSummary(eventsData, month = new Date().getMonth()) {
  const legendContainer = document.getElementById("summary");
  legendContainer.innerHTML = ""; // Clear previous content

  // Create heading and button container
  const headingContainer = document.createElement("div");
  headingContainer.classList.add("summary-heading");

  const heading = document.createElement("h2");
  const monthName = new Date(new Date().getFullYear(), month).toLocaleString('en-US', { month: 'long' });
  heading.textContent = `${monthName} Events Summary`;
  headingContainer.appendChild(heading);

  const buttonContainer = document.createElement("div");
  buttonContainer.classList.add("buttons");

  // Add next and previous buttons
  const nextButton = document.createElement("button");
  nextButton.textContent = "Next";
  nextButton.addEventListener("click", () => {
    month = (month + 1) % 12; // Cycle through months
    updateSummary(eventsData, month);
  });

  const previousButton = document.createElement("button");
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
  let hasEvents = false; // Flag to check if any events exist for the month

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
  } else {
    // Display "No events found" message if no events exist for the month
    const noEventsMessage = document.createElement("p");
    noEventsMessage.textContent = "No events found for this month.";
    legendContainer.appendChild(noEventsMessage);
  }
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
      const formattedStart = formatDate2(event.start, 'MMM dd yyyy');
      const formattedEnd = formatDate2(event.end, 'MMM dd yyyy');

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

// Function to display reminders
function displayReminders(eventsData) {
  // Get the reminders container
  const remindersContainer = document.getElementById("reminders");
  remindersContainer.innerHTML = ''; 

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

    const tdy = document.createElement('h3');
    tdy.classList.add('todays');
    tdy.textContent = "Today is";
    dateSection.appendChild(tdy);

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

    // image3.src = "skid2.png"; // Replace with your actual image URL
    // image3.alt = "Image 3";
    // image3.classList.add('date-image-3');
    // contentSection.appendChild(image3);

    // Container for image and header
    const headerContainer = document.createElement('div');
    headerContainer.classList.add('header-container');

    // Image
    // const image = document.createElement('img');
    // image.src = "https://img.icons8.com/matisse/100/alarm.png"; // Replace with your actual image URL
    // image.alt = "Alarm Icon";
    // image.classList.add('header-image');
    // headerContainer.appendChild(image);

    // header
    const header = document.createElement('h2');
    header.textContent = "Heads Up, Skids!";
    headerContainer.appendChild(header);
    contentSection.appendChild(headerContainer)
    remindersContainer.appendChild(contentSection);

  // Display ongoing events
  if (ongoingEvents.length > 0) {
    const onMessage = document.createElement('p');
    const onText = document.createElement('span');
    onText.textContent = '[Today]';
    onText.style.color = '#3D5300';
    onText.style.fontWeight = 'bold'

    onMessage.appendChild(onText);
  
    onMessage.appendChild(document.createTextNode(' ')); 
  
    onMessage.appendChild(document.createTextNode(ongoingEvents.map(event => event.title).join(', '))); 
  
    contentSection.appendChild(onMessage);
  }

  // Display tomorrow's events
  if (tomorrowEvents.length > 0) {
    const tomMessage = document.createElement('p');
    const tomText = document.createElement('span');
    tomText.textContent = '[Tomorrow]';
    tomText.style.color = '#556FB5';
    tomText.style.fontWeight = 'bold'

    tomMessage.appendChild(tomText);
  
    tomMessage.appendChild(document.createTextNode(' ')); 
  
    tomMessage.appendChild(document.createTextNode(tomorrowEvents.map(event => event.title).join(', '))); 
  
    contentSection.appendChild(tomMessage);
  }

  // Filter events ending by tomorrow
  const endingTomorrowEvents = eventsData.filter(event => {
    const eventEnd = new Date(event.end);
    return eventEnd.getDate() === tomorrow.getDate() && eventEnd.getMonth() === tomorrow.getMonth() && eventEnd.getFullYear() === tomorrow.getFullYear();
  });

  // If no reminders
  if (ongoingEvents.length === 0 && tomorrowEvents.length === 0) {
    const noReminders = document.createElement('p');
    noReminders.textContent = "Take a break from the hustle and bustle. Enjoy your day!";
    remindersContainer.appendChild(noReminders);
  } else if (tomorrowEvents.length === 0){
    const tomMessage = document.createElement('p');
    const tomText = document.createElement('span');
    tomText.textContent = '[Tomorrow]';
    tomText.style.color = '#556FB5';
    tomText.style.fontWeight = 'bold'

    tomMessage.appendChild(tomText);
  
    tomMessage.appendChild(document.createTextNode(' ')); 
  
    tomMessage.appendChild(document.createTextNode("No new events starting tomorrow!")); 
  
    contentSection.appendChild(tomMessage);
  }

    // Display events ending by tomorrow
    if (endingTomorrowEvents.length > 0) {
      const endingMessage = document.createElement('p');
      const endingText = document.createElement('span');
      endingText.textContent = '[Ending tomorrow]';
      endingText.style.color = '#E4508F';
      endingText.style.fontWeight = 'bold'

      endingMessage.appendChild(endingText);
    
      endingMessage.appendChild(document.createTextNode(' ')); 
    
      endingMessage.appendChild(document.createTextNode(endingTomorrowEvents.map(event => event.title).join(', '))); 
    
      contentSection.appendChild(endingMessage);
    }

// Links
const linksSection = document.createElement('div');
linksSection.classList.add('links-section');

// const image4 = document.createElement('img');
// image4.src = "skid4.png"; // Replace with your actual image URL
// image4.alt = "Image 4";
// image4.classList.add('date-image-4');
// linksSection.appendChild(image4);

// const image5 = document.createElement('img');
// image5.src = "skid5.png"; // Replace with your actual image URL
// image5.alt = "Image 5";
// image5.classList.add('date-image-5');
// linksSection.appendChild(image5);

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
  "https://sky-shards.pages.dev/en", // Shard URL
  "https://sky-clock.netlify.app/", // Clock URL
  "https://sky-planner.com/", // Planner URL
  "https://sky-children-of-the-light.fandom.com/wiki/Sky:_Children_of_the_Light_Wiki", // Wiki URL
];

links.forEach((link, index) => {
  const linkContainer = document.createElement('div');
  linkContainer.classList.add('link-container');

  // Link element
  const linkElement = document.createElement('a');
  linkElement.href = linkUrls[index]; // Set the URL for the link
  linkElement.classList.add('link');
  linkElement.target = "_blank";

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

const dailyCollection = collection(db, 'dailies');

// Function to create daily quest items
function createDailyItems() {
  const dailyContainer = document.getElementById("daily");

  const dailyTitle = document.createElement("h2");
  dailyTitle.classList.add("daily-title");
  dailyTitle.textContent = "Daily Quests";
  dailyContainer.appendChild(dailyTitle);

  const dailyItemList = document.createElement("div");
  dailyItemList.classList.add("daily-item-list");

  getDocs(dailyCollection).then(snapshot => {
    snapshot.docs.forEach(doc => {
      const dailyData = doc.data();
      const dailyItem = document.createElement("div");
      dailyItem.classList.add("daily-item");

      const dailyItemText = document.createElement("p");
      dailyItemText.classList.add("daily-item-text");
      dailyItemText.textContent = dailyData.title; 
      dailyItem.appendChild(dailyItemText);

      const dailyItemImage = document.createElement("img");
      dailyItemImage.classList.add("daily-item-image");

      // Get the public URL from the storage URL
      const imageRef = ref(storage, dailyData.image); 

      getDownloadURL(imageRef)
        .then(url => {
          dailyItemImage.src = url;
          dailyItem.appendChild(dailyItemImage);

          // Add event listeners before the image is loaded
          dailyItemImage.addEventListener('click', () => {
            // If an image is already open, close it
            if (document.querySelector('.daily-item-image.full-size')) {
              closeFullSizeImage();
            }

            // Open the clicked image
            dailyItemImage.classList.add('full-size');
            dailyItemImage.addEventListener('click', closeFullSizeImage); 
      });

      dailyItemImage.alt = dailyData.altText
      dailyItemImage.addEventListener('mouseover', () => {
        if (dailyItemImage.classList.contains('full-size')) {
          const tooltip = document.createElement('div');
          tooltip.classList.add('tooltip');
          tooltip.textContent = dailyItemImage.alt;

          tooltip.style.position = 'absolute';
          tooltip.style.top = `${dailyItemImage.offsetTop + dailyItemImage.offsetHeight}px`;
          tooltip.style.left = `${dailyItemImage.offsetLeft}px`;

          tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          tooltip.style.color = '#fff';
          tooltip.style.padding = '5px';
          tooltip.style.borderRadius = '5px';
          tooltip.style.fontSize = '14px'
          tooltip.style.width = '20rem'

          dailyItemImage.parentNode.appendChild(tooltip);
        }
      });
      dailyItemImage.addEventListener('mouseout', () => {
        // Remove the tooltip
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) {
          tooltip.remove();
        }
      });

          const closeButton = document.createElement('div');
          closeButton.classList.add('close-button');
          closeButton.textContent = 'x';

          closeButton.addEventListener('click', () => {
            closeFullSizeImage();
          });

          dailyItem.appendChild(dailyItemImage);
          dailyItem.appendChild(closeButton); 
          dailyItemList.appendChild(dailyItem);
        })
        .catch(error => {
          console.error("Error getting download URL: ", error);
        });
    });
  });

  dailyContainer.appendChild(dailyItemList);
}

createDailyItems(); 

function closeFullSizeImage() {
  const fullSizeImage = document.querySelector('.daily-item-image.full-size');
  if (fullSizeImage) {
    fullSizeImage.classList.remove('full-size');
    fullSizeImage.removeEventListener('click', closeFullSizeImage); 
    fullSizeImage.removeChild(fullSizeImage.querySelector('.close-button'));
  }
}