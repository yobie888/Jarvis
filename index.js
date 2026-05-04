require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

// fetch compatible Railway / Node
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const HF_API_KEY = process.env.HF_API_KEY;

// Modèle IA Hugging Face
const MODEL_URL = "https://api-inference.huggingface.co/models/google/flan-t5-large";

const SYSTEM_PROMPT = `
Tu es Jodie, un assistant expert du jeu Foundation: Galactic Frontier.
Tu donnes des conseils simples, efficaces et orientés progression.
`;

client.on('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== CHANNEL_ID) return;

    try {
        await message.channel.sendTyping();

        const prompt = `${SYSTEM_PROMPT}\n\nUtilisateur: ${message.content}`;

        const response = await fetch(MODEL_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: prompt
            }),
        });

        const data = await response.json();

        console.log("HF RESPONSE:", data);

        const reply =
            data?.[0]?.generated_text ||
            data?.generated_text ||
            "Erreur IA : aucune réponse.";

        await message.reply(reply);

    } catch (err) {
        console.error(err);
        message.reply("Erreur IA : impossible de répondre.");
    }
});

client.login(process.env.DISCORD_TOKEN);
