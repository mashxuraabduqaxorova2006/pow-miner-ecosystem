// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EggToken is ERC20, Ownable {
    constructor() ERC20("Egg Token", "EGG") Ownable(msg.sender) {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}

contract EggGame is Ownable {
    EggToken public rewardToken;
    uint256 public hatchThreshold = 100;
    
    struct UserStats {
        uint256 totalClicks;
        uint256 totalHatched;
        uint256 lastHatchTimestamp;
    }
    
    mapping(address => UserStats) public userStats;
    
    event Clicked(address indexed user, uint256 totalClicks);
    event Hatched(address indexed user, uint256 rewardAmount);
    event BoosterPurchased(address indexed user, string boosterType, uint256 cost);

    constructor() Ownable(msg.sender) {
        rewardToken = new EggToken();
    }

    function hatch() public {
        uint256 reward = 10 * 10**18;
        userStats[msg.sender].totalHatched += 1;
        userStats[msg.sender].lastHatchTimestamp = block.timestamp;
        
        rewardToken.mint(msg.sender, reward);
        
        emit Hatched(msg.sender, reward);
    }

    function buyBooster(string memory boosterType, uint256 cost) public {
        require(rewardToken.balanceOf(msg.sender) >= cost, "Insufficient EGG tokens");
        emit BoosterPurchased(msg.sender, boosterType, cost);
    }
    
    function getStats(address user) public view returns (uint256 clicks, uint256 hatched) {
        return (userStats[user].totalClicks, userStats[user].totalHatched);
    }
}
