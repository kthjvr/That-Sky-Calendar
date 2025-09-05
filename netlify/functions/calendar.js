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

// Firebase init
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

console.log("Firebase initialized");

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

    console.log("Generating calendar...");

    let eventCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log("Raw Firestore data:", data);

      if (!data.title || !data.start || !data.end) {
        console.warn("Skipping event with missing fields:", data);
        return;
      }

      console.log("Parsing event:", data.title, data.start, data.end);

      try {
        // Parse dates more carefully and convert to native Date objects
        const startDate = dayjs.tz(data.start, "YYYY-MM-DD", LA_TZ)
          .hour(0).minute(0).second(0).millisecond(0)
          .utc();

        const endDate = dayjs.tz(data.end, "YYYY-MM-DD", LA_TZ)
          .hour(23).minute(59).second(59).millisecond(999)
          .utc();

        if (!startDate.isValid() || !endDate.isValid()) {
          console.error(`Invalid date for "${data.title}" → start=${data.start}, end=${data.end}`);
          return;
        }

        // Convert to native Date objects explicitly
        const startJSDate = new Date(startDate.valueOf());
        const endJSDate = new Date(endDate.valueOf());

        console.log(`Converted dates for "${data.title}":`, {
          start: startJSDate.toISOString(),
          end: endJSDate.toISOString()
        });

        // Create the event with native Date objects
        calendar.createEvent({
          uid: `${doc.id}@thatskyevents.netlify.app`,
          start: startJSDate,
          end: endJSDate,
          summary: data.title || "Untitled Event",
          location: data.location || "",
          created: new Date(),
          lastModified: new Date(),
          status: "CONFIRMED",
          organizer: {
            name: "Sky Events",
            email: "thatskyevents@gmail.com"
          },
          alarms: [
            {
              type: "display",
              trigger: { minutes: 30, before: true },
              description: `Reminder: "${data.title}" starts soon`
            },
            {
              type: "display",
              trigger: { minutes: 30, before: true, related: "end" },
              description: `Reminder: "${data.title}" ends soon`
            }
          ]
        });

        eventCount++;
      } catch (dateError) {
        console.error(`Error processing dates for event "${data.title}":`, dateError);
        return;
      }
    });

    console.log(`Generated calendar with ${eventCount} events`);

    const calendarString = calendar.toString();
    console.log("Calendar preview:\n", calendarString.split("\n").slice(0, 10).join("\n"));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="sky-events.ics"',
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff"
      },
      body: calendarString
    };
  } catch (error) {
    console.error("Calendar generation failed:", error);
    console.error("Error stack:", error.stack);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "text/plain"
      },
      body: `Error generating calendar: ${error.message}`
    };
  }
}

// Alternative approach - if the above doesn't work, try this version
export async function handlerAlternative(event, context) {
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
      method: "PUBLISH"
    });

    console.log("Generating calendar...");

    let eventCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log("Raw Firestore data:", data);

      if (!data.title || !data.start || !data.end) {
        console.warn("Skipping event with missing fields:", data);
        return;
      }

      try {
        // Simpler date parsing - create Date objects directly
        const startStr = `${data.start}T00:00:00-08:00`; // PST/PDT offset
        const endStr = `${data.end}T23:59:59-08:00`;
        
        const startDate = new Date(startStr);
        const endDate = new Date(endStr);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error(`Invalid date for "${data.title}" → start=${data.start}, end=${data.end}`);
          return;
        }

        console.log(`Dates for "${data.title}":`, {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        });

        calendar.createEvent({
          uid: `${doc.id}@thatskyevents.netlify.app`,
          start: startDate,
          end: endDate,
          summary: data.title || "Untitled Event",
          location: data.location || "",
          created: new Date(),
          lastModified: new Date(),
          status: "CONFIRMED",
          organizer: {
            name: "Sky Events",
            email: "thatskyevents@gmail.com"
          }
        });

        eventCount++;
      } catch (dateError) {
        console.error(`Error processing dates for event "${data.title}":`, dateError);
        return;
      }
    });

    console.log(`Generated calendar with ${eventCount} events`);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="sky-events.ics"',
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff"
      },
      body: calendar.toString()
    };
  } catch (error) {
    console.error("Calendar generation failed:", error);
    console.error("Error stack:", error.stack);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "text/plain"
      },
      body: `Error generating calendar: ${error.message}`
    };
  }
}

// Timezone generator helper
function getTimezoneGenerator() {
  return [
    "BEGIN:VTIMEZONE",
    "TZID:UTC",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZNAME:UTC",
    "TZOFFSETFROM:+0000",
    "TZOFFSETTO:+0000",
    "END:STANDARD",
    "END:VTIMEZONE"
  ].join("\r\n");
}