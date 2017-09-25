const net = require('net');
const path = require('path');
const fs = require('fs');
const ServerManager = require('./server-manager');

const statePath = path.join(process.cwd(), '.server-hub-state.json');

class ServerHubManager extends ServerManager {
    save (state) {
        return new Promise((resolve, reject) => {
            fs.writeFile(statePath, state, (err) => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
    
    load () {
        return new Promise((resolve, reject) => {
            fs.readFile(statePath, (err, contents) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        return resolve('{}');
                    }
                    return reject(err);
                }
                return resolve(contents.toString());
            })
        });
    }
}

const servers = new ServerHubManager();

let buffer = '';

function processCmd (cmdString) {
    let cmd, response;
    try {
        cmd = JSON.parse(cmdString);
    } catch (e) {
        return;
    }
    switch (cmd.type) {
        case 'ADD_SERVER':
            response = servers.addServer(cmd);
            break;
        case 'REMOVE_SERVER':
            response = servers.removeServer(cmd);
            break;
    }
    return response;
}

function parseMessage () {
    const lines = buffer.split('\n');
    buffer = lines[lines.length - 1]; 
    if (lines[lines.length - 1] === '') {
        // Remove last line if incomplete command
        lines.pop();
    }
    return lines.map(line => processCmd(line));
}

function start () {
    net.createServer(client => {
        client.on('data', d => {
            buffer += d.toString();
            const responses = parseMessage();
            responses.push({ type: 'END' })
            responses.forEach(response => {
                client.write(JSON.stringify(response) + '\n');
            });
        });
    }).listen({
        host: 'localhost',
        port: 2345
    });
}


module.exports = {
    start
};
