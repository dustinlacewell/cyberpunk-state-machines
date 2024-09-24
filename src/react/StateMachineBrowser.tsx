import * as machines from "../data"

const machineNames = Object.keys(machines);

console.log(machineNames)

import { useState } from "react";
import { ForceTree } from "./ForceTree";

export const StateMachineBrowser = () => {
    const [selectedMachine, setSelectedMachine] = useState<keyof typeof machines>(machineNames[21] as keyof typeof machines);

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        console.log(`Selected machine: ${event.target.value}`);
        setSelectedMachine(event.target.value as keyof typeof machines);
    };

    return (
        <div style={{
            width: "100vw",
            height: "100vh",
        }}>
            <div style={{
                // fixed top-left corner
                position: "fixed",
                top: 10,
                left: 10,
                zIndex: 1000,
                padding: "10px",
                backgroundColor: "yellow",
                border: "1px solid black",
                borderRadius: "5px",
                fontWeight: "bold",
            }}>
                <select style={{
                    background: "yellow",
                    color: "black",
                }} value={selectedMachine} onChange={handleChange}>
                    {machineNames.map((machine) => (
                        <option style={{fontWeight: "bold"}} key={machine} value={machine}>
                            {machine}
                        </option>
                    ))}
                </select>
            </div>
            <ForceTree machineName={selectedMachine} />
        </div>
    );
}