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

let cachedCalendar = null;
let cachedETag = null;
let cacheExpiry = 0;
let cachedEventCount = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache

console.log("Firebase initialized with caching");

export async function handler(event, context) {
  try {
    const now = Date.now();
    const clientETag = event.headers?.['if-none-match'];

    if (cachedCalendar && now < cacheExpiry) {
      console.log("✅ Serving from cache - NO Firebase reads!");
      
      // If client has same ETag, return 304 Not Modified
      if (clientETag && clientETag === cachedETag) {
        console.log("🎯 Client has current version - returning 304");
        return {
          statusCode: 304,
          headers: {
            "ETag": cachedETag,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Served-From": "cache-304"
          }
        };
      }

      // Return cached calendar
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": 'inline; filename="sky-events.ics"',
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0, s-maxage=0",
          "Pragma": "no-cache",
          "Expires": "0",
          "ETag": cachedETag,
          "Last-Modified": new Date().toUTCString(),
          "X-Content-Type-Options": "nosniff",
          "Vary": "Accept-Encoding, User-Agent",
          "X-Generated-At": new Date().toISOString(),
          "X-Events-Count": cachedEventCount.toString(),
          "X-Served-From": "cache"
        },
        body: cachedCalendar
      };
    }

    console.log("⚠️  Cache expired/empty - fetching from Firestore");
    const snapshot = await db.collection("events").get();
    console.log(`📊 Firebase read: ${snapshot.size} documents`);

    const calendar = ical({
      name: "Sky CotL Events",
      prodId: {
        company: "thatskyevents",
        product: "calendar",
        language: "EN"
      },
      url: "http://development--thatskyevents.netlify.app/.netlify/functions/calendar",
      method: "PUBLISH",
      description: `Sky: Children of the Light Events - Last updated: ${new Date().toISOString()}`,
      lastModified: new Date()
    });

    console.log("🔄 Generating fresh calendar...");

    let eventCount = 0;
    let skippedCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\n--- Processing document ${doc.id} ---`);

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

        const eventConfig = {
          uid: `${doc.id}@thatskyevents.netlify.app`,
          start: startJSDate,
          end: endJSDate,
          summary: data.title,
          location: data.location || "",
          created: new Date(),
          lastModified: new Date(),
          sequence: Math.floor(Date.now() / 1000) 
        };

        calendar.createEvent(eventConfig);
        eventCount++;
        console.log(`✅ Event "${data.title}" added successfully!`);

      } catch (dateError) {
        console.error(`❌ Error processing dates for event "${data.title}":`, dateError);
        skippedCount++;
        return;
      }
    });

    console.log(`\n=== GENERATION SUMMARY ===`);
    console.log(`📊 Total documents: ${snapshot.size}`);
    console.log(`✅ Events created: ${eventCount}`);
    console.log(`❌ Events skipped: ${skippedCount}`);

    const calendarString = calendar.toString();
    
    //Cache the results
    const contentHash = Buffer.from(calendarString).toString('base64').substring(0, 16);
    const timestamp = Date.now();
    const uniqueETag = `"${contentHash}-${timestamp}"`;
    
    cachedCalendar = calendarString;
    cachedETag = uniqueETag;
    cachedEventCount = eventCount;
    cacheExpiry = now + CACHE_DURATION;
    
    console.log(`🎯 Calendar cached for ${CACHE_DURATION / 60000} minutes`);
    console.log(`📦 Cache will expire at: ${new Date(cacheExpiry).toISOString()}`);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="sky-events.ics"',
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
        
        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0, s-maxage=0",
        "Pragma": "no-cache",
        "Expires": "0",
        
        "ETag": uniqueETag,
        "Last-Modified": new Date().toUTCString(),
        
        "X-Content-Type-Options": "nosniff",
        "Vary": "Accept-Encoding, User-Agent",
        
        "X-Generated-At": new Date().toISOString(),
        "X-Events-Count": eventCount.toString(),
        "X-Calendar-Version": timestamp.toString(),
        "X-Served-From": "fresh"
      },
      body: calendarString
    };

  } catch (error) {
    console.error("💥 Calendar generation failed:", error);
    console.error("Error stack:", error.stack);
    
    if (cachedCalendar) {
      console.log("🔄 Serving stale cache as fallback");
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "X-Served-From": "stale-cache-fallback"
        },
        body: cachedCalendar
      };
    }
    
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "text/plain"
      },
      body: `Error generating calendar: ${error.message}`
    };
  }
}