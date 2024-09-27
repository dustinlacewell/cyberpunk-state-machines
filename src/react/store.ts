import { create } from 'zustand';
import * as machines from "../data"
import type { MachineData, GraphData, LinkData, StateData } from './graph';

type State = {
  selectedMachine: keyof typeof machines
  setSelectedMachine: (machine: keyof typeof machines) => void;

  selectedNode: string;
  setSelectedNode: (node: string) => void;

  hoverNode: string;
  setHoverNode: (node: string) => void;

  graphData: GraphData
  setGraphData: (data: GraphData) => void

  highlightNodes: Set<StateData>
  setHighlightNodes: (nodes: Set<StateData>) => void

  highlightLinks: Set<LinkData>
  setHighlightLinks: (links: Set<LinkData>) => void
};

export const useStore = create<State>((set) => ({
  selectedMachine: 'Melee',
  setSelectedMachine: (machine) => set({ selectedMachine: machine }),
  selectedNode: '',
  setSelectedNode: (node) => set({ selectedNode: node }),
  hoverNode: '',
  setHoverNode: (node) => set({ hoverNode: node }),
  graphData: { nodes: [], links: [] },
  setGraphData: (data) => set({ graphData: data }),
  highlightNodes: new Set(),
  setHighlightNodes: (nodes) => set({ highlightNodes: nodes }),
  highlightLinks: new Set(),
  setHighlightLinks: (links) => set({ highlightLinks: links }),
}));