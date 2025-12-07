# Firebase Leaderboard Setup

## Overview
The game now uses Firebase Firestore for storing and retrieving leaderboard data. Scores are **cumulative** - each game's score adds to the player's total.

## How It Works

### 1. Score Saving (When Claim Button is Pressed)
When a player completes a game and clicks the "Claim" button:
1. A gas transaction is sent (0 ETH to self on Base chain)
2. After transaction succeeds, the score is saved to Firestore
3. The chest opening animation plays

**Cumulative Scoring Example:**
- Game 1: Player scores 30 → Total: 30
- Game 2: Player scores 20 → Total: 50 (30 + 20)
- Game 3: Player scores 45 → Total: 95 (50 + 45)

### 2. Data Stored in Firestore
Each player document contains:
```typescript
{
  address: string          // Wallet address (lowercase)
  username: string         // Farcaster username or truncated address
  fid: number             // Farcaster ID
  pfp: string             // Profile picture URL
  totalScore: number      // Cumulative score across all games
  gamesPlayed: number     // Total number of games played
  lastPlayed: Timestamp   // Last game timestamp
  highestScore: number    // Best single-game score
}
```

### 3. Leaderboard Display
The leaderboard shows:
- Top N players sorted by `totalScore` (descending)
- Player's username (from Farcaster) or wallet address
- Total cumulative score
- Number of games played
- Your personal stats (if connected)

## Firebase Configuration

The Firebase config is located in `/lib/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyBMyPmmGUPi9c_pvH7rAEbsu-LMPNYRnYg",
  authDomain: "zombie-game-4d850.firebaseapp.com",
  projectId: "zombie-game-4d850",
  storageBucket: "zombie-game-4d850.firebasestorage.app",
  messagingSenderId: "134260934446",
  appId: "1:134260934446:web:66f93d4670c0d681a2dcbf"
};
```

## Firestore Database Structure

```
leaderboard (collection)
  ├── 0x1234...abcd (document - player address)
  │   ├── address: "0x1234...abcd"
  │   ├── username: "player1"
  │   ├── fid: 12345
  │   ├── pfp: "https://..."
  │   ├── totalScore: 150
  │   ├── gamesPlayed: 3
  │   ├── lastPlayed: Timestamp
  │   └── highestScore: 75
  │
  └── 0x5678...efgh (document - another player)
      └── ...
```

## Key Functions

### `savePlayerScore(address, gameScore, username?, fid?, pfp?)`
Saves or updates a player's score. If the player exists, adds the new score to their total.

### `getTopPlayers(limit)`
Returns the top N players sorted by total score.

### `getPlayerScore(address)`
Gets a specific player's complete stats.

### `getTotalPlayers()`
Returns the total number of players in the leaderboard.

## Testing Cumulative Scoring

1. **First Game:**
   - Play game and score 30 points
   - Click "Claim" and complete transaction
   - Check Firestore: `totalScore: 30`, `gamesPlayed: 1`

2. **Second Game:**
   - Play game and score 20 points
   - Click "Claim" and complete transaction
   - Check Firestore: `totalScore: 50`, `gamesPlayed: 2`

3. **Third Game:**
   - Play game and score 45 points
   - Click "Claim" and complete transaction
   - Check Firestore: `totalScore: 95`, `gamesPlayed: 3`

## Firestore Security Rules (Recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{address} {
      // Anyone can read
      allow read: if true;
      
      // Only allow writes from your app (you can add more security)
      allow write: if true;
    }
  }
}
```

## Troubleshooting

### Scores not saving?
1. Check browser console for errors
2. Verify Firebase project is active
3. Check Firestore security rules allow writes
4. Ensure wallet is connected before claiming

### Leaderboard not loading?
1. Check browser console for errors
2. Verify Firebase config is correct
3. Check Firestore security rules allow reads
4. Try refreshing the leaderboard

### Scores not cumulative?
1. Check that `savePlayerScore` is using `increment()` for `gamesPlayed`
2. Verify the function adds to existing `totalScore`
3. Check Firestore document to see actual values

## Migration from Smart Contract

The old smart contract leaderboard has been replaced with Firebase. The smart contract hooks in `/smartcontracthooks` are no longer used by the Leaderboard component.

If you need to migrate existing on-chain scores to Firebase, you'll need to:
1. Read all scores from the smart contract
2. Write them to Firestore using `savePlayerScore()`
3. Ensure addresses match (lowercase)
