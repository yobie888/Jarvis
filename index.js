require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

// fetch compatible Node 18 / Railway
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Variables environnement
const CHANNEL_ID = process.env.CHANNEL_ID;
const HF_API_KEY = process.env.HF_API_KEY;

// Modèle Hugging Face
const MODEL_URL = "https://api-inference.huggingface.co/models/google/flan-t5-large";

// Prompt système
const SYSTEM_PROMPT = `
Tu es Jodie, une assistante experte du jeu Foundation: Galactic Frontier.
Tu donnes des conseils clairs, stratégiques et utiles pour progresser efficacement.
Réponses courtes, précises et orientées gameplay.
`;

client.on('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== CHANNEL_ID) return;

    try {
        await message.channel.sendTyping();

        const prompt = `${SYSTEM_PROMPT}\n\nJoueur: ${message.content}\nRéponse:`;

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
            "Je n’ai pas pu générer de réponse.";

        await message.reply(reply);

    } catch (err) {
        console.error(err);
        message.reply("Erreur IA : impossible de répondre.");
    }
});

client.login(process.env.DISCORD_TOKEN);
