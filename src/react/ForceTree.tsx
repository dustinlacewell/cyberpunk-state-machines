import { ForceGraph2D } from "react-force-graph";

import { useState, useEffect, useRef, useMemo, type FC } from "react";
import { useWindowSize } from "@react-hook/window-size";

import * as machines from "../data"

const randomRGB = () => {
    return `rgb(${Math.random() * 155}, ${Math.random() * 155}, ${Math.random() * 155})`
}

interface StateData {
    id: string
    name: string
    color: string
    x?: number
    y?: number
    vx?: number
    vy?: number
    neighbors?: StateData[]
    mutual?: StateData[]
    incoming?: StateData[]
    outgoing?: StateData[]
    links?: { source: string, target: string }[]
}

const eq = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

const generateGraph = (machineName: (keyof typeof machines)) => {
    const states = new Set<StateData>([]);
    const { initialState, transitions } = machines[machineName]

    const statesById = new Map<string, StateData>();

    for (const transition of transitions) {
        let hasFirst = false
        for (const state of states) {
            if (eq(state.id, transition.from)) {
                hasFirst = true;
                break;
            }
        }
        if (!hasFirst) {
            const node = {
                id: transition.from,
                name: transition.from,
                color: randomRGB(),
            }
            states.add(node);
            statesById.set(transition.from, node)
        }

        let hasSecond = false;
        for (const state of states) {
            if (eq(state.id, transition.to)) {
                hasSecond = true;
                break;
            }
        }
        if (!hasSecond) {
            const node = {
                id: transition.to,
                name: transition.to,
                color: randomRGB(),
            }
            states.add(node);
            statesById.set(transition.to, node)
        }
    }

    const links = transitions.map((transition: { from: string, to: string }) => {
        return {
            source: transition.from,
            target: transition.to,
            mutual: false,
        }
    })

    // calculate the set of links that havae a reverse link
    links.forEach(link => {
        links.forEach(otherLink => {
            if (eq(link.source, otherLink.target) && eq(link.target, otherLink.source)) {
                link.mutual = true;
                otherLink.mutual = true;
            }
        })
    });

    links.forEach(link => {
        const source = statesById.get(link.source)!;
        const target = statesById.get(link.target)!;

        !source.neighbors && (source.neighbors = []);
        !target.neighbors && (target.neighbors = []);
        !source.mutual && (source.mutual = []);
        !target.mutual && (target.mutual = []);
        !source.outgoing && (source.outgoing = []);
        !target.outgoing && (target.outgoing = []);
        !source.incoming && (source.incoming = []);
        !target.incoming && (target.incoming = []);

        source.neighbors.push(target);
        target.neighbors.push(source);

        if (link.mutual) {
            source.mutual.push(target)
        } else {
            source.outgoing.push(target)
        } 

        !target.mutual && (target.mutual = []);
        !target.incoming && (target.incoming = []);

        if (link.mutual) {
            target.mutual.push(source)
        } else {
            target.incoming.push(source)
        }

        !source.links && (source.links = []);
        !target.links && (target.links = []);
        source.links.push(link);
        target.links.push(link);
    });

    const data = {
        nodes: Array.from(states),
        links: links,
    }

    // Create a cache of every node and its distance to every other node
    const distanceCache: Record<string, Record<string, number>> = {};

    data.nodes.forEach(node => {
        distanceCache[node.id] = {};
        data.nodes.forEach(otherNode => {
            if (node.id === otherNode.id) {
                distanceCache[node.id][otherNode.id] = 0; // Distance to itself is 0
            } else {
                distanceCache[node.id][otherNode.id] = Infinity; // Initialize to Infinity
            }
        });
    });

    // Populate the distance cache using the links
    links.forEach(link => {
        distanceCache[link.source][link.target] = 1; // Direct connection
        distanceCache[link.target][link.source] = 1; // Bidirectional
    });

    // Use Floyd-Warshall algorithm to calculate the maximum number of jumps
    data.nodes.forEach(k => {
        data.nodes.forEach(i => {
            data.nodes.forEach(j => {
                if (distanceCache[i.id][j.id] > distanceCache[i.id][k.id] + distanceCache[k.id][j.id]) {
                    distanceCache[i.id][j.id] = distanceCache[i.id][k.id] + distanceCache[k.id][j.id];
                }
            });
        });
    });

    return { data, distanceCache, initialState };

}

export const ForceTree: FC<{ machineName: (keyof typeof machines) }> = ({ machineName }) => {
    const fgRef = useRef<any>();
    const [width, height] = useWindowSize()
    const [graphData, setGraphData] = useState<any>({ nodes: [], links: [] });
    const { data, distanceCache, initialState } = useMemo(() => generateGraph(machineName), [machineName, graphData]);
    const [highlightNodes, setHighlightNodes] = useState(new Set());
    const [highlightLinks, setHighlightLinks] = useState(new Set());
    const [hoverNode, setHoverNode] = useState(null);

    const updateHighlight = () => {
        setHighlightNodes(highlightNodes);
        setHighlightLinks(highlightLinks);
    };

    const handleNodeHover = (node: any) => {
        highlightNodes.clear();
        highlightLinks.clear();
        if (node) {
            highlightNodes.add(node);
            node.neighbors.forEach((neighbor: any) => highlightNodes.add(neighbor));
            node.links.forEach((link: any) => highlightLinks.add(link));
        }

        setHoverNode(node || null);
        updateHighlight();
    };

    const handleLinkHover = (link: any) => {
        highlightNodes.clear();
        highlightLinks.clear();

        if (link) {
            highlightLinks.add(link);
            highlightNodes.add(link.source);
            highlightNodes.add(link.target);
        }

        updateHighlight();
    };

    const handleEngineStop = () => {
        fgRef.current.zoomToFit(10, 10);
    };

    const linkDirectionalArrowLength = (link: any) =>
        highlightLinks.has(link)
            ? link.mutual
                ? 0
                : 30
            : 0;

    const linkDirectionalParticleColor = (link: any) =>
        highlightLinks.has(link) 
            ? link.mutual
                ? 'slategrey'
                : (hoverNode && link.source === hoverNode ? 'yellow' : 'magenta') 
            : 'rgba(255,255,255,0.2)'

    const linkWidth = 1 //(link: any) => highlightLinks.has(link) ? (hoverNode && link.source === (hoverNode as any).id ? 1 : 10) : 1;

    const linkDirectionalParticleWidth = (link: any) => {
        return highlightLinks.size === 0 || highlightLinks.has(link) ? 10 : 0;
    };

    const linkColor = (link: any) =>
        highlightLinks.has(link)
            ? link.mutual
                ? 'skyblue'
                : (hoverNode && link.source === hoverNode ? 'yellow' : 'magenta')
            : 'rgba(255,255,255,0.2)'


    const nodeCanvasObject = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.id;
        const fontSize = 10;
        ctx.font = `${fontSize}px Sans-Serif`;
        const textWidth = ctx.measureText(label).width;
        const [twidth, fsize] = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding
        const hasHighlight = highlightNodes.size > 0;
        const isHighlight = highlightNodes.has(node)
        let padding = isHighlight ? 15 : 5;
        ctx.fillStyle = !hasHighlight || isHighlight ? node.color : 'gray';
        ctx.beginPath()
        ctx.roundRect(node.x - twidth / 2 - padding, node.y - fsize / 2 - padding, twidth + padding * 2, fsize + padding * 2, 5);
        ctx.fill();

        // if the node is in highlightedNodes, draw a ring around it
        if (isHighlight) {
            if (hoverNode) {
                if ((hoverNode as any).id === node.id) {
                    ctx.strokeStyle = 'yellow';
                } else {
                    if (node.mutual.find((n: any) => n.id === (hoverNode as any).id)) {
                        ctx.strokeStyle = 'skyblue';
                    } else if (node.outgoing.find((n: any) => n.id === (hoverNode as any).id)) {
                        ctx.strokeStyle = 'magenta';
                    } else {
                        ctx.strokeStyle = 'yellow';
                    }
                }
            } else {
                ctx.strokeStyle = 'white';
            }
            ctx.lineWidth = 3;
        } else { // normal white outline
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
        }
        ctx.beginPath();
        ctx.roundRect(node.x - twidth / 2 - padding, node.y - fsize / 2 - padding, twidth + padding * 2, fsize + padding * 2, 5);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.fillText(label, node.x, node.y);

        node.__bckgDimensions = [twidth, fsize]; // to re-use in nodePointerAreaPaint
    };

    useEffect(() => {
        const fg = fgRef.current;
        // clear out the default forces:
        fg.d3Force('link', null);
        fg.d3Force('charge', null);
        fg.d3Force('collide', null);

        fg.d3Force('custom', (alpha: any) => {
            const k = alpha * 0.25;
            const centerNodeId = initialState;
            const centerX = width / 2;
            const centerY = height / 2;
            const radiusIncrement = 180; // Distance between circles
            const nodePositions: { [key: string]: { x: number, y: number } } = {};

            // Set the position of the center node
            nodePositions[centerNodeId] = {
                x: centerX,
                y: centerY
            };

            // Function to calculate positions based on hops
            const calculateNodePositions = (nodeId: string, hops: number) => {
                const angleStep = (2 * Math.PI) / (data.nodes.filter(n => distanceCache[centerNodeId][n.id] === hops).length || 1);
                let angle = 0;

                data.nodes.forEach(node => {
                    if (distanceCache[centerNodeId][node.id] === hops) {
                        nodePositions[node.id] = {
                            x: centerX + Math.cos(angle) * (hops * radiusIncrement),
                            y: centerY + Math.sin(angle) * (hops * radiusIncrement)
                        };
                        angle += angleStep;
                    }
                });
            };

            // Calculate positions for each hop level
            for (let hops = 1; hops <= Math.max(...data.nodes.map(n => distanceCache[centerNodeId][n.id])); hops++) {
                calculateNodePositions(centerNodeId, hops);
            }

            // Update node velocities based on calculated positions
            data.nodes.forEach((node: StateData) => {
                if (nodePositions[node.id]) {
                    const targetX = nodePositions[node.id].x;
                    const targetY = nodePositions[node.id].y;
                    const dx = targetX - node.x!;
                    const dy = targetY - node.y!;
                    node.vx! += dx * k;
                    node.vy! += dy * k;
                }
            });

        });
        setGraphData(data);
    }, [machineName]);

    useEffect(() => {
        const interval = setInterval(() => {
            data.links.forEach(link => {
                if (highlightLinks.has(link)) {
                    fgRef.current.emitParticle(link)
                }
            })

            return () => clearInterval(interval)
        }, 1000)
    })

    return <ForceGraph2D
        width={width}
        height={height}
        ref={fgRef}
        graphData={graphData}
        // minZoom={0.000001}
        backgroundColor="#131017"
        nodeId="id"
        nodeLabel="name"
        nodeRelSize={40}
        linkDirectionalParticles={0}
        cooldownTicks={10}
        onEngineStop={handleEngineStop}
        linkDirectionalArrowRelPos={0.6}
        linkDirectionalArrowLength={linkDirectionalArrowLength}
        linkDirectionalParticleColor={linkDirectionalParticleColor}
        linkWidth={linkWidth}
        linkDirectionalParticleWidth={linkDirectionalParticleWidth}
        onNodeHover={handleNodeHover}
        onLinkHover={handleLinkHover}
        linkColor={linkColor}
        nodeCanvasObject={nodeCanvasObject}
    />;
}