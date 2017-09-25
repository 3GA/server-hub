#!/usr/bin/env node
const net = require('net');
const path = require('path');
const logger = require('cli-logger');
const log = logger();

function sendCmd (cmd) {
    const client = new net.Socket();
    let buffer = '';

    function parseMessage () {
        const lines = buffer.split('\n');
        buffer = lines[lines.length - 1]; 
        if (lines[lines.length - 1] === '') {
            // Remove last line if incomplete command
            lines.pop();
        }
        lines.forEach(line => processCmd(line));
    }

    function processCmd (cmdString) {
        let cmd, response;
        try {
            cmd = JSON.parse(cmdString);
        } catch (e) {
            return;
        }
        switch (cmd.type) {
            case 'ERROR':
                log.error(cmd.message);
                break;
            case 'MESSAGE':
                log.info(cmd.message);
                break;
            case 'END':
                log.debug('Server sent END message, terminating connection');
                client.destroy();
                break;
        }
        return response;
    }
    
    log.debug('Contacting local hub server...');
    client.connect(2345, '127.0.0.1', () => {
        client.on('data', d => {
            buffer += d.toString();
            parseMessage();
        });
        client.write(JSON.stringify(cmd) + '\n');
        log.debug('Command sent, waiting for responses...');
    });
    client.on('error', e => {
        log.error('Could not contact the server hub server. Try checking if the server is running');
    });
    
}

require('yargs')
    .command('add', 'adds a server', (yargs) => {
        yargs.option('id', {
            describe: 'server id',
            type: 'string',
            required: true
        }).option('rootPath', {
            describe: 'Path for the root of the website',
            default: './'
        }).option('spa', {
            describe: 'Uses a serving strategy compatible with front end routing (Single Page Application)',
            default: false,
            type: 'boolean'
        });
    }, (argv) => {
        if (argv.verbose) {
            log.level('debug');
        }
        sendCmd({
            type: 'ADD_SERVER',
            id: argv.id,
            path: path.resolve(argv.rootPath)
        });
    })
    .command('remove', 'removes a server', (yargs) => {
        yargs.option('id', {
            describe: 'server id',
            required: true
        });
    }, (argv) => {
        if (argv.verbose) {
            log.level('debug');
        }
        sendCmd({
            type: 'REMOVE_SERVER',
            id: argv.id
        });
    })
    .option('verbose', {
        alias: 'v',
        describe: 'Enable debug level logging',
        type: 'boolean',
        default: false
    })
    .demandCommand(1, '')
    .help()
    .argv;