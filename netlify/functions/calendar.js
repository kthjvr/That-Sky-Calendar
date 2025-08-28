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

export async function handler(event, context) {
  try {
    const snapshot = await db.collection("events").get();
    const calendar = ical({ name: "Sky CotL Events" });

    snapshot.forEach((doc) => {
      const data = doc.data();

      console.log("Raw Firestore data:", data);

      const startDate = dayjs.tz(
        (data.start || "").trim(),
        "YYYY-MM-DD",
        LA_TZ
      );
      const endDate = dayjs.tz(
        (data.end || "").trim(),
        "YYYY-MM-DD",
        LA_TZ
      );

      console.log("Parsed start:", startDate.format(), "valid?", startDate.isValid());
      console.log("Parsed end:", endDate.format(), "valid?", endDate.isValid());

      if (!startDate.isValid() || !endDate.isValid()) {
        throw new Error(
          `Invalid date values for event "${data.title}" (start=${data.start}, end=${data.end})`
        );
      }

      calendar.createEvent({
        start: startDate.toDate(),
        end: endDate.toDate(),
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
    console.error("Calendar generation failed:", error);
    return {
      statusCode: 500,
      body: `Error generating calendar: ${error.message}`,
    };
  }
}
