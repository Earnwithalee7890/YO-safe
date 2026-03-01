import { http, createConfig } from 'wagmi'
import { base, mainnet, arbitrum } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
    chains: [base, mainnet, arbitrum],
    connectors: [injected()],
    transports: {
        [base.id]: http(),
        [mainnet.id]: http(),
        [arbitrum.id]: http(),
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
