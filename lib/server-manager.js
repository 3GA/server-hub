const {spawn, execSync} = require('child_process');
const path = require('path');

const START_PORT = 50000;
const BINARY_NAME = /win/.test(process.platform) ? 'node.exe' : 'node';

class ServerManager {
    constructor () {
        this._servers = {};
        this._state = {};
        this._usedPorts = [];
        this._loadConfig();
    }

    addServer (opts) {
        let port;
        if (this._state[opts.id]) {
            return { type: 'ERROR', message: `A server with the id '${opts.id}' is already running` };
        }
        port = opts.port || this._getFreePort();
        this._state[opts.id] = {
            id: opts.id,
            path: opts.path,
            port,
            spa: opts.spa || false
        };
        this._startServer(opts.id);
        this._persistConfig();
        return { type: 'MESSAGE', message: `Server started on port '${port}'` };
    }

    removeServer (opts) {
        if (!this._state[opts.id]) {
            return { type: 'ERROR', message: `No server with the id '${opts.id}' is running` };
        }
        this._stopServer(opts.id);
        delete this._state[opts.id];
        this._persistConfig();
        return { type: 'MESSAGE', message: `Server ${opts.id} stopped` };
    }

    _startServer (id) {
        const opts = this._state[id];
        const spawnArgs = [path.join(__dirname, '../node_modules/local-web-server/bin/cli.js'), '-d', opts.path, '-p', opts.port];
        if (opts.spa) {
            spawnArgs.push('--spa');
        }
        this._usedPorts.push(opts.port);
        this._servers[id] = spawn(BINARY_NAME, spawnArgs, {
            stdio: 'ignore'
        });
    }

    _stopServer (id) {
        const opts = this._state[id];
        process.kill(this._servers[opts.id].pid);
        const portIdx = this._usedPorts.indexOf(opts.port);
        if (portIdx !== -1) {
            this._usedPorts.splice(portIdx, 1);
        }
    }

    _getFreePort () {
        let port = START_PORT;
        while (this._usedPorts.indexOf(port) !== -1) {
            port++;
        }
        return port;
    }

    _persistConfig () {
        this.save(JSON.stringify(this._state));
    }

    _loadConfig () {
        this.load()
            .then(state => {
                this._state = JSON.parse(state);
                Object.keys(this._state).forEach(id => this._startServer(id));
            });
    }

    save () {
        return Promise.resolve();
    }

    load () {
        return Promise.resolve({});
    }
}

module.exports = ServerManager;