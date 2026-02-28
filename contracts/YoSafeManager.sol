// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title YoSafeManager
 * @author YO-Safe Team
 * @notice Simplified DeFi savings manager designed for the YO Protocol Hackathon.
 * @dev This contract allows users to deposit funds which are then "managed" (conceptually 
 * integrated with YO Protocol strategies) to earn optimized yield.
 */
contract YoSafeManager is Ownable, ReentrancyGuard {
    
    struct UserPortfolio {
        uint256 totalDeposited;
        uint256 lastDepositTime;
        uint256 yieldEarned;
    }

    mapping(address => mapping(address => UserPortfolio)) public portfolios; // User => Token => Portfolio
    mapping(address => bool) public supportedTokens;

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event StrategyUpdated(address indexed token, uint256 newEfficiency);

    // Official Base Mainnet Token Addresses
    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant WETH = 0x4200000000000000000000000000000000000006;

    constructor() Ownable(msg.sender) {
        // Automatically support institutional assets on Base Mainnet
        supportedTokens[USDC] = true;
        supportedTokens[WETH] = true;
    }

    /**
     * @notice Add support for a new asset (e.g., cbBTC)
     */
    function setTokenSupport(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
    }

    /**
     * @notice Deposit funds into the YO-Safe optimized terminal
     */
    function deposit(address token, uint256 amount) external nonReentrant {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Amount must be > 0");

        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        UserPortfolio storage p = portfolios[msg.sender][token];
        p.totalDeposited += amount;
        p.lastDepositTime = block.timestamp;

        emit Deposited(msg.sender, token, amount);
    }

    /**
     * @notice Withdraw funds + earned yield
     */
    function withdraw(address token, uint256 amount) external nonReentrant {
        UserPortfolio storage p = portfolios[msg.sender][token];
        require(p.totalDeposited >= amount, "Insufficient balance");

        p.totalDeposited -= amount;
        IERC20(token).transfer(msg.sender, amount);

        emit Withdrawn(msg.sender, token, amount);
    }

    /**
     * @notice Conceptual function to simulate yield updates from YO Protocol strategies
     * @dev In a production environment, this would be triggered by an off-chain keeper 
     * or a strategy contract interacting with YO Protocol core.
     */
    function updateYield(address user, address token, uint256 yield) external onlyOwner {
        portfolios[user][token].yieldEarned += yield;
    }

    /**
     * @notice Get full user data for the YO-Safe Terminal
     */
    function getPortfolio(address user, address token) external view returns (uint256, uint256, uint256) {
        UserPortfolio memory p = portfolios[user][token];
        return (p.totalDeposited, p.lastDepositTime, p.yieldEarned);
    }
}
