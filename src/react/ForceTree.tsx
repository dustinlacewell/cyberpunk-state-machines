import { ForceGraph2D } from "react-force-graph";

import { useState, useEffect, useRef, useMemo, type FC } from "react";
import { useWindowSize } from "@react-hook/window-size";

import * as machines from "../data"
import { useStore } from "./store";
import { generateGraph, type Link, type State, type Graph, type StateData, type Machine } from "./graph";

export const ForceTree: FC<{ machineName: (keyof typeof machines) }> = ({ machineName }) => {
    const fgRef = useRef<any>();
    const [width, height] = useWindowSize()
    const [graphData, setGraphData] = useState<Graph>({ nodes: [], links: [] });
    const { data, distanceCache, initialState } = useMemo<Machine>(() => generateGraph(machineName) as any, [machineName]);
    const [highlightNodes, setHighlightNodes] = useState<Set<State>>(new Set());
    const [highlightLinks, setHighlightLinks] = useState<Set<Link>>(new Set());
    const { hoverNode, setHoverNode, selectedNode, setSelectedNode } = useStore();

    const targetNode = hoverNode || selectedNode;

    const updateHighlight = () => {
        setHighlightNodes(new Set(highlightNodes));
        setHighlightLinks(new Set(highlightLinks));
    };

    const highlightTargetNode = (node: State) => {
        highlightNodes.clear();
        highlightLinks.clear();
        highlightNodes.add(node);
        node.getNeighbors().forEach((neighbor) => {
            highlightNodes.add(neighbor);
        });
        node.getAllLinks().forEach((link) => {
            highlightLinks.add(link);
            if (link.mutual) {
                const mutualLink = data.links.find(l => (l.source.id === link.target.id && l.target.id === link.source.id));
                if (mutualLink) highlightLinks.add(mutualLink);
            }
        });
    }

    const handleNodeHover = (node: State | null) => {

        if (node) {
            setHoverNode(node.id);
            highlightTargetNode(node);
        } else {
            setHoverNode('');
            if (selectedNode) {
                highlightTargetNode(data.nodes.find(n => n.id === selectedNode)!);
            } else {
                highlightNodes.clear();
                highlightLinks.clear();
            }
        }
        updateHighlight();
    };

    const handleNodeClick = (node: State | null) => {
        if (node) {
            if (selectedNode === node.id) {
                setSelectedNode('');
                highlightNodes.clear();
                highlightLinks.clear();
            } else {
                setSelectedNode(node.id);
                highlightTargetNode(node);
            }
        }

        updateHighlight();
    };

    useEffect(() => {
        if (targetNode) {
            const node = data.nodes.find((node: any) => node.id === targetNode);

            if (node !== undefined) {
                highlightTargetNode(node);
                return
            }
        }

        highlightNodes.clear();
        highlightLinks.clear();

    }, [targetNode])

    const handleEngineStop = () => {
        fgRef.current.zoomToFit(10, 10);
    };

    const linkDirectionalArrowLength = (link: any) =>
        link.mutual
            ? 0
            : highlightLinks.has(link)
                ? (link.source.id === link.target.id ? 0 : 30) // Adjusted to check for self-links
                : 0;

    const linkDirectionalParticleColor = (link: any) => {
        if (highlightLinks.has(link)) {
            if (link.mutual) {
                return 'skyblue'; // Mutual links
            } else if (link.source.id === targetNode) {
                return 'yellow'; // Outgoing links from hover node
            } else if (link.target.id === targetNode) {
                return 'magenta'; // Incoming links to hover node
            }
        }
        return 'rgba(255,255,255,0.2)';
    }

    const linkWidth = 1;

    const linkDirectionalParticleWidth = (link: any) => {
        return highlightLinks.size === 0 || highlightLinks.has(link) ? 4 : 0;
    };

    const linkColor = (link: any) => {
        if (highlightLinks.has(link)) {
            if (link.mutual) {
                return 'skyblue'; // Mutual links
            } else if (link.source.id === targetNode) {
                return 'yellow'; // Outgoing links from hover node
            } else if (link.target.id === targetNode) {
                return 'magenta'; // Incoming links to hover node
            }
        }
        return 'rgba(255,255,255,0.2)';
    }

    const nodeCanvasObject = (node: State, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.id;
        const fontSize = 10;
        ctx.font = `${fontSize}px Sans-Serif`;
        const [twidth, fsize, padding] = calculateTextDimensions(ctx, label, fontSize, node);
        const isHighlight = highlightNodes.has(node);
        const fillColor = isHighlight ? node.color : (highlightNodes.size > 0 ? 'gray' : node.color);

        drawNodeBackground(ctx, node, twidth, fsize, padding, fillColor);
        drawNodeOutline(ctx, node, isHighlight, twidth, fsize, padding);
        drawNodeLabel(ctx, label, node);

        (node as any).__bckgDimensions = [twidth, fsize]; // to re-use in nodePointerAreaPaint
    };

    const calculateTextDimensions = (ctx: CanvasRenderingContext2D, label: string, fontSize: number, node: State) => {
        const textWidth = ctx.measureText(label).width;
        const padding = highlightNodes.has(node) ? 15 : 5;
        return [textWidth, fontSize, padding];
    };

    const drawNodeBackground = (ctx: CanvasRenderingContext2D, node: State, twidth: number, fsize: number, padding: number, fillColor: string) => {
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.roundRect(node.x - twidth / 2 - padding, node.y - fsize / 2 - padding, twidth + padding * 2, fsize + padding * 2, 5);
        ctx.fill();
    };

    const drawNodeOutline = (ctx: CanvasRenderingContext2D, node: State, isHighlight: boolean, twidth: number, fsize: number, padding: number) => {
        ctx.strokeStyle = isHighlight ? getHighlightStrokeColor(node) : 'white';
        ctx.lineWidth = isHighlight ? 3 : 1;
        ctx.beginPath();
        ctx.roundRect(node.x - twidth / 2 - padding, node.y - fsize / 2 - padding, twidth + padding * 2, fsize + padding * 2, 5);
        ctx.stroke();
    };

    const getHighlightStrokeColor = (node: State) => {
        if (targetNode) {
            if (node.id === targetNode) {
                return 'yellow';
            } else if (node.getAllLinks().some(l => l.mutual && (l.source.id === targetNode || l.target.id === targetNode))) {
                return 'skyblue'; // Mutual links
            } else if (node.getAllLinks().some(l => l.target.id === targetNode)) {
                return 'magenta'; // Incoming links
            } else if (node.getAllLinks().some(l => l.source.id === targetNode)) {
                return 'yellow'; // Outgoing links
            }
        }
        return 'white'; // Other highlighted nodes
    };

    const drawNodeLabel = (ctx: CanvasRenderingContext2D, label: string, node: State) => {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.fillText(label, node.x!, node.y!);
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
                const angleStep = (2 * Math.PI) / (data.nodes.filter(n => distanceCache!.getDistance(centerNodeId, n.id) === hops).length || 1);
                let angle = 0;

                data.nodes.forEach(node => {
                    if (distanceCache!.getDistance(centerNodeId, node.id) === hops) {
                        nodePositions[node.id] = {
                            x: centerX + Math.cos(angle) * (hops * radiusIncrement),
                            y: centerY + Math.sin(angle) * (hops * radiusIncrement)
                        };
                        angle += angleStep;
                    }
                });
            };

            // Calculate positions for each hop level
            for (let hops = 1; hops <= Math.max(...data.nodes.map(n => distanceCache!.getDistance(centerNodeId, n.id))); hops++) {
                calculateNodePositions(centerNodeId, hops);
            }

            // Update node velocities based on calculated positions
            data.nodes.forEach((node) => {
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
        let interval: NodeJS.Timeout | null = null;

        if (highlightLinks.size > 0) {
            highlightLinks.forEach(link => {
                fgRef.current.emitParticle(link);
            });
            interval = setInterval(() => {
                highlightLinks.forEach(link => {
                    fgRef.current.emitParticle(link);
                });
            }, 1000);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [highlightLinks]);

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
        onNodeClick={handleNodeClick}
        // onLinkHover={handleLinkHover}
        linkColor={linkColor}
        enableNodeDrag={false}
        nodeCanvasObject={nodeCanvasObject}
    />;
}