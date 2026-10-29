-- The monthly budgets were seeded from FY26-27 actuals as a starting point, before
-- the Unclassified backlog was re-tagged. That made them guesses, and they were
-- firing false overruns at the point of entry. Clearing them removes the spend
-- limit from every head.
--
-- The feature itself stays: a budget set from the Category master still drives the
-- meter at entry and the bars on the dashboard. This only drops the seeded numbers.
UPDATE "Category" SET "monthlyBudget" = NULL;
