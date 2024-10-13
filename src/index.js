// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, getDoc, onSnapshot, doc } from "firebase/firestore";

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
        // console.log(events);
    })
    .catch(err => {
        console.log(err.message);
    })

// Get the list element
const eventList = document.getElementById('event-list'); 
onSnapshot(colRef, (snapshot) => {
    eventList.innerHTML = '';
    snapshot.docs.forEach((doc) => {
        const event = { ...doc.data(), id: doc.id };
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <h2>${event.title}</h2> 
            <p>${event.location}</p>
        `;
        eventList.appendChild(listItem);
    });
});


// get single document data and display in HTML
const docRef = doc(db, 'events', 'RQmeUrWGw7vJ9bnHKSx4'); 
onSnapshot(docRef, (docSnapshot) => {
    if (docSnapshot.exists()) { // Check if the document exists
        const event = docSnapshot.data();
        window.eventName = event.title; // Make the variable accessible globally
    } else {
        window.eventName = 'No events found'; // Handle empty collection
    }
});

// Pre-defined array 
var test = []; // Initialize the array as empty

// Function to initialize FullCalendar
function initializeCalendar(eventsData) {
  var calendarEl = document.getElementById('calendar');
  var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    aspectRatio: 1.8,
    events: eventsData, // Use the eventsData array here
  });
  calendar.render();
}

// Fetch documents from the collection
getDocs(colRef)
  .then(snapshot => {
    snapshot.docs.forEach(doc => {
      const title = doc.data().title;
      const start = doc.data().start; // Fetch start date from Firestore
      const end = doc.data().end;   // Fetch end date from Firestore
      const color = doc.data().color;

      // Add the event to the test array
      test.push({
        title: title,
        start: start, 
        end: end,  
        color: color
      });
    });

    // Initialize FullCalendar after eventsData is populated
    // (Now called directly within the then block)
    initializeCalendar(test); 
  })
  .catch(error => {
    console.error("Error getting documents: ", error);
  });