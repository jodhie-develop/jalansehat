import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    // Header CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'OPENAI_API_KEY belum dipasang di Vercel.' });
    }

    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Pesan tidak boleh kosong' });

        // 📝 1. LOG PESAN DARI WARGA (VERCEL)
        console.log(`\n========================================`);
        console.log(`📩 [CHAT MASUK WARGA]: ${message}`);

        // 🔍 BACA FILE TEXT KNOWLEDGE BASE
        let fileData = "";
        try {
            const filePath = path.join(process.cwd(), 'data-acara.txt');
            fileData = fs.readFileSync(filePath, 'utf8');
        } catch (err) {
            console.error("⚠️ Gagal membaca file data-acara.txt:", err);
            fileData = "Informasi detail acara belum diisi.";
        }

        const systemInstruction = `Kamu adalah 'Mba Kebonagung', AI Panitia Jalan Sehat RW 10 Griya Kebonagung 2.
Jawab pertanyaan warga berdasarkan DATA RESMI ACARA berikut ini:

--------------------------------------------------
${fileData}
--------------------------------------------------

Aturan Menjawab:
1. Jawab dengan ramah, lucu, santai (bisa gunakan sedikit bahasa Jawa halus/suroboyoan yang akrab seperti 'Cak', 'Mbak', 'Monggo').
2. Jika pertanyaan warga TIDAK ADA di data teks di atas, jawab dengan sopan bahwa kamu belum mendapat info tersebut dari Ketua Panitia/Pak RT.`;

        // Panggil OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: message }
                ],
                temperature: 0.7,
                store: true, // Menyimpan log di OpenAI Project
                metadata: {
                    app_name: "jalan_sehat_rw10",
                    environment: "production"
                },
                user: "warga_rw10_web" // Menandai user agar terlacak di dashboard
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`❌ [ERROR OPENAI]:`, data.error?.message);
            return res.status(response.status).json({ error: data.error?.message || 'Gagal terhubung ke OpenAI' });
        }

        const reply = data.choices[0]?.message?.content || 'Maaf, Mba Kebonagung belum bisa jawab.';

        // 📝 2. LOG BALASAN AI (VERCEL)
        console.log(`🤖 [BALASAN MBA KEBONAGUNG]: ${reply}`);
        console.log(`========================================\n`);

        return res.status(200).json({ reply });

    } catch (error) {
        console.error("❌ [SYSTEM ERROR]:", error.message);
        return res.status(500).json({ error: error.message });
    }
}
