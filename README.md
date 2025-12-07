# Base Sepolia Farcaster MiniApp Template verified for Base Hyperthon (https://hyperthon.org) 2025 by Prmsnls (https://permissionless.net)

The template demonstrates all Mini App capabilities and lets you easily modify it, so you can build Mini Apps on Base Sepolia testnet.

## Cloning the Template

You can use the following command to clone the Mini App template to your local machine:

```
git clone https://github.com/harshshukla9/base-farcaster
```

### Install the dependencies

```
pnpm install
```

### Copy `.env.example` over to `.env.local`

```bash
cp .env.example .env.local
```

### Run the template

```bash
pnpm dev
```

### View the App in Warpcast Embed tool

Warpcast has a neat [Embed tool](https://warpcast.com/~/developers/mini-apps/embed) that you can use to inspect the Mini App before you publish it.

Unfortunately, the embed tool can only work with remote URL. Inputting a localhost URL does not work.

As a workaround, you may make the local app accessible remotely using a tool like `cloudflared` or `ngrok`. In this guide we will use `cloudflared`.

#### Install Cloudflared

```bash
brew install cloudflared
```

For more installation options see the [official docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).

#### Expose localhost

Run the following command in your terminal:

```bash
cloudflared tunnel --url http://localhost:3000
```

Be sure to specify the correct port for your local server.

#### Set `NEXT_PUBLIC_URL` environment variable in `.env.local` file

```bash
NEXT_PUBLIC_URL=<url-from-cloudflared-or-ngrok>
```

#### Use the provided url

`cloudflared` will generate a random subdomain and print it in the terminal for you to use. Any traffic to this URL will get sent to your local server.

Enter the provided URL in the [Warpcast Embed tool](https://warpcast.com/~/developers/mini-apps/embed).

![embed-tool](https://docs.base.org/img/guides/farcaster-miniapp/1.png)

Let's investigate the various components of the template.

## Customizing the Mini App Embed

Mini App Embed is how the Mini App shows up in the feed or in a chat conversation when the URL of the app is shared.

The Mini App Embed looks like this:

![embed-preview](https://docs.base.org/img/guides/farcaster-miniapp/2.png)

You can customize this by editing the file `app/page.tsx`:

```js
...

const appUrl = env.NEXT_PUBLIC_URL;

const frame = {
  version: "next",
  imageUrl: `${appUrl}/images/feed.png`, // Embed image URL (3:2 image ratio)
  button: {
    title: "Template", // Text on the embed button
    action: {
      type: "launch_frame",
      name: "Base Sepolia Farcaster MiniApp Template",
      url: appUrl, // URL that is opened when the embed button is tapped or clicked.
      splashImageUrl: `${appUrl}/images/splash.png`,
      splashBackgroundColor: "#0052FF",
    },
  },
};

...
```

You can either edit the URLs for the images or replace the images in `public/images` folder in the template.

Once you are happy with the changes, click `Refetch` in the Embed tool to get the latest configuration.

> [!NOTE]
> If you are developing locally, ensure that your Next.js app is running locally and the cloudflare tunnel is open. 

## Customizing the Splash Screen

Upon opening the Mini App, the first thing the user will see is the Splash screen:

![splash-screen](https://docs.base.org/img/guides/farcaster-miniapp/3.png)

You can edit the `app/page.tsx` file to customize the Splash screen.

```js
...

const appUrl = env.NEXT_PUBLIC_URL;

const frame = {
  version: "next",
  imageUrl: `${appUrl}/images/feed.png`,
  button: {
    title: "Launch Template",
    action: {
      type: "launch_frame",
      name: "Base Sepolia Farcaster MiniApp Template",
      url: appUrl,
      splashImageUrl: `${appUrl}/images/splash.png`, // App icon in the splash screen (200px * 200px)
      splashBackgroundColor: "#0052FF", // Splash screen background color (Base blue)
    },
  },
};

...
```

For `splashImageUrl`, you can either change the URL or replace the image in `public/images` folder in the template.

## Modifying the Mini App

Upon opening the template Mini App, you should see a screen like this:



The code for this screen is in the `components/pages/app.tsx` file:

```tsx
export default function Home() {
  const { context } = useMiniAppContext();
  return (
    // SafeAreaContainer component makes sure that the app margins are rendered properly depending on which client is being used.
    <SafeAreaContainer insets={context?.client.safeAreaInsets}>
      {/* You replace the Demo component with your home component */}
      <Demo />
    </SafeAreaContainer>
  )
}
```

You can remove or edit the code in this file to build your Mini App.

### Accessing User Context


Your Mini App receives various information about the user, including `username`, `fid`, `displayName`, `pfpUrl` and other fields.

The template provides a helpful hook `useMiniAppContext` that you can use to access these fields:

```js
export function User() {
    const { context } = useMiniAppContext();
    return <p>{context.user.username}</p>
}
```

The template also provide an example of the same in `components/Home/User.tsx` file.

You can learn more about Context [here](https://miniapps.farcaster.xyz/docs/sdk/context).

### Performing App Actions

![composeCast](https://docs.base.org/img/guides/farcaster-miniapp/composeCast.gif)

Mini Apps have the capability to perform native actions that enhance the user experience!

Actions like:

- `addFrame`: Allows the user to save (bookmark) the app in a dedicated section
- `composeCast`: Allows the MiniApp to prompt the user to cast with prefilled text and media
- `viewProfile`: Presents a profile of a Farcaster user in a client native UI



The template provides an easy way to access the actions via the `useMiniAppContext` hook!

```js
const { actions } = useMiniAppContext();
```

An example for the same can be found in `components/Home/FarcasterActions.tsx` file.

### Prompting Wallet Actions



Every user of Warpcast has access to various wallet integrations with Base Sepolia testnet support.

**Mini Apps can prompt the user to perform onchain actions on Base Sepolia**!

The template provides an example for the same in `components/Home/WalletActions.tsx` file.

```js
export function WalletActions() {
    ...

    async function sendTransactionHandler() {
        sendTransaction({
            to: "0x7f748f154B6D180D35fA12460C7E4C631e28A9d7",
            value: parseEther("0.001"), // Small amount for testnet
        });
    }

    ...
}
```

> [!WARNING]
> The wallet supports multiple networks. It is recommended that you ensure that Base Sepolia is connected before prompting wallet actions.

You can use viem's `switchChain` or equivalent to prompt a chain switch.

```js
// Switching to Base Sepolia
switchChain({ chainId: 84532 });
```

The template has an example for the same in the `components/Home/WalletActions.tsx` file.

## Base Sepolia Network Configuration

This template is configured to work with Base Sepolia testnet. Here are the network details:

- **Chain ID**: 84532
- **Network Name**: Base Sepolia
- **RPC URL**: https://sepolia.base.org
- **Block Explorer**: https://sepolia.basescan.org
- **Testnet Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

### Getting Testnet ETH

To test wallet functionality, you'll need testnet ETH on Base Sepolia:

1. Visit the [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
2. Connect your wallet
3. Request testnet ETH
4. Wait for the transaction to complete

## Package Scripts

The template includes several useful pnpm scripts:

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint

# Type checking
pnpm type-check
```

## Modifying the `farcaster.json` file

When publishing the Mini App you will need to have a `farcaster.json` file that follows the specification.

You can edit the `app/.well-known/farcaster.json/route.ts` file with your app details before publishing the app!

```ts
...

const appUrl = process.env.NEXT_PUBLIC_URL;
const farcasterConfig = {
    // accountAssociation details are required to associated the published app with it's author
    accountAssociation: {
        "header": "",
        "payload": "",
        "signature": ""
    },
    frame: {
        version: "1",
        name: "Base Sepolia Farcaster MiniApp Template",
        iconUrl: `${appUrl}/images/icon.png`, // Icon of the app in the app store
        homeUrl: `${appUrl}`, // Default launch URL
        imageUrl: `${appUrl}/images/feed.png`, // Default image to show if shared in a feed.
        screenshotUrls: [], // Visual previews of the app
        tags: ["base", "sepolia", "farcaster", "miniapp", "template", "testnet"], // Descriptive tags for search
        primaryCategory: "developer-tools",
        buttonTitle: "Launch Template",
        splashImageUrl: `${appUrl}/images/splash.png`, // URL of image to show on loading screen.
        splashBackgroundColor: "#0052FF", // Base blue color for loading screen.
    }
};

...
```

You can learn more about publishing the Mini App and other manifest properties [here](https://miniapps.farcaster.xyz/docs/guides/publishing).

## Environment Variables

Make sure to set up the following environment variables in your `.env.local` file:

```bash
NEXT_PUBLIC_URL=your-app-url
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
```

## Deployment

The template is ready to be deployed to various platforms:

### Vercel (Recommended)
```bash
pnpm dlx vercel
```

### Netlify
```bash
pnpm build
# Upload the .next folder to Netlify
```

### Railway
```bash
# Connect your GitHub repository to Railway
# Set environment variables in Railway dashboard
```

## Troubleshooting

### Common Issues

1. **Wallet not connecting to Base Sepolia**
   - Ensure the chain ID is set to 84532
   - Check that the RPC URL is correct
   - Verify the user has testnet ETH

2. **Mini App not loading in Warpcast**
   - Verify the cloudflared tunnel is running
   - Check that NEXT_PUBLIC_URL is set correctly
   - Ensure the farcaster.json file is properly configured

3. **Transaction failures**
   - Check if the user has sufficient testnet ETH
   - Verify the contract address is correct for Base Sepolia
   - Ensure gas limits are appropriate for the network

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Resources

- [Farcaster Mini Apps Documentation](https://miniapps.farcaster.xyz/)
- [Base Sepolia Network Info](https://docs.base.org/network-information)
- [Base Developer Documentation](https://docs.base.org/)
- [Warpcast Embed Tool](https://warpcast.com/~/developers/mini-apps/embed)
- [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)

## Conclusion

In this guide, you explored Farcaster Mini Apps — the simplest way to create engaging, high-retention, and easily monetizable applications on Base Sepolia testnet!

You also discovered the key capabilities of Mini Apps and how you can use this Base Sepolia Farcaster MiniApp Template to build your own decentralized applications with seamless wallet integration.

For more details, check out the official Mini App documentation [here](https://miniapps.farcaster.xyz/) and Base documentation [here](https://docs.base.org/).
