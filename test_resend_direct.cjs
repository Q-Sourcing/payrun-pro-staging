const { Resend } = require('resend');

const resend = new Resend('re_f1GwRXWf_LnXPF4ds16Hf4vsc1gGD4SZo');

(async function () {
    try {
        const data = await resend.emails.send({
            from: 'PayRun Pro <noreply@flipafrica.app>',
            to: 'nalungugames256@gmail.com',
            subject: 'Test Email from Local Script',
            html: '<strong>It works!</strong>'
        });
        console.log("✅ Success:", data);
    } catch (error) {
        console.error("❌ Error:", error);
    }
})();
