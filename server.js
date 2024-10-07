const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');

// Load your event data
const eventData = require('./events.json'); 

// Enable CORS
app.use(cors({ origin: 'https://kthjvr.github.io/That-Sky-Calendar/' })); 

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Define a route to serve your JSON data
app.get('/events.json', (req, res) => {
  res.json(eventData); 
});

// Define a route to serve the HTML with event data
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html')); // Serve index.html
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});