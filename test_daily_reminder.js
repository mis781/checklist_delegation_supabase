/* eslint-disable */
/**
 * test_daily_reminder.js
 * 
 * Mirrors the daily-reminder-cron edge function logic locally.
 * Run:  node test_daily_reminder.js
 *
 * Needs env vars:
 *   VITE_SUPABASE_URL          - loaded from .env automatically
 *   VITE_SUPABASE_ANON_KEY     - loaded from .env automatically
 *   WHATSAPP_ACCESS_TOKEN      - set in your shell or add to .env
 *   WHATSAPP_PHONE_NUMBER_ID   - set in your shell or add to .env
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// -- Load .env manually (no dotenv dependency needed) --
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

// -- Configuration --
const SUPABASE_URL       = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY  = process.env.VITE_SUPABASE_ANON_KEY;
const WA_ACCESS_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN;
const WA_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// -- TARGET USER (hardcoded for test) --
const TARGET_USERNAME = "test-user";
const TARGET_PHONE    = "918827194777"; // E.164 without leading +

// -- Guards --
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE credentials in .env");
  process.exit(1);
}
if (!WA_ACCESS_TOKEN || !WA_PHONE_NUMBER_ID) {
  console.error("Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID");
  console.error("Set them before running:");
  console.error('  $env:WHATSAPP_ACCESS_TOKEN="<token>"');
  console.error('  $env:WHATSAPP_PHONE_NUMBER_ID="<id>"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -- Date helpers (IST) --
const now = new Date();
const todayIST = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(now);

const todayFormattedDate = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
}).format(now);

console.log("\n--- Daily Reminder Test ---");
console.log("Target user  :", TARGET_USERNAME);
console.log("Target phone : +" + TARGET_PHONE);
console.log("Date (IST)   :", todayIST, " (" + todayFormattedDate + ")\n");

// -- Query tasks for test-user --
async function fetchTaskDates() {
  const [checklistRes, delegationRes, eaRes] = await Promise.all([
    supabase
      .from("checklist")
      .select("planned_date")
      .eq("name", TARGET_USERNAME)
      .is("submission_date", null),

    supabase
      .from("delegation")
      .select("planned_date")
      .eq("name", TARGET_USERNAME)
      .is("submission_date", null)
      .neq("status", "done"),

    supabase
      .from("ea_tasks")
      .select("planned_date")
      .eq("doer_name", TARGET_USERNAME)
      .in("status", ["pending", "extend", "extended", "Pending"]),
  ]);

  if (checklistRes.error)  console.warn("checklist query error:", checklistRes.error.message);
  if (delegationRes.error) console.warn("delegation query error:", delegationRes.error.message);
  if (eaRes.error)         console.warn("ea_tasks query error:", eaRes.error.message);

  return [
    ...(checklistRes.data  || []).map((t) => t.planned_date),
    ...(delegationRes.data || []).map((t) => t.planned_date),
    ...(eaRes.data         || []).map((t) => t.planned_date),
  ];
}

// -- Send WhatsApp template --
async function sendReminder(todayCount, pendingCount) {
  const totalCount = todayCount + pendingCount;
  const apiUrl = `https://graph.facebook.com/v21.0/${WA_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: TARGET_PHONE,
    type: "template",
    template: {
      name: "daily_reminder",
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: TARGET_USERNAME },
            { type: "text", text: String(totalCount) },
            { type: "text", text: String(todayCount) },
            { type: "text", text: String(pendingCount) },
          ],
        },
      ],
    },
  };

  console.log("Sending WhatsApp payload:");
  console.log(JSON.stringify(payload, null, 2));

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WA_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (res.ok) {
    console.log("\nMessage sent successfully!");
    console.log("Response:", JSON.stringify(data, null, 2));
  } else {
    console.error("\nWhatsApp API error (HTTP " + res.status + "):");
    console.error("Response:", JSON.stringify(data, null, 2));
  }
}

// -- Main --
async function main() {
  const allDates = await fetchTaskDates();

  let todayCount   = 0;
  let pendingCount = 0;

  for (const date of allDates) {
    if (!date) continue;
    const dateStr = date.split("T")[0];
    if (dateStr === todayIST)    todayCount++;
    else if (dateStr < todayIST) pendingCount++;
  }

  console.log("Task summary for \"" + TARGET_USERNAME + "\":");
  console.log("  Total raw dates :", allDates.length);
  console.log("  Due today       :", todayCount);
  console.log("  Overdue         :", pendingCount);
  console.log("  Total reminder  :", todayCount + pendingCount, "\n");

  if (todayCount + pendingCount === 0) {
    console.log("No tasks found - sending test message with dummy counts (3 total, 2 today, 1 overdue)");
    await sendReminder(2, 1);
  } else {
    await sendReminder(todayCount, pendingCount);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err.message);
  process.exit(1);
});
