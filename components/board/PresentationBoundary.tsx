'use client';

import { Component, type ReactNode } from 'react';

/** A failed graphics context must never unmount the game controller. */
export class PresentationBoundary extends Component<{
  children: ReactNode;
  fallback: ReactNode;
  onUnavailable?: () => void;
}, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onUnavailable?.(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
