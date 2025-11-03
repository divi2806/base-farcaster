import { useFrame } from '@/components/farcaster-provider'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'
import { parseEther } from 'viem'
import { base } from 'viem/chains'
import { useAppKit } from '@reown/appkit/react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSendTransaction,
  useSwitchChain,
} from 'wagmi'

export function WalletActions() {
  const { isEthProviderAvailable } = useFrame()
  const { isConnected, address, chainId } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: hash, sendTransaction } = useSendTransaction()
  const { switchChain } = useSwitchChain()
  const { connect } = useConnect()
  const { open } = useAppKit()

  async function sendTransactionHandler() {
    sendTransaction({
      to: '0x7f748f154B6D180D35fA12460C7E4C631e28A9d7',
      value: parseEther('1'),
    })
  }

  if (isConnected) {
    return (
      <div className="space-y-4 rounded-xl p-4 bg-[#001226] border border-[#0A5CDD]/40">
        <h2 className="text-xl font-bold text-left text-white">Wallet</h2>
        <div className="flex flex-row space-x-4 justify-start items-start">
          <div className="flex flex-col space-y-4 justify-start">
            <p className="text-sm text-left text-[#A3B3C2]">
              Connected to wallet:{' '}
              <span className="bg-white font-mono text-black rounded-md p-[4px]">
                {address}
              </span>
            </p>
            <p className="text-sm text-left text-[#A3B3C2]">
              Chain Id:{' '}
              <span className="bg-white font-mono text-black rounded-md p-[4px]">
                {chainId}
              </span>
            </p>
            {chainId === base.id ? (
              <div className="flex flex-col space-y-2 border border-[#0A5CDD]/30 p-4 rounded-md bg-[#031B36]">
                <h2 className="text-lg font-semibold text-left text-white">Send Transaction Example</h2>
                <button
                  type="button"
                  className="bg-[#0A5CDD] hover:bg-[#0b6ef3] text-white rounded-md p-2 text-sm"
                  onClick={sendTransactionHandler}
                >
                  Send Transaction
                </button>
                {hash && (
                  <button
                    type="button"
                    className="bg-white text-black rounded-md p-2 text-sm"
                    onClick={() =>
                      window.open(
                        `https://basescan.org/tx/${hash}`,
                        '_blank',
                      )
                    }
                  >
                    View Transaction
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="bg-[#0A5CDD] hover:bg-[#0b6ef3] text-white rounded-md p-2 text-sm"
                onClick={() => switchChain({ chainId: base.id })}
              >
                Switch to Base
              </button>
            )}

            <button
              type="button"
              className="bg-[#11253F] hover:bg-[#1a355a] text-white rounded-md p-2 text-sm border border-[#0A5CDD]/30"
              onClick={() => disconnect()}
            >
              Disconnect Wallet
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isEthProviderAvailable) {
    return (
      <div className="space-y-4 rounded-xl p-4 bg-[#001226] border border-[#0A5CDD]/40">
        <h2 className="text-xl font-bold text-left text-white">Wallet</h2>
        <div className="flex flex-row space-x-4 justify-start items-start">
          <button
            type="button"
            className="bg-[#0A5CDD] hover:bg-[#0b6ef3] text-white w-full rounded-md p-3 text-sm"
            onClick={() => {
              if (isEthProviderAvailable) {
                // Inside Warpcast MiniApp: use the Farcaster connector
                connect({ connector: miniAppConnector() })
              } else {
                // On the web: open the WalletConnect/AppKit modal
                open?.()
              }
            }}
          >
            Connect Wallet (WalletConnect)
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-xl p-4 bg-[#001226] border border-[#0A5CDD]/40">
      <h2 className="text-xl font-bold text-left text-white">Wallet</h2>
      <div className="flex flex-row space-x-4 justify-start items-start">
        <p className="text-sm text-left text-[#A3B3C2]">Wallet connection only via Warpcast</p>
      </div>
    </div>
  )
}
