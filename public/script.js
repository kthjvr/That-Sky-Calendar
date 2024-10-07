// Firebase configuration
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
  firebase.initializeApp(firebaseConfig);
  
  // Get a reference to the Firestore database
  const db = firebase.firestore();
  
  // Fetch event data from Firestore
  const eventsContainer = document.getElementById('events-container');
  db.collection('events').get()
    .then(snapshot => {
      snapshot.docs.forEach(doc => {
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
    .catch(error => {
      console.error("Error getting documents: ", error);
    });