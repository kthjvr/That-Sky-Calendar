// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDChyRMRZw13CIheI4_vd5bsrFLBprMC20",
  authDomain: "that-sky-calendar-ffd49.firebaseapp.com",
  projectId: "that-sky-calendar-ffd49",
  storageBucket: "that-sky-calendar-ffd49.appspot.com",
  messagingSenderId: "994867085966",
  appId: "1:994867085966:web:ea6d5b05bccb508eb73fdf",
  measurementId: "G-FXXSH6NS6Z"
};

 // Initialize Firebase
 const app = initializeApp(firebaseConfig);
 const analytics = getAnalytics(app);
 const db = getFirestore(app);

 // Fetch event data from Firestore
 const eventsContainer = document.getElementById('events-container');
 const eventsCollectionRef = collection(db, 'events');
 getDocs(eventsCollectionRef)
   .then((snapshot) => {
     snapshot.docs.forEach((doc) => {
       const eventData = doc.data();
       const eventDiv = document.createElement('div');
       eventDiv.innerHTML = `
         <h2>${eventData.name}</h2>
         <p>Date: ${eventData.date}</p>
         <p>Location: ${eventData.location}</p>
       `;
       eventsContainer.appendChild(eventDiv);
     });
   })
   .catch((error) => {
     console.error("Error fetching events:", error);
     const eventsContainer = document.getElementById('events-container');
     eventsContainer.innerHTML = 'Error fetching events. Please try again later.';
   });

   
  getDocs(eventsCollectionRef)
  .then((snapshot) => {
    console.log('Data fetched successfully:', snapshot.docs);
  })
  .catch((error) => {
    console.error('Error fetching data:', error);
  });