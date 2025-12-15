export interface EmailContext {
    [key: string]: string | number | undefined | null;
}

export interface Block {
    type: 'heading' | 'paragraph' | 'button' | 'divider';
    id?: string;
    [key: string]: any;
}

export interface Design {
    subject: string;
    blocks: Block[];
}

/**
 * Renders a JSON email design into an HTML string.
 * @param design The JSON structure from email_templates.design
 * @param context Key-value pairs for replacement
 */
export function renderEmail(design: Design | null, context: EmailContext, fallbackHtml?: string): { subject: string; html: string } {
    // 1. Fallback if no design found (Legacy HTML mode)
    if (!design || !design.blocks || design.blocks.length === 0) {
        if (fallbackHtml) {
            return {
                subject: design?.subject || 'Notification', // Fallback subject if design exists but empty blocks
                html: replacePlaceholders(fallbackHtml, context)
            };
        }
        return { subject: 'Notification', html: '<p>No content.</p>' };
    }

    // 2. Render Subject
    const subject = replacePlaceholders(design.subject || '', context);

    // 3. Render Blocks
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: sans-serif; line-height: 1.5; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 24px; font-weight: bold; margin-bottom: 16px; }
        h2 { font-size: 20px; font-weight: bold; margin-bottom: 14px; }
        h3 { font-size: 18px; font-weight: bold; margin-bottom: 12px; }
        p { margin-bottom: 16px; }
        .btn { display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .divider { border-top: 1px solid #eee; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
  `;

    for (const block of design.blocks) {
        switch (block.type) {
            case 'heading':
                const level = block.level || 1;
                html += `<h${level}>${safeText(block.text, context)}</h${level}>`;
                break;

            case 'paragraph':
                // Replace newlines with <br> and process placeholders
                const text = safeText(block.text, context).replace(/\n/g, '<br>');
                html += `<p>${text}</p>`;
                break;

            case 'button':
                const url = safeUrl(block.url, context);
                const label = safeText(block.label, context);
                const align = block.align || 'center';
                html += `<div style="text-align: ${align}"><a href="${url}" class="btn">${label}</a></div>`;
                break;

            case 'divider':
                html += `<div class="divider"></div>`;
                break;
        }
    }

    html += `
      </div>
    </body>
    </html>
  `;

    return { subject, html };
}

// --- Helpers ---

function replacePlaceholders(template: string, context: EmailContext): string {
    if (!template) return '';
    return template.replace(/\{\{([\w_]+)\}\}/g, (match, key) => {
        const val = context[key];
        return val !== undefined && val !== null ? String(val) : ''; // Return empty string if missing, or keep match? User requirement: "Log error, optionally block". For now, empty string is safer than raw tag.
    });
}

function safeText(text: string, context: EmailContext): string {
    const content = replacePlaceholders(text, context);
    return escapeHtml(content);
}

function safeUrl(url: string, context: EmailContext): string {
    let processUrl = replacePlaceholders(url, context);
    // Basic sanitization
    if (processUrl.startsWith('javascript:')) return '#';
    return processUrl;
}

function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
