import{initializeApp}from"firebase/app";import{getAnalytics}from"firebase/analytics";import{getFirestore,collection,getDocs}from"firebase/firestore";const firebaseConfig={apiKey:"AIzaSyDChyRMRZw13CIheI4_vd5bsrFLBprMC20",authDomain:"that-sky-calendar-ffd49.firebaseapp.com",projectId:"that-sky-calendar-ffd49",storageBucket:"that-sky-calendar-ffd49.appspot.com",messagingSenderId:"994867085966",appId:"1:994867085966:web:ea6d5b05bccb508eb73fdf",measurementId:"G-FXXSH6NS6Z"},app=initializeApp(firebaseConfig),analytics=getAnalytics(app),db=getFirestore(app),eventsContainer=document.getElementById("events-container"),eventsCollectionRef=collection(db,"events");getDocs(eventsCollectionRef).then((e=>{e.docs.forEach((e=>{const t=e.data(),n=document.createElement("div");n.innerHTML=`\n         <h2>${t.name}</h2>\n         <p>Date: ${t.date}</p>\n         <p>Location: ${t.location}</p>\n       `,eventsContainer.appendChild(n)}))})).catch((e=>{console.error("Error fetching events:",e),document.getElementById("events-container").innerHTML="Error fetching events. Please try again later."}));