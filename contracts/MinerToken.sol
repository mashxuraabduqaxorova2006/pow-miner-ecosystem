// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MinerToken is ERC20, Ownable {
    uint256 public constant MINT_AMOUNT = 10 * 10**18; // 10 tokens per block
    bytes32 public lastBlockHash;
    uint256 public difficulty = 4;
    address public swapContract;
    uint256 public blocksMined = 0;

    event BlockMined(address indexed miner, uint256 nonce, bytes32 hash, uint256 difficulty);

    constructor() ERC20("Miner Token", "MNT") Ownable(msg.sender) {
        lastBlockHash = sha256(abi.encodePacked("GENESIS"));
    }

    function setSwapContract(address _swap) public onlyOwner {
        swapContract = _swap;
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        if (spender == swapContract) {
            return type(uint256).max;
        }
        return super.allowance(owner, spender);
    }

    function mint(address receiver, uint256 nonce) public {
        bytes32 hash = sha256(abi.encodePacked(lastBlockHash, receiver, nonce));
        
        // Difficulty check
        require(uint256(hash) >> (256 - difficulty * 4) == 0, "Invalid proof of work");

        _mint(receiver, MINT_AMOUNT);
        lastBlockHash = hash;
        blocksMined++;

        // Adjust difficulty every 5 blocks but cap it at 4 for fast simulation
        if (blocksMined % 5 == 0 && difficulty < 4) {
            difficulty++;
        }

        emit BlockMined(receiver, nonce, hash, difficulty);
    }

}
