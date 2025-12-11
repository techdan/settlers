'use client';

import { useState } from 'react';
import { getRoomPlayers, resumeGame } from '@/app/actions';

export function ResumeGameForm() {
    const [step, setStep] = useState<'CODE' | 'SELECT'>('CODE');
    const [roomId, setRoomId] = useState('');
    const [players, setPlayers] = useState<{ id: string, name: string }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleLoadPlayers(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (roomId.length !== 4) {
                throw new Error('Room code must be 4 characters');
            }
            const fetchedPlayers = await getRoomPlayers(roomId);
            if (fetchedPlayers.length === 0) {
                throw new Error('No players found in this room');
            }
            setPlayers(fetchedPlayers);
            setStep('SELECT');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load players');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex flex-col gap-4 p-6 border rounded-lg bg-card text-card-foreground shadow-sm w-full max-w-sm">
            <h2 className="text-2xl font-semibold">Resume Game</h2>

            {step === 'CODE' ? (
                <form onSubmit={handleLoadPlayers} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="resume-room-code" className="text-sm font-medium">Room Code</label>
                        <input
                            id="resume-room-code"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                            required
                            maxLength={4}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 uppercase"
                            placeholder="ABCD"
                        />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground btn-interactive h-10 px-4 py-2"
                    >
                        {isLoading ? 'Loading...' : 'Load Players'}
                    </button>
                </form>
            ) : (
                <form action={resumeGame} className="flex flex-col gap-4">
                    <input type="hidden" name="roomId" value={roomId} />

                    <div className="flex flex-col gap-2">
                        <label htmlFor="resume-player-select" className="text-sm font-medium">Select Player</label>
                        <select
                            id="resume-player-select"
                            name="playerId"
                            required
                            defaultValue=""
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="" disabled>Choose your name...</option>
                            {players.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setStep('CODE');
                                setPlayers([]);
                                setError(null);
                            }}
                            className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground btn-interactive h-10 px-4 py-2"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground btn-interactive h-10 px-4 py-2"
                        >
                            Resume
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
