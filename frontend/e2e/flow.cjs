/**
 * End-to-end check of the whole product in a real browser.
 *
 * Needs, already running:  backend on :5000 (fresh database)
 *                          frontend on :5173 (npm run dev, proxying /api)
 * Environment:  E2E_SHOTS  (optional) folder for screenshots
 *               PLAYWRIGHT_PATH  (optional) node_modules folder holding playwright
 */
const path = require("path");
const fs = require("fs");

const resolveFrom = process.env.PLAYWRIGHT_PATH ? { paths: [process.env.PLAYWRIGHT_PATH] } : undefined;
const { chromium } = require(require.resolve("playwright", resolveFrom));

const BASE = process.env.E2E_BASE || "http://127.0.0.1:5173";
const SHOTS = process.env.E2E_SHOTS;
const PW = "correct-horse-battery";

let passed = 0;
function check(label, ok, extra = "") {
  if (!ok) throw new Error(`FAILED: ${label} ${extra}`);
  passed += 1;
  console.log(`  ok  ${label}`);
}

async function shot(page, name) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
}

async function signIn(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function signOut(page) {
  const toggle = page.getByRole("button", { name: "Menu" });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login");
}

async function register(page, name, email, role) {
  await page.goto(`${BASE}/register`);
  await page.getByRole("radio", { name: new RegExp(`^${role}`, "i") }).check();
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PW);
  await page.getByLabel("Repeat password").fill(PW);
  await page.getByRole("button", { name: "Create account" }).click();
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) problems.push(`console: ${m.text()}`);
  });

  console.log("Public pages and guards");
  await page.goto(BASE);
  check("landing headline", await page.getByRole("heading", { level: 1 }).innerText().then((t) => /Ask your faculty/.test(t)));
  await shot(page, "01-landing");
  await page.goto(`${BASE}/app`);
  await page.waitForURL("**/login");
  check("anonymous visitor is sent to sign in", true);
  await signIn(page, "nobody@example.com", "wrong-password-123");
  await page.getByText("The email or password is not correct.").waitFor();
  check("wrong password shows a message", true);

  console.log("Student signs up");
  await page.goto(`${BASE}/register`);
  check("student is the default choice", await page.getByRole("radio", { name: /^student/i }).isChecked());
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByText("Enter your name.").waitFor();
  check("empty registration shows field errors", true);
  await shot(page, "02-register");
  await register(page, "Asha Verma", "asha@example.com", "student");
  await page.waitForURL("**/app");
  check("student lands on the dashboard straight away", await page.getByRole("heading", { level: 1 }).innerText().then((t) => /Hello, Asha/.test(t)));

  console.log("Student asks a question");
  await page.getByRole("link", { name: "Ask a doubt" }).first().click();
  await page.getByLabel("Title").fill("Why is the limit of sin x over x equal to one at zero");
  await page.getByLabel("Your doubt").fill("I can see it numerically but I do not understand the geometric proof using the unit circle and the squeeze theorem.");
  await page.getByLabel("Subject").selectOption("Mathematics");
  await shot(page, "03-ask");
  await page.getByRole("button", { name: "Send question" }).click();
  await page.waitForURL(/\/questions\/\d+/);
  const questionUrl = page.url();
  await page.getByText("Question sent").waitFor();
  check("question created", true);
  check("no answer yet", await page.getByRole("heading", { name: "No answer yet" }).isVisible());
  check("student has no answer form", (await page.getByLabel("Your answer").count()) === 0);
  await shot(page, "04-question-open");
  await page.goto(`${BASE}/faculty`);
  await page.waitForURL("**/forbidden");
  check("student cannot open the faculty queue", true);
  await signOut(page);

  console.log("Faculty signs up, answers and publishes");
  await register(page, "Dr Meera Rao", "meera@example.com", "faculty");
  await page.waitForURL("**/faculty");
  await page.getByText("Asha Verma").waitFor();
  check("faculty lands on the queue and sees the student's question", true);
  await shot(page, "05-faculty");
  await page.goto(questionUrl);
  check("publish is disabled before an answer", await page.getByRole("button", { name: "Publish to library" }).isDisabled());
  await page.getByLabel("Your answer").fill("Compare the areas of the triangle, the sector and the larger triangle on the unit circle. That gives cos x < sin x / x < 1, and the squeeze theorem finishes it.");
  await page.getByRole("button", { name: "Post answer" }).click();
  await page.getByText("Compare the areas").first().waitFor();
  await page.getByRole("button", { name: "Publish to library" }).click();
  await page.getByText("In the library (anonymous)").waitFor();
  check("answered question published", true);
  await signOut(page);

  console.log("Student reads the answer and sees AI suggestions");
  await signIn(page, "asha@example.com", PW);
  await page.waitForURL("**/app");
  await page.goto(questionUrl);
  await page.getByText("squeeze theorem finishes it").waitFor();
  check("student sees the faculty answer", true);
  check("answer is attributed to faculty", await page.getByText("Dr Meera Rao").first().isVisible());
  await shot(page, "06-question-answered");
  await page.goto(`${BASE}/app/ask`);
  await page.getByLabel("Title").fill("Limit of sin x over x as x approaches zero");
  await page.getByText("AI suggestion").first().waitFor({ timeout: 8000 });
  check("similar library question suggested and labelled", await page.getByRole("link", { name: /sin x over x/i }).first().isVisible());
  await shot(page, "07-ask-ai");
  await page.getByRole("button", { name: "Yes" }).first().click();
  await page.getByText("Your answer was saved").waitFor();
  check("AI feedback recorded", true);
  await page.goto(`${BASE}/library`);
  await page.getByText("Why is the limit of sin x over x").first().waitFor();
  check("library lists the question without a student name", !(await page.locator("main").innerText()).includes("Asha"));
  await shot(page, "08-library");

  console.log("Session handling");
  await page.evaluate(() => sessionStorage.setItem("sds.token", "not-a-real-token"));
  await page.goto(`${BASE}/app`);
  await page.waitForURL("**/login");
  check("a bad stored token sends the user to sign in", true);

  console.log("Mobile layout");
  const phone = await browser.newContext({ viewport: { width: 375, height: 740 } });
  const mp = await phone.newPage();
  await mp.goto(`${BASE}/register`);
  check("register fits a phone", await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await shot(mp, "09-mobile-register");
  await signIn(mp, "asha@example.com", PW);
  await mp.waitForURL("**/app");
  check("dashboard fits a phone", await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await mp.getByRole("button", { name: "Menu" }).click();
  await shot(mp, "10-mobile-menu");

  await browser.close();
  if (problems.length) {
    console.log("Browser problems:\n" + problems.join("\n"));
    throw new Error("Browser reported errors");
  }
  console.log(`\nAll ${passed} checks passed.`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
