const fs = require('fs');
const dumpFile = 'remote_migrations_data.sql';
if (!fs.existsSync(dumpFile)) {
    console.error('File not found', dumpFile);
    process.exit(1);
}

const content = fs.readFileSync(dumpFile, 'utf8');
const ids = [
    '20260308122934',
    '20260308124547',
    '20260308125418',
    '20260308130138',
    '20260308131715'
];

if (!fs.existsSync('supabase/migrations')) {
    fs.mkdirSync('supabase/migrations', { recursive: true });
}

for (const id of ids) {
    // Look for `('ID', '{"` or `('ID', '{""` 
    // Wait, pg_dump uses `('ID', '{`
    const searchString = `('${id}', '{`;
    const startIndex = content.indexOf(searchString);
    if (startIndex !== -1) {
        const statementsStart = startIndex + searchString.length - 2; // Point to `{`

        let endIndex = content.indexOf(`}',`, statementsStart);
        if (endIndex === -1) {
            console.log('End not found for', id);
            continue;
        }

        // This is a PostgreSQL array literal like `{"statement1", "statement2"}`.
        let pgArrayStr = content.substring(statementsStart, endIndex + 1);

        // Unescape SQL single quotes
        pgArrayStr = pgArrayStr.replace(/''/g, "'");

        let sql = pgArrayStr;
        if (sql.startsWith('{"') && sql.endsWith('"}')) {
            sql = sql.substring(2, sql.length - 2);
            // unescape `\"` to `"` and `\\\\` to `\\`
            sql = sql.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            sql = sql.replace(/","/g, ';\n'); // separate multiple statements
        } else if (sql.startsWith('{') && sql.endsWith('}')) {
            // maybe it has no quotes if it's simple string, but usually it does
            sql = sql.substring(1, sql.length - 1);
        }

        // Find name
        const rest = content.substring(endIndex + 3, endIndex + 200);
        // rest looks like `'name_here', ...` or `'', ...`
        const nameMatch = rest.match(/^\s*'([^']*)'/);
        let name = nameMatch && nameMatch[1] ? nameMatch[1].trim() : '';
        if (name === '' || name.includes('@')) name = 'remote_pulled_migration';
        name = name.replace(/[^a-zA-Z0-9_-]/g, '_');

        const filename = `supabase/migrations/${id}_${name}.sql`;
        fs.writeFileSync(filename, sql);
        console.log(`Saved: ${filename}`);
    } else {
        console.log('Not found in dump:', id);
    }
}
