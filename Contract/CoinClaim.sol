// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MemeCoinTreasury
 * @dev Contract for claiming random Zora creator coins on Base chain
 * Tokens (Zora Creator Coins - ERC20):
 * - 0x57f4039c85dd48e1b8b23686e9059a1b23b8da12
 * - 0xfEE862918623bfcDf148bf29A1a8F8a7C3e55b9b
 * - 0x50F88fe97f72CD3E75b9Eb4f747F59BcEBA80d59 (RARE - 0.1% probability)
 * - 0xb8d7af22e36788d1dc6e636a76e2e6d98c7fc9cd
 */
contract MemeCoinTreasury is Ownable, ReentrancyGuard {
    // Token addresses on Base chain (Zora Creator Coins)
    address public constant TOKEN_1 = 0x57f4039C85dD48e1b8b23686e9059a1B23B8Da12;
    address public constant TOKEN_2 = 0xfeE862918623bFcDf148bf29A1A8F8a7C3e55b9b;
    address public constant TOKEN_3 = 0x50F88fe97f72CD3E75b9Eb4f747F59BcEBA80d59; // RARE (0.1% probability)
    address public constant TOKEN_4 = 0xB8D7aF22e36788D1Dc6E636a76e2E6D98c7fc9Cd;

    // Array of tokens for easier iteration
    address[4] public tokens = [TOKEN_1, TOKEN_2, TOKEN_3, TOKEN_4];
    
    // Mapping to track user's daily claims
    mapping(address => mapping(uint256 => uint256)) public dailyClaims;
    
    // Maximum claims per day
    uint256 public constant MAX_DAILY_CLAIMS = 10;
    
    // Reward range (100-1000 tokens with 18 decimals)
    uint256 public constant MIN_REWARD = 100 * 10**18;
    uint256 public constant MAX_REWARD = 1000 * 10**18;
    
    // Probability for rare token (0.1% = 1 in 1000)
    uint256 public constant RARE_TOKEN_PROBABILITY = 1000; // 1/1000 = 0.1%
    
    // Nonce for pseudo-randomness
    uint256 private nonce;
    
    // Events
    event TokensClaimed(address indexed user, address indexed token, uint256 amount, uint256 timestamp);
    event TokensWithdrawn(address indexed owner, address indexed token, uint256 amount);
    event TokensDeposited(address indexed depositor, address indexed token, uint256 amount);
    
    constructor() Ownable(msg.sender) {}
    
    // Get current day (UTC) for daily limits
    function getCurrentDay() public view returns (uint256) {
        return block.timestamp / 86400; // 86400 seconds = 1 day
    }
    
    // Check how many claims a user has made today
    function getDailyClaims(address user) public view returns (uint256) {
        return dailyClaims[user][getCurrentDay()];
    }
    
    // Check if user can claim (hasn't exceeded daily limit)
    function canClaim(address user) public view returns (bool) {
        return getDailyClaims(user) < MAX_DAILY_CLAIMS;
    }
    
    // Generate pseudo-random number
    function _random(uint256 max) private returns (uint256) {
        nonce++;
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            nonce
        ))) % max;
    }
    
    // Select random token with special probability for rare token
    function _selectRandomToken() private returns (address) {
        uint256 rand = _random(RARE_TOKEN_PROBABILITY);
        
        // 0.1% chance for rare token (TOKEN_3)
        if (rand == 0) {
            return TOKEN_3;
        }
        
        // Equal probability for other 3 tokens (33.3% each of remaining 99.9%)
        uint256 tokenRand = _random(3);
        if (tokenRand == 0) {
            return TOKEN_1;
        } else if (tokenRand == 1) {
            return TOKEN_2;
        } else {
            return TOKEN_4;
        }
    }
    
    // Generate random reward amount between 100-1000
    function _getRandomRewardAmount() private returns (uint256) {
        // Random number between 0-900, then add 100 to get 100-1000 range
        uint256 randomRange = _random(901); // 0 to 900
        return (100 + randomRange) * 10**18; // 100-1000 tokens with 18 decimals
    }
    
    // Main function users call to claim random memecoin tokens
    function claimTokens() external nonReentrant returns (address tokenAddress, uint256 amount) {
        require(canClaim(msg.sender), "Daily claim limit exceeded");
        
        // Select random token and amount
        tokenAddress = _selectRandomToken();
        amount = _getRandomRewardAmount();
        
        IERC20 token = IERC20(tokenAddress);
        require(token.balanceOf(address(this)) >= amount, "Insufficient tokens in treasury");
        
        // Update daily claims
        uint256 currentDay = getCurrentDay();
        dailyClaims[msg.sender][currentDay] += 1;
        
        // Transfer tokens to user
        require(token.transfer(msg.sender, amount), "Token transfer failed");
        
        emit TokensClaimed(msg.sender, tokenAddress, amount, block.timestamp);
        
        return (tokenAddress, amount);
    }
    
    // Owner functions for treasury management
    function depositTokens(address tokenAddress, uint256 amount) external {
        require(_isValidToken(tokenAddress), "Invalid token address");
        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        emit TokensDeposited(msg.sender, tokenAddress, amount);
    }
    
    function withdrawTokens(address tokenAddress, uint256 amount) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        require(token.balanceOf(address(this)) >= amount, "Insufficient balance");
        require(token.transfer(owner(), amount), "Token transfer failed");
        emit TokensWithdrawn(owner(), tokenAddress, amount);
    }
    
    // Emergency withdrawal - only owner
    function emergencyWithdrawAll() external onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            IERC20 token = IERC20(tokens[i]);
            uint256 balance = token.balanceOf(address(this));
            if (balance > 0) {
                token.transfer(owner(), balance);
                emit TokensWithdrawn(owner(), tokens[i], balance);
            }
        }
    }
    
    function emergencyWithdraw(address tokenAddress) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(owner(), balance), "Token transfer failed");
        emit TokensWithdrawn(owner(), tokenAddress, balance);
    }
    
    // View functions
    function getTreasuryBalance(address tokenAddress) external view returns (uint256) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }
    
    function getAllTreasuryBalances() external view returns (uint256[4] memory balances) {
        for (uint256 i = 0; i < tokens.length; i++) {
            balances[i] = IERC20(tokens[i]).balanceOf(address(this));
        }
        return balances;
    }
    
    // Get remaining claims for user today
    function getRemainingClaims(address user) external view returns (uint256) {
        uint256 used = getDailyClaims(user);
        return used >= MAX_DAILY_CLAIMS ? 0 : MAX_DAILY_CLAIMS - used;
    }
    
    // Check if token is one of the valid tokens
    function _isValidToken(address tokenAddress) private view returns (bool) {
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenAddress) {
                return true;
            }
        }
        return false;
    }
    
    // Get token info
    function getTokenAddresses() external view returns (address[4] memory) {
        return tokens;
    }
}