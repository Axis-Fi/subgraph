import {
  Address,
  BigDecimal,
  BigInt,
  Bytes,
  ethereum,
} from "@graphprotocol/graph-ts";
import {
  afterEach,
  assert,
  beforeEach,
  clearStore,
  dataSourceMock,
  describe,
  mockFunction,
  test,
} from "matchstick-as/assembly/index";

import { AuctionCreated } from "../generated/BatchAuctionHouse/BatchAuctionHouse";
import {
  BatchAuctionCreated,
  BatchAuctionLot,
  BatchEncryptedMarginalPriceLot,
} from "../generated/schema";
import { handleAuctionCreated } from "../src/batchAuctionHouse";
import { toDecimal } from "../src/helpers/number";
import {
  assertBigDecimalEquals,
  assertBigIntEquals,
  assertBooleanEquals,
  assertBytesEquals,
  assertNull,
  assertStringEquals,
} from "./assert";
import { createAuctionCreatedEvent } from "./auction-house-utils";

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

// describe("Describe entity assertions", () => {
//   beforeAll(() => {
//     const id = BigInt.fromI32(234);
//     const auctionRef = Bytes.fromI32(1234567890);
//     const newAuctionCancelledEvent = createAuctionCancelledEvent(
//       id,
//       auctionRef,
//     );
//     handleAuctionCancelled(newAuctionCancelledEvent);
//   });

//   afterAll(() => {
//     clearStore();
//   });

//   // For more test scenarios, see:
//   // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

//   test("AuctionCancelled created and stored", () => {
//     assert.entityCount("AuctionCancelled", 1);

//     // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
//     assert.fieldEquals(
//       "AuctionCancelled",
//       "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
//       "auctionRef",
//       "1234567890",
//     );

//     // More assert options:
//     // https://thegraph.com/docs/en/developer/matchstick/#asserts
//   });
// });

const QUOTE_TOKEN = Address.fromString(
  "0x6B175474E89094C44Da98b954EedeAC495271d0F",
);
const BASE_TOKEN = Address.fromString(
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
);
const id = BigInt.fromI32(234);
const infoHash = "infoHashValueGoesHere";

// 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
const eventAddress: Address = Address.fromString(
  "0xa16081f360e3847006db660bae1c6d1b2e17ec2a",
);

const auctionModuleAddress: string =
  "0x87F2a19FBbf9e557a68bD35D85FAd20dEec40494";

const SELLER: Address = Address.fromString(
  "0x0000000000000000000000000000000000000001",
);

const lotStart: BigInt = BigInt.fromI32(1620000000);
const lotConclusion: BigInt = BigInt.fromI32(1630000000);
const lotQuoteTokenDecimals: i32 = 17;
const lotBaseTokenDecimals: i32 = 21;
const lotCapacityInQuote: boolean = false;
const lotCapacity: BigInt = BigInt.fromU64(1_000_000_000_000_000_000);
const lotSold: BigInt = BigInt.fromI32(0);
const lotPurchased: BigInt = BigInt.fromI32(0);

const lotFeesCurator = Address.fromString(
  "0x1234567890123456789012345678901234567890",
);
const lotFeesCuratorApproved: boolean = false;
const lotFeesCuratorFee: i32 = 100;
const lotFeesProtocolFee: i32 = 90;
const lotFeesReferrerFee: i32 = 80;

const empMinPrice: BigInt = BigInt.fromU64(1_000_000_000_000_000_000);
const empMinFilled: BigInt = BigInt.fromU64(2_000_000_000_000_000_000);
const empMinBidSize: BigInt = BigInt.fromU64(3_000_000_000_000_000_000);
const empPublicKeyX: BigInt = BigInt.fromU64(222);
const empPublicKeyY: BigInt = BigInt.fromU64(333);

function setChain(chain: string): void {
  dataSourceMock.setNetwork(chain);
}

let auctionCreatedEvent: AuctionCreated;

function _mockGetModuleForId(lotId: BigInt): void {
  mockFunction(
    eventAddress,
    "getModuleForId",
    "getModuleForId(uint96):(address)",
    [ethereum.Value.fromUnsignedBigInt(lotId)],
    [ethereum.Value.fromAddress(Address.fromString(auctionModuleAddress))],
    false,
  );
}

function _mockGetModuleForVeecode(veecode: string): void {
  mockFunction(
    eventAddress,
    "getModuleForVeecode",
    "getModuleForVeecode(bytes7):(address)",
    [ethereum.Value.fromFixedBytes(Bytes.fromUTF8(veecode))],
    [ethereum.Value.fromAddress(Address.fromString(auctionModuleAddress))],
    false,
  );
}

function _mockLotData(
  lotId: BigInt,
  start: BigInt,
  conclusion: BigInt,
  quoteTokenDecimals: i32,
  baseTokenDecimals: i32,
  capacityInQuote: boolean,
  capacity: BigInt,
  sold: BigInt,
  purchased: BigInt,
): void {
  mockFunction(
    Address.fromString(auctionModuleAddress),
    "lotData",
    "lotData(uint96):(uint48,uint48,uint8,uint8,bool,uint256,uint256,uint256)",
    [ethereum.Value.fromUnsignedBigInt(lotId)],
    [
      ethereum.Value.fromUnsignedBigInt(start),
      ethereum.Value.fromUnsignedBigInt(conclusion),
      ethereum.Value.fromI32(quoteTokenDecimals),
      ethereum.Value.fromI32(baseTokenDecimals),
      ethereum.Value.fromBoolean(capacityInQuote),
      ethereum.Value.fromUnsignedBigInt(capacity),
      ethereum.Value.fromUnsignedBigInt(sold),
      ethereum.Value.fromUnsignedBigInt(purchased),
    ],
    false,
  );
}

function _mockLotRouting(
  lotId: BigInt,
  seller: Address,
  baseToken: Address,
  quoteToken: Address,
  auctionReference: Bytes,
  funding: BigInt,
  callbacks: Address,
  derivativeReference: Bytes,
  wrapDerivative: boolean,
  derivativeParams: Bytes,
): void {
  mockFunction(
    eventAddress,
    "lotRouting",
    "lotRouting(uint96):(address,address,address,bytes7,uint256,address,bytes7,bool,bytes)",
    [ethereum.Value.fromUnsignedBigInt(lotId)],
    [
      ethereum.Value.fromAddress(seller),
      ethereum.Value.fromAddress(baseToken),
      ethereum.Value.fromAddress(quoteToken),
      ethereum.Value.fromBytes(auctionReference),
      ethereum.Value.fromUnsignedBigInt(funding),
      ethereum.Value.fromAddress(callbacks),
      ethereum.Value.fromBytes(derivativeReference),
      ethereum.Value.fromBoolean(wrapDerivative),
      ethereum.Value.fromBytes(derivativeParams),
    ],
    false,
  );
}

function _mockLotFees(
  lotId: BigInt,
  curator: Address,
  curatorApproved: boolean,
  curatorFee: i32,
  protocolFee: i32,
  referrerFee: i32,
): void {
  mockFunction(
    eventAddress,
    "lotFees",
    "lotFees(uint96):(address,bool,uint48,uint48,uint48)",
    [ethereum.Value.fromUnsignedBigInt(lotId)],
    [
      ethereum.Value.fromAddress(curator),
      ethereum.Value.fromBoolean(curatorApproved),
      ethereum.Value.fromI32(curatorFee),
      ethereum.Value.fromI32(protocolFee),
      ethereum.Value.fromI32(referrerFee),
    ],
    false,
  );
}

function _mockToken(
  address: Address,
  name: string,
  symbol: string,
  decimals: i32,
  totalSupply: BigInt,
): void {
  mockFunction(
    address,
    "name",
    "name():(string)",
    [],
    [ethereum.Value.fromString(name)],
    false,
  );
  mockFunction(
    address,
    "symbol",
    "symbol():(string)",
    [],
    [ethereum.Value.fromString(symbol)],
    false,
  );
  mockFunction(
    address,
    "decimals",
    "decimals():(uint8)",
    [],
    [ethereum.Value.fromI32(decimals)],
    false,
  );
  mockFunction(
    address,
    "totalSupply",
    "totalSupply():(uint256)",
    [],
    [ethereum.Value.fromUnsignedBigInt(totalSupply)],
    false,
  );
}

function _mockEmpAuctionData(
  lotId: BigInt,
  nextBidId: i32,
  nextDecryptIndex: i32,
  status: i32,
  marginalBidId: i32,
  marginalPrice: BigInt,
  minPrice: BigInt,
  minFilled: BigInt,
  minBidSize: BigInt,
  publicKeyX: BigInt,
  publicKeyY: BigInt,
  privateKey: BigInt,
): void {
  const publicKey: ethereum.Tuple = changetype<ethereum.Tuple>([
    ethereum.Value.fromUnsignedBigInt(publicKeyX),
    ethereum.Value.fromUnsignedBigInt(publicKeyY),
  ]);

  mockFunction(
    Address.fromString(auctionModuleAddress),
    "auctionData",
    "auctionData(uint96):(uint64,uint64,uint8,uint64,uint256,uint256,uint256,uint256,(uint256,uint256),uint256)",
    [ethereum.Value.fromUnsignedBigInt(lotId)],
    [
      ethereum.Value.fromI32(nextBidId),
      ethereum.Value.fromI32(nextDecryptIndex),
      ethereum.Value.fromI32(status),
      ethereum.Value.fromI32(marginalBidId),
      ethereum.Value.fromUnsignedBigInt(marginalPrice),
      ethereum.Value.fromUnsignedBigInt(minPrice),
      ethereum.Value.fromUnsignedBigInt(minFilled),
      ethereum.Value.fromUnsignedBigInt(minBidSize),
      ethereum.Value.fromTuple(publicKey),
      ethereum.Value.fromUnsignedBigInt(privateKey),
    ],
    false,
  );
}

describe("auction creation", () => {
  beforeEach(() => {
    const auctionRef = Bytes.fromUTF8("01EMPA");
    auctionCreatedEvent = createAuctionCreatedEvent(id, auctionRef, infoHash);
    setChain("mainnet");

    _mockToken(
      BASE_TOKEN,
      "Wrapped Ether",
      "WETH",
      lotBaseTokenDecimals,
      BigInt.fromU64(1_000_000_000_000_000_000),
    );
    _mockToken(
      QUOTE_TOKEN,
      "Dai",
      "DAI",
      lotQuoteTokenDecimals,
      BigInt.fromU64(1_000_000_000_000_000_000),
    );
    _mockGetModuleForId(id);
    _mockGetModuleForVeecode("01EMPA");
    _mockLotData(
      id,
      lotStart,
      lotConclusion,
      lotQuoteTokenDecimals,
      lotBaseTokenDecimals,
      lotCapacityInQuote,
      lotCapacity,
      lotSold,
      lotPurchased,
    );
    _mockLotRouting(
      id,
      SELLER,
      BASE_TOKEN,
      QUOTE_TOKEN,
      auctionRef,
      lotCapacity,
      Address.zero(),
      Bytes.fromUTF8(""),
      false,
      Bytes.fromUTF8(""),
    );
    _mockLotFees(
      id,
      lotFeesCurator,
      lotFeesCuratorApproved,
      lotFeesCuratorFee,
      lotFeesProtocolFee,
      lotFeesReferrerFee,
    );
    _mockEmpAuctionData(
      id,
      0,
      0,
      0,
      0,
      BigInt.zero(),
      empMinPrice,
      empMinFilled,
      empMinBidSize,
      empPublicKeyX,
      empPublicKeyY,
      BigInt.zero(),
    );
  });

  afterEach(() => {
    clearStore();
  });

  test("AuctionCreated created and stored", () => {
    handleAuctionCreated(auctionCreatedEvent);

    const recordId =
      "mainnet-" + eventAddress.toHexString() + "-" + id.toString();

    // BatchAuctionCreated record is created
    assert.entityCount("BatchAuctionCreated", 1);
    const batchAuctionCreatedRecord = BatchAuctionCreated.load(recordId);
    if (batchAuctionCreatedRecord === null) {
      throw new Error(
        "Expected BatchAuctionCreated to exist for record id " + recordId,
      );
    }
    assertStringEquals(
      batchAuctionCreatedRecord.id,
      recordId,
      "BatchAuctionCreated: id",
    );
    assertStringEquals(
      batchAuctionCreatedRecord.lot,
      recordId,
      "BatchAuctionCreated: lot",
    );
    assertStringEquals(
      batchAuctionCreatedRecord.infoHash,
      infoHash,
      "BatchAuctionCreated: infoHash",
    );

    // BatchAuctionLot record is created
    assert.entityCount("BatchAuctionLot", 1);
    const batchAuctionLotRecord = BatchAuctionLot.load(recordId);
    if (batchAuctionLotRecord === null) {
      throw new Error(
        "Expected BatchAuctionLot to exist for record id " + recordId,
      );
    }

    assertStringEquals(
      batchAuctionLotRecord.id,
      recordId,
      "BatchAuctionLot: id",
    );
    assertStringEquals(
      batchAuctionLotRecord.chain,
      "mainnet",
      "BatchAuctionLot: chain",
    );
    assertBytesEquals(
      batchAuctionLotRecord.auctionHouse,
      eventAddress,
      "BatchAuctionLot: auctionHouse",
    );
    assertBigIntEquals(
      batchAuctionLotRecord.lotId,
      id,
      "BatchAuctionLot: lotId",
    );
    // Lot details
    assertBigDecimalEquals(
      batchAuctionLotRecord.capacityInitial,
      toDecimal(lotCapacity, lotBaseTokenDecimals),
      "BatchAuctionLot: capacityInitial",
    );
    assertBigIntEquals(
      batchAuctionLotRecord.start,
      lotStart,
      "BatchAuctionLot: start",
    );
    assertBigIntEquals(
      batchAuctionLotRecord.conclusion,
      lotConclusion,
      "BatchAuctionLot: conclusion",
    );
    // Routing details
    assertStringEquals(
      batchAuctionLotRecord.auctionType,
      "01EMPA",
      "BatchAuctionLot: auctionType",
    );
    assertBytesEquals(
      batchAuctionLotRecord.baseToken,
      BASE_TOKEN,
      "BatchAuctionLot: baseToken",
    );
    assertBytesEquals(
      batchAuctionLotRecord.quoteToken,
      QUOTE_TOKEN,
      "BatchAuctionLot: quoteToken",
    );
    assertBytesEquals(
      batchAuctionLotRecord.seller,
      SELLER,
      "BatchAuctionLot: seller",
    );
    assertNull(
      batchAuctionLotRecord.derivativeType,
      "BatchAuctionLot: derivativeType",
    );
    assertBooleanEquals(
      batchAuctionLotRecord.wrapDerivative,
      false,
      "BatchAuctionLot: wrapDerivative",
    );
    // Fee details
    assertBytesEquals(
      batchAuctionLotRecord.curator,
      lotFeesCurator,
      "BatchAuctionLot: curator",
    );
    assertBooleanEquals(
      batchAuctionLotRecord.curatorApproved,
      lotFeesCuratorApproved,
      "BatchAuctionLot: curatorApproved",
    );
    assertBigDecimalEquals(
      batchAuctionLotRecord.curatorFee,
      BigDecimal.fromString("0.001"),
      "BatchAuctionLot: curatorFee",
    );
    assertBigDecimalEquals(
      batchAuctionLotRecord.protocolFee,
      BigDecimal.fromString("0.0009"),
      "BatchAuctionLot: protocolFee",
    );
    assertBigDecimalEquals(
      batchAuctionLotRecord.referrerFee,
      BigDecimal.fromString("0.0008"),
      "BatchAuctionLot: referrerFee",
    );
    // Initial values
    assertBigDecimalEquals(
      batchAuctionLotRecord.capacity,
      toDecimal(lotCapacity, lotBaseTokenDecimals),
      "BatchAuctionLot: capacity",
    );
    assertBigDecimalEquals(
      batchAuctionLotRecord.sold,
      BigDecimal.zero(),
      "BatchAuctionLot: sold",
    );
    assertBigDecimalEquals(
      batchAuctionLotRecord.purchased,
      BigDecimal.zero(),
      "BatchAuctionLot: purchased",
    );
    // Bid
    assertBigIntEquals(
      batchAuctionLotRecord.maxBidId,
      BigInt.zero(),
      "BatchAuctionLot: maxBidId",
    );

    // Encrypted marginal price record is created
    assert.entityCount("BatchEncryptedMarginalPriceLot", 1);
    const empLotRecord = BatchEncryptedMarginalPriceLot.load(recordId);
    if (empLotRecord === null) {
      throw new Error(
        "Expected BatchEncryptedMarginalPriceLot to exist for record id " +
          recordId,
      );
    }

    assertStringEquals(
      empLotRecord.id,
      recordId,
      "BatchEncryptedMarginalPriceLot: id",
    );
    assertStringEquals(
      empLotRecord.lot,
      recordId,
      "BatchEncryptedMarginalPriceLot: lot",
    );
    assertStringEquals(
      empLotRecord.status,
      "Started",
      "BatchEncryptedMarginalPriceLot: status",
    );
    assertBigDecimalEquals(
      empLotRecord.minPrice,
      toDecimal(empMinPrice, lotQuoteTokenDecimals),
      "BatchEncryptedMarginalPriceLot: minPrice",
    );
    assertBigDecimalEquals(
      empLotRecord.minFilled,
      toDecimal(empMinFilled, lotBaseTokenDecimals),
      "BatchEncryptedMarginalPriceLot: minFilled",
    );
    assertBigDecimalEquals(
      empLotRecord.minBidSize,
      toDecimal(empMinBidSize, lotQuoteTokenDecimals),
      "BatchEncryptedMarginalPriceLot: minBidSize",
    );
  });
});
