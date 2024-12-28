-- Get all tables and their descriptions
SELECT 
    table_name,
    obj_description((quote_ident(table_schema) || '.' || quote_ident(table_name))::regclass, 'pg_class') as table_description
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Get detailed information about columns for all tables
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.column_default,
    c.is_nullable,
    col_description((quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass::oid, c.ordinal_position) as column_description
FROM 
    information_schema.tables t
    INNER JOIN information_schema.columns c 
        ON t.table_name = c.table_name 
        AND t.table_schema = c.table_schema
WHERE 
    t.table_schema = 'public'
ORDER BY 
    t.table_name, 
    c.ordinal_position;

-- Get all foreign key relationships
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY';

-- Get all indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
ORDER BY
    tablename,
    indexname;

-- Get all triggers
SELECT 
    event_object_table AS table_name,
    trigger_name,
    event_manipulation AS trigger_event,
    action_statement AS trigger_definition
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY 
    event_object_table,
    trigger_name;

-- Get RLS (Row Level Security) policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    schemaname = 'public'
ORDER BY 
    tablename, 
    policyname;
