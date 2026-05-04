require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const db = require("./db");
const KNOWLEDGE = require("./knowledge");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/* =========================
   PROMPT IA
========================= */
const SYSTEM_PROMPT = `
Tu es JODIE.

Règles :
- Tu es une IA
- Réponds uniquement en texte brut
- NE JAMAIS utiliser embed
- NE JAMAIS utiliser format riche
- Réponds uniquement avec du texte simple lisible Discord
- Pas de markdown complexe inutile
`;

/* =========================
   GROQ API
========================= */
async function askIA(prompt) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            temperature: 0.5
        })
    });

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "Erreur IA";
}

/* =========================
   SCORE
========================= */
function updateUser(userId, message) {
    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {

        if (!row) {
            db.run(
                "INSERT INTO users (id, name, score, rank) VALUES (?, ?, 0, 'RECRUE')",
                [userId, "unknown"]
            );
            row = { score: 0 };
        }

        let score = row?.score || 0;

        const t = message.toLowerCase();

        if (t.includes("raid")) score += 2;
        if (t.includes("vs")) score += 2;
        if (t.includes("tribu")) score += 2;

        let rank = "RECRUE";
        if (score > 15) rank = "COMMANDANT";
        else if (score > 8) rank = "STRATÈGE";
        else if (score > 3) rank = "CONFIRMÉ";

        db.run("UPDATE users SET score = ?, rank = ? WHERE id = ?", [
            score,
            rank,
            userId
        ]);
    });
}

/* =========================
   MESSAGE HANDLER
   (IMPORTANT POUR TRANSLATOR)
========================= */
client.on("messageCreate", async (message) => {

    if (message.author.bot) return;

    // IMPORTANT : ne filtre PAS trop, sinon translator ne voit rien
    if (!process.env.CHANNEL_ID || message.channel.id !== process.env.CHANNEL_ID) return;

    const userId = message.author.id;
    const username = message.author.username;

    updateUser(userId, message.content);

    db.all(
        "SELECT * FROM messages WHERE userId = ? ORDER BY id DESC LIMIT 5",
        [userId],
        async (err, rows) => {

            const history = (rows || [])
                .map(r => `User: ${r.question}\nJodie: ${r.answer}`)
                .join("\n");

            const prompt = `
${KNOWLEDGE}

User: ${username}
ID: ${userId}

History:
${history}

Question:
${message.content}
`;

            const reply = await askIA(prompt);

            // IMPORTANT FIX TRANSLATOR :
            // MESSAGE SIMPLE UNIQUEMENT
            const cleanReply = String(reply)
                .replace(/```/g, "")
                .replace(/__/g, "")
                .trim();

            db.run(
                "INSERT INTO messages (userId, question, answer) VALUES (?, ?, ?)",
                [userId, message.content, cleanReply]
            );

            // 🔥 IMPORTANT : PAS EMBED, PAS REPLY COMPLEXE
            message.channel.send({
                content: cleanReply
            });
        }
    );
});

/* =========================
   LOGIN
========================= */
client.login(process.env.DISCORD_TOKEN);
