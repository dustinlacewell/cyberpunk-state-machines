import * as machines from "../data"

const eq = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

const randomRGB = () => {
    return `rgb(${Math.random() * 155}, ${Math.random() * 155}, ${Math.random() * 155})`
}

export interface LinkData {
    source: string
    target: string
    mutual?: LinkData
}

export class StateData {
    id: string;
    name: string;
    color: string;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    incomingLinks: LinkData[];
    outgoingLinks: LinkData[];
    mutualLinks: LinkData[];

    constructor(id: string) {
        this.id = id;
        this.name = id;
        this.color = randomRGB();
        this.incomingLinks = [];
        this.outgoingLinks = [];
        this.mutualLinks = [];
    }

    addIncomingLink(link: LinkData) {
        this.incomingLinks.push(link);
    }

    addOutgoingLink(link: LinkData) {
        this.outgoingLinks.push(link);
    }

    addMutualLink(link: LinkData) {
        this.mutualLinks.push(link);
    }

    getAllLinks(): LinkData[] {
        return [...this.incomingLinks, ...this.outgoingLinks, ...this.mutualLinks];
    }

    getNeighbors(): State[] {
        const neighbors = new Set<State>();
        (this.getAllLinks() as unknown as Link[]).forEach(link => {
            neighbors.add(
                link.source.id === this.id
                    ? link.target
                    : link.source
            );
        });
        return Array.from(neighbors);
    }

    isConnectedTo(nodeId: string): boolean {
        return this.getNeighbors().some(node => node.id === nodeId);
    }

    getLinkTo(nodeId: string): Link | undefined {
        return (this.getAllLinks() as unknown as Link[]).find(link =>
            (link.source.id === this.id && link.target.id === nodeId) ||
            (link.target.id === this.id && link.source.id === nodeId)
        );
    }

    getDegree(): number {
        return this.incomingLinks.length + this.outgoingLinks.length + this.mutualLinks.length;
    }

    isIsolated(): boolean {
        return this.getDegree() === 0;
    }
}

export interface State {
    id: string
    name: string
    color: string
    x: number;
    y: number;
    vx: number;
    vy: number;
    incomingLinks: Link[]
    outgoingLinks: Link[]
    mutualLinks: Link[]

    getAllLinks(): Link[]
    getNeighbors(): State[]
    isConnectedTo(nodeId: string): boolean
    getLinkTo(nodeId: string): Link | undefined
    getDegree(): number
    isIsolated(): boolean
}

export interface Link {
    source: State
    target: State
    mutual?: Link
}

export interface GraphData {
    nodes: StateData[],
    links: LinkData[]
}

export interface Graph {
    nodes: State[]
    links: Link[]
}

export interface MachineData {
    data: GraphData
    distanceCache: DistanceCache | null
    initialState: string
}

export interface Machine {
    data: Graph
    distanceCache: DistanceCache | null
    initialState: string
}


class DistanceCache {
    private cache: Record<string, Record<string, number>> = {};

    constructor(nodes: StateData[], links: LinkData[]) {
        this.initializeCache(nodes);
        this.populateCache(links);
        this.calculateDistances(nodes);
    }

    private initializeCache(nodes: StateData[]) {
        nodes.forEach(node => {
            this.cache[node.id] = {};
            nodes.forEach(otherNode => {
                this.cache[node.id][otherNode.id] = (node.id === otherNode.id) ? 0 : Infinity;
            });
        });
    }

    private populateCache(links: LinkData[]) {
        links.forEach(link => {
            this.cache[link.source][link.target] = 1; // Direct connection
            this.cache[link.target][link.source] = 1; // Bidirectional
        });
    }

    private calculateDistances(nodes: StateData[]) {
        nodes.forEach(k => {
            nodes.forEach(i => {
                nodes.forEach(j => {
                    if (this.cache[i.id][j.id] > this.cache[i.id][k.id] + this.cache[k.id][j.id]) {
                        this.cache[i.id][j.id] = this.cache[i.id][k.id] + this.cache[k.id][j.id];
                    }
                });
            });
        });
    }

    public getDistance(nodeA: string, nodeB: string): number {
        return this.cache[nodeA]?.[nodeB] ?? Infinity;
    }

    public hasPath(nodeA: string, nodeB: string): boolean {
        return this.getDistance(nodeA, nodeB) < Infinity;
    }

    public getAllDistances(node: string): Record<string, number> {
        return this.cache[node] || {};
    }
}

export const generateGraph = (machineName: (keyof typeof machines)): MachineData => {
    const statesById = new Map<string, StateData>();
    const { initialState, transitions } = machines[machineName];

    // Create StateData objects
    for (const { from, to } of transitions) {
        if (!statesById.has(from)) {
            statesById.set(from, new StateData(from));
        }
        if (!statesById.has(to)) {
            statesById.set(to, new StateData(to));
        }
    }

    const links: LinkData[] = transitions.map(({ from, to }) => {
        const link: LinkData = { source: from, target: to };
        const fromNode = statesById.get(from)!;
        const toNode = statesById.get(to)!;

        fromNode.addOutgoingLink(link);
        toNode.addIncomingLink(link);

        return link;
    });

    // Set up mutual links
    for (const link of links) {
        if (link.mutual !== undefined) continue; // Skip if already processed as a mutual link

        const reverseLink = links.find(l => l.source === link.target && l.target === link.source);

        if (reverseLink) {
            link.mutual = reverseLink;
            reverseLink.mutual = link;

            const fromNode = statesById.get(link.source)!;
            const toNode = statesById.get(link.target)!;

            fromNode.addMutualLink(link);
            toNode.addMutualLink(reverseLink);

            console.log(`Mutual link between ${link.source} and ${link.target}`);

            // Remove from incoming/outgoing as they're now mutual
            fromNode.outgoingLinks = fromNode.outgoingLinks.filter(l => l !== link);
            toNode.incomingLinks = toNode.incomingLinks.filter(l => l !== link);
            toNode.outgoingLinks = toNode.outgoingLinks.filter(l => l !== reverseLink);
            fromNode.incomingLinks = fromNode.incomingLinks.filter(l => l !== reverseLink);
        }
    }

    const data: GraphData = {
        nodes: Array.from(statesById.values()),
        links: links,
    };

    const distanceCache = new DistanceCache(data.nodes, data.links);

    return { data, distanceCache, initialState };
};