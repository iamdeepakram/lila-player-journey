import { mkdirSync, rmSync, readdirSync } from "node:fs";
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

const URL = process.env.DEMO_URL ?? "https://lila-player-journey-sage.vercel.app";
const RAW = "docs/walkthrough-raw";
const OUT = "docs/walkthrough.mp4";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

mkdirSync(RAW, { recursive: true });
mkdirSync("docs", { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1400, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: RAW, size: { width: 1400, height: 900 } },
});
const page = await context.newPage();

try {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("heading", { name: /Player journeys/i }).waitFor({ timeout: 60_000 });
  await page.getByRole("button", { name: /^Play$/ }).waitFor({ timeout: 60_000 });
  await sleep(4000);

  await page.getByRole("button", { name: /4\s*x/i }).click();
  await sleep(800);
  await page.getByRole("button", { name: "Play" }).click();
  await sleep(18_000);
  await page.getByRole("button", { name: "Pause" }).click();
  await sleep(1500);

  await page.getByRole("checkbox", { name: "Kill zones" }).click();
  await sleep(2500);
  await page.getByRole("checkbox", { name: "Storm death zones" }).click();
  await sleep(2500);

  await page.getByRole("combobox").first().selectOption("Lockdown");
  await sleep(3500);
  await page.getByRole("button", { name: "Play" }).click();
  await sleep(14_000);
  await page.getByRole("button", { name: "Pause" }).click();
  await sleep(1200);

  await page.getByRole("combobox").first().selectOption("GrandRift");
  await sleep(7000);
} finally {
  await context.close();
  await browser.close();
}

const files = readdirSync(RAW).filter((f) => f.endsWith(".webm"));
if (!files.length) {
  console.error("no webm recorded");
  process.exit(1);
}
const webm = `${RAW}/${files[0]}`;
const ff = spawnSync(
  ffmpegPath,
  [
    "-y",
    "-i",
    webm,
    "-t",
    "60",
    "-vf",
    "scale=1280:-2,fps=30",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "26",
    "-movflags",
    "+faststart",
    "-an",
    OUT,
  ],
  { stdio: "inherit" },
);
if (ff.status !== 0) {
  console.error("ffmpeg failed; leaving", webm);
  process.exit(ff.status ?? 1);
}
rmSync(RAW, { recursive: true, force: true });
console.log("wrote", OUT);
