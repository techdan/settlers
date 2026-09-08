import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace, type Texture } from 'three';
import type { EventDieFace } from '@/core/rules/commodity-constants';
import { DIE_FACES, EVENT_FACES } from './dice-topology';

const PIPS: Record<number, readonly (readonly [number, number])[]> = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

function texture(draw: (context: CanvasRenderingContext2D) => void): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The dice tray could not create its materials.');
    draw(context);
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    result.anisotropy = 2;
    return result;
}

function background(context: CanvasRenderingContext2D, color: string) {
    context.fillStyle = color;
    context.fillRect(0, 0, 256, 256);
    const glaze = context.createLinearGradient(0, 0, 256, 256);
    glaze.addColorStop(0, '#ffffff16');
    glaze.addColorStop(0.5, '#ffffff00');
    glaze.addColorStop(1, '#0000000c');
    context.fillStyle = glaze;
    context.fillRect(0, 0, 256, 256);
}

function productionFace(body: string, pip: string, value: number): CanvasTexture {
    return texture(context => {
        background(context, body);
        for (const [x, y] of PIPS[value]) {
            const px = 128 + x * 51;
            const py = 128 + y * 51;
            // The small bevel around each inset pip remains legible at HUD size.
            context.beginPath();
            context.arc(px, py + 1.5, 19, 0, Math.PI * 2);
            context.fillStyle = '#ffffff4f';
            context.fill();
            context.beginPath();
            context.arc(px, py - 1, 17.5, 0, Math.PI * 2);
            context.fillStyle = '#00000055';
            context.fill();
            context.beginPath();
            context.arc(px + 0.5, py + 1, 15, 0, Math.PI * 2);
            context.fillStyle = pip;
            context.fill();
        }
    });
}

function eventFace(face: EventDieFace): CanvasTexture {
    return texture(context => {
        background(context, '#efe4c9');
        context.lineJoin = 'round';
        context.lineCap = 'round';
        if (face === 'ship') {
            context.fillStyle = '#283c40';
            context.beginPath();
            context.moveTo(46, 145);
            context.quadraticCurveTo(128, 202, 210, 140);
            context.lineTo(184, 181);
            context.quadraticCurveTo(128, 204, 73, 181);
            context.closePath();
            context.fill();
            context.fillRect(121, 53, 10, 104);
            context.fillStyle = '#a33127';
            context.fillRect(75, 62, 96, 65);
            context.fillStyle = '#f3e4bd';
            context.fillRect(75, 76, 96, 11);
            context.fillRect(75, 103, 96, 11);
            context.strokeStyle = '#c6a15d';
            context.lineWidth = 6;
            context.beginPath();
            context.moveTo(60, 207);
            context.quadraticCurveTo(80, 197, 100, 207);
            context.quadraticCurveTo(120, 217, 140, 207);
            context.quadraticCurveTo(160, 197, 186, 207);
            context.stroke();
            return;
        }

        const color = { science: '#32724b', trade: '#bd8a27', politics: '#315985' }[face];
        context.fillStyle = color;
        context.beginPath();
        context.roundRect(46, 42, 164, 172, 23);
        context.fill();
        context.strokeStyle = '#efe4c9';
        context.lineWidth = 4;
        context.beginPath();
        context.roundRect(56, 52, 144, 152, 17);
        context.stroke();
        context.fillStyle = '#efe4c9';
        if (face === 'science') {
            // Open book, matching the existing improvement glyph's language.
            context.beginPath();
            context.moveTo(126, 100);
            context.quadraticCurveTo(98, 81, 70, 90);
            context.lineTo(70, 163);
            context.quadraticCurveTo(97, 154, 126, 172);
            context.lineTo(126, 100);
            context.moveTo(134, 100);
            context.quadraticCurveTo(159, 81, 187, 90);
            context.lineTo(187, 163);
            context.quadraticCurveTo(159, 154, 134, 172);
            context.closePath();
            context.fill();
        } else if (face === 'trade') {
            // Balanced scales: the established trade symbol.
            context.lineWidth = 10;
            context.beginPath();
            context.moveTo(128, 80);
            context.lineTo(128, 175);
            context.moveTo(82, 100);
            context.lineTo(176, 100);
            context.moveTo(106, 177);
            context.lineTo(150, 177);
            context.stroke();
            for (const x of [86, 170]) {
                context.lineWidth = 4;
                context.beginPath();
                context.moveTo(x, 102);
                context.lineTo(x - 20, 143);
                context.lineTo(x + 20, 143);
                context.closePath();
                context.stroke();
                context.beginPath();
                context.arc(x, 142, 20, 0, Math.PI);
                context.fill();
            }
        } else {
            // Crenellated city gate.
            context.beginPath();
            context.moveTo(77, 181);
            context.lineTo(77, 81);
            context.lineTo(95, 81);
            context.lineTo(95, 99);
            context.lineTo(117, 99);
            context.lineTo(117, 81);
            context.lineTo(140, 81);
            context.lineTo(140, 99);
            context.lineTo(162, 99);
            context.lineTo(162, 81);
            context.lineTo(180, 81);
            context.lineTo(180, 181);
            context.closePath();
            context.fill();
            context.fillStyle = color;
            context.beginPath();
            context.roundRect(112, 132, 33, 58, [17, 17, 0, 0]);
            context.fill();
        }
    });
}

export function createDiceMaterials() {
    const maps: Texture[] = [];
    const materials: MeshStandardMaterial[] = [];
    const material = (map: Texture) => {
        maps.push(map);
        const result = new MeshStandardMaterial({ map, roughness: 0.36, metalness: 0.015 });
        materials.push(result);
        return result;
    };
    const production = (body: string, pip: string) => DIE_FACES.map(value => material(productionFace(body, pip, value)));
    const red = production('#b63e32', '#fff0d3');
    const ivory = production('#f1e4c7', '#302d27');
    const yellow = production('#deb54d', '#362d22');
    const eventMap = new Map<EventDieFace, MeshStandardMaterial>();
    const event = EVENT_FACES.map(face => {
        const existing = eventMap.get(face);
        if (existing) return existing;
        const created = material(eventFace(face));
        eventMap.set(face, created);
        return created;
    });
    const blank = material(texture(context => background(context, '#c4b69a')));
    const wood = material(texture(context => {
        background(context, '#895b35');
        for (let i = 0; i < 64; i++) {
            context.strokeStyle = i % 3 === 0 ? '#402b203a' : '#d8a66630';
            context.lineWidth = 0.5 + (i % 4) * 0.5;
            context.beginPath();
            for (let x = 0; x <= 256; x += 8) {
                const y = i * 4 + Math.sin(x / 57 + i / 3) * 2.5 + Math.sin(x / 31 + i) * 0.8;
                if (x === 0) context.moveTo(x, y);
                else context.lineTo(x, y);
            }
            context.stroke();
        }
    }));
    wood.roughness = 0.66;
    const felt = material(texture(context => {
        background(context, '#254946');
        for (let y = 0; y < 256; y += 4) {
            for (let x = 0; x < 256; x += 4) {
                context.fillStyle = (x + y) % 8 === 0 ? '#ffffff09' : '#00000013';
                context.fillRect(x, y, 1, 2);
            }
        }
        context.strokeStyle = '#c6af752f';
        context.lineWidth = 1.5;
        context.setLineDash([3, 4]);
        context.strokeRect(10, 10, 236, 236);
    }));
    felt.roughness = 1;
    return {
        red, ivory, yellow, event, blank, wood, felt,
        dispose() {
            materials.forEach(item => item.dispose());
            maps.forEach(item => item.dispose());
        },
    };
}
