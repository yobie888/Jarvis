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
- Réponses claires
- Texte simple uniquement
- Pas d’embed
- Pas markdown
- Assistant stratégique
`;

/* =========================
NETTOYAGE TEXTE
========================= */
function cleanText(text) {
  if (!text) return "Erreur.";

  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/#/g, "")
    .replace(/`/g, "")
    .trim();
}

/* =========================
APPEL GROQ
========================= */
async function askIA(prompt) {
  const res = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
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
    }
  );

  const data = await res.json();

  return cleanText(
    data?.choices?.[0]?.message?.content || "Erreur IA"
  );
}

/* =========================
ENVOI WEBHOOK
========================= */
async function sendWebhook(text) {
  await fetch(process.env.WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: "JODIE",
      content: text
    })
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

  db.all(
    "SELECT * FROM messages WHERE userId=? ORDER BY id DESC LIMIT 5",
    [userId],
    async (err, rows) => {

      const history = rows.map(r =>
        `Joueur: ${r.question}\nJodie: ${r.answer}`
      ).join("\n");

      const prompt = `
${KNOWLEDGE}

Joueur : ${username}

Historique :
${history}

Question :
${message.content}
`;

      const reply = await askIA(prompt);

      db.run(
        "INSERT INTO messages (userId, question, answer) VALUES (?, ?, ?)",
        [userId, message.content, reply]
      );

      await sendWebhook(reply);
    }
  );
});

/* =========================
LOGIN
========================= */
client.login(process.env.DISCORD_TOKEN);
