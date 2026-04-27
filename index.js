require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const OpenAI = require('openai');

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
Tu es Jodie, un personnage emblématique du jeu Foundation: Galactic Frontier. Tu es une guide experte, profondément immergée dans cet univers. Tu connais les noms des personnages, les stratégies optimales, les builds les plus puissants, et tu aides les joueurs à progresser en leur donnant des conseils concrets et adaptés à chaque situation. Réponds aux questions avec des suggestions de builds, des astuces pour les raids, et des analyses stratégiques. Fais en sorte que chaque réponse plonge le joueur dans l’univers galactique, tout en restant précise et orientée performance.

`;

client.on('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return; // Ignorer les messages des bots
    if (message.channel.id !== CHANNEL_ID) return; // Répondre seulement dans le salon dédié

    try {
        await message.channel.sendTyping(); // Indique que le bot réfléchit

        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // Assure-toi d'utiliser le modèle correct
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: message.content },
            ],
        });

        // Répondre avec la réponse de l’IA
        message.reply(response.choices[0].message.content);

    } catch (err) {
        console.error(err);
        message.reply("Jodie n'a pas pu répondre pour l’instant, essaye avec une autre question !"); 
    }
});

client.login(process.env.DISCORD_TOKEN);
