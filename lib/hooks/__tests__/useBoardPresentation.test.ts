import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useBoardPresentation } from '../useBoardPresentation';

afterEach(() => { cleanup(); localStorage.clear(); });

describe('primary board presentation', () => {
    it.each([null, 'classic', 'three'])('starts in 3D with legacy preference %s', saved => {
        if (saved) localStorage.setItem('settlers.board-presentation.v1', saved);
        const { result } = renderHook(useBoardPresentation);
        expect(result.current.mode).toBe('three');
    });

    it('renders the same primary presentation on the server', () => {
        function Presentation() {
            return createElement('span', null, useBoardPresentation().mode);
        }
        expect(renderToString(createElement(Presentation))).toBe('<span>three</span>');
    });
});
