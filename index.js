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
   CONFIG SALONS
========================= */
const SOURCE_CHANNEL_ID = process.env.SOURCE_CHANNEL_ID;

/* =========================
   IA PROMPT
========================= */
const SYSTEM_PROMPT = `
Tu es JODIE.

Règles :
- texte simple uniquement
- aucune mise en forme
- pas d'embed
- pas de markdown complexe
- réponse directe
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
    return data?.choices?.[0]?.message?.content || "erreur";
}

/* =========================
   MESSAGE HANDLER
========================= */
client.on("messageCreate", async (message) => {

    if (message.author.bot) return;
    if (message.channel.id !== SOURCE_CHANNEL_ID) return;

    const username = message.author.username;

    db.all(
        "SELECT * FROM messages WHERE userId = ? ORDER BY id DESC LIMIT 5",
        [message.author.id],
        async (err, rows) => {

            const history = rows
                .map(r => `Joueur: ${r.question}\nJodie: ${r.answer}`)
                .join("\n");

            const prompt = `
${KNOWLEDGE}

Joueur: ${username}

Historique:
${history}

Message:
${message.content}

Réponds simplement en texte brut.
`;

            const reply = await askIA(prompt);

            db.run(
                "INSERT INTO messages (userId, question, answer) VALUES (?, ?, ?)",
                [message.author.id, message.content, reply]
            );

            /* IMPORTANT : MESSAGE NORMAL DISCORD */
            message.channel.send(reply);
        }
    );
});

client.login(process.env.DISCORD_TOKEN);
