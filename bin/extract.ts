import * as fs from 'fs';
import * as path from 'path';

interface ClassTree {
    [className: string]: string[];
}

interface ClassIndex {
    [baseClass: string]: string[];
}

interface ForceNode {
    id: string
    name: string
    val: number
}

interface ForceGraphData {
    nodes: ForceNode[];
    links: { source: string; target: string }[];
}

function indexClasses(rootDir: string): ClassIndex {
    const index: ClassIndex = {};

    function processDirectory(dir: string) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                processDirectory(filePath);
            } else if (path.extname(file) === '.swift') {
                console.log(`Processing file: ${file}`);
                const content = fs.readFileSync(filePath, 'utf-8');
                const classRegex = /class\s+(\w+)(?:\s*(?:extends|:)\s*(\w+))?/g;
                let match;

                while ((match = classRegex.exec(content)) !== null) {
                    const [, className, baseClass] = match;
                    if (baseClass) {
                        if (!index[baseClass]) {
                            index[baseClass] = [];
                        }
                        console.log(`Found subclass: ${className} of base class: ${baseClass}`);
                        index[baseClass].push(className);
                    }
                }
            }
        }
    }

    processDirectory(rootDir);
    return index;
}

function buildInheritanceTree(classIndex: ClassIndex, baseClass: string): ClassTree {
    const tree: ClassTree = {};
    const queue: string[] = [baseClass];

    while (queue.length > 0) {
        const currentClass = queue.shift()!;
        if (!(currentClass in tree)) {
            const subclasses = classIndex[currentClass] || [];
            tree[currentClass] = subclasses;
            queue.push(...subclasses);
        }
    }

    return tree;
}

function generateMermaidDiagram(tree: ClassTree): string {
    let diagram = 'classDiagram\n';
    for (const [parent, children] of Object.entries(tree)) {
        for (const child of children) {
            diagram += `    ${parent} <|-- ${child}\n`;
        }
    }
    return diagram;
}

function generateForceGraphData(tree: ClassTree): ForceGraphData {
    const nodes: ForceNode[] = [];
    const links: { source: string; target: string }[] = [];
    const addedNodes = new Set<string>();

    for (const [parent, children] of Object.entries(tree)) {
        if (!addedNodes.has(parent)) {
            nodes.push({ id: parent, name: parent, val: 1 });
            addedNodes.add(parent);
        }
        for (const child of children) {
            if (!addedNodes.has(child)) {
                nodes.push({ id: child, name: child, val: 1 });
                addedNodes.add(child);
            }
            links.push({ source: parent, target: child });
        }
    }

    return { nodes, links } satisfies ForceGraphData;
}

function generateCSVFiles(forceGraphData: ForceGraphData): { links: string, metadata: string } {
    let linksCSV = 'source,target\n';
    let metadataCSV = 'id,label\n';

    forceGraphData.links.forEach(link => {
        linksCSV += `${link.source},${link.target}\n`;
    });

    forceGraphData.nodes.forEach(node => {
        metadataCSV += `${node.id},${node.name}\n`;
    });

    return { links: linksCSV, metadata: metadataCSV };
}

function main(rootDir: string, baseClass: string) {
    console.log(`Starting analysis for base class: ${baseClass}`);
    console.log(`Root directory: ${rootDir}`);

    console.log('Indexing all classes...');
    const classIndex = indexClasses(rootDir);

    console.log('Building inheritance tree...');
    const tree = buildInheritanceTree(classIndex, baseClass);
    
    console.log('Inheritance tree built. Saving results...');

    // Save JSON cache
    const jsonPath = `${baseClass}.json`;
    fs.writeFileSync(jsonPath, JSON.stringify(tree, null, 2));
    console.log(`JSON cache saved to: ${jsonPath}`);
    
    // Generate and save Mermaid diagram
    const mermaidDiagram = generateMermaidDiagram(tree);
    const mmPath = `${baseClass}.mm`;
    fs.writeFileSync(mmPath, mermaidDiagram);
    console.log(`Mermaid diagram saved to: ${mmPath}`);

    // Generate and save Force Graph data
    const forceGraphData = generateForceGraphData(tree);
    const forceGraphPath = `${baseClass}_nodes.json`;
    fs.writeFileSync(forceGraphPath, JSON.stringify(forceGraphData, null, 2));
    console.log(`Force Graph data saved to: ${forceGraphPath}`);

    // Generate and save CSV files
    const { links, metadata } = generateCSVFiles(forceGraphData);
    fs.writeFileSync(`${baseClass}_links.csv`, links);
    console.log(`Links CSV saved to: ${baseClass}_links.csv`);
    fs.writeFileSync(`${baseClass}_metadata.csv`, metadata);
    console.log(`Metadata CSV saved to: ${baseClass}_metadata.csv`);

    console.log('Analysis complete.');
}

// Usage
const rootDir = process.argv[2];
const baseClass = process.argv[3];

if (!rootDir || !baseClass) {
    console.error('Please provide root directory and base class name as arguments.');
    process.exit(1);
}

main(rootDir, baseClass);