require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

/* =========================
   BOT DISCORD
========================= */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

/* =========================
   CONFIG
========================= */
const CHANNEL_ID = process.env.CHANNEL_ID;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

/* =========================
   BASE DE DONNÉES (MEMOIRE PRO)
========================= */
const db = new sqlite3.Database("./jodie.db");

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT,
            score INTEGER DEFAULT 0,
            rank TEXT DEFAULT 'RECRUE'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT,
            question TEXT,
            answer TEXT,
            date INTEGER
        )
    `);
});

/* =========================
   KNOWLEDGE GAME
========================= */
const GAME_KNOWLEDGE = `
JODIE - STRATÈGE GALACTIC FRONTIER

- sécurité : drones + garnison
- raids : coordination obligatoire
- TP : via raids
- gloire : zones rouges
- VS : stratégie et retrait intelligent
- tribus : puissance + organisation
`;

/* =========================
   IA GROQ
========================= */
async function askIA(prompt) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: "Tu es Jodie, IA stratégique de jeu." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7
        }),
    });

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "Erreur IA";
}

/* =========================
   READY
========================= */
client.on("ready", () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
});

/* =========================
   MESSAGE SYSTEM
========================= */
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== CHANNEL_ID) return;

    const userId = message.author.id;
    const username = message.author.username;

    message.channel.sendTyping();

    /* =========================
       USER LOAD
    ========================= */
    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {

        if (!user) {
            db.run(
                "INSERT INTO users (id, username, score, rank) VALUES (?, ?, 0, 'RECRUE')",
                [userId, username]
            );
            user = { score: 0, rank: "RECRUE" };
        }

        let score = user.score;

        const text = message.content.toLowerCase();

        if (text.includes("raid")) score += 2;
        if (text.includes("vs")) score += 2;
        if (text.includes("gloire")) score += 1;
        if (text.includes("tribus")) score += 2;

        let rank = "RECRUE";
        if (score > 15) rank = "COMMANDANT";
        else if (score > 8) rank = "STRATÈGE";
        else if (score > 3) rank = "CONFIRMÉ";

        db.run(
            "UPDATE users SET score = ?, rank = ? WHERE id = ?",
            [score, rank, userId]
        );

        /* =========================
           HISTORIQUE
        ========================= */
        db.all(
            "SELECT * FROM history WHERE userId = ? ORDER BY id DESC LIMIT 5",
            [userId],
            async (err, rows) => {

                const history = rows.reverse()
                    .map(h => `User: ${h.question}\nJodie: ${h.answer}`)
                    .join("\n");

                const prompt = `
${GAME_KNOWLEDGE}

JOUEUR: ${username}
RANK: ${rank}
SCORE: ${score}

IMPORTANT:
Toujours parler à ${username}.
Tu es une IA, pas le joueur.

HISTORIQUE:
${history}

QUESTION:
${message.content}
`;

                const reply = await askIA(prompt);

                db.run(
                    "INSERT INTO history (userId, question, answer, date) VALUES (?, ?, ?, ?)",
                    [userId, message.content, reply, Date.now()]
                );

                message.reply(reply);
            }
        );
    });
});

/* =========================
   LOGIN
========================= */
client.login(process.env.DISCORD_TOKEN);
