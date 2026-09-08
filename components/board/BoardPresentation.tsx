'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { Box, Layers } from 'lucide-react';
import { useBoardPresentation } from '@/lib/hooks/useBoardPresentation';
import { useBoardViewportInsets } from '@/lib/hooks/useBoardViewportInsets';
import type { BoardRendererProps } from '@/lib/types/board-renderer';
import { BoardCanvas } from './BoardCanvas';
import { PresentationBoundary } from './PresentationBoundary';

const BoardScene = dynamic(() => import('./three/BoardScene'), {
  ssr: false,
  loading: () => <div role="status" className="flex h-full items-center justify-center bg-[#214e59] text-[#f3e9cf]">Preparing your island…</div>,
});

export function BoardPresentation({ preview = false, ...props }: BoardRendererProps & { preview?: boolean }) {
  const preference = useBoardPresentation();
  const [previewMode, setPreviewMode] = useState<'classic' | 'three'>('three');
  const mode = preview ? previewMode : preference.mode;
  const setMode = preview ? setPreviewMode : preference.setMode;
  const liveThree = !preview && mode === 'three';
  const viewportRef = useBoardViewportInsets(liveThree);
  const [notice, setNotice] = useState(false);
  const unavailable = useCallback(() => {
    setNotice(true);
    setMode('classic');
  }, [setMode]);
  return (
    <div ref={viewportRef} className={`relative h-full w-full ${liveThree ? 'bg-[#397c81] [--board-inset-top:5.75rem] [--board-inset-bottom:15rem] [--board-inset-left:0px] [--board-inset-right:0px] xl:[--board-inset-top:0px] xl:[--board-inset-bottom:10rem] xl:[--board-inset-right:18rem]' : ''} ${liveThree && props.gameState.gameMode === 'cities_and_knights' ? 'xl:[--board-inset-left:10.5rem]' : ''}`} data-board-presentation={mode}>
      {mode === 'three' ? (
        <div data-board-scene-viewport className="absolute min-h-0 min-w-0 overflow-hidden" style={liveThree ? { top: 'var(--board-inset-top)', right: 'var(--board-inset-right)', bottom: 'var(--board-inset-bottom)', left: 'var(--board-inset-left)' } : { inset: 0 }}>
        <PresentationBoundary fallback={<BoardCanvas {...props} />} onUnavailable={unavailable}>
          <BoardScene {...props} onUnavailable={unavailable} />
        </PresentationBoundary>
        </div>
      ) : <BoardCanvas {...props} />}
      <div className={`pointer-events-auto absolute left-1/2 z-20 -translate-x-1/2 ${preview ? 'top-4' : 'top-16 xl:top-4'}`} style={liveThree ? { left: 'calc((100% + var(--board-inset-left) - var(--board-inset-right)) / 2)', top: 'calc(var(--board-inset-top) + 1rem)' } : undefined}>
        <div role="group" aria-label="Board appearance" className="flex w-max gap-1 whitespace-nowrap rounded-full border border-[#a98d55]/40 bg-[#252b27]/95 p-1 text-xs text-[#f3e9cf] shadow-lg backdrop-blur-md">
          {(['classic', 'three'] as const).map(value => (
            <button key={value} type="button" aria-pressed={mode === value}
              onClick={() => { setNotice(false); setMode(value); }}
              className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-full px-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0b963] ${mode === value ? 'bg-[#e6ce95] text-[#302919]' : 'hover:bg-white/10'}`}>
              {value === 'classic' ? <Layers size={14} /> : <Box size={14} />}
              {value === 'classic' ? 'Classic' : '3D Preview'}
            </button>
          ))}
        </div>
        {notice && <p role="status" className="mt-2 w-64 rounded-lg bg-[#252b27] p-3 text-xs text-[#f3e9cf]">3D is unavailable on this device. Your game continues in Classic.</p>}
      </div>
    </div>
  );
}
