import { Address, BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  afterEach,
  assert,
  beforeEach,
  clearStore,
  dataSourceMock,
  describe,
  test,
} from "matchstick-as/assembly/index";

import {
  AuctionCancelled,
  AuctionCreated,
} from "../generated/BatchAuctionHouse/BatchAuctionHouse";
import {
  BatchAuctionCancelled,
  BatchAuctionCreated,
  BatchAuctionLot,
  BatchEncryptedMarginalPriceLot,
} from "../generated/schema";
import {
  handleAuctionCancelled,
  handleAuctionCreated,
} from "../src/batchAuctionHouse";
import { toDecimal } from "../src/helpers/number";
import {
  assertBigDecimalEquals,
  assertBigIntEquals,
  assertBooleanEquals,
  assertBytesEquals,
  assertNull,
  assertStringEquals,
} from "./assert";
import {
  createAuctionCancelledEvent,
  createAuctionCreatedEvent,
} from "./auction-house-utils";
import { mockGetModuleForVeecode } from "./mocks/baseAuctionHouse";
import { mockGetModuleForId } from "./mocks/baseAuctionHouse";
import { mockLotRouting } from "./mocks/baseAuctionHouse";
import { mockLotFees } from "./mocks/baseAuctionHouse";
import { mockLotData } from "./mocks/batchAuctionHouse";
import { mockEmpAuctionData, mockEmpPartialFill } from "./mocks/emp";
import { mockToken } from "./mocks/token";

const auctionModuleVeecode = "01EMPA";
const QUOTE_TOKEN = Address.fromString(
  "0x6B175474E89094C44Da98b954EedeAC495271d0F",
);
const BASE_TOKEN = Address.fromString(
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
);
const lotId = BigInt.fromI32(234);
const infoHash = "infoHashValueGoesHere";

// 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
const eventAddress: Address = Address.fromString(
  "0xa16081f360e3847006db660bae1c6d1b2e17ec2a",
);

const auctionModuleAddress: Address = Address.fromString(
  "0x87F2a19FBbf9e557a68bD35D85FAd20dEec40494",
);

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

describe("auction creation", () => {
  beforeEach(() => {
    const auctionRef = Bytes.fromUTF8(auctionModuleVeecode);
    auctionCreatedEvent = createAuctionCreatedEvent(
      lotId,
      auctionRef,
      infoHash,
    );
    setChain("mainnet");

    mockToken(
      BASE_TOKEN,
      "Wrapped Ether",
      "WETH",
      lotBaseTokenDecimals,
      BigInt.fromU64(1_000_000_000_000_000_000),
    );
    mockToken(
      QUOTE_TOKEN,
      "Dai",
      "DAI",
      lotQuoteTokenDecimals,
      BigInt.fromU64(1_000_000_000_000_000_000),
    );
    mockGetModuleForId(eventAddress, lotId, auctionModuleAddress);
    mockGetModuleForVeecode(
      eventAddress,
      auctionModuleVeecode,
      auctionModuleAddress,
    );
    mockLotData(
      auctionModuleAddress,
      lotId,
      lotStart,
      lotConclusion,
      lotQuoteTokenDecimals,
      lotBaseTokenDecimals,
      lotCapacityInQuote,
      lotCapacity,
      lotSold,
      lotPurchased,
    );
    mockLotRouting(
      eventAddress,
      lotId,
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
    mockLotFees(
      eventAddress,
      lotId,
      lotFeesCurator,
      lotFeesCuratorApproved,
      lotFeesCuratorFee,
      lotFeesProtocolFee,
      lotFeesReferrerFee,
    );
    mockEmpAuctionData(
      auctionModuleAddress,
      lotId,
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
      "mainnet-" + eventAddress.toHexString() + "-" + lotId.toString();

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
      lotId,
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
      auctionModuleVeecode,
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

let auctionCancelledEvent: AuctionCancelled;

describe("auction cancellation", () => {
  beforeEach(() => {
    const auctionRef = Bytes.fromUTF8(auctionModuleVeecode);
    auctionCreatedEvent = createAuctionCreatedEvent(
      lotId,
      auctionRef,
      infoHash,
    );
    setChain("mainnet");

    mockToken(
      BASE_TOKEN,
      "Wrapped Ether",
      "WETH",
      lotBaseTokenDecimals,
      BigInt.fromU64(1_000_000_000_000_000_000),
    );
    mockToken(
      QUOTE_TOKEN,
      "Dai",
      "DAI",
      lotQuoteTokenDecimals,
      BigInt.fromU64(1_000_000_000_000_000_000),
    );
    mockGetModuleForId(eventAddress, lotId, auctionModuleAddress);
    mockGetModuleForVeecode(
      eventAddress,
      auctionModuleVeecode,
      auctionModuleAddress,
    );
    mockLotData(
      auctionModuleAddress,
      lotId,
      lotStart,
      lotConclusion,
      lotQuoteTokenDecimals,
      lotBaseTokenDecimals,
      lotCapacityInQuote,
      lotCapacity,
      lotSold,
      lotPurchased,
    );
    mockLotRouting(
      eventAddress,
      lotId,
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
    mockLotFees(
      eventAddress,
      lotId,
      lotFeesCurator,
      lotFeesCuratorApproved,
      lotFeesCuratorFee,
      lotFeesProtocolFee,
      lotFeesReferrerFee,
    );
    mockEmpAuctionData(
      auctionModuleAddress,
      lotId,
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

    handleAuctionCreated(auctionCreatedEvent);

    // Update mocks
    mockLotData(
      auctionModuleAddress,
      lotId,
      lotStart,
      lotConclusion,
      lotQuoteTokenDecimals,
      lotBaseTokenDecimals,
      lotCapacityInQuote,
      BigInt.zero(),
      lotSold,
      lotPurchased,
    );
    mockEmpAuctionData(
      auctionModuleAddress,
      lotId,
      0,
      0,
      2, // Settled
      0,
      BigInt.zero(),
      empMinPrice,
      empMinFilled,
      empMinBidSize,
      empPublicKeyX,
      empPublicKeyY,
      BigInt.zero(),
    );
    mockEmpPartialFill(
      auctionModuleAddress,
      lotId,
      false,
      0,
      BigInt.zero(),
      BigInt.zero(),
    );

    auctionCancelledEvent = createAuctionCancelledEvent(lotId, auctionRef);
  });

  afterEach(() => {
    clearStore();
  });

  test("AuctionCancelled created and stored", () => {
    handleAuctionCancelled(auctionCancelledEvent);

    const recordId =
      "mainnet-" + eventAddress.toHexString() + "-" + lotId.toString();

    // BatchAuctionCancelled record is created
    assert.entityCount("BatchAuctionCancelled", 1);
    const batchAuctionCancelledRecord = BatchAuctionCancelled.load(recordId);
    if (batchAuctionCancelledRecord === null) {
      throw new Error(
        "Expected BatchAuctionCancelled to exist for record id " + recordId,
      );
    }
    assertStringEquals(
      batchAuctionCancelledRecord.id,
      recordId,
      "BatchAuctionCancelled: id",
    );
    assertStringEquals(
      batchAuctionCancelledRecord.lot,
      recordId,
      "BatchAuctionCancelled: lot",
    );
    assertBytesEquals(
      batchAuctionCancelledRecord.auctionRef,
      Bytes.fromUTF8(auctionModuleVeecode),
      "BatchAuctionCancelled: auctionRef",
    );

    // BatchAuctionLot record is updated
    assert.entityCount("BatchAuctionLot", 1);
    const batchAuctionLotRecord = BatchAuctionLot.load(recordId);
    if (batchAuctionLotRecord === null) {
      throw new Error(
        "Expected BatchAuctionLot to exist for record id " + recordId,
      );
    }
    assertBigDecimalEquals(
      batchAuctionLotRecord.capacity,
      BigDecimal.zero(),
      "BatchAuctionLot: capacity",
    );

    // BatchEncryptedMarginalPriceLot record is updated
    assert.entityCount("BatchEncryptedMarginalPriceLot", 1);
    const empLotRecord = BatchEncryptedMarginalPriceLot.load(recordId);
    if (empLotRecord === null) {
      throw new Error(
        "Expected BatchEncryptedMarginalPriceLot to exist for record id " +
          recordId,
      );
    }
    assertStringEquals(
      empLotRecord.status,
      "Settled",
      "BatchEncryptedMarginalPriceLot: status",
    );
    assertBigDecimalEquals(
      empLotRecord.marginalPrice,
      BigDecimal.zero(),
      "BatchEncryptedMarginalPriceLot: marginalPrice",
    );
    assertBooleanEquals(
      empLotRecord.hasPartialFill,
      false,
      "BatchEncryptedMarginalPriceLot: hasPartialFill",
    );
    assertBigIntEquals(
      empLotRecord.partialBidId,
      null,
      "BatchEncryptedMarginalPriceLot: partialBidId",
    );
  });
});
