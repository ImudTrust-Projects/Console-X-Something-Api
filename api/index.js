import { kv } from '@vercel/kv';
import crypto from 'crypto';

const HASH_KEY = process.env.HASH_SECRET;
const SECRET_KEY = process.env.SECRET_KEY;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

let votesObj = { "a-votes": [], "b-votes": [] };
let activeRooms = {};
let activeUserData = {};
let bannedIds = [];

const ipRequestTimestamps = new Map();
const syncDataRequestTimestamps = new Map();
const voteDelay = new Map();
const ipTelemetryLock = new Map();

async function initializeFromKV() {
  try {
    const votes = await kv.get('votes');
    if (votes) {
      votesObj = votes;
    } else {
      await kv.set('votes', votesObj);
    }

    const banned = await kv.get('bannedIds');
    if (banned) {
      bannedIds = banned;
    } else {
      await kv.set('bannedIds', bannedIds);
    }

    console.log('KV initialized successfully');
  } catch (error) {
    console.error('KV initialization error:', error);
  }
}

initializeFromKV();

function hashIpAddr(ip) {
    if (!HASH_KEY) return crypto.createHash('sha256').update(ip).digest('hex');
    const h = crypto.createHmac('sha256', HASH_KEY).update(ip).digest();
    return h.toString('hex');
}

function cleanString(input, maxLength = 12) {
    if (!input) return "NULL";
    
    let cleaned = '';
    for (let i = 0; i < input.length; i++) {
        const c = input[i];
        if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) {
            cleaned += c;
        }
    }
    
    if (cleaned.length > maxLength) {
        cleaned = cleaned.substring(0, maxLength);
    }
    
    cleaned = cleaned.toUpperCase();
    
    return cleaned || "NULL";
}

function cleanAndFormatData(data) {
    return {
        directory: cleanString(data.directory, 12),
        identity: cleanString(data.identity, 12),
        region: cleanString(data.region, 3),
        userid: cleanString(data.userid, 20),
        isPrivate: data.isPrivate !== undefined ? data.isPrivate : true,
        playerCount: Math.min(Math.max(parseInt(data.playerCount) || 0, -1), 10),
        gameMode: cleanString(data.gameMode, 128),
        consoleVersion: data.consoleVersion || "3.0.7",
        menuName: data.menuName || "stupid",
        menuVersion: data.menuVersion || "8.3.0"
    };
}

function isValidId(id) {
    if (!id || id === "NULL") return false;
    if (id.length <= 10) return false;
    return true;
}

async function getRequestBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch {
                resolve({});
            }
        });
    });
}

async function sendToDiscordWebhook(data) {
    if (!DISCORD_WEBHOOK_URL) return;
    
    const content = `New connection received\n> Room Data: \`${data.directory}\` \`${data.region}\` \`${data.gameMode}\` \`${data.isPrivate ? "Public" : "Private"}\` \`${data.playerCount} Players\`\n> User Data: \`${data.identity}\` \`${data.userid}\` \`Console ${data.consoleVersion}\` \`${data.menuName} ${data.menuVersion}\``;
    
    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        console.log('Sent to Discord webhook');
    } catch (error) {
        console.error('Error sending to Discord:', error);
    }
}

function canWriteTelemData(ipHash, userId) {
    const now = Date.now();
    const lock = ipTelemetryLock.get(ipHash);
    const telemTimeout = 60 * 60 * 1000;
    
    if (lock && (now - lock.timestamp < telemTimeout) && lock.userId !== userId) {
        return false;
    }
    ipTelemetryLock.set(ipHash, { userId, timestamp: now });
    return true;
}

function sendMethodNotAllowed(res, allowedMethods) {
    res.setHeader('Allow', allowedMethods.join(', '));
    return res.status(405).json({ 
        status: 405, 
        error: `Method not allowed. This endpoint only accepts ${allowedMethods.join(' or ')} requests.` 
    });
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent, X-API-Key, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const clientIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ipHash = hashIpAddr(clientIp);
    
    console.log(`${new Date().toISOString()} - ${ipHash} ${req.method} ${req.url}`);

    try {
        if (req.url === '/telemetry' || req.url === '/telementery') {
            if (req.method !== 'POST') {
                return sendMethodNotAllowed(res, ['POST']);
            }
            
            const lastRequest = ipRequestTimestamps.get(clientIp);
            if (lastRequest && Date.now() - lastRequest < 6000) {
                return res.status(429).json({ status: 429 });
            }
            ipRequestTimestamps.set(clientIp, Date.now());

            const data = await getRequestBody(req);
            console.log('Raw telemetry:', JSON.stringify(data));
            
            const cleanedData = cleanAndFormatData(data);
            console.log('Cleaned telemetry:', JSON.stringify(cleanedData));
            
            if (!isValidId(cleanedData.userid)) {
                console.log(`Invalid user ID: ${cleanedData.userid} (Length: ${cleanedData.userid.length})`);
                return res.status(400).json({ 
                    status: 400, 
                    error: "Invalid user ID length",
                    received: cleanedData.userid,
                    length: cleanedData.userid.length
                });
            }

            activeRooms[cleanedData.directory] = {
                region: cleanedData.region,
                gameMode: cleanedData.gameMode,
                playerCount: cleanedData.playerCount,
                isPrivate: cleanedData.isPrivate,
                timestamp: Date.now()
            };

            try {
                await kv.set(`room:${cleanedData.directory}`, JSON.stringify(activeRooms[cleanedData.directory]), { ex: 600 });
                
                const userKey = `user:${cleanedData.userid}`;
                await kv.hset(userKey, {
                    lastSeen: Date.now(),
                    version: cleanedData.consoleVersion,
                    menu: cleanedData.menuName,
                    ip: clientIp,
                    region: cleanedData.region
                });
                await kv.expire(userKey, 3600);
            } catch (e) {
                console.error('KV store error:', e);
            }

            if (!canWriteTelemData(ipHash, cleanedData.userid)) {
                return res.status(410).json({ status: 410, error: "Invalid telemetry" });
            }

            await sendToDiscordWebhook(cleanedData);
            return res.status(200).json({ status: 200 });
        }

        else if (req.url === '/syncdata') {
            if (req.method !== 'POST') {
                return sendMethodNotAllowed(res, ['POST']);
            }
            
            const lastRequest = syncDataRequestTimestamps.get(clientIp);
            if (lastRequest && Date.now() - lastRequest < 2500) {
                return res.status(429).json({ status: 429 });
            }
            syncDataRequestTimestamps.set(clientIp, Date.now());

            const data = await getRequestBody(req);
            console.log('Sync data received for room:', data.directory);
            
            try {
                await kv.set(`sync:${data.directory}:${Date.now()}`, JSON.stringify(data), { ex: 3600 });
            } catch (e) {}
            
            return res.status(200).json({ status: 200 });
        }

        else if (req.url === '/usercount') {
            if (req.method === 'POST') {
                try {
                    const data = await getRequestBody(req);
                    let count = 0;
                    try {
                        const visitors = await kv.keys('visitor:*');
                        count = visitors?.length || 0;
                    } catch (e) {}
                    
                    count = count + 1;
                    
                    try {
                        await kv.set(`visitor:${ipHash}:${Date.now()}`, 'active', { ex: 300 });
                    } catch (e) {}
                    
                    return res.status(200).json({ users: count });
                } catch (e) {
                    return res.status(400).json({ status: 400, error: "Invalid request body" });
                }
            }
            else if (req.method === 'GET') {
                let count = 0;
                try {
                    const visitors = await kv.keys('visitor:*');
                    count = visitors?.length || 0;
                } catch (e) {}
                return res.status(200).json({ users: count });
            }
            else {
                return sendMethodNotAllowed(res, ['GET', 'POST']);
            }
        }

        else if (req.url === '/rooms') {
            if (req.method !== 'GET') {
                return sendMethodNotAllowed(res, ['GET']);
            }
            
            const data = await getRequestBody(req);
            if (data.key !== SECRET_KEY) {
                return res.status(401).json({ status: 401 });
            }
            
            const currentTime = Date.now();
            Object.keys(activeRooms).forEach(dir => {
                if (currentTime - activeRooms[dir].timestamp > 600000) delete activeRooms[dir];
            });
            
            return res.status(200).json({ activeRooms });
        }

        else if (req.url === '/getsyncdata') {
            if (req.method !== 'GET') {
                return sendMethodNotAllowed(res, ['GET']);
            }
            
            const data = await getRequestBody(req);
            if (data.key !== SECRET_KEY) {
                return res.status(401).json({ status: 401 });
            }
            
            const currentTime = Date.now();
            Object.keys(activeUserData).forEach(dir => {
                if (currentTime - activeUserData[dir].timestamp > 600000) delete activeUserData[dir];
            });
            
            return res.status(200).json({ activeUserData });
        }

        else if (req.url === '/serverdata') {
            if (req.method !== 'GET') {
                return sendMethodNotAllowed(res, ['GET']);
            }
            
            return res.status(200).json({
                "menu-version": "8.3.0",
                "min-version": "1.0.6",
                "min-console-version": "2.9.0",
                "discord-invite": "",
                "motd": "This is just a test menu",
                "admins": [
                    { "name": "test", "user-id": "9823858" },
                    { "name": "imudtrust2", "user-id": "C701CA5E99BC620C" },
                    { "name": "imudtrust", "user-id": "A997F8331FE24A39" },
                    { "name": "senty", "user-id": "44B08CC771932391" },
                    { "name": "clawedau1", "user-id": "CACF4FD9A7330B61" },
                    { "name": "clawedau", "user-id": "BF054A0F6192F34B" },
                    { "name": "sigmaboy", "user-id": "B041C36FC53B77EE" }
                ],
                "super-admins": ["imudtrust2", "imudtrust", "senty", "clawedau1", "clawedau", "sigmaboy"],
                "patreon": [],
                "detected-mods": [],
                "poll": "This is just a test dw.",
                "option-a": "okay",
                "option-b": "fuck no"
            });
        }

        else if (req.url === '/vote') {
            if (req.method !== 'POST') {
                return sendMethodNotAllowed(res, ['POST']);
            }
            
            const lastVote = voteDelay.get(clientIp);
            if (lastVote && Date.now() - lastVote < (60 * 60 * 1000)) {
                return res.status(429).json({ status: 429 });
            }
            voteDelay.set(clientIp, Date.now());

            const data = await getRequestBody(req);
            
            if (votesObj['a-votes'].includes(ipHash) || votesObj['b-votes'].includes(ipHash)) {
                return res.status(400).json({ error: "You have already voted" });
            }
            
            if (data.option === 'a-votes' || data.option === 'b-votes') {
                votesObj[data.option].push(ipHash);
                
                try {
                    await kv.set('votes', votesObj);
                } catch (e) {}
            }
            
            return res.status(200).json({
                "a-votes": votesObj["a-votes"].length,
                "b-votes": votesObj["b-votes"].length
            });
        }

        else if (req.url === '/votes') {
            if (req.method !== 'GET') {
                return sendMethodNotAllowed(res, ['GET']);
            }
            
            return res.status(200).json({
                "a-votes": votesObj["a-votes"].length,
                "b-votes": votesObj["b-votes"].length
            });
        }

        else if (req.url === '/blacklistid') {
            if (req.method !== 'POST') {
                return sendMethodNotAllowed(res, ['POST']);
            }
            
            const data = await getRequestBody(req);
            if (data.key !== SECRET_KEY) {
                return res.status(401).json({ status: 401 });
            }
            
            if (!bannedIds.includes(data.id)) {
                bannedIds.push(data.id);
                try {
                    await kv.set('bannedIds', bannedIds);
                } catch (e) {}
            }
            return res.status(200).json({ status: 200 });
        }

        else if (req.url === '/unblacklistid') {
            if (req.method !== 'POST') {
                return sendMethodNotAllowed(res, ['POST']);
            }
            
            const data = await getRequestBody(req);
            if (data.key !== SECRET_KEY) {
                return res.status(401).json({ status: 401 });
            }
            
            bannedIds = bannedIds.filter(id => id !== data.id);
            try {
                await kv.set('bannedIds', bannedIds);
            } catch (e) {}
            return res.status(200).json({ status: 200 });
        }

        else if (req.url === '/getblacklisted') {
            if (req.method !== 'GET') {
                return sendMethodNotAllowed(res, ['GET']);
            }
            
            const data = await getRequestBody(req);
            if (data.key !== SECRET_KEY) {
                return res.status(401).json({ status: 401 });
            }
            
            return res.status(200).json({ data: bannedIds.join("\n") });
        }

        else if (req.url === "/" || req.url === "") {
            if (req.method !== 'GET') {
                return sendMethodNotAllowed(res, ['GET']);
            }
            
            return res.status(200).json({ 
                status: 200, 
                message: "API Server",
                endpoints: [
                    "/telemetry (POST)",
                    "/syncdata (POST)",
                    "/usercount (GET, POST)",
                    "/rooms (GET - requires key)",
                    "/getsyncdata (GET - requires key)",
                    "/serverdata (GET)",
                    "/vote (POST)",
                    "/votes (GET)",
                    "/blacklistid (POST - requires key)",
                    "/unblacklistid (POST - requires key)",
                    "/getblacklisted (GET - requires key)"
                ]
            });
        }

        else {
            return res.status(404).json({ status: 404, error: "Endpoint not found" });
        }

    } catch (err) {
        console.error('Error:', err.message);
        return res.status(500).json({ status: 500, error: err.message });
    }
}