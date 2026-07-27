/**
 * Script to fix progress card decks for game FFOE
 * Adds missing card copies to bring each deck to the correct count of 18
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Define schema inline
const games = pgTable('games', {
    id: text('id').primaryKey(),
    roomId: text('room_id').notNull(),
    state: text('state').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Types
type ProgressCardType = string;
interface GameState {
    roomId: string;
    players: Array<{
        id: string;
        progressCards?: ProgressCardType[];
        revealedVPCards?: ProgressCardType[];
    }>;
    progressDecks?: {
        science: ProgressCardType[];
        trade: ProgressCardType[];
        politics: ProgressCardType[];
    };
    [key: string]: unknown;
}

const ROOM_ID = 'FFOE';

// Correct deck compositions with quantities
const CORRECT_DECKS = {
    science: [
        'alchemist', 'alchemist', // 2
        'crane', 'crane', // 2
        'engineer', // 1
        'inventor', 'inventor', // 2
        'irrigation', 'irrigation', // 2
        'medicine', 'medicine', // 2
        'mining', 'mining', // 2
        'road_building_progress', 'road_building_progress', // 2
        'smith', 'smith', // 2
        'printer', // 1
    ] as ProgressCardType[],
    trade: [
        'commercial_harbor', 'commercial_harbor', // 2
        'guild_dues', 'guild_dues', // 2
        'merchant_fleet', 'merchant_fleet', // 2
        'merchant', 'merchant', 'merchant', 'merchant', 'merchant', 'merchant', // 6
        'resource_monopoly', 'resource_monopoly', 'resource_monopoly', 'resource_monopoly', // 4
        'trade_monopoly', 'trade_monopoly', // 2
    ] as ProgressCardType[],
    politics: [
        'encouragement', 'encouragement', // 2
        'diplomat', 'diplomat', // 2
        'treason', 'treason', // 2
        'intrigue', 'intrigue', // 2
        'saboteur', 'saboteur', // 2
        'espionage', 'espionage', 'espionage', // 3
        'taxation', 'taxation', // 2
        'wedding', 'wedding', // 2
        'constitution', // 1
    ] as ProgressCardType[],
};

function shuffleDeck<T>(deck: T[]): T[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

async function fixFFOEProgressDecks() {
    const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ No database connection string found!');
        console.error('   Please set SUPABASE_DATABASE_URL or DATABASE_URL in .env.local');
        process.exit(1);
    }

    console.log('🔍 Looking for game in room FFOE...');
    console.log('🔗 Using SUPABASE_DATABASE_URL');

    // Create database connection
    const client = postgres(connectionString, { prepare: false });
    const db = drizzle(client);

    try {
        // Get the game from database
        const gameRecords = await db.select().from(games).where(eq(games.roomId, ROOM_ID));

        if (gameRecords.length === 0) {
            console.error('❌ No game found for room FFOE');
            await client.end();
            process.exit(1);
        }

        const gameRecord = gameRecords[0];
        const gameState: GameState = JSON.parse(gameRecord.state);

        console.log('✅ Found game:', gameRecord.id);
        console.log('📊 Current deck counts:');
        console.log('  Science:', gameState.progressDecks?.science?.length ?? 0);
        console.log('  Trade:', gameState.progressDecks?.trade?.length ?? 0);
        console.log('  Politics:', gameState.progressDecks?.politics?.length ?? 0);

        if (!gameState.progressDecks) {
            console.error('❌ Game has no progress decks!');
            await client.end();
            process.exit(1);
        }

        // Calculate which cards are already out of the deck (in hands or revealed)
        const drawnCards: {
            science: ProgressCardType[];
            trade: ProgressCardType[];
            politics: ProgressCardType[];
        } = {
            science: [],
            trade: [],
            politics: [],
        };

        // Collect all cards that have been drawn (in player hands and revealed VP cards)
        for (const player of gameState.players) {
            if (player.progressCards) {
                for (const card of player.progressCards) {
                    const cardMeta = getCardCategory(card);
                    if (cardMeta) {
                        drawnCards[cardMeta].push(card);
                    }
                }
            }
            if (player.revealedVPCards) {
                for (const card of player.revealedVPCards) {
                    const cardMeta = getCardCategory(card);
                    if (cardMeta && (card === 'printer' || card === 'constitution')) {
                        drawnCards[cardMeta].push(card);
                    }
                }
            }
        }

        console.log('\n📝 Cards already drawn:');
        console.log('  Science:', drawnCards.science.length, drawnCards.science);
        console.log('  Trade:', drawnCards.trade.length, drawnCards.trade);
        console.log('  Politics:', drawnCards.politics.length, drawnCards.politics);

        // For each deck, calculate missing cards
        const missingCards = {
            science: calculateMissingCards(
                CORRECT_DECKS.science,
                gameState.progressDecks.science,
                drawnCards.science
            ),
            trade: calculateMissingCards(
                CORRECT_DECKS.trade,
                gameState.progressDecks.trade,
                drawnCards.trade
            ),
            politics: calculateMissingCards(
                CORRECT_DECKS.politics,
                gameState.progressDecks.politics,
                drawnCards.politics
            ),
        };

        console.log('\n➕ Missing cards to add:');
        console.log('  Science:', missingCards.science.length, missingCards.science);
        console.log('  Trade:', missingCards.trade.length, missingCards.trade);
        console.log('  Politics:', missingCards.politics.length, missingCards.politics);

        // Add missing cards to each deck and shuffle
        gameState.progressDecks.science = shuffleDeck([
            ...gameState.progressDecks.science,
            ...missingCards.science,
        ]);
        gameState.progressDecks.trade = shuffleDeck([
            ...gameState.progressDecks.trade,
            ...missingCards.trade,
        ]);
        gameState.progressDecks.politics = shuffleDeck([
            ...gameState.progressDecks.politics,
            ...missingCards.politics,
        ]);

        console.log('\n✨ Updated deck counts:');
        console.log('  Science:', gameState.progressDecks.science.length);
        console.log('  Trade:', gameState.progressDecks.trade.length);
        console.log('  Politics:', gameState.progressDecks.politics.length);

        // Update the database
        await db
            .update(games)
            .set({
                state: JSON.stringify(gameState),
                updatedAt: new Date(),
            })
            .where(eq(games.id, gameRecord.id));

        console.log('\n✅ Successfully updated game FFOE in database!');

        await client.end();
    } catch (error) {
        await client.end();
        throw error;
    }
}

function getCardCategory(
    card: ProgressCardType
): 'science' | 'trade' | 'politics' | null {
    if (CORRECT_DECKS.science.includes(card)) return 'science';
    if (CORRECT_DECKS.trade.includes(card)) return 'trade';
    if (CORRECT_DECKS.politics.includes(card)) return 'politics';
    return null;
}

function calculateMissingCards(
    correctDeck: ProgressCardType[],
    currentDeck: ProgressCardType[],
    drawnCards: ProgressCardType[]
): ProgressCardType[] {
    // Count how many of each card should exist
    const shouldHave = new Map<ProgressCardType, number>();
    for (const card of correctDeck) {
        shouldHave.set(card, (shouldHave.get(card) ?? 0) + 1);
    }

    // Count how many we currently have (in deck + drawn)
    const currentlyHave = new Map<ProgressCardType, number>();
    for (const card of [...currentDeck, ...drawnCards]) {
        currentlyHave.set(card, (currentlyHave.get(card) ?? 0) + 1);
    }

    // Calculate what's missing
    const missing: ProgressCardType[] = [];
    for (const [card, shouldCount] of shouldHave.entries()) {
        const haveCount = currentlyHave.get(card) ?? 0;
        const missingCount = shouldCount - haveCount;
        for (let i = 0; i < missingCount; i++) {
            missing.push(card);
        }
    }

    return missing;
}

// Run the script
fixFFOEProgressDecks()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
