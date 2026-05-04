require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const HF_API_KEY = process.env.HF_API_KEY;

// Modèle Hugging Face (tu peux le changer plus tard si besoin)
const MODEL_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

const SYSTEM_PROMPT = `
Tu es Jodie, un personnage emblématique du jeu Foundation: Galactic Frontier.
Tu donnes des conseils stratégiques précis pour optimiser les performances.
Réponses claires, utiles et orientées gameplay.
`;

client.on('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== CHANNEL_ID) return;

    try {
        await message.channel.sendTyping();

        const prompt = `${SYSTEM_PROMPT}\n\nUtilisateur: ${message.content}\nRéponse:`;

        const response = await fetch(MODEL_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 200,
                    temperature: 0.7,
                }
            }),
        });

        const data = await response.json();

        const reply =
            data?.[0]?.generated_text?.split("Réponse:")?.pop()?.trim()
            || "Erreur IA : aucune réponse reçue.";

        await message.reply(reply);

    } catch (err) {
        console.error(err);
        message.reply("Erreur IA : impossible de répondre pour le moment.");
    }
});

client.login(process.env.DISCORD_TOKEN);
