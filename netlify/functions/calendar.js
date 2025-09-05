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

      // Create the event
      calendar.createEvent({
        uid: `${doc.id}@thatskyevents.netlify.app`,
        start: startDate.toDate(),
        end: endDate.toDate(),
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
