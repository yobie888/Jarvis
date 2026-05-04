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
const webhook = new WebhookClient({
    url: process.env.WEBHOOK_URL
});

/* =========================
   SYSTEM PROMPT
========================= */
const SYSTEM_PROMPT = `
Tu es JODIE.

RÈGLES ABSOLUES :
- Tu es une IA
- Réponds uniquement en texte brut
- Pas d'embeds
- Pas de mise en forme avancée
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
    if (message.author.bot) return;

    const username = message.author.username;

    const prompt = `
${KNOWLEDGE}

Utilisateur: ${username}
Message: ${message.content}
`;

    const reply = await askIA(prompt);

    db.run(
        "INSERT INTO messages (userId, question, answer) VALUES (?, ?, ?)",
        [message.author.id, message.content, reply]
    );

    /* =========================
       ENVOI VIA WEBHOOK
       (FAUX USER = DÉTECTÉ PAR TRANSLATOR)
    ========================= */
    await webhook.send({
        content: reply,
        username: "JODIE IA",
        avatarURL: "https://i.imgur.com/your-avatar.png"
    });
});

/* =========================
   LOGIN
========================= */
client.login(process.env.DISCORD_TOKEN);
