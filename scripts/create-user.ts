// Creates a user, or sets a new password for an existing one.
//
//   npm run user:create -- you@example.com
//
// Asks for the password without showing it. For scripts, pass it in the
// PUBLOG_PASSWORD environment variable instead.

import { stdin, stdout } from "node:process";
import { databasePath, MIN_PASSWORD_LENGTH, openDatabase, upsertUser } from "../lib/db-core.ts";

async function askHidden(question: string): Promise<string> {
  if (!stdin.isTTY) throw new Error("No terminal to ask for the password; set PUBLOG_PASSWORD.");
  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          return resolve(value);
        }
        if (char === "\u0003") {
          stdin.setRawMode(false);
          return reject(new Error("Cancelled."));
        }
        if (char === "\u007f") value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run user:create -- <email>");
    process.exit(1);
  }
  let password = process.env.PUBLOG_PASSWORD;
  if (!password) {
    password = await askHidden(`Password for ${email} (at least ${MIN_PASSWORD_LENGTH} characters): `);
    const again = await askHidden("Same password again: ");
    if (password !== again) throw new Error("The passwords don’t match.");
  }
  const db = openDatabase();
  const result = await upsertUser(db, email, password);
  console.log(
    result === "created"
      ? `Created ${email} in ${databasePath()}`
      : `Updated the password of ${email} and signed out their sessions.`,
  );
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
