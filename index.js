require("dotenv").config();
console.log("BOOT START");

const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

client.once("ready", () => {
    console.log("BOT ONLINE");
});

client.login(process.env.DISCORD_TOKEN);
