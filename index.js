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
   PROMPT IA FIXE
========================= */
const SYSTEM_PROMPT = `
Tu es JODIE.

RÈGLES ABSOLUES :
- Tu es une IA, jamais un joueur
- Le joueur est toujours l'utilisateur Discord
- Tu dois utiliser son pseudo EXACT
- Tu ne dois jamais t'appeler joueur

COMPORTEMENT :
- reconnaissance joueur obligatoire
- mémoire des conversations
- analyse stratégique
- commandant militaire
`;

/* =========================
   GROQ
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
   SCORE SYSTEM
========================= */
function updateUser(userId, message) {
    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
        let score = row?.score || 0;

        const t = message.toLowerCase();

        if (t.includes("raid")) score += 2;
        if (t.includes("vs")) score += 2;
        if (t.includes("tribu")) score += 2;

        let rank = "RECRUE";
        if (score > 15) rank = "COMMANDANT";
        else if (score > 8) rank = "STRATÈGE";
        else if (score > 3) rank = "CONFIRMÉ";

        if (!row) {
            db.run(
                "INSERT INTO users (id, name, score, rank) VALUES (?, ?, ?, ?)",
                [userId, "unknown", score, rank]
            );
        } else {
            db.run(
                "UPDATE users SET score = ?, rank = ? WHERE id = ?",
                [score, rank, userId]
            );
        }
    });
}

/* =========================
   OUTILS ENVOI MESSAGE
   (IMPORTANT POUR TRANSLATOR)
========================= */

// découpe si message trop long
function splitMessage(text, max = 2000) {
    const parts = [];
    while (text.length > max) {
        let slice = text.slice(0, max);
        let lastBreak = slice.lastIndexOf("\n");
        if (lastBreak > 0) slice = slice.slice(0, lastBreak);
        parts.push(slice);
        text = text.slice(slice.length);
    }
    if (text.length) parts.push(text);
    return parts;
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
                .reverse()
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

Réponds précisément.
`;

            const reply = await askIA(prompt);

            db.run(
                "INSERT INTO messages (userId, question, answer) VALUES (?, ?, ?)",
                [userId, message.content, reply]
            );

            /* =========================
               ENVOI COMPATIBLE TRANSLATOR
            ========================= */

            const messages = splitMessage(reply);

            for (const msg of messages) {
                await message.reply({
                    content: msg
                });
            }
        }
    );
});

/* =========================
   LOGIN
========================= */
client.login(process.env.DISCORD_TOKEN);
