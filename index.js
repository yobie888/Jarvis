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
const API_KEY = process.env.OPENROUTER_API_KEY;

client.on('ready', () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== CHANNEL_ID) return;

  try {
    await message.channel.sendTyping();

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://railway.app",
        "X-Title": "Jarvis Bot"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat-v3-0324:free",
        messages: [
          {
            role: "system",
            content: "Tu es Jodie, experte stratégie gaming."
          },
          {
            role: "user",
            content: message.content
          }
        ]
      })
    });

    const data = await response.json();

    console.log("OPENROUTER DATA:", JSON.stringify(data, null, 2));

    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.error?.message ||
      "Aucune réponse.";

    await message.reply(reply);

  } catch (err) {
    console.error("ERREUR:", err);
    await message.reply("Erreur IA.");
  }
});

client.login(process.env.DISCORD_TOKEN);
