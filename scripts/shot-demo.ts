// Demo screenshot: types a password so the live strength meter renders,
// via the Chrome DevTools Protocol over a WebSocket. In-process server.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
process.env.PORT = "3000"; process.env.HOST = "127.0.0.1"; process.env.BREACH_PROVIDER = "mock";
const CHROME = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const OUT = process.argv[2]!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

await import("../src/server.ts");
await sleep(400);

const chrome = spawn(CHROME, [
  "--no-sandbox", "--single-process", "--no-zygote", "--disable-gpu",
  "--headless=new", "--remote-debugging-port=9222", "--window-size=1100,1250", "about:blank",
], { stdio: "ignore" });

let wsUrl = "";
for (let i = 0; i < 40; i++) {
  try {
    const list = await (await fetch("http://127.0.0.1:9222/json")).json() as Array<any>;
    const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
    if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
  } catch {}
  await sleep(250);
}
if (!wsUrl) { console.log("no CDP endpoint"); chrome.kill("SIGKILL"); process.exit(1); }

const ws = new WebSocket(wsUrl);
let id = 0;
const pending = new Map<number, (v: any) => void>();
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data as string);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)!(msg); pending.delete(msg.id); }
});
await new Promise<void>((res) => ws.addEventListener("open", () => res()));
const send = (method: string, params: any = {}) =>
  new Promise<any>((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: "http://127.0.0.1:3000/" });
await sleep(1200);
// Type a moderately strong password and fire the input event.
await send("Runtime.evaluate", { expression:
  `const i=document.getElementById('pw-input'); i.value='Giraffe-Blue-42!'; i.dispatchEvent(new Event('input',{bubbles:true})); 'ok';` });
await sleep(500);
const shot = await send("Page.captureScreenshot", { format: "png" });
if (shot?.result?.data) { writeFileSync(OUT, Buffer.from(shot.result.data, "base64")); console.log("saved", OUT); }
else { console.log("no screenshot data"); }
ws.close(); chrome.kill("SIGKILL");
process.exit(0);
