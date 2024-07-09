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

import { AuctionCancelled } from "../generated/BatchAuctionHouse/BatchAuctionHouse";
import {
  BatchAuctionAborted,
  BatchAuctionCancelled,
  BatchAuctionCreated,
  BatchAuctionLot,
  BatchBid,
  BatchBidClaimed,
  BatchBidCreated,
  BatchBidRefunded,
  BatchFixedPriceLot,
} from "../generated/schema";
import {
  handleAbort,
  handleAuctionCancelled,
  handleAuctionCreated,
  handleBid,
  handleBidClaimed,
  handleRefundBid,
  handleSettle,
} from "../src/batchAuctionHouse";
import { toDecimal } from "../src/helpers/number";
import {
  assertBigDecimalEquals,
  assertBigIntEquals,
  assertBooleanEquals,
  assertBytesEquals,
  assertI32Equals,
  assertNull,
  assertStringEquals,
} from "./assert";
import {
  createAuctionAbortedEvent,
  createAuctionCancelledEvent,
  createAuctionCreatedEvent,
  createBidEvent,
  createClaimBidEvent,
  createRefundBidEvent,
  createSettleEvent,
} from "./auction-house-utils";
import {
  getBatchAuctionLot,
  getBatchAuctionSettled,
  getBatchBid,
  getBatchBidClaimed,
  getBatchFixedPriceLot,
} from "./helpers/records";
import { mockGetModuleForVeecode } from "./mocks/baseAuctionHouse";
import { mockGetAuctionModuleForId } from "./mocks/baseAuctionHouse";
import { mockLotRouting } from "./mocks/baseAuctionHouse";
import { mockLotFees } from "./mocks/baseAuctionHouse";
import { mockLotData } from "./mocks/batchAuctionHouse";
import { defaultLogIndex, defaultTransactionHash } from "./mocks/event";
import {
  mockFpbAuctionData,
  mockFpbBid,
  mockFpbBidClaim,
  mockFpbParent,
  mockFpbPartialFill,
} from "./mocks/fpb";
import { mockToken } from "./mocks/token";

const auctionModuleVeecode = "01FPBA";
const auctionRef = Bytes.fromUTF8(auctionModuleVeecode);
const QUOTE_TOKEN = Address.fromString(
  "0x6B175474E89094C44Da98b954EedeAC495271d0F",
);
const BASE_TOKEN = Address.fromString(
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
);
const LOT_ID = BigInt.fromI32(234);
const infoHash = "infoHashValueGoesHere";
const auctionHouse: Address = Address.fromString(
  "0xBA00003Cc5713c5339f4fD5cA0339D54A88BC87b",
);
const auctionModuleAddress: Address = Address.fromString(
  "0x87F2a19FBbf9e557a68bD35D85FAd20dEec40494",
);
const SELLER: Address = Address.fromString(
  "0x0000000000000000000000000000000000000001",
);

// Lot
const lotStart: BigInt = BigInt.fromI32(1620000000);
const lotConclusion: BigInt = BigInt.fromI32(1630000000);
const lotQuoteTokenDecimals: i32 = 17;
const lotBaseTokenDecimals: i32 = 21;
const lotCapacityInQuote: boolean = false;
const lotCapacity: BigInt = BigInt.fromU64(10_000_000_000_000_000_000_000); // 10 e21
const lotSold: BigInt = BigInt.fromI32(0);
const lotPurchased: BigInt = BigInt.fromI32(0);

// FPB
const fpbPrice: BigInt = BigInt.fromU64(1_000_000_000_000_000_000); // 10 e17
const fpbMinFilled: BigInt = BigInt.fromU64(1_000_000_000_000_000_000); // 1e18 = 0.0001 e21

// Bids
const BID_ID_ONE: BigInt = BigInt.fromI32(1);
const BID_ID_TWO: BigInt = BigInt.fromI32(2);
const BID_ID_THREE: BigInt = BigInt.fromI32(3);
const BIDDER: Address = Address.fromString(
  "0x0000000000000000000000000000000000000002",
);
const bidReferrer: Address = Address.fromString(
  "0x0000000000000000000000000000000000000003",
);
const bidAmountIn: BigInt = BigInt.fromString("10_000_000_000_000_000_000"); // == 100 e17
const bidAmountOut: BigInt = BigInt.fromString(
  "10_000_000_000_000_000_000_000",
); // == 100 / 10 = 10
const bidPartialFillPayout = bidAmountOut.minus(BigInt.fromString("100000"));
const bidPartialFillRefund = BigInt.fromString("100000");

function setChain(chain: string): void {
  dataSourceMock.setNetwork(chain);
}

function _createAuctionLot(): void {
  const auctionCreatedEvent = createAuctionCreatedEvent(
    LOT_ID,
    auctionRef,
    infoHash,
    auctionHouse,
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
  mockGetAuctionModuleForId(auctionHouse, LOT_ID, auctionModuleAddress);
  mockGetModuleForVeecode(
    auctionHouse,
    auctionModuleVeecode,
    auctionModuleAddress,
  );
  mockLotData(
    auctionModuleAddress,
    LOT_ID,
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
    auctionHouse,
    LOT_ID,
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
  mockLotFees(auctionHouse, LOT_ID, Address.zero(), false, 0, 0, 0);
  mockFpbAuctionData(
    auctionModuleAddress,
    LOT_ID,
    fpbPrice,
    0,
    1,
    false,
    BigInt.zero(),
    fpbMinFilled,
  );

  handleAuctionCreated(auctionCreatedEvent);
}

function _createBidWithId(bidId: BigInt): void {
  const bidEvent = createBidEvent(
    LOT_ID,
    bidId,
    BIDDER,
    bidAmountIn,
    auctionHouse,
  );

  mockFpbBid(
    auctionModuleAddress,
    LOT_ID,
    bidId,
    BIDDER,
    bidAmountIn,
    bidReferrer,
    0, // Submitted
  );

  handleBid(bidEvent);
}

function _createBid(): void {
  _createBidWithId(BID_ID_ONE);
}

describe("auction creation", () => {
  beforeEach(() => {
    //
  });

  afterEach(() => {
    clearStore();
  });

  test("record created", () => {
    _createAuctionLot();

    const lotRecordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();
    const recordId = defaultTransactionHash
      .concatI32(defaultLogIndex.toI32())
      .concatI32(LOT_ID.toI32());

    // BatchAuctionCreated record is created
    assert.entityCount("BatchAuctionCreated", 1);
    const batchAuctionCreatedRecord = BatchAuctionCreated.load(recordId);
    if (batchAuctionCreatedRecord === null) {
      throw new Error(
        "Expected BatchAuctionCreated to exist for lot id " +
          LOT_ID.toString() +
          " at record id " +
          recordId.toHexString(),
      );
    }
    assertBytesEquals(
      batchAuctionCreatedRecord.id,
      recordId,
      "BatchAuctionCreated: id",
    );
    assertStringEquals(
      batchAuctionCreatedRecord.lot,
      lotRecordId,
      "BatchAuctionCreated: lot",
    );
    assertStringEquals(
      batchAuctionCreatedRecord.infoHash,
      infoHash,
      "BatchAuctionCreated: infoHash",
    );

    // BatchAuctionLot record is created
    assert.entityCount("BatchAuctionLot", 1);
    const batchAuctionLotRecord = getBatchAuctionLot(lotRecordId);

    assertStringEquals(
      batchAuctionLotRecord.id,
      lotRecordId,
      "BatchAuctionLot: id",
    );
    assertStringEquals(
      batchAuctionLotRecord.chain,
      "mainnet",
      "BatchAuctionLot: chain",
    );
    assertBytesEquals(
      batchAuctionLotRecord.auctionHouse,
      auctionHouse,
      "BatchAuctionLot: auctionHouse",
    );
    assertBigIntEquals(
      batchAuctionLotRecord.lotId,
      LOT_ID,
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
      null,
      "BatchAuctionLot: curator",
    );
    assertBooleanEquals(
      batchAuctionLotRecord.curatorApproved,
      false,
      "BatchAuctionLot: curatorApproved",
    );
    assertBigDecimalEquals(
      batchAuctionLotRecord.curatorFee,
      BigDecimal.zero(),
      "BatchAuctionLot: curatorFee",
    );
    assertBigDecimalEquals(
      batchAuctionLotRecord.protocolFee,
      BigDecimal.zero(),
      "BatchAuctionLot: protocolFee",
    );
    assertBigDecimalEquals(
      batchAuctionLotRecord.referrerFee,
      BigDecimal.zero(),
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

    // FixedPriceBatch record is created
    assert.entityCount("BatchFixedPriceLot", 1);
    const fpbLotRecord = BatchFixedPriceLot.load(lotRecordId);
    if (fpbLotRecord === null) {
      throw new Error(
        "Expected BatchFixedPriceLot to exist for record id " + lotRecordId,
      );
    }

    assertStringEquals(fpbLotRecord.id, lotRecordId, "BatchFixedPriceLot: id");
    assertStringEquals(
      fpbLotRecord.lot,
      lotRecordId,
      "BatchFixedPriceLot: lot",
    );
    assertStringEquals(
      fpbLotRecord.status,
      "created",
      "BatchFixedPriceLot: status",
    );
    assertBooleanEquals(
      fpbLotRecord.settlementSuccessful,
      false,
      "BatchFixedPriceLot: settlementSuccessful",
    );
    assertBigDecimalEquals(
      fpbLotRecord.price,
      toDecimal(fpbPrice, lotQuoteTokenDecimals),
      "BatchFixedPriceLot: price",
    );
    assertBigDecimalEquals(
      fpbLotRecord.minFilled,
      toDecimal(fpbMinFilled, lotBaseTokenDecimals),
      "BatchFixedPriceLot: minFilled",
    );
    assertBooleanEquals(
      fpbLotRecord.hasPartialFill,
      false,
      "BatchEncryptedMarginalPriceLot: hasPartialFill",
    );
    assertBigIntEquals(
      fpbLotRecord.partialBidId,
      null,
      "BatchEncryptedMarginalPriceLot: partialBidId",
    );

    // Check reverse lookups
    const batchAuctionLotRecordCreatedLookup =
      batchAuctionLotRecord.created.load();
    assertI32Equals(
      batchAuctionLotRecordCreatedLookup.length,
      1,
      "BatchAuctionLot: created lookup length",
    );
    assertBytesEquals(
      batchAuctionLotRecordCreatedLookup[0].id,
      recordId,
      "BatchAuctionLot: created lookup",
    );
  });
});

let auctionCancelledEvent: AuctionCancelled;
const lotCancellation: BigInt = lotStart.plus(BigInt.fromI32(1));

describe("auction cancellation", () => {
  beforeEach(() => {
    _createAuctionLot();

    // Update mocks
    mockLotData(
      auctionModuleAddress,
      LOT_ID,
      lotStart,
      lotCancellation, // Conclusion time gets updated
      lotQuoteTokenDecimals,
      lotBaseTokenDecimals,
      lotCapacityInQuote,
      BigInt.zero(), // Capacity gets set to zero
      lotSold,
      lotPurchased,
    );
    mockFpbAuctionData(
      auctionModuleAddress,
      LOT_ID,
      fpbPrice,
      1, // Settled
      1,
      false,
      BigInt.zero(),
      fpbMinFilled,
    );
    mockFpbPartialFill(
      auctionModuleAddress,
      LOT_ID,
      false,
      0,
      BigInt.zero(),
      BigInt.zero(),
    );

    auctionCancelledEvent = createAuctionCancelledEvent(
      LOT_ID,
      auctionRef,
      auctionHouse,
    );
  });

  afterEach(() => {
    clearStore();
  });

  test("BatchAuctionCancelled created and stored", () => {
    handleAuctionCancelled(auctionCancelledEvent);

    const lotRecordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();
    const recordId = defaultTransactionHash
      .concatI32(defaultLogIndex.toI32())
      .concatI32(LOT_ID.toI32());

    // BatchAuctionCancelled record is created
    assert.entityCount("BatchAuctionCancelled", 1);
    const batchAuctionCancelledRecord = BatchAuctionCancelled.load(recordId);
    if (batchAuctionCancelledRecord === null) {
      throw new Error(
        "Expected BatchAuctionCancelled to exist for lot id " +
          LOT_ID.toString() +
          " at record id " +
          recordId.toHexString(),
      );
    }
    assertBytesEquals(
      batchAuctionCancelledRecord.id,
      recordId,
      "BatchAuctionCancelled: id",
    );
    assertStringEquals(
      batchAuctionCancelledRecord.lot,
      lotRecordId,
      "BatchAuctionCancelled: lot",
    );
    assertBytesEquals(
      batchAuctionCancelledRecord.auctionRef,
      Bytes.fromUTF8(auctionModuleVeecode),
      "BatchAuctionCancelled: auctionRef",
    );

    // BatchAuctionLot record is updated
    assert.entityCount("BatchAuctionLot", 1, "BatchAuctionLot count");
    const batchAuctionLotRecord = BatchAuctionLot.load(lotRecordId);
    if (batchAuctionLotRecord === null) {
      throw new Error(
        "Expected BatchAuctionLot to exist for record id " + lotRecordId,
      );
    }
    assertBigDecimalEquals(
      batchAuctionLotRecord.capacity,
      BigDecimal.zero(),
      "BatchAuctionLot: capacity",
    );
    assertBigIntEquals(
      batchAuctionLotRecord.conclusion,
      lotCancellation,
      "BatchAuctionLot: conclusion",
    );

    // BatchFixedPriceLot record is updated
    assert.entityCount("BatchFixedPriceLot", 1, "BatchFixedPriceLot count");
    const fpbLotRecord = BatchFixedPriceLot.load(lotRecordId);
    if (fpbLotRecord === null) {
      throw new Error(
        "Expected BatchFixedPriceLot to exist for record id " + lotRecordId,
      );
    }
    assertStringEquals(
      fpbLotRecord.status,
      "cancelled",
      "BatchFixedPriceLot: status",
    );
    assertBooleanEquals(
      fpbLotRecord.settlementSuccessful,
      false,
      "BatchFixedPriceLot: settlementSuccessful",
    );
    assertBooleanEquals(
      fpbLotRecord.hasPartialFill,
      false,
      "BatchFixedPriceLot: hasPartialFill",
    );
    assertBigIntEquals(
      fpbLotRecord.partialBidId,
      null,
      "BatchFixedPriceLot: partialBidId",
    );

    // Check reverse lookups
    assertI32Equals(
      batchAuctionLotRecord.cancelled.load().length,
      1,
      "BatchAuctionLot: cancelled lookup length",
    );
    assertBytesEquals(
      batchAuctionLotRecord.cancelled.load()[0].id,
      recordId,
      "BatchAuctionLot: cancelled lookup",
    );
  });
});

describe("bid", () => {
  beforeEach(() => {
    _createAuctionLot();

    _createBid();
  });

  afterEach(() => {
    clearStore();
  });

  test("BatchBid created and stored", () => {
    const lotRecordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();
    const bidRecordId = lotRecordId + "-" + BID_ID_ONE.toString();
    const recordId = defaultTransactionHash
      .concatI32(defaultLogIndex.toI32())
      .concatI32(LOT_ID.toI32())
      .concatI32(BID_ID_ONE.toI32());

    // BatchBid record is created
    assert.entityCount("BatchBid", 1);
    const batchBidRecord = BatchBid.load(bidRecordId);
    if (batchBidRecord === null) {
      throw new Error(
        "Expected BatchBid to exist for lot id " +
          LOT_ID.toString() +
          " and bid id " +
          BID_ID_ONE.toString(),
      );
    }

    assertStringEquals(batchBidRecord.id, bidRecordId, "Bid: id");
    assertStringEquals(batchBidRecord.lot, lotRecordId, "Bid: lot");
    assertBytesEquals(batchBidRecord.bidder, BIDDER, "Bid: bidder");
    assertBigDecimalEquals(
      batchBidRecord.amountIn,
      toDecimal(bidAmountIn, lotQuoteTokenDecimals),
      "Bid: amountIn",
    );
    assertBigIntEquals(
      batchBidRecord.rawAmountIn,
      bidAmountIn,
      "Bid: rawAmountIn",
    );
    assertBigDecimalEquals(
      batchBidRecord.amountOut,
      toDecimal(bidAmountOut, lotBaseTokenDecimals), // Set as the price is known
      "Bid: amountOut",
    );
    assertBigIntEquals(
      batchBidRecord.rawAmountOut,
      bidAmountOut, // Set as the price is known
      "Bid: rawAmountOut",
    );
    assertBytesEquals(batchBidRecord.referrer, bidReferrer, "Bid: referrer");
    assertStringEquals(batchBidRecord.status, "submitted", "Bid: status");

    // BatchAuctionLot record is updated
    assert.entityCount("BatchAuctionLot", 1);
    const batchAuctionLotRecord = BatchAuctionLot.load(lotRecordId);
    if (batchAuctionLotRecord === null) {
      throw new Error(
        "Expected BatchAuctionLot to exist for record id " + lotRecordId,
      );
    }

    assertBigIntEquals(
      batchAuctionLotRecord.maxBidId,
      BID_ID_ONE,
      "BatchAuctionLot: maxBidId",
    );

    // Check reverse lookups
    const batchAuctionLotRecordBidsLookup = batchAuctionLotRecord.bids.load();
    assertI32Equals(
      batchAuctionLotRecordBidsLookup.length,
      1,
      "BatchAuctionLot: bids lookup length",
    );
    assertStringEquals(
      batchAuctionLotRecordBidsLookup[0].id,
      bidRecordId,
      "BatchAuctionLot: bids lookup",
    );

    // BatchBidCreated record is created
    const batchBidCreatedRecord = BatchBidCreated.load(recordId);
    if (batchBidCreatedRecord === null) {
      throw new Error(
        "Expected BatchBidCreated to exist for lot id " +
          LOT_ID.toString() +
          " and bid id " +
          BID_ID_ONE.toString() +
          " at record id: " +
          recordId.toHexString(),
      );
    }

    assertStringEquals(
      batchBidCreatedRecord.lot,
      batchAuctionLotRecord.id,
      "BatchBidCreated: lot",
    );
    assertStringEquals(
      batchBidCreatedRecord.bid,
      batchBidRecord.id,
      "BatchBidCreated: bid",
    );
  });
});

describe("bid refund", () => {
  beforeEach(() => {
    _createAuctionLot();

    _createBid();

    // Update mocks
    mockFpbBid(
      auctionModuleAddress,
      LOT_ID,
      BID_ID_ONE,
      BIDDER,
      bidAmountIn,
      bidReferrer,
      1, // Claimed
    );

    const bidRefundEvent = createRefundBidEvent(
      LOT_ID,
      BID_ID_ONE,
      BIDDER,
      auctionHouse,
    );
    handleRefundBid(bidRefundEvent);
  });

  afterEach(() => {
    clearStore();
  });

  test("BatchBidRefunded created and stored", () => {
    const lotRecordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();
    const bidRecordId = lotRecordId + "-" + BID_ID_ONE.toString();
    const recordId = defaultTransactionHash
      .concatI32(defaultLogIndex.toI32())
      .concatI32(LOT_ID.toI32())
      .concatI32(BID_ID_ONE.toI32());

    // BatchBidRefunded record is created
    assert.entityCount("BatchBidRefunded", 1);
    const batchBidRefundedRecord = BatchBidRefunded.load(recordId);
    if (batchBidRefundedRecord === null) {
      throw new Error(
        "Expected BatchBidRefunded to exist for lot id " +
          LOT_ID.toString() +
          " and bid id " +
          BID_ID_ONE.toString() +
          " at record id " +
          recordId.toHexString(),
      );
    }

    assertBytesEquals(batchBidRefundedRecord.id, recordId, "Bid: id");
    assertStringEquals(batchBidRefundedRecord.lot, lotRecordId, "Bid: lot");
    assertStringEquals(batchBidRefundedRecord.bid, bidRecordId, "Bid: bid");
    assertBytesEquals(batchBidRefundedRecord.bidder, BIDDER, "Bid: bidder");

    // BatchBid record is updated
    const batchBidRecord = BatchBid.load(bidRecordId);
    if (batchBidRecord === null) {
      throw new Error(
        "Expected BatchBid to exist for record id " + bidRecordId,
      );
    }

    assertStringEquals(batchBidRecord.status, "claimed", "Bid: status");
    assertNull(batchBidRecord.outcome, "Bid: outcome");
    assertBigDecimalEquals(
      batchBidRecord.amountOut,
      toDecimal(bidAmountOut, lotBaseTokenDecimals),
      "Bid: amountOut",
    );
    assertBigIntEquals(
      batchBidRecord.rawAmountOut,
      bidAmountOut,
      "Bid: rawAmountOut",
    );

    // Check reverse lookups
    const batchBidRecordRefundedLookup = batchBidRecord.refunded.load();
    assertI32Equals(
      batchBidRecordRefundedLookup.length,
      1,
      "Bid: refunded lookup length",
    );
    assertBytesEquals(
      batchBidRecordRefundedLookup[0].id,
      recordId,
      "Bid: refunded lookup",
    );
    const batchAuctionLotRecord = BatchAuctionLot.load(lotRecordId);
    if (batchAuctionLotRecord === null) {
      throw new Error(
        "Expected BatchAuctionLot to exist for record id " + lotRecordId,
      );
    }
    const batchAuctionLotRecordBidsRefundedLookup =
      batchAuctionLotRecord.bidsRefunded.load();
    assertI32Equals(
      batchAuctionLotRecordBidsRefundedLookup.length,
      1,
      "BatchAuctionLot: bidsRefunded lookup length",
    );
    assertBytesEquals(
      batchAuctionLotRecordBidsRefundedLookup[0].id,
      recordId,
      "BatchAuctionLot: bidsRefunded lookup",
    );
  });
});

describe("abort", () => {
  beforeEach(() => {
    _createAuctionLot();

    _createBid();

    // Update lot status
    mockFpbAuctionData(
      auctionModuleAddress,
      LOT_ID,
      fpbPrice,
      1, // Aborted (Settled)
      2,
      false,
      BigInt.zero(),
      fpbMinFilled,
    );
    mockFpbParent(auctionModuleAddress, auctionHouse);

    // Set bid outcome
    mockFpbBidClaim(
      auctionModuleAddress,
      LOT_ID,
      BID_ID_ONE,
      BIDDER,
      bidReferrer,
      bidAmountIn,
      BigInt.zero(),
      bidAmountIn,
    );

    // Create event
    const auctionAbortedEvent = createAuctionAbortedEvent(LOT_ID, auctionHouse);
    handleAbort(auctionAbortedEvent);
  });

  afterEach(() => {
    clearStore();
  });

  test("BatchAuctionAborted created and stored", () => {
    const lotRecordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();
    const recordId = defaultTransactionHash
      .concatI32(defaultLogIndex.toI32())
      .concatI32(LOT_ID.toI32());

    // BatchAuctionAborted record is stored
    assert.entityCount("BatchAuctionAborted", 1);
    const batchAuctionAbortedRecord = BatchAuctionAborted.load(recordId);
    if (batchAuctionAbortedRecord === null) {
      throw new Error(
        "Expected BatchAuctionAborted to exist for lot id " +
          LOT_ID.toString() +
          " at record id " +
          recordId.toHexString(),
      );
    }

    assertBytesEquals(
      batchAuctionAbortedRecord.id,
      recordId,
      "BatchAuctionAborted: id",
    );
    assertStringEquals(
      batchAuctionAbortedRecord.lot,
      lotRecordId,
      "BatchAuctionAborted: lot",
    );

    // BatchAuctionLot record is updated
    assert.entityCount("BatchAuctionLot", 1);
    const batchAuctionLotRecord = BatchAuctionLot.load(lotRecordId);
    if (batchAuctionLotRecord === null) {
      throw new Error(
        "Expected BatchAuctionLot to exist for record id " + lotRecordId,
      );
    }

    // Check reverse lookups
    const batchAuctionLotAbortedLookup = batchAuctionLotRecord.aborted.load();
    assertI32Equals(
      batchAuctionLotAbortedLookup.length,
      1,
      "BatchAuctionLot: aborted lookup length",
    );
    assertBytesEquals(
      batchAuctionLotAbortedLookup[0].id,
      recordId,
      "BatchAuctionLot: aborted lookup",
    );

    // BatchFixedPriceLot record is updated
    assert.entityCount("BatchFixedPriceLot", 1);
    const empLotRecord = getBatchFixedPriceLot(lotRecordId);
    assertStringEquals(
      empLotRecord.status,
      "aborted",
      "BatchFixedPriceLot: status",
    );
    assertBooleanEquals(
      empLotRecord.settlementSuccessful,
      false,
      "BatchFixedPriceLot: settlementSuccessful",
    );
    assertBooleanEquals(
      empLotRecord.hasPartialFill,
      false,
      "BatchFixedPriceLot: hasPartialFill",
    );
    assertBigIntEquals(
      empLotRecord.partialBidId,
      null,
      "BatchFixedPriceLot: partialBidId",
    );

    // Check the bid
    const bidRecordId = lotRecordId + "-" + BID_ID_ONE.toString();
    const batchBidRecord = BatchBid.load(bidRecordId);
    if (batchBidRecord === null) {
      throw new Error(
        "Expected BatchBid to exist for record id " + bidRecordId,
      );
    }

    assertStringEquals(batchBidRecord.status, "submitted", "Bid: status"); // Bid was not decrypted
    assertStringEquals(batchBidRecord.outcome, "lost", "Bid: outcome");
  });

  test("BatchBidClaimed created and stored", () => {
    // Mock the bid status
    mockFpbBid(
      auctionModuleAddress,
      LOT_ID,
      BID_ID_ONE,
      BIDDER,
      bidAmountIn,
      bidReferrer,
      1, // Claimed
    );

    // Create the event to claim the bid
    const bidClaimEvent = createClaimBidEvent(
      LOT_ID,
      BID_ID_ONE,
      BIDDER,
      auctionHouse,
    );
    handleBidClaimed(bidClaimEvent);

    // BatchBidClaimed record is stored
    const lotRecordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();
    const bidRecordId = lotRecordId + "-" + BID_ID_ONE.toString();
    const recordId = defaultTransactionHash
      .concatI32(defaultLogIndex.toI32())
      .concatI32(LOT_ID.toI32())
      .concatI32(BID_ID_ONE.toI32());

    assert.entityCount("BatchBidClaimed", 1);
    const batchBidClaimedRecord = getBatchBidClaimed(LOT_ID, BID_ID_ONE);

    assertBytesEquals(
      batchBidClaimedRecord.id,
      recordId,
      "BatchBidClaimed: id",
    );
    assertStringEquals(
      batchBidClaimedRecord.lot,
      lotRecordId,
      "BatchBidClaimed: lot",
    );
    assertStringEquals(
      batchBidClaimedRecord.bid,
      bidRecordId,
      "BatchBidClaimed: bid",
    );

    // BatchBid is updated
    const batchBidRecord = getBatchBid(lotRecordId, BID_ID_ONE);
    assertStringEquals(batchBidRecord.status, "claimed", "Bid: status");
    assertStringEquals(batchBidRecord.outcome, "lost", "Bid: outcome");

    // Check reverse lookups
    const batchBidRecordClaimedLookup = batchBidRecord.claimed.load();
    assertI32Equals(
      batchBidRecordClaimedLookup.length,
      1,
      "Bid: claimed lookup length",
    );
    assertBytesEquals(
      batchBidRecordClaimedLookup[0].id,
      recordId,
      "Bid: claimed lookup",
    );
  });
});

describe("settle", () => {
  beforeEach(() => {
    _createAuctionLot();

    _createBidWithId(BID_ID_ONE); // Won
    _createBidWithId(BID_ID_TWO); // Lost
    _createBidWithId(BID_ID_THREE); // Partial fill

    // Update auction data for settlement
    mockFpbAuctionData(
      auctionModuleAddress,
      LOT_ID,
      fpbPrice,
      1, // Settled
      4,
      true,
      bidAmountIn
        .plus(bidAmountIn)
        .plus(bidAmountIn)
        .minus(bidPartialFillRefund), // 30 - refund
      fpbMinFilled,
    );

    // Update lot data for settlement
    mockLotData(
      auctionModuleAddress,
      LOT_ID,
      lotStart,
      lotConclusion,
      lotQuoteTokenDecimals,
      lotBaseTokenDecimals,
      lotCapacityInQuote,
      lotCapacity,
      bidAmountOut.plus(bidAmountOut).plus(bidPartialFillPayout), // sold: 20 + partial fill
      bidAmountIn
        .plus(bidAmountIn)
        .plus(bidAmountIn)
        .minus(bidPartialFillRefund), // purchased: 30 - refund
    );

    // Update mocks for 3 bids
    mockFpbBidClaim(
      auctionModuleAddress,
      LOT_ID,
      BID_ID_ONE,
      BIDDER,
      bidReferrer,
      bidAmountIn,
      bidAmountOut, // Won
      BigInt.zero(),
    );
    mockFpbBidClaim(
      auctionModuleAddress,
      LOT_ID,
      BID_ID_TWO,
      BIDDER,
      bidReferrer,
      bidAmountIn,
      BigInt.zero(), // Lost
      bidAmountIn,
    );
    mockFpbBidClaim(
      auctionModuleAddress,
      LOT_ID,
      BID_ID_THREE,
      BIDDER,
      bidReferrer,
      bidAmountIn,
      bidPartialFillPayout, // Partial fill
      bidPartialFillRefund,
    );
    mockFpbPartialFill(
      auctionModuleAddress,
      LOT_ID,
      true,
      BID_ID_THREE.toI32(),
      bidPartialFillPayout,
      bidPartialFillRefund,
    );

    const settleEvent = createSettleEvent(LOT_ID, auctionHouse);
    handleSettle(settleEvent);
  });

  afterEach(() => {
    clearStore();
  });

  test("BatchAuctionSettled created and stored", () => {
    const lotRecordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();
    const recordId = defaultTransactionHash
      .concatI32(defaultLogIndex.toI32())
      .concatI32(LOT_ID.toI32());

    // BatchAuctionSettled record is stored
    assert.entityCount("BatchAuctionSettled", 1);
    const batchAuctionSettledRecord = getBatchAuctionSettled(recordId);

    assertBytesEquals(
      batchAuctionSettledRecord.id,
      recordId,
      "BatchAuctionSettled: id",
    );
    assertStringEquals(
      batchAuctionSettledRecord.lot,
      lotRecordId,
      "BatchAuctionSettled: lot",
    );

    // BatchAuctionLot record is updated
    assert.entityCount("BatchAuctionLot", 1);
    const batchAuctionLotRecord = getBatchAuctionLot(lotRecordId);
    // Check reverse lookups
    const batchAuctionLotSettledLookup = batchAuctionLotRecord.settled.load();
    assertI32Equals(
      batchAuctionLotSettledLookup.length,
      1,
      "BatchAuctionLot: settled lookup length",
    );
    assertBytesEquals(
      batchAuctionLotSettledLookup[0].id,
      recordId,
      "BatchAuctionLot: settled lookup",
    );

    // BatchFixedPriceLot record is updated
    assert.entityCount("BatchFixedPriceLot", 1);
    const empLotRecord = getBatchFixedPriceLot(lotRecordId);
    assertStringEquals(
      empLotRecord.status,
      "settled",
      "BatchFixedPriceLot: status",
    );
    assertBooleanEquals(
      empLotRecord.settlementSuccessful,
      true,
      "BatchFixedPriceLot: settlementSuccessful",
    );
    assertBooleanEquals(
      empLotRecord.hasPartialFill,
      true,
      "BatchEncryptedMarginalPriceLot: hasPartialFill",
    );
    assertBigIntEquals(
      empLotRecord.partialBidId,
      BID_ID_THREE,
      "BatchEncryptedMarginalPriceLot: partialBidId",
    );

    // Check that the bids are updated
    const batchBidRecordOne = getBatchBid(lotRecordId, BID_ID_ONE);
    assertStringEquals(
      batchBidRecordOne.status,
      "submitted",
      "Bid one: status",
    );
    assertStringEquals(batchBidRecordOne.outcome, "won", "Bid one: outcome");
    assertBigDecimalEquals(
      batchBidRecordOne.amountOut,
      toDecimal(bidAmountOut, lotBaseTokenDecimals),
      "Bid one: amountOut",
    );
    assertBigDecimalEquals(
      batchBidRecordOne.submittedPrice,
      toDecimal(fpbPrice, lotQuoteTokenDecimals),
      "Bid one: submittedPrice",
    );
    assertBigDecimalEquals(
      batchBidRecordOne.settledAmountIn,
      toDecimal(bidAmountIn, lotQuoteTokenDecimals),
      "Bid one: settledAmountIn",
    );
    assertBigDecimalEquals(
      batchBidRecordOne.settledAmountInRefunded,
      BigDecimal.zero(),
      "Bid one: settledAmountInRefunded",
    );
    assertBigDecimalEquals(
      batchBidRecordOne.settledAmountOut,
      toDecimal(bidAmountOut, lotBaseTokenDecimals),
      "Bid one: settledAmountOut",
    );

    const batchBidRecordTwo = getBatchBid(lotRecordId, BID_ID_TWO);
    assertStringEquals(
      batchBidRecordTwo.status,
      "submitted",
      "Bid two: status",
    );
    assertStringEquals(batchBidRecordTwo.outcome, "lost", "Bid two: outcome");
    assertBigDecimalEquals(
      batchBidRecordTwo.amountOut,
      toDecimal(bidAmountOut, lotBaseTokenDecimals),
      "Bid two: amountOut",
    );
    assertBigDecimalEquals(
      batchBidRecordTwo.submittedPrice,
      toDecimal(fpbPrice, lotQuoteTokenDecimals),
      "Bid two: submittedPrice",
    );
    assertBigDecimalEquals(
      batchBidRecordTwo.settledAmountIn,
      BigDecimal.zero(),
      "Bid two: settledAmountIn",
    );
    assertBigDecimalEquals(
      batchBidRecordTwo.settledAmountInRefunded,
      toDecimal(bidAmountIn, lotQuoteTokenDecimals),
      "Bid two: settledAmountInRefunded",
    );
    assertBigDecimalEquals(
      batchBidRecordTwo.settledAmountOut,
      BigDecimal.zero(),
      "Bid two: settledAmountOut",
    );

    const batchBidRecordThree = getBatchBid(lotRecordId, BID_ID_THREE);
    assertStringEquals(
      batchBidRecordThree.status,
      "submitted",
      "Bid three: status",
    );
    assertStringEquals(
      batchBidRecordThree.outcome,
      "won - partial fill",
      "Bid three: outcome",
    );
    assertBigDecimalEquals(
      batchBidRecordThree.amountOut,
      toDecimal(bidAmountOut, lotBaseTokenDecimals),
      "Bid three: amountOut",
    );
    assertBigDecimalEquals(
      batchBidRecordThree.submittedPrice,
      toDecimal(fpbPrice, lotQuoteTokenDecimals),
      "Bid three: submittedPrice",
    );
    assertBigDecimalEquals(
      batchBidRecordThree.settledAmountIn,
      toDecimal(bidAmountIn.minus(bidPartialFillRefund), lotQuoteTokenDecimals),
      "Bid three: settledAmountIn",
    );
    assertBigDecimalEquals(
      batchBidRecordThree.settledAmountInRefunded,
      toDecimal(bidPartialFillRefund, lotQuoteTokenDecimals),
      "Bid three: settledAmountInRefunded",
    );
    assertBigDecimalEquals(
      batchBidRecordThree.settledAmountOut,
      toDecimal(bidPartialFillPayout, lotBaseTokenDecimals),
      "Bid three: settledAmountOut",
    );

    // Check that the sold, purchased and capacity are set
    assertBigDecimalEquals(
      batchAuctionLotRecord.sold,
      toDecimal(
        bidAmountOut.plus(bidAmountOut).plus(bidPartialFillPayout),
        lotBaseTokenDecimals,
      ),
      "BatchAuctionLot: sold",
    );
    assertBigDecimalEquals(
      batchAuctionLotRecord.purchased,
      toDecimal(
        bidAmountIn
          .plus(bidAmountIn)
          .plus(bidAmountIn)
          .minus(bidPartialFillRefund),
        lotQuoteTokenDecimals,
      ),
      "BatchAuctionLot: purchased",
    );
    assertBigDecimalEquals(
      batchAuctionLotRecord.capacity,
      toDecimal(lotCapacity, lotBaseTokenDecimals), // Remains the same
      "BatchAuctionLot: capacity",
    );
  });

  test("BatchBidClaimed created and stored", () => {
    // Mock the bid status
    mockFpbBidClaim(
      auctionModuleAddress,
      LOT_ID,
      BID_ID_TWO,
      BIDDER,
      bidReferrer,
      bidAmountIn,
      bidAmountOut,
      BigInt.zero(),
    );
    mockFpbBid(
      auctionModuleAddress,
      LOT_ID,
      BID_ID_ONE,
      BIDDER,
      bidAmountIn,
      bidReferrer,
      1, // Claimed
    );

    // Create the event to claim the bid
    const bidClaimEvent = createClaimBidEvent(
      LOT_ID,
      BID_ID_ONE,
      BIDDER,
      auctionHouse,
    );
    handleBidClaimed(bidClaimEvent);

    // BatchBidClaimed record is stored
    const lotRecordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();
    const bidRecordId = lotRecordId + "-" + BID_ID_ONE.toString();
    const recordId = defaultTransactionHash
      .concatI32(defaultLogIndex.toI32())
      .concatI32(LOT_ID.toI32())
      .concatI32(BID_ID_ONE.toI32());

    assert.entityCount("BatchBidClaimed", 1);
    const batchBidClaimedRecord = getBatchBidClaimed(LOT_ID, BID_ID_ONE);

    assertBytesEquals(
      batchBidClaimedRecord.id,
      recordId,
      "BatchBidClaimed: id",
    );
    assertStringEquals(
      batchBidClaimedRecord.lot,
      lotRecordId,
      "BatchBidClaimed: lot",
    );
    assertStringEquals(
      batchBidClaimedRecord.bid,
      bidRecordId,
      "BatchBidClaimed: bid",
    );

    // BatchBid is updated
    const batchBidRecord = getBatchBid(lotRecordId, BID_ID_ONE);
    assertStringEquals(batchBidRecord.status, "claimed", "Bid: status");
    assertStringEquals(batchBidRecord.outcome, "won", "Bid: outcome");

    // Check reverse lookups
    const batchBidRecordClaimedLookup = batchBidRecord.claimed.load();
    assertI32Equals(
      batchBidRecordClaimedLookup.length,
      1,
      "Bid: claimed lookup length",
    );
    assertBytesEquals(
      batchBidRecordClaimedLookup[0].id,
      recordId,
      "Bid: claimed lookup",
    );
  });
});
