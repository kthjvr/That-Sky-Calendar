import ical from "ical-generator";
import * as admin from "firebase-admin";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const LA_TZ = "America/Los_Angeles";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

console.log("passed the init");

export async function handler(event, context) {
  try {
    // Calculate cutoff date - 1 month ago from today in LA timezone
    const cutoffDate = dayjs().tz(LA_TZ).subtract(1, 'month').startOf('day');
    console.log(`Calendar cutoff date: ${cutoffDate.format('YYYY-MM-DD')} (LA timezone)`);

    const snapshot = await db.collection("events").get();

    const calendar = ical({
      name: "Sky CotL Events",
      description: "Sky: Children of the Light Events Calendar - Recent & Upcoming Events",
      prodId: { 
        company: "thatskyevents", 
        product: "calendar", 
        language: "EN" 
      },
      url: "https://development--thatskyevents.netlify.app/.netlify/functions/calendar",
      method: "PUBLISH",
      timezone: {
        name: "UTC",
        generator: getTimezoneGenerator
      }
    });

    console.log("inside the export");

    let eventCount = 0;
    let skippedCount = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();

      console.log("Raw Firestore data:", data);

      // Skip events without required fields
      if (!data.title || !data.start || !data.end) {
        console.warn("Skipping event with missing required fields:", data);
        skippedCount++;
        return;
      }

      const startString = `${(data.start || "").trim()}T00:00:00`;
      const endString = `${(data.end || "").trim()}T23:59:59`;

      console.log("ISO strings:", startString, endString);

      // Parse as LA timezone, then convert to UTC
      const startDate = dayjs.tz(startString, LA_TZ).utc();
      const endDate = dayjs.tz(endString, LA_TZ).utc();

      console.log(
        "Parsed start:",
        startDate.format(),
        "valid?",
        startDate.isValid()
      );
      console.log(
        "Parsed end:",
        endDate.format(),
        "valid?",
        endDate.isValid()
      );

      if (!startDate.isValid() || !endDate.isValid()) {
        console.error(
          `Invalid date values for event "${data.title}" (start=${data.start}, end=${data.end})`
        );
        skippedCount++;
        return;
      }

      // Filter out events that ended more than 1 month ago
      const eventStartInLA = dayjs.tz(startString, LA_TZ);
      const eventEndInLA = dayjs.tz(endString, LA_TZ);
      
      if (eventEndInLA.isBefore(cutoffDate)) {
        console.log(`Skipping old event "${data.title}" (ended ${eventEndInLA.format('YYYY-MM-DD')})`);
        skippedCount++;
        return;
      }

      console.log(`Including event "${data.title}" (starts ${eventStartInLA.format('YYYY-MM-DD')})`);

      // Create event with more complete properties
      calendar.createEvent({
        uid: `${doc.id}@thatskyevents.netlify.app`, // Unique ID
        start: startDate.toDate(),
        end: endDate.toDate(),
        summary: data.title || "Untitled Event",
        description: data.description || "",
        location: data.location || "",
        created: new Date(),
        lastModified: new Date(),
        status: 'CONFIRMED',
        organizer: {
          name: 'Sky Events',
          email: 'events@thatskyevents.netlify.app'
        }
      });
      
      eventCount++;
    });

    console.log(`Generated calendar with ${eventCount} events (skipped ${skippedCount} old events)`);
    console.log(`Cutoff date was: ${cutoffDate.format('YYYY-MM-DD')} LA time`);

    const calendarString = calendar.toString();
    
    console.log("Calendar preview:", calendarString.split('\n').slice(0, 10).join('\n'));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "ok",
        eventsCount: snapshot.size,
        sampleICS: calendar.toString().split("\n").slice(0, 15),
      }),
    };
  } catch (error) {
    console.error("Calendar generation failed:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "text/plain",
      },
      body: `Error generating calendar: ${error.message}`,
    };
  }
}

// Helper function
function getTimezoneGenerator() {
  return [
    'BEGIN:VTIMEZONE',
    'TZID:UTC',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZNAME:UTC',
    'TZOFFSETFROM:+0000',
    'TZOFFSETTO:+0000',
    'END:STANDARD',
    'END:VTIMEZONE'
  ].join('\r\n');
}