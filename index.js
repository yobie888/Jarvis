require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const API_KEY = process.env.GROQ_API_KEY;

/*
  🧠 IA COACH GAMING ULTRA PRO
  Objectif :
  - stratégie fiable
  - zéro invention de stats
  - réponses structurées
*/
const SYSTEM_PROMPT = `
Tu es Jodie, une IA coach stratégique experte du jeu Foundation: Galactic Frontier.

MISSION :
Aider les joueurs à optimiser leur progression (combat, flotte, économie, raids, défense).

RÈGLES ABSOLUES :
- Ne JAMAIS inventer de chiffres, valeurs ou statistiques exactes.
- Si une donnée est inconnue → dire clairement que cela dépend des mises à jour ou du serveur.
- Toujours privilégier stratégie, logique et conseils concrets.
- Être clair, structuré et utile.

FORMAT DE RÉPONSE :
1. Réponse directe
2. Explication courte
3. Conseil pratique
4. Erreur à éviter (si utile)

STYLE :
- Coach de jeu
- Clair et efficace
- Pas de blabla inutile
`;

client.on('ready', () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== CHANNEL_ID) return;

  const userMessage = message.content.trim();

  /*
    🔧 Mini commandes futures (base évolutive)
  */
  if (userMessage === "/help") {
    return message.reply(
      "Commandes disponibles : /help (bientôt : /build, /fleet, /raid)"
    );
  }

  try {
    await message.channel.sendTyping();

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
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
            content: `
Contexte :
Jeu = Foundation Galactic Frontier

Question joueur :
${userMessage}

Réponds comme un coach expert stratégique.
            `
          }
        ],
        temperature: 0.3,   // 🔥 très important = moins d’hallucination
        max_tokens: 500
      })
    });

    const data = await response.json();

    console.log("DEBUG GROQ:", JSON.stringify(data, null, 2));

    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.error?.message ||
      "Aucune réponse disponible.";

    await message.reply(reply);

  } catch (err) {
    console.error("BOT ERROR:", err);
    await message.reply("Erreur IA, réessaie dans quelques secondes.");
  }
});

client.login(process.env.DISCORD_TOKEN);
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const API_KEY = process.env.GROQ_API_KEY;

const SYSTEM_PROMPT = `
Tu es Jodie, experte du jeu Foundation: Galactic Frontier.
Tu donnes des conseils clairs, efficaces et stratégiques.
`;

client.on('ready', () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== CHANNEL_ID) return;

  try {
    await message.channel.sendTyping();

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
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
            content: message.content
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.error?.message ||
      "Aucune réponse.";

    await message.reply(reply);

  } catch (err) {
    console.error(err);
    await message.reply("Erreur IA.");
  }
});

client.login(process.env.DISCORD_TOKEN);
