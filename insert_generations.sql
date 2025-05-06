CREATE OR REPLACE FUNCTION insert_generation(
    generation_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    inserted_id BIGINT;
    result JSONB;
BEGIN
    INSERT INTO generations (
        user_id,
        model,
        generated_count,
        accepted_unedited_count,
        accepted_edited_count,
        source_text_hash,
        source_text_length,
        generation_duration
    )
    VALUES (
        (generation_data->>'user_id')::uuid,
        generation_data->>'model',
        (generation_data->>'generated_count')::integer,
        NULL, -- accepted_unedited_count początkowo NULL
        NULL, -- accepted_edited_count początkowo NULL
        generation_data->>'source_text_hash',
        (generation_data->>'source_text_length')::integer,
        (generation_data->>'generation_duration')::integer
    )
    RETURNING id INTO inserted_id;
    
    SELECT jsonb_build_object(
        'success', true,
        'id', inserted_id
    ) INTO result;
    
    RETURN COALESCE(result, '{"success": false, "id": null}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION insert_generation TO authenticated;

CREATE OR REPLACE FUNCTION create_generation_with_flashcards(
    generation_data JSONB,
    flashcards_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    inserted_gen_id BIGINT;
    result JSONB;
BEGIN
    -- Rozpocznij transakcję
    BEGIN
        -- Najpierw utwórz generację
        INSERT INTO generations (
            user_id,
            model,
            generated_count,
            accepted_unedited_count,
            accepted_edited_count,
            source_text_hash,
            source_text_length,
            generation_duration
        )
        VALUES (
            (generation_data->>'user_id')::uuid,
            generation_data->>'model',
            (generation_data->>'generated_count')::integer,
            NULL, -- accepted_unedited_count początkowo NULL
            NULL, -- accepted_edited_count początkowo NULL
            generation_data->>'source_text_hash',
            (generation_data->>'source_text_length')::integer,
            (generation_data->>'generation_duration')::integer
        )
        RETURNING id INTO inserted_gen_id;
        
        -- Następnie utwórz fiszki
        INSERT INTO flashcards (
            user_id,
            front,
            back,
            source,
            generation_id
        )
        SELECT 
            (flashcards_data->>'user_id')::uuid,
            (item->>'front')::text,
            (item->>'back')::text,
            (item->>'source')::text,
            inserted_gen_id
        FROM jsonb_array_elements(flashcards_data->'items') as item;
        
        -- Zbuduj wynik
        SELECT jsonb_build_object(
            'success', true,
            'generation_id', inserted_gen_id
        ) INTO result;
        
        -- Zatwierdź transakcję
        COMMIT;
    EXCEPTION WHEN OTHERS THEN
        -- W przypadku błędu wycofaj transakcję
        ROLLBACK;
        RAISE;
    END;
    
    RETURN COALESCE(result, '{"success": false, "generation_id": null}'::jsonb);
END;
$$;