import fs from 'fs';
import readline from 'readline';
import path from 'path';

type StateMachineData = Record<string, Record<string, string[]>>;

async function processFile(inputFile: string, outputFile: string): Promise<void> {
    const stateMachines: StateMachineData = {};
    const regex = /^playerStateMachine(\w+)\.([\w\d]+)\.(\w+),\d+$/;

    const fileStream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        const match = line.match(regex);
        if (match) {
            const [, machineName, stateName, attributeName] = match;
            
            if (!stateMachines[machineName]) {
                stateMachines[machineName] = {};
            }
            if (!stateMachines[machineName][stateName]) {
                stateMachines[machineName][stateName] = [];
            }
            stateMachines[machineName][stateName].push(attributeName);
        }
    }

    const jsonOutput = JSON.stringify(stateMachines, null, 2);
    fs.writeFileSync(outputFile, jsonOutput);
    console.log(`Processed data written to ${outputFile}`);
}

function main() {
    const args = process.argv.slice(2);
    if (args.length !== 2) {
        console.error('Usage: ts-node process_state_machines.ts <input_file> <output_file>');
        process.exit(1);
    }

    const [inputFile, outputFile] = args;

    if (!fs.existsSync(inputFile)) {
        console.error(`Input file ${inputFile} does not exist.`);
        process.exit(1);
    }

    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
        console.error(`Output directory ${outputDir} does not exist.`);
        process.exit(1);
    }

    processFile(inputFile, outputFile).catch(error => {
        console.error('An error occurred:', error);
        process.exit(1);
    });
}

main();