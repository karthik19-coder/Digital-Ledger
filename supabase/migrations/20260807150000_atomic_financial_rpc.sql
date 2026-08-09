-- Atomic Financial RPCs for Supermarket Digital Ledger
-- Phase 15: Fixes P0 Non-Atomic multi-table inserts
-- Preserves existing Row Level Security by using SECURITY INVOKER

-- 1. CREATE SALE
CREATE OR REPLACE FUNCTION create_sale(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    new_sale_id UUID;
    sale_row JSONB;
    c_id UUID;
    c_credit NUMERIC;
BEGIN
    -- Extract customer_id and credit_amount to check if customer tx is needed
    c_id := (payload->>'customer_id')::UUID;
    c_credit := COALESCE((payload->>'credit_amount')::NUMERIC, 0);

    -- Insert into sales table
    INSERT INTO sales (
        business_date,
        cash_amount,
        upi_amount,
        credit_amount,
        total_amount,
        customer_id,
        reference_number,
        notes
    ) VALUES (
        (payload->>'business_date')::DATE,
        COALESCE((payload->>'cash_amount')::NUMERIC, 0),
        COALESCE((payload->>'upi_amount')::NUMERIC, 0),
        c_credit,
        COALESCE((payload->>'total_amount')::NUMERIC, 0),
        c_id,
        payload->>'reference_number',
        payload->>'notes'
    )
    RETURNING id INTO new_sale_id;

    -- If credit > 0 and customer_id is provided, create customer_transaction
    IF c_credit > 0 AND c_id IS NOT NULL THEN
        INSERT INTO customer_transactions (
            customer_id,
            business_date,
            amount,
            type,
            reference_id,
            reference_type,
            notes
        ) VALUES (
            c_id,
            (payload->>'business_date')::DATE,
            c_credit,
            'Credit',
            new_sale_id,
            'Sale',
            'Auto-generated from Sale ' || new_sale_id
        );
    END IF;

    SELECT to_jsonb(s.*) INTO sale_row FROM sales s WHERE id = new_sale_id;
    RETURN sale_row;
END;
$$;


-- 2. UPDATE SALE
CREATE OR REPLACE FUNCTION update_sale(sale_id UUID, payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    sale_row JSONB;
    c_id UUID;
    c_credit NUMERIC;
    sale_date DATE;
    ctx_id UUID;
BEGIN
    c_id := (payload->>'customer_id')::UUID;
    c_credit := COALESCE((payload->>'credit_amount')::NUMERIC, 0);
    sale_date := (payload->>'business_date')::DATE;

    -- Update sales table
    UPDATE sales SET
        business_date = COALESCE(sale_date, business_date),
        cash_amount = COALESCE((payload->>'cash_amount')::NUMERIC, cash_amount),
        upi_amount = COALESCE((payload->>'upi_amount')::NUMERIC, upi_amount),
        credit_amount = COALESCE(c_credit, credit_amount),
        total_amount = COALESCE((payload->>'total_amount')::NUMERIC, total_amount),
        customer_id = c_id,
        reference_number = payload->>'reference_number',
        notes = payload->>'notes',
        updated_at = NOW()
    WHERE id = sale_id
    RETURNING business_date INTO sale_date;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sale not found or not authorized';
    END IF;

    -- Check if linked customer transaction exists
    SELECT id INTO ctx_id FROM customer_transactions 
    WHERE reference_id = sale_id AND reference_type = 'Sale';

    IF c_credit > 0 AND c_id IS NOT NULL THEN
        IF ctx_id IS NOT NULL THEN
            UPDATE customer_transactions SET
                amount = c_credit,
                customer_id = c_id,
                business_date = sale_date,
                updated_at = NOW()
            WHERE id = ctx_id;
        ELSE
            INSERT INTO customer_transactions (
                customer_id,
                business_date,
                amount,
                type,
                reference_id,
                reference_type,
                notes
            ) VALUES (
                c_id,
                sale_date,
                c_credit,
                'Credit',
                sale_id,
                'Sale',
                'Auto-generated from Sale ' || sale_id
            );
        END IF;
    ELSE
        -- If credit is 0 or no customer, delete any linked customer transaction
        IF ctx_id IS NOT NULL THEN
            DELETE FROM customer_transactions WHERE id = ctx_id;
        END IF;
    END IF;

    SELECT to_jsonb(s.*) INTO sale_row FROM sales s WHERE id = sale_id;
    RETURN sale_row;
END;
$$;


-- 3. DELETE SALE
CREATE OR REPLACE FUNCTION delete_sale(sale_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    -- Delete linked customer transaction first
    DELETE FROM customer_transactions 
    WHERE reference_id = sale_id AND reference_type = 'Sale';

    -- Delete the sale
    DELETE FROM sales 
    WHERE id = sale_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sale not found or not authorized';
    END IF;

    RETURN TRUE;
END;
$$;


-- 4. CREATE PURCHASE
CREATE OR REPLACE FUNCTION create_purchase(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    new_purchase_id UUID;
    purchase_row JSONB;
    v_id UUID;
    p_amount NUMERIC;
    p_paid_amount NUMERIC;
    p_method payment_method_enum;
    p_date DATE;
    p_notes TEXT;
BEGIN
    v_id := (payload->>'vendor_id')::UUID;
    p_amount := COALESCE((payload->>'total_amount')::NUMERIC, 0);
    p_date := (payload->>'business_date')::DATE;
    p_notes := payload->>'notes';
    
    -- Cast text to enum for payment method
    IF payload->>'payment_method' IS NOT NULL THEN
        p_method := (payload->>'payment_method')::payment_method_enum;
    END IF;

    -- In stock.repository.ts, paid_amount is derived from cash_amount + upi_amount.
    p_paid_amount := COALESCE((payload->>'cash_amount')::NUMERIC, 0) + COALESCE((payload->>'upi_amount')::NUMERIC, 0);

    -- Insert into purchases table
    INSERT INTO purchases (
        vendor_id,
        business_date,
        total_amount,
        cash_amount,
        upi_amount,
        credit_amount,
        payment_method,
        reference_number,
        notes
    ) VALUES (
        v_id,
        p_date,
        p_amount,
        COALESCE((payload->>'cash_amount')::NUMERIC, 0),
        COALESCE((payload->>'upi_amount')::NUMERIC, 0),
        COALESCE((payload->>'credit_amount')::NUMERIC, 0),
        p_method,
        payload->>'reference_number',
        p_notes
    )
    RETURNING id INTO new_purchase_id;

    -- Create vendor purchase transaction
    INSERT INTO vendor_transactions (
        vendor_id,
        amount,
        business_date,
        type,
        reference_id,
        reference_type,
        notes
    ) VALUES (
        v_id,
        p_amount,
        p_date,
        'Purchase',
        new_purchase_id,
        'Purchase',
        p_notes
    );

    -- Create vendor payment transaction if paid amount > 0
    IF p_paid_amount > 0 AND p_method IS NOT NULL THEN
        INSERT INTO vendor_transactions (
            vendor_id,
            amount,
            business_date,
            type,
            payment_method,
            reference_id,
            reference_type,
            notes
        ) VALUES (
            v_id,
            p_paid_amount,
            p_date,
            'Payment',
            p_method,
            new_purchase_id,
            'Purchase',
            'Purchase Payment' || CASE WHEN p_notes IS NOT NULL THEN ' - ' || p_notes ELSE '' END
        );
    END IF;

    SELECT to_jsonb(p.*) INTO purchase_row FROM purchases p WHERE id = new_purchase_id;
    RETURN purchase_row;
END;
$$;


-- 5. UPDATE PURCHASE
CREATE OR REPLACE FUNCTION update_purchase(purchase_id UUID, payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    purchase_row JSONB;
    v_id UUID;
    p_amount NUMERIC;
    p_paid_amount NUMERIC;
    p_method payment_method_enum;
    p_date DATE;
    p_notes TEXT;
BEGIN
    v_id := (payload->>'vendor_id')::UUID;
    p_amount := COALESCE((payload->>'total_amount')::NUMERIC, 0);
    p_date := (payload->>'business_date')::DATE;
    p_notes := payload->>'notes';
    
    -- Cast text to enum for payment method
    IF payload->>'payment_method' IS NOT NULL THEN
        p_method := (payload->>'payment_method')::payment_method_enum;
    END IF;
    
    p_paid_amount := COALESCE((payload->>'cash_amount')::NUMERIC, 0) + COALESCE((payload->>'upi_amount')::NUMERIC, 0);

    -- Update purchases table
    UPDATE purchases SET
        vendor_id = COALESCE(v_id, vendor_id),
        business_date = COALESCE(p_date, business_date),
        total_amount = COALESCE(p_amount, total_amount),
        cash_amount = COALESCE((payload->>'cash_amount')::NUMERIC, cash_amount),
        upi_amount = COALESCE((payload->>'upi_amount')::NUMERIC, upi_amount),
        credit_amount = COALESCE((payload->>'credit_amount')::NUMERIC, credit_amount),
        payment_method = p_method,
        reference_number = payload->>'reference_number',
        notes = p_notes,
        updated_at = NOW()
    WHERE id = purchase_id
    RETURNING vendor_id, business_date, total_amount, notes, payment_method INTO v_id, p_date, p_amount, p_notes, p_method;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase not found or not authorized';
    END IF;

    -- Delete old vendor transactions
    DELETE FROM vendor_transactions 
    WHERE reference_id = purchase_id 
      AND type IN ('Purchase', 'Payment')
      AND (
        reference_type = 'Purchase'
        OR reference_type IS NULL
        OR reference_type = 'purchase'
      );

    -- Create new vendor purchase transaction
    INSERT INTO vendor_transactions (
        vendor_id,
        amount,
        business_date,
        type,
        reference_id,
        reference_type,
        notes
    ) VALUES (
        v_id,
        p_amount,
        p_date,
        'Purchase',
        purchase_id,
        'Purchase',
        p_notes
    );

    -- Create new vendor payment transaction if paid amount > 0
    IF p_paid_amount > 0 AND p_method IS NOT NULL THEN
        INSERT INTO vendor_transactions (
            vendor_id,
            amount,
            business_date,
            type,
            payment_method,
            reference_id,
            reference_type,
            notes
        ) VALUES (
            v_id,
            p_paid_amount,
            p_date,
            'Payment',
            p_method,
            purchase_id,
            'Purchase',
            'Purchase Payment' || CASE WHEN p_notes IS NOT NULL THEN ' - ' || p_notes ELSE '' END
        );
    END IF;

    SELECT to_jsonb(p.*) INTO purchase_row FROM purchases p WHERE id = purchase_id;
    RETURN purchase_row;
END;
$$;


-- 6. DELETE PURCHASE
CREATE OR REPLACE FUNCTION delete_purchase(purchase_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    -- First delete associated vendor transactions by reference_id
    DELETE FROM vendor_transactions 
    WHERE reference_id = purchase_id 
      AND type IN ('Purchase', 'Payment')
      AND (
        reference_type = 'Purchase'
        OR reference_type IS NULL
        OR reference_type = 'purchase'
      );

    -- Then delete the purchase
    DELETE FROM purchases 
    WHERE id = purchase_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase not found or not authorized';
    END IF;

    RETURN TRUE;
END;
$$;
