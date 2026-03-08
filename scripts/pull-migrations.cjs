const fs = require('fs');
const path = require('path');

const dumpFile = path.join(__dirname, '..', 'migrations_dump.json');
const outputDir = path.join(__dirname, '..', 'supabase', 'migrations');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

try {
    if (!fs.existsSync(dumpFile)) {
        console.log('Dump file not found.');
        process.exit(1);
    }

    const content = fs.readFileSync(dumpFile, 'utf8');
    if (!content.trim() || content.trim() === '') {
        console.log('Dump file is empty. Perhaps the query returned no results.');
        process.exit(0);
    }

    const migrations = JSON.parse(content);
    if (!migrations || migrations.length === 0) {
        console.log('No migrations found in database matching those IDs.');
        process.exit(0);
    }

    for (const mig of migrations) {
        const safeName = mig.name ? mig.name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'remote_pulled';
        const filename = `${mig.version}_${safeName}.sql`;
        const filepath = path.join(outputDir, filename);

        let sql = '';
        let stmts = mig.statements;

        if (typeof stmts === 'string') {
            try { stmts = JSON.parse(stmts); } catch (e) { }
        }

        if (Array.isArray(stmts)) {
            sql = stmts.join(';\n');
        } else {
            sql = stmts || '';
        }

        fs.writeFileSync(filepath, sql, 'utf8');
        console.log(`Saved: ${filename}`);
    }
} catch (err) {
    console.error('Error parsing JSON:', err);
}

if (fs.existsSync(dumpFile)) fs.unlinkSync(dumpFile);
