# Roomsure hackathon prototype

Open `Roomsure Prototype.html` in a browser, then choose **Verified people**.
Keep `demo-account.js` beside the HTML file. No installation or keys required.

## Account, identity and card demo

Start a demo session with a sample name/email and seeker or host role. Enter the
visible email code `123456`, then simulate ID/selfie and card pass/fail results.
Hosts must also confirm the demo permission-to-rent checkbox. Failed checks can
be retried; reset clears all checks; sign out clears the account. Session data is
stored only in this tab's sessionStorage (browser session restore may retain it).

This is a simulation, not secure authentication. No emails are delivered, IDs
uploaded, cards collected, money authorized, deposits held, or provider calls made.
Do not enter real personal or payment information. Anyone can alter client-side
state. Badges apply only to these simulated checks and do not certify listings.
Existing seeded listing badges are demo fixtures, independent of this account.

The MVP requirements explicitly exclude real payments, real identity checks and
authentication beyond demo login. A production implementation needs a server,
provider-backed sessions and authorization, hosted identity/card collection,
verified webhooks, and durable verification records. Never reuse this local
simulator as a production access-control mechanism.

Run verification logic tests with `node --test demo-account.test.cjs`.
