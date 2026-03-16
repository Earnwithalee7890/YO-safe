export const YO_SAFE_MANAGER_ABI = [
    // ─── Constructor ───────────────────────────────────────────────────────
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },

    // ─── Events ────────────────────────────────────────────────────────────
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true,  "internalType": "address", "name": "user",           "type": "address" },
            { "indexed": true,  "internalType": "address", "name": "vault",          "type": "address" },
            { "indexed": true,  "internalType": "address", "name": "token",          "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "assets",         "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "sharesReceived", "type": "uint256" }
        ],
        "name": "DepositedToVault",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true,  "internalType": "address", "name": "user",           "type": "address" },
            { "indexed": true,  "internalType": "address", "name": "vault",          "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "shares",         "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "assetsReceived", "type": "uint256" }
        ],
        "name": "RedeemedFromVault",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true,  "internalType": "address", "name": "vault",    "type": "address" },
            { "indexed": false, "internalType": "bool",    "name": "approved", "type": "bool"    }
        ],
        "name": "VaultApproved",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "newOwner",      "type": "address" }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },

    // ─── Write Functions ───────────────────────────────────────────────────

    /**
     * depositToVault — pulls user ERC-20 assets, approves and deposits into
     * the specified YO Protocol ERC-4626 vault, credits vault shares to caller.
     */
    {
        "inputs": [
            { "internalType": "address", "name": "vault",  "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "depositToVault",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },

    /**
     * redeemFromVault — burns vault shares and redeems underlying assets
     * from the YO Protocol vault directly to the caller's wallet.
     * Pass shares = 0 to redeem the full position.
     */
    {
        "inputs": [
            { "internalType": "address", "name": "vault",  "type": "address" },
            { "internalType": "uint256", "name": "shares", "type": "uint256" }
        ],
        "name": "redeemFromVault",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },

    /**
     * setVaultApproval — owner-only: whitelist or delist a YO vault.
     */
    {
        "inputs": [
            { "internalType": "address", "name": "vault",    "type": "address" },
            { "internalType": "bool",    "name": "approved", "type": "bool"    }
        ],
        "name": "setVaultApproval",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "newOwner", "type": "address" }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },

    // ─── View Functions ────────────────────────────────────────────────────

    /**
     * getPosition — returns live position data for a user in a YO vault.
     * currentAssets reflects real-time yield because it calls vault.convertToAssets().
     */
    {
        "inputs": [
            { "internalType": "address", "name": "user",  "type": "address" },
            { "internalType": "address", "name": "vault", "type": "address" }
        ],
        "name": "getPosition",
        "outputs": [
            { "internalType": "uint256", "name": "shares",        "type": "uint256" },
            { "internalType": "uint256", "name": "currentAssets", "type": "uint256" },
            { "internalType": "uint256", "name": "depositedAt",   "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "user",  "type": "address" },
            { "internalType": "address", "name": "vault", "type": "address" }
        ],
        "name": "getDepositRecord",
        "outputs": [
            { "internalType": "uint256", "name": "assets",    "type": "uint256" },
            { "internalType": "uint256", "name": "shares",    "type": "uint256" },
            { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "",  "type": "address" },
            { "internalType": "address", "name": "",  "type": "address" }
        ],
        "name": "userShares",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "name": "approvedVaults",
        "outputs": [
            { "internalType": "bool", "name": "", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "YO_USD_VAULT",
        "outputs": [
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];
