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
    const snapshot = await db.collection("events").get();

    const calendar = ical({ name: "Sky CotL Events" });

    snapshot.forEach((doc) => {
      const data = doc.data();

      const start = dayjs.tz(data.start, "YYYY-MM-DD", LA_TZ).startOf("day").toDate();
      const end = dayjs.tz(data.end, "YYYY-MM-DD", LA_TZ).endOf("day").toDate();

      calendar.createEvent({
        start,
        end,
        summary: data.title || "Untitled Event",
        description: data.description || "",
        timezone: LA_TZ,
      });
    });

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
