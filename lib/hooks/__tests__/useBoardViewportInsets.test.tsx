import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { calculateBoardViewportInsets, useBoardViewportInsets, type ViewportRect } from '../useBoardViewportInsets';

const rect = (left: number, top: number, width: number, height: number): ViewportRect => ({ left, top, width, height, right: left + width, bottom: top + height });

afterEach(() => vi.restoreAllMocks());

describe('live 3D viewport reservations', () => {
  it('reserves rendered, scaled HUD bounds relative to an offset board viewport', () => {
    const result = calculateBoardViewportInsets(rect(20, 50, 1366, 768), {
      rail: rect(1108.8, 66, 261.2, 500),
      tray: rect(45, 640, 1310, 160),
      leftPanels: [rect(36, 118, 153.9, 96)],
    });
    expect(result).toEqual({ top: 0, right: 286, bottom: 186, left: 178 });
  });

  it('reserves the tablet header and tray while ignoring hidden desktop panels', () => {
    const result = calculateBoardViewportInsets(rect(0, 0, 768, 1024), {
      rail: rect(0, 0, 0, 0), leftPanels: [rect(0, 0, 0, 0)],
      headers: [rect(8, 8, 752, 76)], tray: rect(8, 720, 752, 292),
    });
    expect(result).toEqual({ top: 92, right: 0, bottom: 312, left: 0 });
  });

  it('ignores panels outside the board and clips reservations to its dimensions', () => {
    expect(calculateBoardViewportInsets(rect(0, 0, 600, 400), {
      rail: rect(700, 0, 300, 400), tray: rect(0, 500, 600, 200),
    })).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(calculateBoardViewportInsets(rect(0, 0, 600, 400), {
      tray: rect(0, -100, 600, 600),
    }).bottom).toBe(400);
  });

  it('does not schedule viewport measurement for preview or Classic', () => {
    const schedule = vi.spyOn(window, 'requestAnimationFrame');
    function DisabledMeasurement() {
      const viewportRef = useBoardViewportInsets(false);
      return <div ref={viewportRef} />;
    }
    render(<DisabledMeasurement />);
    expect(schedule).not.toHaveBeenCalled();
  });
});
