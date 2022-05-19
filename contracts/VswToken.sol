//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VswToken is ERC20, Ownable {

    constructor() ERC20("VswToken", "VSW") {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // / (UPDATE) `transferOwnership` is already an externally-facing method inherited from `Ownable`
    // / Thanks @brianunlam for pointing this out
    // /
    // / function _transferOwnership(address newOwner) public onlyOwner {
    // /     transferOwnership(newOwner);
    // / }
}