-- Function to get Dashboard Analytics correctly from account_balances view
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
  cash_balance NUMERIC,
  receivable NUMERIC,
  payable NUMERIC,
  equity NUMERIC,
  profit NUMERIC,
  income NUMERIC,
  expense NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Cash: Assets excluding Receivables (Piutang)
    COALESCE(SUM(CASE WHEN type = 'aset' AND account_name NOT ILIKE '%Piutang%' THEN balance ELSE 0 END), 0),
    
    -- Receivable: Assets with 'Piutang' in name
    COALESCE(SUM(CASE WHEN type = 'aset' AND account_name ILIKE '%Piutang%' THEN balance ELSE 0 END), 0),
    
    -- Payable: Liabilities
    COALESCE(SUM(CASE WHEN type = 'kewajiban' THEN balance ELSE 0 END), 0),
    
    -- Equity: Modal
    COALESCE(SUM(CASE WHEN type = 'modal' THEN balance ELSE 0 END), 0),
    
    -- Profit: Income - Expense
    (COALESCE(SUM(CASE WHEN type = 'pendapatan' THEN balance ELSE 0 END), 0) - 
     COALESCE(SUM(CASE WHEN type = 'beban' THEN balance ELSE 0 END), 0)),

    -- Income
    COALESCE(SUM(CASE WHEN type = 'pendapatan' THEN balance ELSE 0 END), 0),
    
    -- Expense
    COALESCE(SUM(CASE WHEN type = 'beban' THEN balance ELSE 0 END), 0)
  
  FROM account_balances
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
