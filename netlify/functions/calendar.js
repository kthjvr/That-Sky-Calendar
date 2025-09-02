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
    const snapshot = await db.collection("events").get();

    const calendar = ical({
      name: "Sky CotL Events",
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
    snapshot.forEach((doc) => {
      const data = doc.data();

      console.log("Raw Firestore data:", data);

      // Skip events without required fields
      if (!data.title || !data.start || !data.end) {
        console.warn("Skipping event with missing required fields:", data);
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
        return;
      }

      // Create event with more complete properties
      calendar.createEvent({
        uid: `${doc.id}@thatskyevents.netlify.app`, // Unique ID
        start: startDate.toDate(),
        end: endDate.toDate(),
        summary: data.title || "Untitled Event",
        location: data.location || "",
        created: new Date(),
        lastModified: new Date(),
        status: 'CONFIRMED',
        organizer: {
          name: 'Sky Events',
          email: 'thatskyevents@gmail.com'
        }
      });

      eventCount++;
    });

    console.log(`Generated calendar with ${eventCount} events`);

    const calendarString = calendar.toString();

    console.log("Calendar preview:", calendarString.split('\n').slice(0, 10).join('\n'));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="sky-events.ics"',
        // CORS headers
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff"
      },
      body: calendarString,
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