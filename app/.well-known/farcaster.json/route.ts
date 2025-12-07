import { NextResponse } from "next/server";
import { APP_URL } from "../../../lib/constants";

export async function GET() {
  const farcasterConfig = {
    "frame": {
      "name": "survivor-zombies",
      "version": "1",
      "iconUrl": "https://survivor-zombies.vercel.app/images/icon.png",
      "homeUrl": "https://survivor-zombies.vercel.app",
      "imageUrl": "https://survivor-zombies.vercel.app/images/image.png",
      "splashImageUrl": "https://survivor-zombies.vercel.app/images/splash.png",
      "splashBackgroundColor": "#111111",
      "webhookUrl": "https://survivor-zombies.vercel.app/api/webhook",
      "subtitle": "survive the zombie apocalypse",
      "description": "Fight zombies and survive the night",
      "primaryCategory": "games"
    },
    "accountAssociation": {
    "header": "eyJmaWQiOjExMDg1NzQsInR5cGUiOiJhdXRoIiwia2V5IjoiMHhkODUzOTVERWYzZDYzM0U3ODYyOTFiZjlERTU0ZDMyNGVlYkM3OTE3In0",
    "payload": "eyJkb21haW4iOiJqdW1wZmluYWwudmVyY2VsLmFwcCJ9",
    "signature": "1bA7P3VPHAsGMdMnoxf8SLWHhVoohnfN/c1EoYvT7xo8ttSZ099HrC31BaDDsQPQaxp4ASRabDcBi16A9SWOZxs="
  },
   "baseBuilder": {
    "allowedAddresses": ["0x721f07F9E4b5b2D522D0D657cCEebfb64487d8DC"]
  }
  };

  return NextResponse.json(farcasterConfig);
}
