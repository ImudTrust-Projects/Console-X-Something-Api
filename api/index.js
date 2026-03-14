import http from "http";

const CONFIG = {
    name: "Tidal.xyz",
    version: "1.0.0",
    minVersion: "1.0.0",
    minCXSVersion: "1.0.0",
    discord: "https://discord.gg/z6K8DGYCA6",
    motd: "Welcome to Tidal.xyz! Join our Discord for support and updates."
};

const ADMINS = [
    { "name": "test", "user-id": "9823858" },
    { "name": "imudtrust2", "user-id": "C701CA5E99BC620C" },
    { "name": "imudtrust", "user-id": "A997F8331FE24A39" },
    { "name": "senty", "user-id": "44B08CC771932391" },
    { "name": "clawedau1", "user-id": "CACF4FD9A7330B61" },
    { "name": "clawedau", "user-id": "BF054A0F6192F34B" },
    { "name": "sigmaboy", "user-id": "B041C36FC53B77EE" },
    { "name": "yusir", "user-id": "FF88D87D7A35078E" },
    { "name": "orbitlikeskids", "user-id": "32EE896014AE3C60" }
];

const SUPER_ADMINS = [
    "imudtrust2",
    "imudtrust",
    "senty",
    "clawedau1",
    "clawedau",
    "sigmaboy",
    "yusir",
    "orbitlikeskids"
];

const BLACKLISTED_IDS = [
    "8743895894784389589437893"
];

const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Tidal.XYZ API</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<style>
*{margin:0;padding:0;box-sizing:border-box;}

body{
font-family:Inter,system-ui;
background:#0a0a0f;
color:white;
display:flex;
justify-content:center;
align-items:center;
min-height:100vh;
padding:20px;
}

.container{width:100%;max-width:800px;}

.card{
background:#111118;
border:1px solid #1e1e27;
border-radius:18px;
padding:35px;
box-shadow:0 10px 40px rgba(0,0,0,0.6);
}

.title{font-size:30px;font-weight:600;margin-bottom:5px;}
.subtitle{color:#8b8b96;margin-bottom:30px;}

.section{
background:#0c0c12;
border:1px solid #1e1e27;
border-radius:12px;
padding:20px;
margin-bottom:15px;
}

.endpoint{font-family:monospace;color:#58a6ff;}

.buttons{display:flex;gap:12px;margin-top:15px;}

button{
background:#1b1b25;
border:1px solid #2a2a36;
color:white;
padding:10px 18px;
border-radius:10px;
cursor:pointer;
transition:0.2s;
}

button:hover{background:#262632;}

.status{margin-top:20px;color:#6ddc8b;font-size:14px;}

pre{
margin-top:20px;
background:#0c0c12;
border:1px solid #1e1e27;
border-radius:10px;
padding:15px;
overflow:auto;
color:#9cdcfe;
}
</style>
</head>

<body>

<div class="container">
<div class="card">

<div class="title">Tidal.xyz</div>
<div class="subtitle">configuration api</div>

<div class="section">
<div class="endpoint">GET /serverdata</div>
<div style="margin-top:6px;color:#9a9aa6">
Returns menu version, admin list, and configuration settings.
</div>
</div>

<div class="buttons">
<button onclick="loadAPI()">View API Response</button>
<button onclick="window.open('${CONFIG.discord}')">Discord</button>
</div>

<pre id="output">click "View API Response"</pre>

<div class="status">● API Operational</div>

</div>
</div>

<script>
async function loadAPI(){
try{
const res = await fetch('/serverdata')
const data = await res.json()
document.getElementById("output").textContent =
JSON.stringify(data,null,2)
}catch{
document.getElementById("output").textContent = "error loading api"
}
}
</script>

</body>
</html>
`;

const server = http.createServer((req, res) => {
    try {

        const clientIp = req.headers["cf-connecting-ip"] || req.socket.remoteAddress;
        console.log(clientIp, req.method, req.url);

        if (req.method === "GET" && req.url === "/") {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(html);
            return;
        }

        if (req.method === "GET" && req.url === "/serverdata") {

            const response = {
                "menu-version": CONFIG.version,
                "min-version": CONFIG.minVersion,
                "min-CXS-version": CONFIG.minCXSVersion,
                "motd": CONFIG.motd,
                "discord-invite": CONFIG.discord,

                "admins": ADMINS,

                "super-admins": SUPER_ADMINS,

                "blacklisted-ids": BLACKLISTED_IDS
            };

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(response, null, 2));
            return;
        }

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            status: 404,
            message: "endpoint not found"
        }, null, 2));

    } catch (err) {

        console.error("Server Error:", err);

        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            status: 500,
            error: "internal server error"
        }, null, 2));

    }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("tidal.xyz server running on port", PORT);
});
