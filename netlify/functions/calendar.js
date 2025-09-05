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
    console.log(`Found ${snapshot.size} documents in events collection`);

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
    let skippedCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\n--- Processing document ${doc.id} ---`);
      console.log("Raw Firestore data:", JSON.stringify(data, null, 2));

      // Check for required fields
      if (!data.title) {
        console.warn("❌ Skipping event: missing title");
        skippedCount++;
        return;
      }
      if (!data.start) {
        console.warn("❌ Skipping event: missing start date");
        skippedCount++;
        return;
      }
      if (!data.end) {
        console.warn("❌ Skipping event: missing end date");
        skippedCount++;
        return;
      }

      console.log(`✅ Event has required fields: "${data.title}"`);
      console.log(`📅 Dates - start: "${data.start}", end: "${data.end}"`);

      try {
        let startJSDate, endJSDate;

        if (data.start instanceof Date) {
          startJSDate = new Date(data.start);
        } else if (typeof data.start === 'number') {
          startJSDate = new Date(data.start);
        } else if (typeof data.start === 'string') {
          if (data.start.includes('T') || data.start.includes(' ')) {
            startJSDate = new Date(data.start);
          } else {
            startJSDate = new Date(`${data.start}T00:00:00-08:00`);
          }
        } else {
          console.error("❌ Unknown start date format:", typeof data.start, data.start);
          skippedCount++;
          return;
        }

        if (data.end instanceof Date) {
          endJSDate = new Date(data.end);
        } else if (typeof data.end === 'number') {
          endJSDate = new Date(data.end);
        } else if (typeof data.end === 'string') {
          if (data.end.includes('T') || data.end.includes(' ')) {
            endJSDate = new Date(data.end);
          } else {
            endJSDate = new Date(`${data.end}T23:59:59-08:00`);
          }
        } else {
          console.error("❌ Unknown end date format:", typeof data.end, data.end);
          skippedCount++;
          return;
        }

        // Validate dates
        if (isNaN(startJSDate.getTime()) || isNaN(endJSDate.getTime())) {
          console.error(`❌ Invalid dates for "${data.title}":`, {
            startInput: data.start,
            endInput: data.end,
            startParsed: startJSDate,
            endParsed: endJSDate
          });
          skippedCount++;
          return;
        }

        console.log(`✅ Successfully parsed dates:`, {
          start: startJSDate.toISOString(),
          end: endJSDate.toISOString()
        });

        // Create the event
        const eventConfig = {
          uid: `${doc.id}@thatskyevents.netlify.app`,
          start: startJSDate,
          end: endJSDate,
          summary: data.title,
          location: data.location || "",
          created: new Date(),
          lastModified: new Date()
        };

        console.log("📝 Creating event with config:", JSON.stringify({
          uid: eventConfig.uid,
          start: eventConfig.start.toISOString(),
          end: eventConfig.end.toISOString(),
          summary: eventConfig.summary
        }, null, 2));

        calendar.createEvent(eventConfig);
        eventCount++;
        console.log(`✅ Event "${data.title}" added successfully!`);

      } catch (dateError) {
        console.error(`❌ Error processing dates for event "${data.title}":`, dateError);
        console.error("Error stack:", dateError.stack);
        skippedCount++;
        return;
      }
    });

    console.log(`\n=== SUMMARY ===`);
    console.log(`📊 Total documents: ${snapshot.size}`);
    console.log(`✅ Events created: ${eventCount}`);
    console.log(`❌ Events skipped: ${skippedCount}`);

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
        "Cache-Control": "no-cache, no-store, must-revalidate", 
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Content-Type-Options": "nosniff",
        "ETag": `"${Date.now()}"`
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