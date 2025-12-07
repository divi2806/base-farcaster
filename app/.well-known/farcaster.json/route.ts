import { NextResponse } from "next/server";
import { APP_URL } from "../../../lib/constants";

export async function GET() {
  const farcasterConfig = {
    "frame": {
      "name": "survivor-zombies",
      "version": "1",
      "iconUrl": "https://killz-game-zombie.vercel.app/images/icon.png",
      "homeUrl": "https://killz-game-zombie.vercel.app",
      "imageUrl": "https://killz-game-zombie.vercel.app/images/image.png",
      "splashImageUrl": "https://killz-game-zombie.vercel.app/images/splash.png",
      "splashBackgroundColor": "#111111",
      "webhookUrl": "https://survivor-zombies.vercel.app/api/webhook",
      "subtitle": "survive the zombie apocalypse",
      "description": "Fight zombies and survive the night and prevent from getting infected",
      "primaryCategory": "games"
    },
    "accountAssociation": {
     "header": "eyJmaWQiOjExNDI1MzksInR5cGUiOiJhdXRoIiwia2V5IjoiMHgyODUyMTE3NzI2ODcyNTY0YThiZDk3M2E5OTIzOGEzOTdiMjgzMUJmIn0",
    "payload": "eyJkb21haW4iOiJraWxsei1nYW1lLXpvbWJpZS52ZXJjZWwuYXBwIn0",
    "signature": "MA1uH/+BC23CI38qenJw3gOBKUfqhGvTow5MJZAk4DlSEOIgMHhWCgBoej088rMKoDZEDsuFpMjUkMpuLvudQhw="
  },
   "baseBuilder": {
    "allowedAddresses": ["0x721f07F9E4b5b2D522D0D657cCEebfb64487d8DC"]
  }
  };

  return NextResponse.json(farcasterConfig);
}
