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
    console.log("Raw data:", data);

    let startDate, endDate;

    if (data.start && typeof data.start.toDate === "function") {
        startDate = dayjs(data.start.toDate()).tz(LA_TZ).startOf("day").toDate();
    } else if (typeof data.start === "string") {
        startDate = dayjs.tz(data.start, "YYYY-MM-DD", LA_TZ).startOf("day").toDate();
    }

    if (data.end && typeof data.end.toDate === "function") {
        endDate = dayjs(data.end.toDate()).tz(LA_TZ).endOf("day").toDate();
    } else if (typeof data.end === "string") {
        endDate = dayjs.tz(data.end, "YYYY-MM-DD", LA_TZ).endOf("day").toDate();
    }

    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error(
        `Invalid date values for event "${data.title}" (start=${JSON.stringify(
            data.start
        )}, end=${JSON.stringify(data.end)})`
        );
    }

    calendar.createEvent({
        start: startDate,
        end: endDate,
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
