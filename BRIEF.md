1. Context

CashMine pays users back part of the trading fees they pay on crypto exchanges. We call this payback. It is live on web, and the iOS/Android app is next. In this task you build a slice of that app: seeing payback balances and claiming them. The money is real for our users, so correctness matters more than polish.

You build it with React Native (Expo) and ship the web build, so that we can open it on a phone from a link.

2. Setup

Create a new Expo app with TypeScript (for example npx create-expo-app@latest). Use any libraries you like, as long as they work on web.
Run it in the browser (npx expo start --web) and design for a phone screen, about 390 px wide. We will open your link on a phone. It does not need to run on iOS or Android.
We host a test API for this task. Its documentation: https://task-api.cashmine.io/docs
Your personal token: {TOKEN}
It is valid for 24 hours, until 2026-10-23 08:00 UTC. All data is fake and private to your token.
Treat the API as a real remote server that you call but cannot change.
Do not put the token in your code, your repository or your deployed build. On first open, the app asks for the token (a text field is enough), keeps it in the browser and offers a way to change it. We will open your link with our own tokens.
Keep the API base URL in one place in your code.
If the API is unavailable during your slot, say so in your submission email and we will offer you a new slot.

3. What to build

The items are in priority order. Doing fewer things correctly is better than doing everything halfway.

Balances (Home). Show each asset's balances, the total in USD, and how fresh the data is. Include loading, error/retry and refresh states.
Claim. The user picks an asset and enters an amount or taps Max. They see the fee and the amount they will receive, then confirm and submit. Afterwards they can follow the claim until it completes or fails. Validate input against the rules in the API documentation.
Tests. Write a few unit tests for your amount logic: parsing, validation, fee and totals.
Activity (if time allows). Show a paginated history of accruals, reversals and claims.
4. Decisions we leave to you

Each of these has more than one reasonable answer. Pick one and tell us why.

How you represent and calculate amounts.
What the balance shows right after a claim is submitted. Two pieces of user feedback pull in opposite directions. One user said: "I claimed and my balance didn't change, so I claimed again." Another said: "My balance dropped, then jumped back up, and I stopped trusting the app."
What the user sees, and what the app does, when the result of a claim request is unknown, for example after a timeout.
5. AI tools

Use any AI tools you like: chat, IDE assistants or coding agents. AI may write code. We expect you to use these tools, and we care about how you work with them, not whether you do.

Keep your AI conversations and put them in ai-logs/ in your repository. You can export them, add share links or copy-paste them. If your tool cannot export, screenshots are fine. Do not tidy them up, because messy prompts are normal. The repository is public, so remove anything private, including your token.
For the balance-after-claim decision, ask your AI for at least two approaches before you choose. We want to see that conversation.
Commit at least every 30 minutes and do not squash your commits. Your history is part of the submission.
6. Notes

Add a NOTES.md of about one page with three sections:

Decisions. Cover the three decisions above and any others that matter: what you chose, what the alternatives were, and why.
Working with AI. Describe three moments and point to where each one is in ai-logs/:
a prompt that did not get you what you wanted, and how you changed it
a time AI output was wrong or risky, and how you found out
a time you disagreed with the AI or rejected a suggestion, and why
Not done / known issues. Say what is missing or wrong and what you would do next.
README.md only needs the live link, how to run the app locally and what works.

7. Submission

Before 2026-10-22 10:00 UTC, reply to this email with:

the link to a public GitHub repository with your full commit history
the live link to your deployed web build. Any static host works, for example EAS Hosting, Vercel, Netlify or Cloudflare Pages. npx expo export --platform web builds it.
roughly how long you spent
Deploy early, for example once the first screen works, so that hosting problems do not eat your last minutes. Do not push or redeploy after 2026-10-22 10:00 UTC.

8. What we look at

Whether money handling and the claim flow are correct
Your decisions and how you explain them
How you work with AI: the context you give it, how you check its output, and where you push back
Your React Native implementation and UX states on a phone screen
How clear your notes are
In the next interview we will walk through your code together. You will also make a small change live, using your AI tool, while sharing your screen. Please be ready to explain any line you submitted.

We do not answer questions during the task. If something is unclear, make a reasonable assumption, write it in NOTES.md and keep going.
