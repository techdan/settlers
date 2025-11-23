import { GameController } from '@/components/game/GameController';

export default async function FlatBoardPage({
    searchParams,
}: {
    searchParams: Promise<{ roomId: string; playerId: string }>;
}) {
    const { roomId, playerId } = await searchParams;

    if (!roomId || !playerId) {
        return <div className="p-8 text-red-500">Missing room ID or player ID</div>;
    }

    return (
        <main className="min-h-screen">
            <GameController roomId={roomId} playerId={playerId} />
        </main>
    );
}
