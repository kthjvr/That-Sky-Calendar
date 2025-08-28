import ical from "ical-generator";
import * as admin from "firebase-admin";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const LA_TZ = "America/Los_Angeles";

// Parse service account from Netlify env var
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}


const db = admin.firestore();

export async function handler(event, context) {
  try {
    // Step 3.1: Fetch events from Firestore
    const snapshot = await db.collection("events").get();

    // Step 3.2: Init calendar
    const calendar = ical({ name: "Sky CotL Events" });

    // Step 3.3: Add events into calendar
    snapshot.forEach((doc) => {
      const data = doc.data();

      // Assume Firestore has { start: "2025-09-01", end: "2025-09-04" }
      const start = dayjs.tz(`${data.start} 00:00`, LA_TZ).toDate();
      const end = dayjs.tz(`${data.end} 23:59`, LA_TZ).toDate();

      calendar.createEvent({
        start,
        end,
        summary: data.title || "Untitled Event",
        description: data.description || "",
        timezone: LA_TZ,
      });
    });

    // Step 3.4: Return .ics response
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "attachment; filename=sky-events.ics",
      },
      body: calendar.toString(),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `Error generating calendar: ${error.message}`,
    };
  }
}
