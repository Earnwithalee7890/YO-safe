// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─── Minimal ERC-20 interface ──────────────────────────────────────────────────
interface IERC20Min {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

// ─── Minimal ERC-4626 interface (YO Protocol vaults are ERC-4626 compliant) ────
interface IERC4626Min {
    function asset() external view returns (address);
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function convertToAssets(uint256 shares) external view returns (uint256);
}

/**
 * @title YoSafeManager
 * @author YO-Safe Team
 * @notice On-chain savings manager that routes user deposits directly into live YO Protocol
 *         ERC-4626 vaults. Self-contained — no external imports needed.
 *
 * @dev Architecture:
 *   User → YoSafeManager.depositToVault() → YO Protocol ERC-4626 Vault → Yield
 *   User → YoSafeManager.redeemFromVault() ← YO Protocol ERC-4626 Vault ← Assets + Yield
 */
contract YoSafeManager {

    // ─── Inlined: Ownable ──────────────────────────────────────────────────

    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == _owner, "YoSafe: not owner");
        _;
    }

    function owner() public view returns (address) { return _owner; }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "YoSafe: zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    // ─── Inlined: ReentrancyGuard ──────────────────────────────────────────

    uint256 private _status;
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    modifier nonReentrant() {
        require(_status != ENTERED, "YoSafe: reentrant call");
        _status = ENTERED;
        _;
        _status = NOT_ENTERED;
    }

    // ─── Inlined: IERC20 & IERC4626 moved to file scope above contract ──────

    /// @notice Tracks vault shares held on behalf of each user, per vault
    mapping(address => mapping(address => uint256)) public userShares;

    /// @notice Whitelisted YO Protocol ERC-4626 vaults
    mapping(address => bool) public approvedVaults;

    struct DepositRecord {
        uint256 assets;
        uint256 shares;
        uint256 timestamp;
    }
    mapping(address => mapping(address => DepositRecord)) public depositRecords;

    // ─── Events ────────────────────────────────────────────────────────────

    event DepositedToVault(
        address indexed user,
        address indexed vault,
        address indexed token,
        uint256 assets,
        uint256 sharesReceived
    );
    event RedeemedFromVault(
        address indexed user,
        address indexed vault,
        uint256 shares,
        uint256 assetsReceived
    );
    event VaultApproved(address indexed vault, bool approved);

    // ─── Known YO Protocol Vault Addresses (Base Mainnet) ──────────────────

    /// @notice yoUSD vault on Base Mainnet (underlying: USDC)
    address public constant YO_USD_VAULT = 0xb2B6372eBbFEBFBABe1E2f43C7a41e1Bde8c7090;

    // ─── Constructor ───────────────────────────────────────────────────────

    constructor() {
        _owner = msg.sender;
        _status = NOT_ENTERED;
        emit OwnershipTransferred(address(0), msg.sender);

        // Whitelist the yoUSD vault at deploy time
        approvedVaults[YO_USD_VAULT] = true;
        emit VaultApproved(YO_USD_VAULT, true);
    }

    // ─── Admin ─────────────────────────────────────────────────────────────

    function setVaultApproval(address vault, bool approved) external onlyOwner {
        approvedVaults[vault] = approved;
        emit VaultApproved(vault, approved);
    }

    // ─── Core: Deposit ─────────────────────────────────────────────────────

    /**
     * @notice Deposit underlying assets into a YO Protocol ERC-4626 vault.
     *         Flow: User Wallet → YoSafeManager → YO Vault → Live Yield Strategies
     *
     * @param vault  Address of an approved YO Protocol ERC-4626 vault
     * @param amount Amount of underlying asset to deposit (in asset decimals)
     */
    function depositToVault(address vault, uint256 amount) external nonReentrant {
        require(approvedVaults[vault], "YoSafe: vault not approved");
        require(amount > 0, "YoSafe: amount must be > 0");

        IERC4626Min yoVault = IERC4626Min(vault);
        address token = yoVault.asset();

        // 1. Pull user's underlying token into this contract
        bool ok = IERC20Min(token).transferFrom(msg.sender, address(this), amount);
        require(ok, "YoSafe: transferFrom failed");

        // 2. Approve the YO vault to spend the token from this contract
        IERC20Min(token).approve(vault, amount);

        // 3. Deposit into the live YO Protocol vault — funds enter yield strategies
        uint256 sharesReceived = yoVault.deposit(amount, address(this));
        require(sharesReceived > 0, "YoSafe: no shares received");

        // 4. Credit vault shares to the user
        userShares[msg.sender][vault] += sharesReceived;

        // 5. Record for portfolio queries
        DepositRecord storage rec = depositRecords[msg.sender][vault];
        rec.assets    += amount;
        rec.shares    += sharesReceived;
        rec.timestamp  = block.timestamp;

        emit DepositedToVault(msg.sender, vault, token, amount, sharesReceived);
    }

    // ─── Core: Redeem ──────────────────────────────────────────────────────

    /**
     * @notice Redeem vault shares from a YO Protocol ERC-4626 vault.
     *         Flow: YO Vault → YoSafeManager → User Wallet (assets + yield)
     *
     * @param vault  Address of the YO Protocol ERC-4626 vault
     * @param shares Shares to redeem (pass 0 to redeem full position)
     */
    function redeemFromVault(address vault, uint256 shares) external nonReentrant {
        require(approvedVaults[vault], "YoSafe: vault not approved");

        uint256 available = userShares[msg.sender][vault];
        require(available > 0, "YoSafe: no shares to redeem");

        uint256 toRedeem = (shares == 0) ? available : shares;
        require(toRedeem <= available, "YoSafe: insufficient shares");

        // Checks-effects-interactions: deduct before external call
        userShares[msg.sender][vault] -= toRedeem;

        DepositRecord storage rec = depositRecords[msg.sender][vault];
        rec.shares = rec.shares >= toRedeem ? rec.shares - toRedeem : 0;

        // Redeem from the YO vault — underlying assets sent directly to user's wallet
        uint256 assetsReceived = IERC4626Min(vault).redeem(toRedeem, msg.sender, address(this));

        emit RedeemedFromVault(msg.sender, vault, toRedeem, assetsReceived);
    }

    // ─── Views ─────────────────────────────────────────────────────────────

    /**
     * @notice Get a user's live position in a YO Protocol vault.
     * @param user  User address
     * @param vault YO Protocol vault address
     * @return shares        Raw vault shares held on behalf of user
     * @return currentAssets Live underlying value (includes accrued yield via convertToAssets)
     * @return depositedAt   Timestamp of last deposit
     */
    function getPosition(address user, address vault)
        external
        view
        returns (uint256 shares, uint256 currentAssets, uint256 depositedAt)
    {
        shares = userShares[user][vault];
        currentAssets = shares > 0 ? IERC4626Min(vault).convertToAssets(shares) : 0;
        depositedAt   = depositRecords[user][vault].timestamp;
    }

    /**
     * @notice Get the recorded deposit metadata for a user in a vault.
     */
    function getDepositRecord(address user, address vault)
        external
        view
        returns (uint256 assets, uint256 shares, uint256 timestamp)
    {
        DepositRecord memory rec = depositRecords[user][vault];
        return (rec.assets, rec.shares, rec.timestamp);
    }
}
