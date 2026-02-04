-- 1. Ensure normal_balance column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'normal_balance') THEN
        ALTER TABLE accounts ADD COLUMN normal_balance text;
    END IF;
END $$;

-- 2. Seed normal_balance based on Type (Accounting Standards)
UPDATE accounts 
SET normal_balance = CASE 
    WHEN type IN ('aset', 'beban') THEN 'debit'
    ELSE 'kredit'
END
WHERE normal_balance IS NULL;

-- 3. Create Strict View as requested by User
CREATE OR REPLACE VIEW account_balances AS
SELECT
  a.id AS account_id,
  a.user_id,
  a.name AS account_name,
  a.type,
  a.normal_balance,

  COALESCE(SUM(ji.debit), 0)  AS total_debit,
  COALESCE(SUM(ji.credit), 0) AS total_credit,

  -- saldo bersih sesuai normal balance
  CASE
    WHEN a.normal_balance = 'debit'
      THEN COALESCE(SUM(ji.debit - ji.credit), 0)
    WHEN a.normal_balance = 'kredit'
      THEN COALESCE(SUM(ji.credit - ji.debit), 0)
  END AS balance,

  -- kolom khusus NERACA SALDO
  CASE
    WHEN a.normal_balance = 'debit'
      THEN GREATEST(COALESCE(SUM(ji.debit - ji.credit), 0), 0)
    ELSE 0
  END AS saldo_debit,

  CASE
    WHEN a.normal_balance = 'kredit'
      THEN GREATEST(COALESCE(SUM(ji.credit - ji.debit), 0), 0)
    ELSE 0
  END AS saldo_kredit

FROM accounts a
LEFT JOIN journal_items ji
  ON ji.account_id = a.id

GROUP BY
  a.id,
  a.user_id,
  a.name,
  a.type,
  a.normal_balance;
