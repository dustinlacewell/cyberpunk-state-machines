import * as machines from "../data"

const machineNames = Object.keys(machines);

console.log(machineNames)

import { useMemo, useState } from "react";
import { ForceTree } from "./ForceTree";
import { useStore } from "./store";
import { Inspector } from "./Inspector";

export const StateMachineBrowser = () => {
    const {
        hoverNode, setHoverNode,
        selectedMachine, setSelectedMachine
    } = useStore();

    const states = useMemo(() => {
        const states = new Set<string>();
        machines[selectedMachine].transitions.forEach(({from, to}) => {
            states.add(from);
            states.add(to);
        });
        return Array.from(states).sort();
    }, [selectedMachine])

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        console.log(`Selected machine: ${event.target.value}`);
        setSelectedMachine(event.target.value as keyof typeof machines);
    };

    return (
        <div className="w-screen h-screen">
            <div className="fixed flex flex-col gap-2 top-2 left-2 z-50 p-2 bg-yellow-300 border border-black rounded-md font-bold">
                <h1>State Machine:</h1>
                <select className="bg-yellow-300 p-2 rounded-lg text-black border border-black" value={selectedMachine} onChange={handleChange}>
                    {machineNames.map((machine) => (
                        <option className="font-bold" key={machine} value={machine}>
                            {machine}
                        </option>
                    ))}
                </select>
                <h1>States:</h1>
                <div className="flex flex-col gap-2 p-3 rounded-md bg-[#231438] overflow-y-auto max-h-[50vh]">
                    {states.map((state: string) => (
                        <div 
                            onMouseEnter={() => setHoverNode(state)} 
                            onMouseLeave={() => setHoverNode('')}
                            className={`cursor-pointer hover:text-[magenta] font-normal text-[white] ${state === hoverNode ? 'text-[magenta]' : ''}`} key={state}>{state}</div>
                    ))}
                </div>
            </div>
            <ForceTree machineName={selectedMachine} />
            <Inspector />
        </div>
    );
}