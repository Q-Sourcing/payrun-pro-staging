const fs = require('fs');
const path = require('path');

const ids = [
    '20260308122934',
    '20260308124547',
    '20260308125418',
    '20260308130138',
    '20260308131715'
];

for (const id of ids) {
    const files = fs.readdirSync('supabase/migrations').filter(f => f.startsWith(id));
    for (const file of files) {
        const filepath = path.join('supabase/migrations', file);
        let content = fs.readFileSync(filepath, 'utf8');

        // Let's just Regex strip the start and end tokens
        // Start: ^'\s*\{"? 
        // End: "}\s*'?$ or }\s*'?$
        content = content.replace(/^'\s*(\{\s*"?)/, '');
        content = content.replace(/("?\s*\}\s*'?)$/, '');

        // If there are escaped quotes like \"
        content = content.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

        // If there are physical newlines escaping via \n string
        // Actually, they look like real physical newlines in the dump.

        fs.writeFileSync(filepath, content.trim() + '\n');
        console.log(`Cleaned ${file}`);
    }
}
