require("dotenv").config();
const { Client, GatewayIntentBits, WebhookClient } = require("discord.js");
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
   WEBHOOK (IMPORTANT)
========================= */
const webhook = new WebhookClient({ url: process.env.WEBHOOK_URL });

/* =========================
   SYSTEM PROMPT
========================= */
const SYSTEM_PROMPT = `
Tu es JODIE.

RÈGLES :
- Texte simple uniquement
- Pas d'embeds
- Pas de mise en forme spéciale
- Réponse brute Discord
- IA stratégique militaire
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
   MESSAGE HANDLER
========================= */
client.on("messageCreate", async (message) => {

    if (!message.content) return;
    if (message.author.bot) return; // on ignore bots utilisateurs mais JODIE est webhook maintenant

    const userId = message.author.id;
    const username = message.author.username;

    db.all(
        "SELECT * FROM messages WHERE userId = ? ORDER BY id DESC LIMIT 5",
        [userId],
        async (err, rows) => {

            const history = rows
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

Réponds en texte simple uniquement.
`;

            const reply = await askIA(prompt);

            db.run(
                "INSERT INTO messages (userId, question, answer) VALUES (?, ?, ?)",
                [userId, message.content, reply]
            );

            /* =========================
               ENVOI COMPATIBLE TRANSLATOR
            ========================= */
            webhook.send({
                content: reply,
                username: "JODIE",
                allowedMentions: { parse: [] }
            });
        }
    );
});

/* =========================
   LOGIN
========================= */
client.login(process.env.DISCORD_TOKEN);
