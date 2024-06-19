import {
  Address,
  BigInt,
  Bytes,
  dataSource,
  log,
} from "@graphprotocol/graph-ts";

import { AuctionCreated } from "../../generated/BatchAuctionHouse/BatchAuctionHouse";
import { LinearVesting } from "../../generated/BatchLinearVesting/LinearVesting";
import { BatchAuctionLot, BatchLinearVestingLot } from "../../generated/schema";
import { toISO8601String } from "../helpers/date";
import { fromSlicedBytes } from "../helpers/number";

export const LV_KEYCODE = "LIV";

function _getLinearVestingLotId(
  linearVestingModule: Address,
  tokenId: BigInt,
): string {
  return (
    dataSource.network() +
    "-" +
    linearVestingModule.toHexString() +
    "-" +
    tokenId.toString()
  );
}

function _getLinearVestingModule(moduleAddress: Address): LinearVesting {
  return LinearVesting.bind(moduleAddress);
}

export function getTokenId(
  linearVestingModule: Address,
  baseToken: Address,
  derivativeParams: Bytes,
): BigInt {
  const linearVesting = _getLinearVestingModule(linearVestingModule);

  return linearVesting.computeId(baseToken, derivativeParams);
}

export function getTokenDecimals(
  linearVestingModule: Address,
  tokenId: BigInt,
): number {
  const linearVesting = _getLinearVestingModule(linearVestingModule);

  return linearVesting.decimals(tokenId);
}

export function getBalanceOf(
  linearVestingModule: Address,
  account: Address,
  tokenId: BigInt,
): BigInt {
  const linearVesting = _getLinearVestingModule(linearVestingModule);

  return linearVesting.balanceOf(account, tokenId);
}

export function createLinearVestingLot(
  batchAuctionLot: BatchAuctionLot,
  createdEvent: AuctionCreated,
  derivativeParams: Bytes,
): void {
  // Determine the tokenId
  const tokenId: BigInt = getTokenId(
    createdEvent.address,
    batchAuctionLot.baseToken,
    derivativeParams,
  );

  // Create the lot
  const lvLotId: string = _getLinearVestingLotId(createdEvent.address, tokenId);
  const lvLot: BatchLinearVestingLot = new BatchLinearVestingLot(lvLotId);
  lvLot.lot = batchAuctionLot.id;
  log.info("Adding BatchLinearVestingLot for lot: {}", [lvLot.lot]);

  // Decode the parameters
  // uint48, uint48

  // Get the first 32 characters of the derivativeParams
  const start: BigInt = fromSlicedBytes(derivativeParams, 0, 32);
  // Get the next 32 characters of the derivativeParams
  const expiry: BigInt = fromSlicedBytes(derivativeParams, 32, 64);

  lvLot.startTimestamp = start;
  lvLot.startDate = toISO8601String(start);
  lvLot.expiryTimestamp = expiry;
  lvLot.expiryDate = toISO8601String(expiry);
  lvLot.save();
}

export function getLinearVestingLot(
  moduleAddress: Address,
  tokenId: BigInt,
): BatchLinearVestingLot | null {
  const lvLotId: string = _getLinearVestingLotId(moduleAddress, tokenId);
  const lvLot = BatchLinearVestingLot.load(lvLotId);

  return lvLot;
}
