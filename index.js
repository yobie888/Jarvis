require("dotenv").config();
const {
    Client,
    GatewayIntentBits,
    WebhookClient
} = require("discord.js");

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
   WEBHOOK
========================= */

let webhook = null;

if (
    process.env.WEBHOOK_ID &&
    process.env.WEBHOOK_TOKEN
) {
    webhook = new WebhookClient({
        id: process.env.WEBHOOK_ID,
        token: process.env.WEBHOOK_TOKEN
    });
}

/* =========================
   PROMPT IA
========================= */

const SYSTEM_PROMPT = `
Tu es JODIE IA.

RÈGLES :
- Tu es une IA experte du jeu
- Tu aides les joueurs
- Tu mémorises les discussions
- Tu réponds précisément
- Tu utilises le pseudo exact du joueur
- Réponse claire
- Réponse courte ou longue selon besoin
`;

/* =========================
   GROQ
========================= */

async function askIA(prompt) {

    const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            method: "POST",
            headers: {
                Authorization:
                    `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: SYSTEM_PROMPT
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.5
            })
        }
    );

    const data = await res.json();

    return data?.choices?.[0]?.message?.content ||
        "Erreur IA.";
}

/* =========================
   SCORE
========================= */

function updateUser(userId, username, msg) {

    db.get(
        "SELECT * FROM users WHERE id = ?",
        [userId],
        (err, row) => {

            if (!row) {
                db.run(
                    "INSERT INTO users (id,name,score,rank) VALUES (?,?,0,'RECRUE')",
                    [userId, username]
                );
            }

            let score = row?.score || 0;

            const t = msg.toLowerCase();

            if (t.includes("raid")) score += 2;
            if (t.includes("tribu")) score += 2;
            if (t.includes("vs")) score += 2;
            if (t.includes("top")) score += 1;

            let rank = "RECRUE";

            if (score > 20) rank = "COMMANDANT";
            else if (score > 10) rank = "STRATÈGE";
            else if (score > 5) rank = "CONFIRMÉ";

            db.run(
                "UPDATE users SET score=?,rank=?,name=? WHERE id=?",
                [score, rank, username, userId]
            );
        }
    );
}

/* =========================
   ENVOI MESSAGE
========================= */

async function sendReply(message, text) {

    try {

        if (webhook) {

            await webhook.send({
                content: text,
                username: "Jodie IA",
                avatarURL:
                    "https://i.imgur.com/AfFp7pu.png"
            });

            return;
        }

    } catch (err) {

        console.log("Erreur webhook:");
        console.log(err.message);
    }

    /* secours */

    await message.channel.send(text);
}

/* =========================
   MESSAGE HANDLER
========================= */

client.on("messageCreate", async (message) => {

    if (message.author.bot) return;

    if (
        message.channel.id !==
        process.env.CHANNEL_ID
    ) return;

    const userId = message.author.id;
    const username = message.author.username;

    updateUser(
        userId,
        username,
        message.content
    );

    db.all(
        "SELECT * FROM messages WHERE userId=? ORDER BY id DESC LIMIT 8",
        [userId],
        async (err, rows) => {

            const history = rows
                .reverse()
                .map(
                    r =>
                        `Joueur:${r.question}\nJodie:${r.answer}`
                )
                .join("\n");

            const prompt = `
${KNOWLEDGE}

JOUEUR:
Nom:${username}

HISTORIQUE:
${history}

QUESTION:
${message.content}

Réponds précisément.
`;

            const reply = await askIA(prompt);

            db.run(
                "INSERT INTO messages (userId,question,answer) VALUES (?,?,?)",
                [
                    userId,
                    message.content,
                    reply
                ]
            );

            await sendReply(message, reply);
        }
    );
});

/* =========================
   READY
========================= */

client.once("ready", () => {
    console.log(`Connecté : ${client.user.tag}`);
});

/* =========================
   LOGIN
========================= */

client.login(process.env.DISCORD_TOKEN);
