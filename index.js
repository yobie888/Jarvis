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

RÈGLES :
- Réponse en texte simple uniquement
- Aucun embed
- Aucun format spécial
- IA stratégique militaire
- Toujours répondre clairement et directement
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
   MESSAGE HANDLER
========================= */
client.on("messageCreate", async (message) => {

    /* 🔴 IMPORTANT : sécurité minimale */
    if (!message.content) return;

    /* 🔴 FILTRE SALON (IMPORTANT) */
    if (message.channel.id !== process.env.CHANNEL_ID) return;

    const userId = message.author.id;
    const username = message.author.username;

    /* update mémoire */
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

Historique:
${history}

Message:
${message.content}

Réponds en texte simple.
`;

            const reply = await askIA(prompt);

            db.run(
                "INSERT INTO messages (userId, question, answer) VALUES (?, ?, ?)",
                [userId, message.content, reply]
            );

            /* 🔴 IMPORTANT POUR TRANSLATOR */
            message.channel.send(reply);
        }
    );
});

/* =========================
   LOGIN
========================= */
client.login(process.env.DISCORD_TOKEN);
