'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
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
    <div ref={viewportRef} className={`relative h-full w-full ${liveThree ? 'bg-[#397c81] [--board-inset-top:5.75rem] [--board-inset-bottom:15rem] [--board-inset-left:0px] [--board-inset-right:0px] xl:[--board-inset-top:0px] xl:[--board-inset-bottom:10rem] xl:[--board-inset-right:22rem]' : ''} ${liveThree && props.gameState.gameMode === 'cities_and_knights' ? 'xl:[--board-inset-left:10.5rem]' : ''}`} data-board-presentation={mode}>
      {mode === 'three' ? (
        <div data-board-scene-viewport className="absolute min-h-0 min-w-0 overflow-hidden" style={liveThree ? { top: 'var(--board-inset-top)', right: 'var(--board-inset-right)', bottom: 'var(--board-inset-bottom)', left: 'var(--board-inset-left)' } : { inset: 0 }}>
        <PresentationBoundary fallback={<BoardCanvas {...props} />} onUnavailable={unavailable}>
          <BoardScene {...props} onUnavailable={unavailable} />
        </PresentationBoundary>
        </div>
      ) : <BoardCanvas {...props} />}
      {notice && <p role="status" className={`pointer-events-none absolute left-1/2 z-20 w-64 -translate-x-1/2 rounded-lg bg-[#252b27] p-3 text-xs text-[#f3e9cf] ${preview ? 'top-4' : 'top-16 xl:top-4'}`}>3D is unavailable on this device. Your game continues in compatibility mode.</p>}
    </div>
  );
}
