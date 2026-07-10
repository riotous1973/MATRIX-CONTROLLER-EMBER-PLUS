const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { EmberClient } = require('emberplus-connection');
const Probel = require('probel-swp-08');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const PORT = 3556;
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

// Server-side layouts persistence (stored in the same directory as the executable)
const LAYOUTS_FILE = path.join(path.dirname(process.execPath), 'layouts.json');
let serverLayouts = {};

try {
    if (fs.existsSync(LAYOUTS_FILE)) {
        serverLayouts = JSON.parse(fs.readFileSync(LAYOUTS_FILE, 'utf8'));
        console.log(`Loaded ${Object.keys(serverLayouts).length} layouts from server file.`);
    } else {
        fs.writeFileSync(LAYOUTS_FILE, JSON.stringify({}), 'utf8');
    }
} catch (e) {
    console.error("Failed to load layouts.json:", e.message);
}

let client = null;
let probelClient = null;
let matrixNode = null;
let emberData = { sources: {}, destinations: {} };
let isMatrixConnected = false;

async function connectToEmber(ip, port, socket) {
    if (client) {
        client.disconnect();
        client = null;
    }

    if (probelClient) {
        try {
            if (probelClient.client) {
                probelClient.client.destroy();
            }
        } catch (e) {
            console.error("Error disconnecting Pro-Bel:", e.message);
        }
        probelClient = null;
    }

    try {
        console.log(`Connecting to Ember+ server at ${ip}:${port}...`);
        client = new EmberClient(ip, port, 30000);
        
        client.on('error', e => {
            console.error("Ember+ Client Error:", e.message);
            isMatrixConnected = false;
            io.emit('matrix_status', { connected: false, message: 'Errore Ember+: ' + e.message });
        });

        await client.connect();
        isMatrixConnected = true;
        console.log("Ember+ Connected.");
        io.emit('matrix_status', { connected: true, message: 'Connected to MediorNet!' });

        // Connect to Pro-Bel on port 5555
        try {
            console.log(`Connecting to Pro-Bel at ${ip}:5555...`);
            probelClient = new Probel(ip, {
                port: 5555,
                extended: false,
                sources: 1024,
                destinations: 1024,
                levels: 17,
                matrix: 1
            });
            probelClient.events.on('connection', (state) => {
                if (state) {
                    console.log('Connected to Pro-Bel Matrix on port 5555.');
                } else {
                    console.log('Pro-Bel Matrix connection failed.');
                }
            });
            probelClient.events.on('error', (err) => {
                console.error('Pro-Bel Client Error:', err.message || err);
            });
        } catch (pbErr) {
            console.error("Failed to initialize Pro-Bel connection:", pbErr.message);
        }

        // Get root
        await (await client.getDirectory(client.tree)).response;

        // Fetch Matrix
        console.log("Fetching Video Matrix (1.2.0.3)...");
        matrixNode = await client.getElementByPath('1.2.0.3');

        // Fetch Targets Labels
        try {
            const targetsNode = await client.getElementByPath('1.2.0.1.1');
            if(targetsNode) {
                await (await client.getDirectory(targetsNode)).response;
                await new Promise(r => setTimeout(r, 1000));
            }

            const sourcesNode = await client.getElementByPath('1.2.0.1.2');
            if(sourcesNode) {
                await (await client.getDirectory(sourcesNode)).response;
                await new Promise(r => setTimeout(r, 1000));
            }

            emberData.destinations = {};
            if(targetsNode) {
                let tChildren = targetsNode.children || targetsNode.elements;
                const iter = tChildren instanceof Map ? Array.from(tChildren.values()) : Object.values(tChildren || {});
                for(let c of iter) {
                    let name = `Out ${c.number}`;
                    if (c.contents && c.contents.value) name = c.contents.value;
                    else if (c.contents && c.contents.description) name = c.contents.description;
                    else if (c.contents && c.contents.identifier) name = c.contents.identifier;
                    
                    if (name === `Out ${c.number}` || name === undefined) {
                        await (await client.getDirectory(c)).response;
                        const cIter = c.children instanceof Map ? Array.from(c.children.values()) : Object.values(c.children || {});
                        if(cIter.length > 0) {
                            name = cIter[0].contents ? cIter[0].contents.value : (cIter[0].contents ? cIter[0].contents.identifier : undefined);
                        }
                    }
                    if (name) emberData.destinations[c.number] = name;
                }
            }

            emberData.sources = {};
            if(sourcesNode) {
                let sChildren = sourcesNode.children || sourcesNode.elements;
                const iter = sChildren instanceof Map ? Array.from(sChildren.values()) : Object.values(sChildren || {});
                for(let c of iter) {
                    let name = `In ${c.number}`;
                    if (c.contents && c.contents.value) name = c.contents.value;
                    else if (c.contents && c.contents.description) name = c.contents.description;
                    else if (c.contents && c.contents.identifier) name = c.contents.identifier;

                    if (name === `In ${c.number}` || name === undefined) {
                        await (await client.getDirectory(c)).response;
                        const cIter = c.children instanceof Map ? Array.from(c.children.values()) : Object.values(c.children || {});
                        if(cIter.length > 0) {
                            name = cIter[0].contents ? cIter[0].contents.value : (cIter[0].contents ? cIter[0].contents.identifier : undefined);
                        }
                    }
                    if (name) emberData.sources[c.number] = name;
                }
            }
            console.log(`Ember+ Data Ready: ${Object.keys(emberData.destinations).length} targets, ${Object.keys(emberData.sources).length} sources.`);
            io.emit('matrix_names', emberData);
        } catch (labelErr) {
            console.warn("Failed to fetch labels (timeout?), proceeding without names:", labelErr.message);
            // We don't disconnect!
            io.emit('matrix_names', emberData);
        }

} catch (e) {
        console.error("Failed to connect/fetch Ember+ data:", e.message);
        isMatrixConnected = false;
        io.emit('matrix_status', { connected: false, message: 'Errore: ' + e.message });
        client = null;
    }
}

io.on('connection', (socket) => {
    console.log('Web client connected');
    
    // Send server-side layouts to the client
    socket.emit('layouts_list', serverLayouts);

    socket.on('save_layout', (data) => {
        const { name, layout } = data;
        if (!name) return;
        serverLayouts[name] = layout;
        try {
            fs.writeFileSync(LAYOUTS_FILE, JSON.stringify(serverLayouts, null, 2), 'utf8');
            io.emit('layouts_list', serverLayouts); // broadcast to all
        } catch (e) {
            console.error("Failed to save layout:", e.message);
        }
    });

    socket.on('delete_layout', (name) => {
        if (!name) return;
        delete serverLayouts[name];
        try {
            fs.writeFileSync(LAYOUTS_FILE, JSON.stringify(serverLayouts, null, 2), 'utf8');
            io.emit('layouts_list', serverLayouts); // broadcast to all
        } catch (e) {
            console.error("Failed to delete layout:", e.message);
        }
    });

    socket.on('import_layouts', (importedLayouts) => {
        if (typeof importedLayouts !== 'object' || importedLayouts === null) return;
        serverLayouts = { ...serverLayouts, ...importedLayouts };
        try {
            fs.writeFileSync(LAYOUTS_FILE, JSON.stringify(serverLayouts, null, 2), 'utf8');
            io.emit('layouts_list', serverLayouts); // broadcast to all
        } catch (e) {
            console.error("Failed to import layouts:", e.message);
        }
    });

    if (isMatrixConnected) {
        socket.emit('matrix_status', { connected: true, message: 'Connected to MediorNet!' });
        socket.emit('matrix_names', emberData);
    } else {
        socket.emit('matrix_status', { connected: false, message: 'Disconnected' });
    }

    socket.on('connect_matrix', (data) => {
        io.emit('matrix_status', { connected: false, message: 'Connessione in corso...' });
        connectToEmber(data.ip, data.port, socket);
    });

    socket.on('disconnect_matrix', () => {
        isMatrixConnected = false;
        if (client) {
            client.disconnect();
            client = null;
        }
        if (probelClient) {
            try {
                if (probelClient.client) {
                    probelClient.client.destroy();
                }
            } catch (e) {
                console.error("Error disconnecting Pro-Bel:", e.message);
            }
            probelClient = null;
        }
        io.emit('matrix_status', { connected: false, message: 'Disconnected' });
    });

    
    socket.on('take_snapshot', async (stateMap) => {
        console.log(`Requested TAKE SNAPSHOT`);
        if (client && matrixNode) {
            for (const outStr in stateMap) {
                const targetInt = parseInt(outStr, 10);
                const sourceInt = parseInt(stateMap[outStr], 10);
                try {
                    const req = await client.matrixConnect(matrixNode, targetInt, [sourceInt]);
                    await req.response;
                    io.emit('take_success', { output: targetInt, input: sourceInt });
                    await new Promise(r => setTimeout(r, 60)); // Stagger to not flood the matrix
                } catch (e) {
                    console.error(`Failed snapshot take ${sourceInt}->${targetInt}:`, e.message);
                }
            }
        }
    });

socket.on('take', async (data) => {
        const { output, input } = data;
        const outputs = Array.isArray(output) ? output : [output];
        console.log(`Requested TAKE: Source ${input} to Targets ${outputs.join(', ')}`);
        
        if (client && matrixNode) {
            try {
                const sourceInt = parseInt(input, 10);
                
                for (let out of outputs) {
                    const targetInt = parseInt(out, 10);
                    const req = await client.matrixConnect(matrixNode, targetInt, [sourceInt]);
                    await req.response;
                    console.log(`Take successful via Ember+: Source ${sourceInt} to Target ${targetInt}`);
                    // Slight stagger as requested
                    await new Promise(r => setTimeout(r, 50));
                }
                io.emit('take_success', { output: outputs, input: sourceInt });
            } catch (err) {
                console.error("Take failed:", err.message);
                socket.emit('matrix_error', { message: 'Take failed: ' + err.message });
            }
        } else {
            socket.emit('matrix_error', { message: 'Not connected to matrix.' });
        }
    });

    socket.on('take_multi', async (commands) => {
        if (client && matrixNode) {
            try {
                for (let cmd of commands) {
                    const req = await client.matrixConnect(matrixNode, cmd.out, [cmd.in]);
                    await req.response;
                    console.log(`Multi-Take successful via Ember+: Source ${cmd.in} to Target ${cmd.out}`);
                    await new Promise(r => setTimeout(r, 50));
                }
                io.emit('take_multi_success', commands);
            } catch (err) {
                console.error("Multi-take failed:", err.message);
                socket.emit('matrix_error', { message: 'Undo failed: ' + err.message });
            }
        }
    });

    socket.on('request_connection_state', async (data) => {
        try {
            const targetInt = parseInt(data.target, 10);
            if (isNaN(targetInt)) return;
            
            // 1. Try Ember+ first (fast and accurate)
            if (matrixNode && matrixNode.connections) {
                let conn = null;
                if (matrixNode.connections instanceof Map) {
                    conn = matrixNode.connections.get(targetInt) || matrixNode.connections.get(targetInt.toString());
                } else {
                    conn = matrixNode.connections[targetInt] || matrixNode.connections[targetInt.toString()];
                }
                
                if (conn && conn.sources && conn.sources.length > 0) {
                    const sourceId = conn.sources[0];
                    const payload = { '1': { '1': {} } };
                    payload['1']['1'][targetInt] = sourceId;
                    socket.emit('matrix_crosspoint', payload); // Send ONLY to requester
                    return;
                }
            }
            
            // 2. Fallback to Pro-Bel
            if (probelClient && probelClient.connected) {
                const destNumber = targetInt; 
                const res = await probelClient.interrogate(destNumber, 0, 0);
                
                let foundSource = null;
                for (let mKey in probelClient.tallies) {
                    const matrixObj = probelClient.tallies[mKey];
                    for (let lKey in matrixObj) {
                        const levelObj = matrixObj[lKey];
                        if (levelObj[destNumber] !== undefined) {
                            foundSource = levelObj[destNumber];
                            break;
                        }
                    }
                    if (foundSource !== null) break;
                }
                
                if (foundSource !== null) {
                    const sourceId = foundSource;
                    const payload = { '1': { '1': {} } };
                    payload['1']['1'][targetInt] = sourceId;
                    socket.emit('matrix_crosspoint', payload); // Send ONLY to requester
                }
            }
        } catch (e) {
            console.error("Error requesting connection state:", e.message);
        }
    });

    socket.on('shutdown_server', () => {
        console.log('Shutdown requested from UI. Closing server...');
        setTimeout(() => process.exit(0), 1000);
    });
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is already in use. Opening browser to existing instance...`);
        exec(`start http://localhost:${PORT}`);
        setTimeout(() => process.exit(0), 1000);
    } else {
        console.error("Server error:", e);
    }
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    exec(`start http://localhost:${PORT}`);
});
