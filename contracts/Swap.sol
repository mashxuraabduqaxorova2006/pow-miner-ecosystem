// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Swap is Ownable {
    IERC20 public token;
    uint256 public rate = 100; // 100 MNT = 1 ETH

    mapping(string => address) public assetTokens;

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }

    receive() external payable {}

    function setAssetToken(string memory asset, address tokenAddress) public onlyOwner {
        assetTokens[asset] = tokenAddress;
    }

    function swapForAsset(address user, uint256 amount, string memory asset) public {
        require(token.balanceOf(user) >= amount, "Insufficient MNT balance");
        address assetTokenAddr = assetTokens[asset];
        require(assetTokenAddr != address(0), "Asset not supported");

        IERC20 assetToken = IERC20(assetTokenAddr);
        uint256 assetAmount;
        
        if (keccak256(abi.encodePacked(asset)) == keccak256(abi.encodePacked("USD"))) {
            assetAmount = amount * 25 / 10; // 1 MNT = 2.5 USD
        } else if (keccak256(abi.encodePacked(asset)) == keccak256(abi.encodePacked("BTC"))) {
            assetAmount = amount * 4 / 100000; // 1 MNT = 0.00004 BTC
        }

        require(assetToken.balanceOf(address(this)) >= assetAmount, "Insufficient asset liquidity");

        token.transferFrom(user, address(this), amount);
        assetToken.transfer(user, assetAmount);
    }

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
