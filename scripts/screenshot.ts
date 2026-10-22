import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
process.env.PORT = "3000"; process.env.HOST = "127.0.0.1"; process.env.BREACH_PROVIDER = "mock";
const CHROME = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const OUT = process.argv[2]!; const PATH_ = process.argv[3] ?? "/";
await import("../src/server.ts");
await new Promise((r) => setTimeout(r, 500));
try {
  await run(CHROME, ["--no-sandbox","--single-process","--no-zygote","--disable-gpu","--hide-scrollbars","--force-device-scale-factor=1","--window-size=1100,1500",`--screenshot=${OUT}`,`http://127.0.0.1:3000${PATH_}`], { timeout: 30000 });
  console.log("ok");
} catch (e) { console.log("chrome error:", (e as Error).message); }
process.exit(0);
