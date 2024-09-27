import { useStore } from "./store";
import { useMemo } from "react";
import * as values from "../data/values.json";

const BooleanProperty = ({ name, value }: { name: string; value: boolean }) => (
    <div className="flex items-center mb-2">
        <input type="checkbox" checked={value} readOnly className="mr-2 cursor-not-allowed" />
        <span className="font-medium">{name}</span>
    </div>
);

const NumberProperty = ({ name, value }: { name: string; value: number }) => (
    <div className="mb-2">
        <span className="font-medium">{name}: </span>
        <input type="number" value={value.toFixed(2)} readOnly disabled className="bg-gray-700 rounded px-2" />
    </div>
);

const StringProperty = ({ name, value }: { name: string; value: string }) => (
    <div className="mb-2">
        <span className="font-medium">{name}: </span>
        <input type="text" value={value} readOnly disabled className="bg-gray-700 rounded px-2 w-full" />
    </div>
);

const ArrayProperty = ({ name, value }: { name: string; value: any[] }) => (
    <div className="mb-2">
        <span className="font-medium">{name}:</span>
        <div className="ml-4">
            {value.map((item, index) => (
                <div key={index} className="mb-1">
                    <PropertyRenderer name={`${name}[${index}]`} value={item} />
                </div>
            ))}
        </div>
    </div>
);

const ObjectProperty = ({ name, value }: { name: string; value: object }) => (
    <div className="mb-2">
        <span className="font-medium">{name}:</span>
        <pre className="bg-gray-700 rounded p-2 mt-1 overflow-x-auto">
            {JSON.stringify(value, null, 2)}
        </pre>
    </div>
);

const UnknownProperty = ({ name }: { name: string }) => (
    <div className="mb-2">
        <span className="font-medium">{name}: </span>
        <span>Unknown type</span>
    </div>
);

const PropertyRenderer = ({ name, value }: { name: string; value: any }) => {
    if (typeof value === "boolean") return <BooleanProperty name={name} value={value} />;
    if (typeof value === "number") return <NumberProperty name={name} value={value} />;
    if (typeof value === "string") return <StringProperty name={name} value={value} />;
    if (Array.isArray(value)) return <ArrayProperty name={name} value={value} />;
    if (typeof value === "object") return <ObjectProperty name={name} value={value} />;
    return <UnknownProperty name={name} />;
};

const PropertiesList = ({ properties }: { properties: Record<string, any> }) => (
    <>
        {Object.entries(properties).map(([key, value]) => (
            <PropertyRenderer key={key} name={key} value={value} />
        ))}
    </>
);

export const Inspector = () => {
    let { selectedMachine, hoverNode, selectedNode } = useStore();

    const targetNode = hoverNode || selectedNode;

    const properties = useMemo(() => {
        if (!targetNode) return null;
        if (selectedMachine === "ScenesFastForward") {
            selectedMachine = "ScenesFoastFoward" as any
        }
        return (values as any)[selectedMachine]?.[targetNode] || null;
    }, [selectedMachine, targetNode]);

    return (
        <div className="fixed right-0 top-0 w-80 h-screen bg-gray-800 text-white p-4 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Inspector</h2>
            {properties ? (
                <>
                    <h3 className="text-lg font-semibold mb-2">{targetNode}</h3>
                    <PropertiesList properties={properties} />
                </>
            ) : (
                <p>No properties to display</p>
            )}
        </div>
    );
};
