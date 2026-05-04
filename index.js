require("dotenv").config();

console.log("BOOT STARTED");

process.on("uncaughtException", (err) => {
    console.log("UNCAUGHT EXCEPTION:");
    console.log(err);
});

process.on("unhandledRejection", (err) => {
    console.log("UNHANDLED REJECTION:");
    console.log(err);
});

const { Client, GatewayIntentBits } = require("discord.js");

console.log("DISCORD IMPORT OK");

const db = require("./db");
console.log("DB IMPORT OK");

const KNOWLEDGE = require("./knowledge");
console.log("KNOWLEDGE IMPORT OK");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once("ready", () => {
    console.log("BOT ONLINE");
});

console.log("LOGIN START");
client.login(process.env.DISCORD_TOKEN);
