export default async function handler(req, res) {
    // Header CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const apiKey = process.env.OPENAI_API_KEY; // Ambil dari Environment Variable Vercel
    if (!apiKey) {
        return res.status(500).json({ error: 'OPENAI_API_KEY belum dipasang di Vercel.' });
    }

    try {
        const { message, systemInstruction } = req.body;
        if (!message) return res.status(400).json({ error: 'Pesan tidak boleh kosong' });

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Model cepat & murah
                messages: [
                    { 
                        role: 'system', 
                        content: systemInstruction || 'Kamu adalah asisten virtual yang ramah dan profesional.' 
                    },
                    { role: 'user', content: message }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'Gagal terhubung ke OpenAI' });
        }

        const reply = data.choices[0]?.message?.content || 'Maaf, tidak ada jawaban.';
        return res.status(200).json({ reply });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
