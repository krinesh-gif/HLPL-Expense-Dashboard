-- "Paid by" had four options, but the team only ever distinguishes cash from
-- everything electronic - which is what their original sheets recorded too.
-- UPI, bank transfers and card payments all become ONLINE.

ALTER TYPE "PaymentMode" ADD VALUE IF NOT EXISTS 'ONLINE';
