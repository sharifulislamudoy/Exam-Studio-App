import { existsSync, readFileSync, writeFileSync } from "node:fs";
const template = new URL("./.env.example", import.meta.url);
const output = new URL("./.env", import.meta.url);
if (existsSync(output)) console.log(".env already exists; kept unchanged.");
else {
  const text = readFileSync(template, "utf8");
  writeFileSync(output, text, { mode: 0o600 });
  console.log("Created .env. Set your own connection/settings before running.");
}
