// Temporary verification script — drives the running app with Playwright.
import { chromium } from "playwright";
import fs from "node:fs";

const SHOTS = "verify-shots";
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
function log(status, msg) {
  results.push(`${status} ${msg}`);
  console.log(`${status} ${msg}`);
}

async function expectVisible(page, selectorOrText, label, opts = {}) {
  try {
    const loc =
      typeof selectorOrText === "string" && selectorOrText.startsWith("text=")
        ? page.locator(selectorOrText).first()
        : page.locator(selectorOrText).first();
    await loc.waitFor({ state: "visible", timeout: opts.timeout ?? 8000 });
    log("PASS:", label);
    return true;
  } catch {
    log("FAIL:", label);
    return false;
  }
}

const browser = await chromium.launch();
const phase = process.argv[2] || "offline";

if (phase === "offline") {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  // 1. Main page loads in offline demo mode with seeded data
  await page.goto("http://localhost:3000/");
  await expectVisible(page, "text=ToolShare", "app header renders");
  await expectVisible(page, "text=Offline demo", "offline demo badge shown");
  await expectVisible(page, "text=Spray Painter", "seeded item (Spray Painter) visible in Circle tab");
  await expectVisible(page, "text=Alice", "seeded friend Alice visible");
  await page.screenshot({ path: `${SHOTS}/01-offline-home.png`, fullPage: true });

  // 2. My Items tab + add item flow
  await page.getByRole("tab", { name: /My Items/ }).click();
  await expectVisible(page, "text=Your Items", "My Items tab opens");
  await page.getByRole("button", { name: "+ Add Item" }).click();
  await page.getByPlaceholder("e.g., Cordless Drill").fill("Test Hammer");
  await page.getByPlaceholder("e.g., Power Tools").fill("Hand Tools");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expectVisible(page, 'text="Test Hammer" added to your tools', "add-item success toast");
  await expectVisible(page, "text=Test Hammer", "new item appears in list");
  await page.screenshot({ path: `${SHOTS}/02-added-item.png`, fullPage: true });

  // 3. Validation probe: empty title
  await page.getByRole("button", { name: "+ Add Item" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expectVisible(page, "text=Title is required", "PROBE empty title -> validation error");
  await page.getByRole("button", { name: "Close dialog" }).click();

  // 4. Circle management modal: create a circle locally
  await page.getByRole("button", { name: "Manage circles" }).click();
  await expectVisible(page, "text=Create a new circle", "circle modal opens");
  await expectVisible(
    page,
    "text=cloud version",
    "PROBE join-by-code disabled note shown in offline mode"
  );
  await page.getByPlaceholder("e.g., Maple Street Neighbors").fill("Test Circle");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expectVisible(page, 'text=Circle "Test Circle" created', "create-circle toast");
  const options = await page.locator("select[aria-label='Select circle'] option").allTextContents();
  if (options.includes("Test Circle")) log("PASS:", "new circle appears in circle selector");
  else log("FAIL:", `new circle missing from selector (options: ${options.join(", ")})`);

  // 5. Request flow: open details of Alice's drill, validate dates, send request
  await page.getByRole("tab", { name: /Circle/ }).first().click();
  await page
    .getByText("18V Drill + Bits")
    .locator("xpath=ancestor::div[contains(@class,'bg-gray-900')][1]")
    .getByRole("button", { name: "Details" })
    .click();
  await expectVisible(page, "text=Request to borrow this tool", "details modal opens for friend's item");
  await page.getByRole("button", { name: "Request Tool" }).click();
  await expectVisible(page, "text=Start date is required", "PROBE missing dates -> validation error");
  const dates = page.locator("input[type=date]");
  await dates.nth(0).fill("2026-06-20");
  await dates.nth(1).fill("2026-06-22");
  await page.getByRole("button", { name: "Request Tool" }).click();
  await expectVisible(page, "text=Request sent for", "request-sent toast");

  // 6. Requests tab shows outgoing request
  await page.getByRole("tab", { name: /Requests/ }).click();
  await expectVisible(page, "text=Outgoing Requests", "outgoing request listed");
  await page.screenshot({ path: `${SHOTS}/03-requests.png`, fullPage: true });

  // 7. Persistence probe: reload, data still there
  await page.reload();
  await page.getByRole("tab", { name: /My Items/ }).click();
  await expectVisible(page, "text=Test Hammer", "PROBE reload -> added item persists (localStorage)");

  if (errors.length) {
    log("WARN:", `console/page errors: ${errors.slice(0, 5).join(" | ")}`);
  } else {
    log("PASS:", "no console or page errors during the whole flow");
  }
} else {
  // Phase B: dummy Firebase config on port 3001 — login UI renders
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // 1. Signed-out users get redirected from / to /login
  await page.goto("http://localhost:3001/");
  await page.waitForURL("**/login", { timeout: 10000 }).catch(() => {});
  if (page.url().includes("/login")) log("PASS:", "/ redirects signed-out user to /login");
  else log("FAIL:", `expected redirect to /login, got ${page.url()}`);

  // 2. Login UI elements
  await expectVisible(page, "#email", "email field renders");
  await expectVisible(page, "#password", "password field renders");
  await expectVisible(page, "text=Continue with Google", "Google sign-in button renders");
  await expectVisible(page, "text=Forgot password?", "forgot-password link renders");
  await page.screenshot({ path: `${SHOTS}/04-login-signin.png`, fullPage: true });

  // 3. Empty submit probe
  await page.getByRole("button", { name: "Sign In", exact: true }).last().click();
  await expectVisible(page, "text=Email and password are required", "PROBE empty submit -> inline error");

  // 4. Create Account mode shows name field
  await page.getByRole("button", { name: "Create Account" }).first().click();
  await expectVisible(page, "#name", "create-account mode shows name field");
  await page.screenshot({ path: `${SHOTS}/05-login-signup.png`, fullPage: true });

  // 5. Signup without name probe
  await page.locator("#email").fill("test@example.com");
  await page.locator("#password").fill("secret123");
  await page.getByRole("button", { name: "Create Account", exact: true }).last().click();
  await expectVisible(page, "text=Please enter your name", "PROBE signup without name -> inline error");

  // 6. Real submit against dummy Firebase -> friendly error, no crash
  await page.locator("#name").fill("Test User");
  await page.getByRole("button", { name: "Create Account", exact: true }).last().click();
  const errBox = page.locator("div.bg-red-900\\/30");
  try {
    await errBox.waitFor({ state: "visible", timeout: 15000 });
    log("PASS:", `PROBE signup with dummy Firebase config -> friendly error shown: "${(await errBox.textContent())?.trim()}"`);
  } catch {
    log("FAIL:", "no error message after signup attempt with dummy Firebase");
  }
  await page.screenshot({ path: `${SHOTS}/06-login-error.png`, fullPage: true });
}

await browser.close();
const fails = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n=== ${phase}: ${results.length} checks, ${fails} failures ===`);
process.exit(fails ? 1 : 0);
