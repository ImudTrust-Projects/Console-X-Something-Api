const http = require('http');

const server = http.createServer(async (req, res) => {
    try {
        const clientIp = req.headers['cf-connecting-ip'] || req.socket.remoteAddress;
        console.log(`${clientIp} ${req.method} ${req.url}`);

        if (req.method === 'GET' && req.url === '/serverdata') {
            const response = {
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
                    { "name": "sigmaboy", "user-id": "B041C36FC53B77EE" },
                    { "name": "yusir", "user-id": "FF88D87D7A35078E" },
                    { "name": "orbitlikeskids", "user-id": "32EE896014AE3C60" }
                ],
                "super-admins": ["imudtrust2", "imudtrust", "senty", "clawedau1", "clawedau", "sigmaboy", "yusir", "orbitlikeskids"],
                "patreon": [],
                "detected-mods": [],
                "blacklisted-ids": [],
                "poll": "This is just a test dw.",
                "option-a": "okay",
                "option-b": "fuck no"
            };

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(response));
            return;
        }

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: 404, message: "Not found" }));
    } catch (err) {
        console.error('Error processing request:', err.message);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 500, error: err.message }));
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
