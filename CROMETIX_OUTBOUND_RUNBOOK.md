# Crometix Outbound System - Full Runbook

This runbook covers the full process from pulling leads from Apollo to adding qualified leads into Instantly.

## 1. Start the local API

From the project root:

```bash
npm run dev
```

Verify the server is running:

```bash
curl http://localhost:3001/health
```

Expected result: a successful health response from the API.

---

## 2. Pull and import leads from Apollo

Run the Apollo import route:

```bash
curl http://localhost:3001/apollo/import-test
```

This should:

- Search Apollo using the configured filters
- Enrich contacts
- Import leads with valid emails and websites
- Set new leads to `NEW`

Check imported leads:

```bash
curl "http://localhost:3001/leads?status=NEW"
```

---

## 3. Let the scoring job process leads

The server runs the scoring job automatically on its configured schedule.

The normal status flow is:

```text
NEW
-> SCORE_PENDING
-> REPORT_PENDING
```

Leads should be disqualified when:

- Website performance score is above the qualification threshold
- The website fails
- The company is not a valid target
- The lead is a supplier, software company, consultant, or other non-med-spa business

Check qualified leads waiting for comparisons:

```bash
curl "http://localhost:3001/leads?status=REPORT_PENDING"
```

Check disqualified leads:

```bash
curl "http://localhost:3001/leads?status=DISQUALIFIED"
```

---

## 4. Generate competitor comparisons

Generate comparison data for qualified leads:

```bash
curl -X POST http://localhost:3001/leads/generate-comparisons
```

The route may process a limited number per call. Repeat until it returns:

```json
{
  "attempted": 0,
  "generated": 0,
  "skipped": 0,
  "errors": 0
}
```

Check comparison-ready leads:

```bash
curl "http://localhost:3001/leads?status=COMPARISON_READY"
```

---

## 5. Generate public report URLs

Create public report links:

```bash
curl -X POST http://localhost:3001/leads/generate-report-urls
```

Check report-ready leads:

```bash
curl "http://localhost:3001/leads?status=REPORT_READY"
```

All report URLs must use the singular route:

```text
https://crometix.com/report/<lead-id>
```

Check that no incorrect plural URLs exist:

```bash
curl -s "http://localhost:3001/leads?status=REPORT_READY"   | grep -o 'https://crometix.com/reports/[^"]*'
```

This command should return nothing.

---

## 6. Manually verify reports before sending

Before pushing leads to Instantly, inspect a sample of reports.

Verify:

- The lead is actually a med spa or relevant cosmetic practice
- The decision-maker is relevant
- The company name is correct
- The performance score is correct
- `Competitor_1` and `Competitor_2` are legitimate nearby competitors
- The report URL loads successfully
- No fields display `undefined`, `null`, or raw merge tags
- Suppliers and unrelated businesses are excluded

Test a report URL:

```bash
curl -I "https://crometix.com/report/<lead-id>"
```

Expected result:

```text
HTTP/2 200
```

---

## 7. Remove test or invalid records

Disqualify internal test leads or bad-fit companies before sending.

Example:

```bash
cat <<'SQL' | npx prisma db execute --stdin
UPDATE "Lead"
SET "status" = 'DISQUALIFIED',
    "errorMessage" = 'Internal test record'
WHERE "email" = 'will@test.com';
SQL
```

Example for a supplier:

```bash
cat <<'SQL' | npx prisma db execute --stdin
UPDATE "Lead"
SET "status" = 'DISQUALIFIED',
    "errorMessage" = 'Supplier, not a med spa prospect'
WHERE "email" = 'brad@medicalspasupply.com';
SQL
```

---

## 8. Push a smoke-test lead to Instantly

Push one report-ready lead:

```bash
curl -X POST http://localhost:3001/leads/push-to-instantly
```

Check which lead was added:

```bash
curl "http://localhost:3001/leads?status=INSTANTLY_ADDED"
```

In Instantly, verify:

- Correct campaign
- Correct first name
- Correct company name
- Correct performance score
- Correct competitor names
- Correct report URL
- No broken merge fields
- Sending account is correct
- Campaign schedule is correct
- Campaign is paused while testing, unless ready to launch

---

## 9. Push a small batch

After the smoke test passes, push 5 leads:

```bash
for i in {1..5}; do
  curl -s -X POST http://localhost:3001/leads/push-to-instantly
  echo
done
```

Verify them:

```bash
curl -s "http://localhost:3001/leads?status=INSTANTLY_ADDED"
```

---

## 10. Push the remaining ready leads

Once the first batch is verified, push the rest.

Example for 10 leads:

```bash
for i in {1..10}; do
  curl -s -X POST http://localhost:3001/leads/push-to-instantly
  echo
done
```

Check whether any report-ready leads remain:

```bash
curl -s "http://localhost:3001/leads?status=REPORT_READY"
```

An empty array means all ready leads have been pushed:

```json
[]
```

---

## 11. Final checks in Instantly

Before activating the campaign, verify:

- Campaign A and Campaign B are assigned correctly
- Leads are split into comparable groups
- Positive reply rate is the primary test metric
- Email copy and delays are correct
- Stop-on-reply is enabled
- Report links work
- Reply routing works
- HubSpot handoff works if enabled
- Sending accounts are warmed and active
- Daily limits are safe

---

## Recommended launch sequence

Use this order for every new batch:

```text
Apollo import
-> NEW
-> scoring job
-> REPORT_PENDING
-> generate comparisons
-> COMPARISON_READY
-> generate report URLs
-> REPORT_READY
-> manual QA
-> push one smoke-test lead
-> push 5 leads
-> verify in Instantly
-> push remaining leads
-> launch campaign
```

## Primary performance metric

```text
Positive Reply Rate = Positive Replies / Delivered Leads
```

For the A/B test, compare Campaign A and Campaign B only after both have received a meaningful number of delivered leads.
