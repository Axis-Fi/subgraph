import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

import { ERC20 } from "../../generated/BatchAuctionHouse/ERC20";
import { Token } from "../../generated/schema";

function _getERC20Contract(address: Bytes): ERC20 {
  return ERC20.bind(Address.fromBytes(address));
}

export function getTokenBalance(address: Bytes, account: Address): BigInt {
  const tokenContract: ERC20 = _getERC20Contract(address);

  return tokenContract.balanceOf(account);
}

export function getOrCreateToken(address: Bytes): Token {
  let token = Token.load(address);
  if (token == null) {
    token = new Token(address);

    // Populate token data
    token.address = address;

    const tokenContract: ERC20 = _getERC20Contract(address);

    token.name = tokenContract.name();
    token.symbol = tokenContract.symbol();
    token.decimals = tokenContract.decimals();
    token.totalSupply = tokenContract.totalSupply();

    token.save();
  }

  return token as Token;
}
