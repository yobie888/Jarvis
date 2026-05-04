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
const HF_API_KEY = process.env.HF_API_KEY;

const MODEL_URL = "https://api-inference.huggingface.co/models/google/flan-t5-base";

client.on('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== CHANNEL_ID) return;

    try {
        await message.channel.sendTyping();

        const response = await fetch(MODEL_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                inputs: message.content
            })
        });

        const data = await response.json();

        console.log("HF DATA:", data);

        if (data.error) {
            return message.reply("Erreur HF : " + data.error);
        }

        const reply =
            data?.[0]?.generated_text ||
            "Aucune réponse IA.";

        await message.reply(reply);

    } catch (err) {
        console.error("ERREUR:", err);
        await message.reply("Erreur technique IA.");
    }
});

client.login(process.env.DISCORD_TOKEN);
