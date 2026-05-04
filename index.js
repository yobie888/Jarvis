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

const SYSTEM_PROMPT = `
Tu es Jodie, une assistante experte du jeu Foundation: Galactic Frontier.
Tu donnes des conseils stratégiques clairs, utiles et efficaces pour progresser.
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
        model: "llama3-8b-8192",
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
