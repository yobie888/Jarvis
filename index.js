require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const OpenAI = require("openai");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CHANNEL_ID = process.env.CHANNEL_ID;

const SYSTEM_PROMPT = `
Tu es un expert du jeu Foundation: Galactic Frontier.
Tu aides les joueurs à progresser efficacement.

Réponses :
- directes
- utiles
- orientées optimisation
- sans blabla inutile
`;

client.on("ready", () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== CHANNEL_ID) return;
  if (message.content.length < 5) return;

  try {
    await message.channel.sendTyping();

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message.content },
      ],
    });

    message.reply(response.choices[0].message.content);
  } catch (err) {
    console.error(err);
    message.reply("Erreur IA.");
  }
});

client.login(process.env.DISCORD_TOKEN);
