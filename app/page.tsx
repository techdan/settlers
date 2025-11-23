import { createRoom, joinRoom } from './actions';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-4xl font-bold">Settlers of Lanc</h1>

      <div className="flex flex-col md:flex-row gap-12 w-full max-w-4xl justify-center">
        {/* Create Room Section */}
        <div className="flex flex-col gap-4 p-6 border rounded-lg bg-card text-card-foreground shadow-sm w-full max-w-sm">
          <h2 className="text-2xl font-semibold">Create Room</h2>
          <form action={createRoom} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="create-name" className="text-sm font-medium">Your Name</label>
              <input
                id="create-name"
                name="playerName"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter your name"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Create New Room
            </button>
          </form>
        </div>

        {/* Join Room Section */}
        <div className="flex flex-col gap-4 p-6 border rounded-lg bg-card text-card-foreground shadow-sm w-full max-w-sm">
          <h2 className="text-2xl font-semibold">Join Room</h2>
          <form action={joinRoom} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="join-name" className="text-sm font-medium">Your Name</label>
              <input
                id="join-name"
                name="playerName"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter your name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="room-code" className="text-sm font-medium">Room Code</label>
              <input
                id="room-code"
                name="roomId"
                required
                maxLength={4}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 uppercase"
                placeholder="ABCD"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2"
            >
              Join Room
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
