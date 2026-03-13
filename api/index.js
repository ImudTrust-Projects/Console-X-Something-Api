import http from 'http';

const server = http.createServer(async (req, res) => {
    try {
        const clientIp = req.headers['cf-connecting-ip'] || req.socket.remoteAddress;
        console.log(`${clientIp} ${req.method} ${req.url}`);

        if (req.method === 'GET' && req.url === '/') {
            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <title>API · serverdata</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: #0a0a0c;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, system-ui, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 1.5rem;
            color: #e1e1e3;
        }

        .container {
            max-width: 480px;
            width: 100%;
        }

        .card {
            background: #111113;
            border: 1px solid #1e1e22;
            border-radius: 16px;
            padding: 2rem;
        }

        .header {
            margin-bottom: 2rem;
        }

        .title {
            font-size: 1.5rem;
            font-weight: 500;
            letter-spacing: -0.02em;
            color: #ffffff;
            margin-bottom: 0.5rem;
        }

        .subtitle {
            font-size: 0.875rem;
            color: #7f7f8c;
        }

        .endpoint {
            background: #0c0c0f;
            border: 1px solid #1e1e22;
            border-radius: 12px;
            padding: 1.25rem;
        }

        .endpoint-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 0.75rem;
        }

        .method {
            background: #1a1a1f;
            color: #58a6ff;
            font-size: 0.75rem;
            font-weight: 500;
            padding: 0.25rem 0.5rem;
            border-radius: 6px;
            letter-spacing: 0.01em;
            border: 1px solid #2a2a30;
        }

        .path {
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-size: 0.875rem;
            color: #e1e1e3;
        }

        .description {
            font-size: 0.875rem;
            color: #7f7f8c;
            line-height: 1.5;
        }

        .footer {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid #1e1e22;
            font-size: 0.75rem;
            color: #5c5c66;
            display: flex;
            justify-content: space-between;
        }

        .status {
            display: flex;
            align-items: center;
            gap: 0.375rem;
        }

        .status-dot {
            width: 6px;
            height: 6px;
            background: #28a745;
            border-radius: 50%;
        }

        a {
            color: #58a6ff;
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <div class="title">serverdata</div>
                <div class="subtitle">menu configuration endpoint</div>
            </div>

            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method">GET</span>
                    <span class="path">/serverdata</span>
                </div>
                <div class="description">
                    Returns menu version, admin list, MOTD and configuration settings.
                </div>
            </div>

            <div class="footer">
                <div class="status">
                    <span class="status-dot"></span>
                    operational
                </div>
                <div>
                    <a href="/serverdata">→ view response</a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
            `;
            
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(html);
            return;
        }

        if (req.method === 'GET' && req.url === '/serverdata') {
            const response = {
                "menu-version": "1.0.0",
                "min-version": "1.0.0",
                "min-CXS-version": "1.0.0",
                "discord-invite": "",
                "motd": "hello world",
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
                "blacklisted-ids": [],
            };

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(response, null, 2));
            return;
        }

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: 404, message: "endpoint not found" }, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 500, error: err.message }, null, 2));
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
