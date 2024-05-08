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
  Bid,
  Curated,
} from "../generated/BatchAuctionHouse/BatchAuctionHouse";
import {
  BatchAuctionCancelled,
  BatchAuctionCreated,
  BatchAuctionCurated,
  BatchAuctionLot,
  BatchBid,
  BatchBidDecrypted,
  BatchBidRefunded,
  BatchEncryptedMarginalPriceLot,
} from "../generated/schema";
import {
  handleAuctionCancelled,
  handleAuctionCreated,
  handleBid,
  handleCurated,
  handleRefundBid,
} from "../src/batchAuctionHouse";
import { handleBidDecrypted } from "../src/handleEncryptedMarginalPrice";
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
  createBidEvent,
  createCuratedEvent,
  createRefundBidEvent,
} from "./auction-house-utils";
import { createBidDecryptedEvent } from "./empam-utils";
import { mockGetModuleForVeecode } from "./mocks/baseAuctionHouse";
import { mockGetModuleForId } from "./mocks/baseAuctionHouse";
import { mockLotRouting } from "./mocks/baseAuctionHouse";
import { mockLotFees } from "./mocks/baseAuctionHouse";
import { mockLotData } from "./mocks/batchAuctionHouse";
import {
  mockEmpAuctionData,
  mockEmpBid,
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

const bidId: BigInt = BigInt.fromI32(111);
const BIDDER: Address = Address.fromString(
  "0x0000000000000000000000000000000000000002",
);
const bidAmountIn: BigInt = BigInt.fromString("1000000000000000001");
const bidAmountOut: BigInt = BigInt.fromString("2000000000000000000");
const bidReferrer: Address = Address.fromString(
  "0x0000000000000000000000000000000000000003",
);

function setChain(chain: string): void {
  dataSourceMock.setNetwork(chain);
}

function _createAuctionLot(): void {
  const auctionCreatedEvent = createAuctionCreatedEvent(
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
}

function _createBid(): void {
  const bidEvent = createBidEvent(lotId, bidId, BIDDER, bidAmountIn);

  mockEmpBid(
    auctionModuleAddress,
    lotId,
    bidId,
    BIDDER,
    bidAmountIn,
    BigInt.zero(), // Encrypted
    bidReferrer,
    0, // Submitted
  );

  handleBid(bidEvent);
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
      lotId,
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

  test("BatchAuctionCancelled created and stored", () => {
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
  });
});

let auctionCuratedEvent: Curated;

describe("auction curation", () => {
  beforeEach(() => {
    _createAuctionLot();

    // Update mocks
    mockLotFees(
      eventAddress,
      lotId,
      lotFeesCurator,
      true, // Curator approved
      lotFeesCuratorFee,
      lotFeesProtocolFee,
      lotFeesReferrerFee,
    );

    auctionCuratedEvent = createCuratedEvent(lotId, lotFeesCurator);
  });

  afterEach(() => {
    clearStore();
  });

  test("BatchAuctionCurated created and stored", () => {
    handleCurated(auctionCuratedEvent);

    const recordId =
      "mainnet-" + eventAddress.toHexString() + "-" + lotId.toString();

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
      "mainnet-" + eventAddress.toHexString() + "-" + lotId.toString();
    const recordId = lotRecordId + "-" + bidId.toString();

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
      bidId,
      "BatchAuctionLot: maxBidId",
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
      lotId,
      bidId,
      BIDDER,
      bidAmountIn,
      BigInt.zero(), // Encrypted
      bidReferrer,
      2, // Claimed
    );

    const bidRefundEvent = createRefundBidEvent(lotId, bidId, BIDDER);
    handleRefundBid(bidRefundEvent);
  });

  afterEach(() => {
    clearStore();
  });

  test("BatchBidRefunded created and stored", () => {
    const lotRecordId =
      "mainnet-" + eventAddress.toHexString() + "-" + lotId.toString();
    const recordId = lotRecordId + "-" + bidId.toString();

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
  });
});

describe("bid decryption", () => {
  beforeEach(() => {
    _createAuctionLot();

    _createBid();

    // Update mocks
    mockEmpBid(
      auctionModuleAddress,
      lotId,
      bidId,
      BIDDER,
      bidAmountIn,
      bidAmountOut, // Decrypted
      bidReferrer,
      1, // Decrypted
    );
    mockEmpParent(
      auctionModuleAddress, // TODO need to change the event address
      eventAddress
    );

    const bidDecryptedEvent = createBidDecryptedEvent(
      lotId,
      bidId,
      bidAmountIn,
      bidAmountOut,
    );
    handleBidDecrypted(bidDecryptedEvent);
  });

  test("BatchBidDecrypted created and stored", () => {
    const lotRecordId =
      "mainnet-" + eventAddress.toHexString() + "-" + lotId.toString();
    const bidRecordId = lotRecordId + "-" + bidId.toString();

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

    const bidAmountInDecimal = toDecimal(bidAmountIn, lotQuoteTokenDecimals);
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
    assertBigDecimalEquals(
      batchBidRecord.submittedPrice,
      bidAmountInDecimal.div(bidAmountOutDecimal),
      "Bid: submittedPrice",
    );
    // TODO rawSubmittedPrice
  });
});

// TODO abort

// TODO settle

// TODO claim bid after settle

// TODO claim bid after abort

// TODO linear vesting
