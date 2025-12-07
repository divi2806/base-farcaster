import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit, increment, serverTimestamp } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBMyPmmGUPi9c_pvH7rAEbsu-LMPNYRnYg",
  authDomain: "zombie-game-4d850.firebaseapp.com",
  projectId: "zombie-game-4d850",
  storageBucket: "zombie-game-4d850.firebasestorage.app",
  messagingSenderId: "134260934446",
  appId: "1:134260934446:web:66f93d4670c0d681a2dcbf"
};

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { app, db };

// Leaderboard types
export interface PlayerScore {
  address: string;
  username?: string;
  fid?: number;
  pfp?: string;
  totalScore: number;
  gamesPlayed: number;
  lastPlayed: any; // Firestore Timestamp
  highestScore: number;
}

/**
 * Save or update player score in Firestore
 * Scores are cumulative - adds to existing total
 */
export async function savePlayerScore(
  address: string,
  gameScore: number,
  username?: string,
  fid?: number,
  pfp?: string
): Promise<void> {
  try {
    const playerRef = doc(db, "leaderboard", address.toLowerCase());
    const playerDoc = await getDoc(playerRef);

    if (playerDoc.exists()) {
      // Player exists - update cumulative score
      const existingData = playerDoc.data() as PlayerScore;
      const newTotalScore = existingData.totalScore + gameScore;
      const newHighestScore = Math.max(existingData.highestScore, gameScore);

      await setDoc(playerRef, {
        totalScore: newTotalScore,
        gamesPlayed: increment(1),
        lastPlayed: serverTimestamp(),
        highestScore: newHighestScore,
        // Update profile info if provided
        ...(username && { username }),
        ...(fid && { fid }),
        ...(pfp && { pfp }),
      }, { merge: true });

      console.log(`Updated score for ${address}: ${existingData.totalScore} + ${gameScore} = ${newTotalScore}`);
    } else {
      // New player - create entry
      await setDoc(playerRef, {
        address: address.toLowerCase(),
        username: username || address.slice(0, 10),
        fid: fid || 0,
        pfp: pfp || "",
        totalScore: gameScore,
        gamesPlayed: 1,
        lastPlayed: serverTimestamp(),
        highestScore: gameScore,
      });

      console.log(`Created new player ${address} with score: ${gameScore}`);
    }
  } catch (error) {
    console.error("Error saving player score:", error);
    throw error;
  }
}

/**
 * Get top N players from leaderboard
 */
export async function getTopPlayers(limitCount: number = 20): Promise<PlayerScore[]> {
  try {
    const leaderboardRef = collection(db, "leaderboard");
    const q = query(leaderboardRef, orderBy("totalScore", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);

    const players: PlayerScore[] = [];
    querySnapshot.forEach((doc) => {
      players.push(doc.data() as PlayerScore);
    });

    return players;
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    throw error;
  }
}

/**
 * Get specific player's score
 */
export async function getPlayerScore(address: string): Promise<PlayerScore | null> {
  try {
    const playerRef = doc(db, "leaderboard", address.toLowerCase());
    const playerDoc = await getDoc(playerRef);

    if (playerDoc.exists()) {
      return playerDoc.data() as PlayerScore;
    }
    return null;
  } catch (error) {
    console.error("Error fetching player score:", error);
    throw error;
  }
}

/**
 * Get player's rank on leaderboard
 */
export async function getPlayerRank(address: string): Promise<number> {
  try {
    const leaderboardRef = collection(db, "leaderboard");
    const q = query(leaderboardRef, orderBy("totalScore", "desc"));
    const querySnapshot = await getDocs(q);

    let rank = 0;
    querySnapshot.forEach((doc) => {
      rank++;
      if (doc.id === address.toLowerCase()) {
        return rank;
      }
    });

    return rank;
  } catch (error) {
    console.error("Error fetching player rank:", error);
    return 0;
  }
}

/**
 * Get total number of players
 */
export async function getTotalPlayers(): Promise<number> {
  try {
    const leaderboardRef = collection(db, "leaderboard");
    const querySnapshot = await getDocs(leaderboardRef);
    return querySnapshot.size;
  } catch (error) {
    console.error("Error fetching total players:", error);
    return 0;
  }
}
