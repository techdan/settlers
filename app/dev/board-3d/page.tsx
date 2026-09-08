import { notFound } from 'next/navigation';
import { IslandPlayground } from './IslandPlayground';

export default function Board3DPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <IslandPlayground />;
}
