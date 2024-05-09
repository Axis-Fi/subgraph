import {
  Address,
  BigDecimal,
  BigInt,
  Bytes,
  log,
} from "@graphprotocol/graph-ts";
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
  Curated,
} from "../generated/BatchAuctionHouse/BatchAuctionHouse";
import {
  BatchAuctionAborted,
  BatchAuctionCancelled,
  BatchAuctionCreated,
  BatchAuctionCurated,
  BatchAuctionLot,
  BatchAuctionSettled,
  BatchBid,
  BatchBidDecrypted,
  BatchBidRefunded,
  BatchEncryptedMarginalPriceLot,
} from "../generated/schema";
import {
  handleAbort,
  handleAuctionCancelled,
  handleAuctionCreated,
  handleBid,
  handleCurated,
  handleRefundBid,
  handleSettle,
} from "../src/batchAuctionHouse";
import { handleBidDecrypted } from "../src/handleEncryptedMarginalPrice";
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
  createCuratedEvent,
  createRefundBidEvent,
  createSettleEvent,
} from "./auction-house-utils";
import { createBidDecryptedEvent } from "./empam-utils";
import { calculatePrice } from "./helpers/price";
import {
  getBatchAuctionLot,
  getBatchAuctionSettled,
  getBatchBid,
  getBatchEncryptedMarginalPriceLot,
} from "./helpers/records";
import { mockGetModuleForVeecode } from "./mocks/baseAuctionHouse";
import { mockGetModuleForId } from "./mocks/baseAuctionHouse";
import { mockLotRouting } from "./mocks/baseAuctionHouse";
import { mockLotFees } from "./mocks/baseAuctionHouse";
import { mockLotData } from "./mocks/batchAuctionHouse";
import {
  mockEmpAuctionData,
  mockEmpBid,
  mockEmpBidClaim,
  mockEmpParent,
  mockEmpPartialFill,
} from "./mocks/emp";
import { mockToken } from "./mocks/token";

const auctionModuleVeecode = "01EMPA";
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

const BID_ID_ONE: BigInt = BigInt.fromI32(111);
const BID_ID_TWO: BigInt = BigInt.fromI32(112);
const BID_ID_THREE: BigInt = BigInt.fromI32(113);
const BIDDER: Address = Address.fromString(
  "0x0000000000000000000000000000000000000002",
);
const bidAmountIn: BigInt = BigInt.fromString("1000000000000000001"); // == 10.00000000000000001
const bidAmountOut: BigInt = BigInt.fromString("2000000000000000000"); // == 0.002
const bidReferrer: Address = Address.fromString(
  "0x0000000000000000000000000000000000000003",
);
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
  mockGetModuleForId(auctionHouse, LOT_ID, auctionModuleAddress);
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
  mockLotFees(
    auctionHouse,
    LOT_ID,
    lotFeesCurator,
    lotFeesCuratorApproved,
    lotFeesCuratorFee,
    lotFeesProtocolFee,
    lotFeesReferrerFee,
  );
  mockEmpAuctionData(
    auctionModuleAddress,
    LOT_ID,
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
}

function _createBidWithId(bidId: BigInt): void {
  const bidEvent = createBidEvent(
    LOT_ID,
    bidId,
    BIDDER,
    bidAmountIn,
    auctionHouse,
  );

  mockEmpBid(
    auctionModuleAddress,
    LOT_ID,
    bidId,
    BIDDER,
    bidAmountIn,
    BigInt.zero(), // Encrypted
    bidReferrer,
    0, // Submitted
  );

  handleBid(bidEvent);
}

function _createBid(): void {
  _createBidWithId(BID_ID_ONE);
}

function _decryptBid(bidId: BigInt, amountOut: BigInt | null): void {
  const amountOutNotNull = amountOut === null ? BigInt.zero() : amountOut;

  mockEmpBid(
    auctionModuleAddress,
    LOT_ID,
    bidId,
    BIDDER,
    bidAmountIn,
    amountOutNotNull, // Decrypted
    bidReferrer,
    1, // Decrypted
  );
  mockEmpParent(auctionModuleAddress, auctionHouse);

  const bidDecryptedEvent = createBidDecryptedEvent(
    auctionModuleAddress,
    LOT_ID,
    bidId,
    bidAmountIn,
    amountOut,
  );
  handleBidDecrypted(bidDecryptedEvent);
}

describe("auction creation", () => {
  beforeEach(() => {
    _createAuctionLot();
  });

  afterEach(() => {
    clearStore();
  });

  test("BatchAuctionCreated created and stored", () => {
    const recordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();

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
      "Created",
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

    // Check reverse lookups
    const batchAuctionLotRecordCreatedLookup =
      batchAuctionLotRecord.created.load();
    assertI32Equals(
      batchAuctionLotRecordCreatedLookup.length,
      1,
      "BatchAuctionLot: created lookup length",
    );
    assertStringEquals(
      batchAuctionLotRecordCreatedLookup[0].id,
      recordId,
      "BatchAuctionLot: created lookup",
    );
  });

  // TODO curator not set

  // TODO protocol fee not set

  // TODO curator fee not set

  // TODO referrer fee not set
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
    mockEmpAuctionData(
      auctionModuleAddress,
      LOT_ID,
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

    const recordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();

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
    assertBigIntEquals(
      batchAuctionLotRecord.conclusion,
      lotCancellation,
      "BatchAuctionLot: conclusion",
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

    // Check reverse lookups
    assertI32Equals(
      batchAuctionLotRecord.cancelled.load().length,
      1,
      "BatchAuctionLot: cancelled lookup length",
    );
    assertStringEquals(
      batchAuctionLotRecord.cancelled.load()[0].id,
      recordId,
      "BatchAuctionLot: cancelled lookup",
    );
  });
});

let auctionCuratedEvent: Curated;

describe("auction curation", () => {
  beforeEach(() => {
    _createAuctionLot();

    // Update mocks
    mockLotFees(
      auctionHouse,
      LOT_ID,
      lotFeesCurator,
      true, // Curator approved
      lotFeesCuratorFee,
      lotFeesProtocolFee,
      lotFeesReferrerFee,
    );

    auctionCuratedEvent = createCuratedEvent(
      LOT_ID,
      lotFeesCurator,
      auctionHouse,
    );
  });

  afterEach(() => {
    clearStore();
  });

  test("BatchAuctionCurated created and stored", () => {
    handleCurated(auctionCuratedEvent);

    const recordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();

    // BatchAuctionCurated record is stored
    assert.entityCount("BatchAuctionCurated", 1);
    const batchAuctionCuratedRecord = BatchAuctionCurated.load(recordId);
    if (batchAuctionCuratedRecord === null) {
      throw new Error(
        "Expected BatchAuctionCurated to exist for record id " + recordId,
      );
    }

    assertStringEquals(
      batchAuctionCuratedRecord.id,
      recordId,
      "BatchAuctionCurated: id",
    );
    assertStringEquals(
      batchAuctionCuratedRecord.lot,
      recordId,
      "BatchAuctionCurated: lot",
    );
    assertBytesEquals(
      batchAuctionCuratedRecord.curator,
      lotFeesCurator,
      "BatchAuctionCurated: curator",
    );

    // BatchAuctionLot record is updated
    assert.entityCount("BatchAuctionLot", 1);
    const batchAuctionLotRecord = BatchAuctionLot.load(recordId);
    if (batchAuctionLotRecord === null) {
      throw new Error(
        "Expected BatchAuctionLot to exist for record id " + recordId,
      );
    }

    assertBooleanEquals(
      batchAuctionLotRecord.curatorApproved,
      true,
      "BatchAuctionLot: curatorApproved",
    );

    // Check reverse lookups
    assertI32Equals(
      batchAuctionLotRecord.curated.load().length,
      1,
      "BatchAuctionLot: curated lookup length",
    );
    assertStringEquals(
      batchAuctionLotRecord.curated.load()[0].id,
      recordId,
      "BatchAuctionLot: curated lookup",
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
    const recordId = lotRecordId + "-" + BID_ID_ONE.toString();

    // BatchBid record is created
    assert.entityCount("BatchBid", 1);
    const batchBidRecord = BatchBid.load(recordId);
    if (batchBidRecord === null) {
      throw new Error("Expected BatchBid to exist for record id " + recordId);
    }

    assertStringEquals(batchBidRecord.id, recordId, "Bid: id");
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
      null, // Not set until decryption
      "Bid: amountOut",
    );
    assertBigIntEquals(
      batchBidRecord.rawAmountOut,
      null, // Not set until decryption
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
      recordId,
      "BatchAuctionLot: bids lookup",
    );
  });

  // TODO referrer not set
});

describe("bid refund", () => {
  beforeEach(() => {
    _createAuctionLot();

    _createBid();

    // Update mocks
    mockEmpBid(
      auctionModuleAddress,
      LOT_ID,
      BID_ID_ONE,
      BIDDER,
      bidAmountIn,
      BigInt.zero(), // Encrypted
      bidReferrer,
      2, // Claimed
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
    const recordId = lotRecordId + "-" + BID_ID_ONE.toString();

    // BatchBidRefunded record is created
    assert.entityCount("BatchBidRefunded", 1);
    const batchBidRefundedRecord = BatchBidRefunded.load(recordId);
    if (batchBidRefundedRecord === null) {
      throw new Error("Expected BatchBid to exist for record id " + recordId);
    }

    assertStringEquals(batchBidRefundedRecord.id, recordId, "Bid: id");
    assertStringEquals(batchBidRefundedRecord.lot, lotRecordId, "Bid: lot");
    assertStringEquals(batchBidRefundedRecord.bid, recordId, "Bid: bid");
    assertBytesEquals(batchBidRefundedRecord.bidder, BIDDER, "Bid: bidder");

    // BatchBid record is updated
    const batchBidRecord = BatchBid.load(recordId);
    if (batchBidRecord === null) {
      throw new Error("Expected BatchBid to exist for record id " + recordId);
    }

    assertStringEquals(batchBidRecord.status, "claimed", "Bid: status");
    assertNull(batchBidRecord.outcome, "Bid: outcome");
    assertBigDecimalEquals(batchBidRecord.amountOut, null, "Bid: amountOut");
    assertBigIntEquals(batchBidRecord.rawAmountOut, null, "Bid: rawAmountOut");

    // Check reverse lookups
    const batchBidRecordRefundedLookup = batchBidRecord.refunded.load();
    assertI32Equals(
      batchBidRecordRefundedLookup.length,
      1,
      "Bid: refunded lookup length",
    );
    assertStringEquals(
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
    assertStringEquals(
      batchAuctionLotRecordBidsRefundedLookup[0].id,
      recordId,
      "BatchAuctionLot: bidsRefunded lookup",
    );
  });
});

describe("bid decryption", () => {
  beforeEach(() => {
    _createAuctionLot();

    _createBid();

    _decryptBid(BID_ID_ONE, bidAmountOut);
  });

  test("BatchBidDecrypted created and stored", () => {
    const lotRecordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();
    const bidRecordId = lotRecordId + "-" + BID_ID_ONE.toString();

    // BatchBidDecrypted record is created
    assert.entityCount("BatchBidDecrypted", 1);
    const batchBidDecryptedRecord = BatchBidDecrypted.load(bidRecordId);
    if (batchBidDecryptedRecord === null) {
      throw new Error(
        "Expected BatchBidDecrypted to exist for record id " + bidRecordId,
      );
    }

    assertStringEquals(batchBidDecryptedRecord.id, bidRecordId, "Bid: id");
    assertStringEquals(batchBidDecryptedRecord.lot, lotRecordId, "Bid: lot");
    assertStringEquals(batchBidDecryptedRecord.bid, bidRecordId, "Bid: bid");
    assertBigDecimalEquals(
      batchBidDecryptedRecord.amountIn,
      toDecimal(bidAmountIn, lotQuoteTokenDecimals),
      "Bid: amountIn",
    );
    assertBigDecimalEquals(
      batchBidDecryptedRecord.amountOut,
      toDecimal(bidAmountOut, lotBaseTokenDecimals),
      "Bid: amountOut",
    );

    // BatchBid is updated
    const batchBidRecord = BatchBid.load(bidRecordId);
    if (batchBidRecord === null) {
      throw new Error(
        "Expected BatchBid to exist for record id " + bidRecordId,
      );
    }

    const bidAmountOutDecimal = toDecimal(bidAmountOut, lotBaseTokenDecimals);
    assertBigDecimalEquals(
      batchBidRecord.amountOut,
      bidAmountOutDecimal,
      "Bid: amountOut",
    );
    assertBigIntEquals(
      batchBidRecord.rawAmountOut,
      bidAmountOut,
      "Bid: rawAmountOut",
    );
    const submittedPriceDecimal = calculatePrice(
      bidAmountIn,
      lotQuoteTokenDecimals,
      bidAmountOut,
    );
    assertBigDecimalEquals(
      batchBidRecord.submittedPrice,
      submittedPriceDecimal,
      "Bid: submittedPrice",
    );
    // TODO rawSubmittedPrice

    // Check reverse lookups
    const batchBidRecordDecryptedLookup = batchBidRecord.decrypted.load();
    assertI32Equals(
      batchBidRecordDecryptedLookup.length,
      1,
      "Bid: decrypted lookup length",
    );
    assertStringEquals(
      batchBidRecordDecryptedLookup[0].id,
      bidRecordId,
      "Bid: decrypted lookup",
    );
    const batchAuctionLotRecord = BatchAuctionLot.load(lotRecordId);
    if (batchAuctionLotRecord === null) {
      throw new Error(
        "Expected BatchAuctionLot to exist for record id " + lotRecordId,
      );
    }
    const batchAuctionLotRecordBidsDecryptedLookup =
      batchAuctionLotRecord.bidsDecrypted.load();
    assertI32Equals(
      batchAuctionLotRecordBidsDecryptedLookup.length,
      1,
      "BatchAuctionLot: bidsDecrypted lookup length",
    );
    assertStringEquals(
      batchAuctionLotRecordBidsDecryptedLookup[0].id,
      bidRecordId,
      "BatchAuctionLot: bidsDecrypted lookup",
    );
  });

  // TODO bid decryption with no amount out
});

describe("abort", () => {
  beforeEach(() => {
    _createAuctionLot();

    _createBid();

    // Update mocks
    mockEmpAuctionData(
      auctionModuleAddress,
      LOT_ID,
      0,
      0,
      2, // Aborted (Settled)
      0,
      BigInt.fromU64(2 ^ (256 - 1)), // Marginal price set to uint256 max
      empMinPrice,
      empMinFilled,
      empMinBidSize,
      empPublicKeyX,
      empPublicKeyY,
      BigInt.zero(),
    );
    mockEmpParent(auctionModuleAddress, auctionHouse);
    mockEmpBidClaim(
      auctionModuleAddress,
      LOT_ID,
      BID_ID_ONE,
      BIDDER,
      bidReferrer,
      bidAmountIn,
      BigInt.zero(),
      bidAmountIn,
    );

    const auctionAbortedEvent = createAuctionAbortedEvent(LOT_ID, auctionHouse);
    handleAbort(auctionAbortedEvent);
  });

  afterEach(() => {
    clearStore();
  });

  test("BatchAuctionAborted created and stored", () => {
    const recordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();

    // BatchAuctionAborted record is stored
    assert.entityCount("BatchAuctionAborted", 1);
    const batchAuctionAbortedRecord = BatchAuctionAborted.load(recordId);
    if (batchAuctionAbortedRecord === null) {
      throw new Error(
        "Expected BatchAuctionAborted to exist for record id " + recordId,
      );
    }

    assertStringEquals(
      batchAuctionAbortedRecord.id,
      recordId,
      "BatchAuctionAborted: id",
    );
    assertStringEquals(
      batchAuctionAbortedRecord.lot,
      recordId,
      "BatchAuctionAborted: lot",
    );

    // BatchAuctionLot record is updated
    assert.entityCount("BatchAuctionLot", 1);
    const batchAuctionLotRecord = BatchAuctionLot.load(recordId);
    if (batchAuctionLotRecord === null) {
      throw new Error(
        "Expected BatchAuctionLot to exist for record id " + recordId,
      );
    }

    // Check reverse lookups
    const batchAuctionLotAbortedLookup = batchAuctionLotRecord.aborted.load();
    assertI32Equals(
      batchAuctionLotAbortedLookup.length,
      1,
      "BatchAuctionLot: aborted lookup length",
    );
    assertStringEquals(
      batchAuctionLotAbortedLookup[0].id,
      recordId,
      "BatchAuctionLot: aborted lookup",
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

    // Check the bid
    const bidRecordId = recordId + "-" + BID_ID_ONE.toString();
    const batchBidRecord = BatchBid.load(bidRecordId);
    if (batchBidRecord === null) {
      throw new Error(
        "Expected BatchBid to exist for record id " + bidRecordId,
      );
    }

    assertStringEquals(batchBidRecord.status, "submitted", "Bid: status"); // Bid was not decrypted
    assertStringEquals(batchBidRecord.outcome, "lost", "Bid: outcome");
  });
});

describe("settle", () => {
  beforeEach(() => {
    _createAuctionLot();

    _createBidWithId(BID_ID_ONE); // Won
    _createBidWithId(BID_ID_TWO); // Lost
    _createBidWithId(BID_ID_THREE); // Partial fill

    // Update mocks
    mockEmpAuctionData(
      auctionModuleAddress,
      LOT_ID,
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

    _decryptBid(BID_ID_ONE, bidAmountOut);
    _decryptBid(BID_ID_TWO, bidAmountOut);
    _decryptBid(BID_ID_THREE, bidAmountOut);

    mockEmpParent(auctionModuleAddress, auctionHouse);

    // Update mocks for 3 bids
    mockEmpBidClaim(
      auctionModuleAddress,
      LOT_ID,
      BID_ID_ONE,
      BIDDER,
      bidReferrer,
      bidAmountIn,
      bidAmountOut, // Won
      BigInt.zero(),
    );
    mockEmpBidClaim(
      auctionModuleAddress,
      LOT_ID,
      BID_ID_TWO,
      BIDDER,
      bidReferrer,
      bidAmountIn,
      BigInt.zero(), // Lost
      bidAmountIn,
    );
    mockEmpBidClaim(
      auctionModuleAddress,
      LOT_ID,
      BID_ID_THREE,
      BIDDER,
      bidReferrer,
      bidAmountIn,
      bidPartialFillPayout, // Partial fill
      bidPartialFillRefund,
    );
    // mockEmpPartialFill(
    //   auctionModuleAddress,
    //   lotId,
    //   true,
    //   BID_ID_THREE.toI32(),
    //   bidPartialFillPayout,
    //   bidPartialFillRefund,
    // );

    const settleEvent = createSettleEvent(LOT_ID, auctionHouse);
    handleSettle(settleEvent);
  });

  afterEach(() => {
    clearStore();
  });

  test("BatchAuctionSettled created and stored", () => {
    const recordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();

    // BatchAuctionSettled record is stored
    assert.entityCount("BatchAuctionSettled", 1);
    const batchAuctionSettledRecord = getBatchAuctionSettled(recordId);

    assertStringEquals(
      batchAuctionSettledRecord.id,
      recordId,
      "BatchAuctionSettled: id",
    );
    assertStringEquals(
      batchAuctionSettledRecord.lot,
      recordId,
      "BatchAuctionSettled: lot",
    );

    // BatchAuctionLot record is updated
    assert.entityCount("BatchAuctionLot", 1);
    const batchAuctionLotRecord = getBatchAuctionLot(recordId);
    // Check reverse lookups
    const batchAuctionLotSettledLookup = batchAuctionLotRecord.settled.load();
    assertI32Equals(
      batchAuctionLotSettledLookup.length,
      1,
      "BatchAuctionLot: settled lookup length",
    );
    assertStringEquals(
      batchAuctionLotSettledLookup[0].id,
      recordId,
      "BatchAuctionLot: settled lookup",
    );

    // BatchEncryptedMarginalPriceLot record is updated
    assert.entityCount("BatchEncryptedMarginalPriceLot", 1);
    const empLotRecord = getBatchEncryptedMarginalPriceLot(recordId);
    assertStringEquals(
      empLotRecord.status,
      "Settled",
      "BatchEncryptedMarginalPriceLot: status",
    );

    // Check that the bids are updated
    // TODO re-enable submitted price checks
    const batchBidRecordOne = getBatchBid(recordId, BID_ID_ONE);
    assertStringEquals(
      batchBidRecordOne.status,
      "decrypted",
      "Bid one: status",
    );
    assertStringEquals(batchBidRecordOne.outcome, "won", "Bid one: outcome");
    assertBigDecimalEquals(
      batchBidRecordOne.amountOut,
      toDecimal(bidAmountOut, lotBaseTokenDecimals),
      "Bid one: amountOut",
    );
    // assertBigDecimalEquals(
    //   batchBidRecordOne.submittedPrice,
    //   calculatePrice(bidAmountIn, lotQuoteTokenDecimals, bidAmountOut),
    //   "Bid one: submittedPrice",
    // );
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

    const batchBidRecordTwo = getBatchBid(recordId, BID_ID_TWO);
    assertStringEquals(
      batchBidRecordTwo.status,
      "decrypted",
      "Bid two: status",
    );
    assertStringEquals(batchBidRecordTwo.outcome, "lost", "Bid two: outcome");
    assertBigDecimalEquals(
      batchBidRecordTwo.amountOut,
      toDecimal(bidAmountOut, lotBaseTokenDecimals),
      "Bid two: amountOut",
    );
    // assertBigDecimalEquals(
    //   batchBidRecordTwo.submittedPrice,
    //   calculatePrice(bidAmountIn, lotQuoteTokenDecimals, bidAmountOut),
    //   "Bid two: submittedPrice",
    // );
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

    const batchBidRecordThree = getBatchBid(recordId, BID_ID_THREE);
    assertStringEquals(
      batchBidRecordThree.status,
      "decrypted",
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
    // assertBigDecimalEquals(
    //   batchBidRecordThree.submittedPrice,
    //   calculatePrice(bidAmountIn, lotQuoteTokenDecimals, bidAmountOut),
    //   "Bid three: submittedPrice",
    // );
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
  });
});

// TODO settle - partial fill, won, lost

// TODO claim bid after settle

// TODO claim bid after abort

// TODO linear vesting
