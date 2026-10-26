-- C-3 Customer Payment Race Condition Fix
-- This migration creates an RPC to handle customer payments securely using row-level locking.

CREATE OR REPLACE FUNCTION record_customer_payment(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer_id UUID;
    v_amount NUMERIC(12,2);
    v_business_date DATE;
    v_payment_method payment_method_enum;
    v_reference_id UUID;
    v_reference_type TEXT;
    v_notes TEXT;
    
    v_total_credit NUMERIC(12,2);
    v_total_payment NUMERIC(12,2);
    v_outstanding_balance NUMERIC(12,2);
    
    v_inserted_row customer_transactions;
BEGIN
    -- 1. Extract values from payload
    v_customer_id := (payload->>'customer_id')::UUID;
    v_amount := (payload->>'amount')::NUMERIC(12,2);
    v_business_date := (payload->>'business_date')::DATE;
    v_payment_method := (payload->>'payment_method')::payment_method_enum;
    
    -- Optional fields
    v_reference_id := NULLIF(payload->>'reference_id', '')::UUID;
    v_reference_type := NULLIF(payload->>'reference_type', '');
    v_notes := NULLIF(payload->>'notes', '');

    -- 2. Validate essential fields
    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer ID is required';
    END IF;
    
    IF v_amount IS NULL OR v_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;
    
    IF v_payment_method IS NULL THEN
        RAISE EXCEPTION 'Payment method is required';
    END IF;

    -- 3. Lock the customer row to serialize concurrent payment requests
    PERFORM id FROM public.customers WHERE id = v_customer_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found';
    END IF;

    -- 4. Calculate the current outstanding balance accurately from the database
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'Credit' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'Payment' THEN amount ELSE 0 END), 0)
    INTO v_total_credit, v_total_payment
    FROM public.customer_transactions
    WHERE customer_id = v_customer_id;
    
    v_outstanding_balance := v_total_credit - v_total_payment;

    -- 5. Validate the payment against the outstanding balance
    IF v_amount > v_outstanding_balance THEN
        RAISE EXCEPTION 'Payment exceeds outstanding customer credit';
    END IF;

    -- 6. Insert the payment transaction
    INSERT INTO public.customer_transactions (
        customer_id,
        business_date,
        amount,
        type,
        payment_method,
        reference_id,
        reference_type,
        notes,
        created_by,
        updated_by
    ) VALUES (
        v_customer_id,
        v_business_date,
        v_amount,
        'Payment',
        v_payment_method,
        v_reference_id,
        v_reference_type,
        v_notes,
        current_user_uuid(),
        current_user_uuid()
    ) RETURNING * INTO v_inserted_row;

    -- 7. Return the inserted row as JSONB
    RETURN to_jsonb(v_inserted_row);
END;
$$;

-- Grant execution permission to authenticated users only
REVOKE ALL ON FUNCTION record_customer_payment(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_customer_payment(JSONB) TO authenticated;
