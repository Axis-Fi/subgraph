import {
  Address,
  BigInt,
  Bytes,
  ethereum,
  Wrapped,
} from "@graphprotocol/graph-ts";

export const defaultLogIndex = BigInt.fromI32(1);
export const defaultTransactionLogIndex = BigInt.fromI32(1);
export const defaultEventDataLogType = "default_log_type";

const defaultBigInt = BigInt.fromI32(1);
export const defaultAddress = Address.fromString(
  "0xA16081F360e3847006dB660bae1c6d1b2e17eC2A",
);
const defaultAddressBytes = defaultAddress as Bytes;
const defaultIntBytes = Bytes.fromI32(1);

function newLog(): ethereum.Log {
  return new ethereum.Log(
    defaultAddress,
    [defaultAddressBytes],
    defaultAddressBytes,
    defaultAddressBytes,
    defaultIntBytes,
    defaultAddressBytes,
    defaultBigInt,
    defaultBigInt,
    defaultBigInt,
    defaultEventDataLogType,
    new Wrapped(false),
  );
}

function newBlock(): ethereum.Block {
  return new ethereum.Block(
    defaultAddressBytes,
    defaultAddressBytes,
    defaultAddressBytes,
    defaultAddress,
    defaultAddressBytes,
    defaultAddressBytes,
    defaultAddressBytes,
    defaultBigInt,
    defaultBigInt,
    defaultBigInt,
    defaultBigInt,
    defaultBigInt,
    defaultBigInt,
    defaultBigInt,
    defaultBigInt,
  );
}

function newTransaction(): ethereum.Transaction {
  return new ethereum.Transaction(
    defaultAddressBytes,
    defaultBigInt,
    defaultAddress,
    defaultAddress,
    defaultBigInt,
    defaultBigInt,
    defaultBigInt,
    defaultAddressBytes,
    defaultBigInt,
  );
}

function newTransactionReceipt(): ethereum.TransactionReceipt {
  return new ethereum.TransactionReceipt(
    defaultAddressBytes,
    defaultBigInt,
    defaultAddressBytes,
    defaultBigInt,
    defaultBigInt,
    defaultBigInt,
    defaultAddress,
    [newLog()],
    defaultBigInt,
    defaultAddressBytes,
    defaultAddressBytes,
  );
}

export function newMockEvent(contract: Address): ethereum.Event {
  return new ethereum.Event(
    contract,
    defaultLogIndex,
    defaultTransactionLogIndex,
    defaultEventDataLogType,
    newBlock(),
    newTransaction(),
    [],
    newTransactionReceipt(),
  );
}
