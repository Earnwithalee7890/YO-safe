import { http, createConfig, fallback } from 'wagmi'
import { base, mainnet, arbitrum } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { injected } from 'wagmi/connectors'

// Use multiple reliable Base RPC endpoints with retries to avoid timeout
// when waiting for transaction receipts (approve + deposit flow)
export const config = createConfig({
    chains: [base, mainnet, arbitrum],
    connectors: [injected()],
    transports: {
        [base.id]: fallback([
            http('https://mainnet.base.org', { retryCount: 5, retryDelay: 2000 }),
            http('https://base.drpc.org', { retryCount: 3, retryDelay: 2000 }),
            http('https://base-rpc.publicnode.com', { retryCount: 3, retryDelay: 2000 }),
            http(), // default fallback
        ]),
        [mainnet.id]: http('https://ethereum.publicnode.com', { retryCount: 3, retryDelay: 1500 }),
        [arbitrum.id]: http('https://arbitrum-one.publicnode.com', { retryCount: 3, retryDelay: 1500 }),
    },
})

const queryClient = new QueryClient()

export const Web3Provider = ({ children }) => {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    )
}
