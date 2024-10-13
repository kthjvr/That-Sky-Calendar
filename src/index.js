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
            <h2>${event.name}</h2> 
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
        window.eventName = event.name; // Make the variable accessible globally
    } else {
        window.eventName = 'No events found'; // Handle empty collection
    }
});

