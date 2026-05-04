require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

/* =========================
   CONFIG
========================= */
const CHANNEL_ID = process.env.CHANNEL_ID;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MEMORY_FILE = "memory.json";

/* =========================
   MÉMOIRE DISK
========================= */
if (!fs.existsSync(MEMORY_FILE)) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify({ users: {} }, null, 2));
}

const loadMemory = () => JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
const saveMemory = (data) => fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));

/* =========================
   BASE DE CONNAISSANCE
========================= */
const GAME_KNOWLEDGE = `
======================
🧠 JODIE - GALACTIC FRONTIER MASTER SYSTEM
======================

🛡️ SÉCURITÉ
- Garnison = protection maximale
- Zones 1-3 + ports guilde = safe
- Retirer tous les drones avant déconnexion
- 2 destructions = bouclier 3h
- AFK sans drones = stratégie safe

⚔️ RAIDS
- discipline obligatoire
- 2 ralliements max
- boss uniquement sur ordre
- leader contrôle participants
- synchronisation obligatoire

🚀 TÉLÉPORTATION
- rejoindre raid = TP instantané
- multi-vaisseaux possible
- point de retour = vaisseau en zone safe

🏆 GLOIRE
- zones rouges = 100%
- zones 4-9 = farming
- AFK sans drones = optimal

⚔️ VS INTER-SERVEUR
- cible rouge foncé uniquement
- rouge clair = éviter
- AFK interdit
- retraite = stratégie valide

📊 TRIBUS CLASSIQUES
- niveaux 1 à 10
- flottes x5
- 110-120% recommandé

🔥 TRIBUS SACRÉES / BLACKOUT
- niveaux 10 à 200
- flottes jusqu’à x10
- haute difficulté
- coordination obligatoire

📅 TOP 100
- jour 1 dev
- jour 2 recrutement
- jour 3 tech
- jour 4 vaisseau amiral
- jour 5 préparation
- jour 6 guerre

🧠 RÈGLES
- discipline > chaos
- stratégie > force brute
- coordination > solo
======================
`;

/* =========================
   IA PROMPT
========================= */
const SYSTEM_PROMPT = `
Tu es Jodie.

IA stratégique experte de Galactic Frontier.

Tu :
- reconnais les joueurs
- adaptes tes réponses selon leur niveau
- optimises raids, VS, économie et progression
- joues un rôle de commandant militaire
`;

/* =========================
   SCORE JOUEUR (NOUVEAU)
========================= */
function updatePlayerProfile(user, text) {
    const t = text.toLowerCase();

    if (!user.profile.score) user.profile.score = 0;

    if (t.includes("raid")) user.profile.score += 2;
    if (t.includes("vs")) user.profile.score += 2;
    if (t.includes("gloire")) user.profile.score += 1;
    if (t.includes("tribus")) user.profile.score += 2;
    if (t.includes("tp")) user.profile.score += 1;

    // niveau automatique
    if (user.profile.score > 15) user.profile.rank = "COMMANDANT";
    else if (user.profile.score > 8) user.profile.rank = "STRATÈGE";
    else if (user.profile.score > 3) user.profile.rank = "CONFIRMÉ";
    else user.profile.rank = "RECRUE";
}

/* =========================
   GROQ API
========================= */
async function askIA(prompt) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            temperature: 0.7
        }),
    });

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "Erreur IA";
}

/* =========================
   READY
========================= */
client.on('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
});

/* =========================
   MESSAGE HANDLER
========================= */
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== CHANNEL_ID) return;

    try {
        await message.channel.sendTyping();

        const memory = loadMemory();
        const userId = message.author.id;

        if (!memory.users[userId]) {
            memory.users[userId] = {
                name: message.author.username,
                history: [],
                profile: {
                    score: 0,
                    rank: "RECRUE",
                    notes: []
                }
            };
        }

        const user = memory.users[userId];

        /* 🔥 UPDATE PROFIL */
        updatePlayerProfile(user, message.content);

        /* HISTORIQUE */
        const historyContext = user.history
            .slice(-6)
            .map(h => `Joueur: ${h.q}\nJodie: ${h.a}`)
            .join("\n");

        /* PROMPT FINAL */
        const prompt = `
${GAME_KNOWLEDGE}

=== JOUEUR ===
Nom: ${user.name}
Rang: ${user.profile.rank}
Score: ${user.profile.score}

=== HISTORIQUE ===
${historyContext}

=== QUESTION ===
${message.content}

Réponds comme un commandant stratégique expert.
`;

        const reply = await askIA(prompt);

        /* MÉMOIRE */
        user.history.push({
            q: message.content,
            a: reply,
            t: Date.now()
        });

        if (user.history.length > 80) {
            user.history = user.history.slice(-80);
        }

        memory.users[userId] = user;
        saveMemory(memory);

        await message.reply(reply);

    } catch (err) {
        console.error(err);
        message.reply("Erreur IA.");
    }
});

/* =========================
   LOGIN
========================= */
client.login(process.env.DISCORD_TOKEN);
