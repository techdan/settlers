export type PortType =
    | "generic"
    | "wood"
    | "brick"
    | "sheep"
    | "wheat"
    | "ore";

export interface Port {
    id: string;
    type: PortType;
    position: { x: number; y: number }; // pixel coords
    angle: number; // direction toward board center (degrees)
    vertices?: { x: number; y: number }[]; // optional vertices for rendering connections
}
