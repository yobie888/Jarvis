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
   PROMPT IA (JODIE)
========================= */
const SYSTEM_PROMPT = `
Tu es JODIE.

RÈGLES ABSOLUES :
- Tu es une IA stratégique
- Tu n’es jamais un joueur
- Tu reconnais les joueurs par leur pseudo Discord
- Tu mémorises les conversations
- Tu analyses les situations de jeu

STYLE IMPORTANT :
- Réponses uniquement en texte brut
- AUCUN format embed
- AUCUN JSON
- AUCUN markdown décoratif lourd
- Style simple, lisible pour bot translator
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
   WEBHOOK SEND (IMPORTANT)
========================= */
async function sendWebhook(content, username) {
    await fetch(process.env.WEBHOOK_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username || "JODIE",
            content: content
        })
    });
}

/* =========================
   SCORE + RANK
========================= */
function updateUser(userId, message) {
    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {

        if (!row) {
            db.run("INSERT INTO users (id, name, score, rank) VALUES (?, ?, 0, 'RECRUE')",
                [userId, "unknown"]);
            row = { score: 0 };
        }

        let score = row.score || 0;

        const t = message.toLowerCase();

        if (t.includes("raid")) score += 2;
        if (t.includes("vs")) score += 2;
        if (t.includes("tribu")) score += 2;

        let rank = "RECRUE";
        if (score > 15) rank = "COMMANDANT";
        else if (score > 8) rank = "STRATÈGE";
        else if (score > 3) rank = "CONFIRMÉ";

        db.run("UPDATE users SET score = ?, rank = ? WHERE id = ?",
            [score, rank, userId]);
    });
}

/* =========================
   MESSAGE HANDLER
========================= */
client.on("messageCreate", async (message) => {

    if (message.author.bot) return;
    if (message.channel.id !== process.env.CHANNEL_ID) return;

    const userId = message.author.id;
    const username = message.author.username;

    updateUser(userId, message.content);

    db.all(
        "SELECT * FROM messages WHERE userId = ? ORDER BY id DESC LIMIT 5",
        [userId],
        async (err, rows) => {

            const history = (rows || [])
                .map(r => `Joueur: ${r.question}\nJodie: ${r.answer}`)
                .join("\n");

            const prompt = `
${KNOWLEDGE}

JOUEUR:
Nom: ${username}
ID: ${userId}

HISTORIQUE:
${history}

QUESTION:
${message.content}

Réponds clairement en texte brut.
`;

            const reply = await askIA(prompt);

            db.run(
                "INSERT INTO messages (userId, question, answer) VALUES (?, ?, ?)",
                [userId, message.content, reply]
            );

            // IMPORTANT : envoi webhook SANS embed
            await sendWebhook(reply, "JODIE");
        }
    );
});

/* =========================
   LOGIN
========================= */
client.login(process.env.DISCORD_TOKEN);
