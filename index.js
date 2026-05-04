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
- Tu dois utiliser le pseudo du joueur
- Tu réponds de manière stratégique
- Tu te souviens du contexte

IMPORTANT FORMAT :
- Tu écris UNIQUEMENT du texte simple
- INTERDICTION ABSOLUE :
  * embeds
  * markdown complexe
  * JSON
  * code blocks
  * format rich
- Tu réponds comme un humain dans Discord
- phrases simples lisibles par un bot translator
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
   SCORE SYSTEM
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

        let score = row.score || 0;

        const t = message.toLowerCase();

        if (t.includes("raid")) score += 2;
        if (t.includes("vs")) score += 2;
        if (t.includes("tribu")) score += 2;

        let rank = "RECRUE";
        if (score > 15) rank = "COMMANDANT";
        else if (score > 8) rank = "STRATÈGE";
        else if (score > 3) rank = "CONFIRMÉ";

        db.run(
            "UPDATE users SET score = ?, rank = ? WHERE id = ?",
            [score, rank, userId]
        );
    });
}

/* =========================
   FORCER TEXTE SIMPLE (IMPORTANT POUR TRANSLATOR BOT)
========================= */
function sanitizeOutput(text) {
    return text
        .replace(/```/g, "")       // supprime code blocks
        .replace(/\*\*/g, "")      // supprime bold markdown
        .replace(/__/g, "")        // underline
        .replace(/#/g, "")         // headers markdown
        .replace(/$begin:math:display$\|$end:math:display$/g, "")     // brackets
        .trim();
}

/* =========================
   MESSAGE HANDLER
========================= */
client.on("messageCreate", async (message) => {

    // ignore bots (IMPORTANT)
    if (message.author.bot) return;

    // only channel target
    if (message.channel.id !== process.env.CHANNEL_ID) return;

    const userId = message.author.id;
    const username = message.author.username;

    updateUser(userId, message.content);

    db.all(
        "SELECT * FROM messages WHERE userId = ? ORDER BY id DESC LIMIT 5",
        [userId],
        async (err, rows) => {

            const history = rows
                .map(r => `Joueur: ${r.question} | Jodie: ${r.answer}`)
                .join("\n");

            const prompt = `
${KNOWLEDGE}

Joueur: ${username}
Message: ${message.content}

Historique:
${history}

Réponds clairement en texte simple.
`;

            let reply = await askIA(prompt);

            // IMPORTANT FIX TRANSLATOR BOT
            reply = sanitizeOutput(reply);

            db.run(
                "INSERT INTO messages (userId, question, answer) VALUES (?, ?, ?)",
                [userId, message.content, reply]
            );

            // IMPORTANT: reply as NORMAL MESSAGE (not embed, not webhook)
            await message.channel.send(reply);
        }
    );
});

/* =========================
   LOGIN
========================= */
client.login(process.env.DISCORD_TOKEN);
