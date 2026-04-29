// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Swap is Ownable {
    IERC20 public token;
    uint256 public rate = 100; // 100 MNT = 1 ETH (for demo)

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }

    // Allow the contract to receive ETH
    receive() external payable {}

    function swapTokensForEth(uint256 amount) public {
        _swap(msg.sender, amount);
    }

    // Allows a relayer to pay gas for the user
    function swapFor(address user, uint256 amount) public {
        _swap(user, amount);
    }

    function _swap(address user, uint256 amount) internal {
        require(token.balanceOf(user) >= amount, "Insufficient token balance");
        uint256 ethAmount = amount / rate;
        require(address(this).balance >= ethAmount, "Insufficient ETH in contract");

        token.transferFrom(user, address(this), amount);
        payable(user).transfer(ethAmount);
    }

    function withdrawTokens() public onlyOwner {
        token.transfer(owner(), token.balanceOf(address(this)));
    }

    function withdrawEth() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
