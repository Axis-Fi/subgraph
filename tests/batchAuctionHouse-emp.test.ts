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
  Curated,
} from "../generated/BatchAuctionHouse/BatchAuctionHouse";
import {
  BatchAuctionAborted,
  BatchAuctionCancelled,
  BatchAuctionCreated,
  BatchAuctionCurated,
  BatchAuctionLot,
  BatchBid,
  BatchBidDecrypted,
  BatchBidRefunded,
  BatchEncryptedMarginalPriceLot,
  BatchLinearVestingRedeemed,
} from "../generated/schema";
import {
  handleAbort,
  handleAuctionCancelled,
  handleAuctionCreated,
  handleBid,
  handleBidClaimed,
  handleCurated,
  handleRefundBid,
  handleSettle,
} from "../src/batchAuctionHouse";
import { handleRedeemed } from "../src/handleBatchLinearVesting";
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
  createClaimBidEvent,
  createCuratedEvent,
  createLinearVestingRedeemEvent,
  createRefundBidEvent,
  createSettleEvent,
} from "./auction-house-utils";
import { createBidDecryptedEvent } from "./empam-utils";
import { calculatePrice } from "./helpers/price";
import {
  getBatchAuctionLot,
  getBatchAuctionSettled,
  getBatchBid,
  getBatchBidClaimed,
  getBatchEncryptedMarginalPriceLot,
  getBatchLinearVestingLot,
  getBatchLinearVestingRedeemed,
} from "./helpers/records";
import { mockGetModuleForVeecode } from "./mocks/baseAuctionHouse";
import { mockGetAuctionModuleForId } from "./mocks/baseAuctionHouse";
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
import {
  mockBalanceOf,
  mockDecimals,
  mockTokenId,
} from "./mocks/linearVesting";
import { mockToken } from "./mocks/token";

const auctionModuleVeecode = "01EMPA";
const linearVestingVeecode = "01LIV";
const linearVestingParams = Bytes.fromHexString(
  "0x00000000000000000000000000000000000000000000000000000000663d011000000000000000000000000000000000000000000000000000000000663fa410",
);
const linearVestingStart = 1715274000; // 0x00000000000000000000000000000000000000000000000000000000663d0110
const linearVestingExpiry = 1715446800; // 0x00000000000000000000000000000000000000000000000000000000663fa410

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

const derivativeModuleAddress: Address = Address.fromString(
  "0x90608F57161aC771b28fb0adCd2434cfa1463201",
);
const derivativeTokenId: BigInt = BigInt.fromString("22331111");
const derivativeTokenBalance: BigInt = BigInt.fromString(
  "10000000000000000000000",
); // 10
const derivativeRedeemed: BigInt = BigInt.fromString("1500000000000000000000"); // 1.5

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
const lotMarginalPrice: BigInt = BigInt.fromU64(5_000_000);
const UINT256_MAX = BigInt.fromUnsignedBytes(
  Bytes.fromHexString(
    "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  ),
); // Marginal price set to uint256 max

const empMinPrice: BigInt = BigInt.fromU64(1_000_000_000_000_000_000);
const empMinFilled: BigInt = BigInt.fromU64(2_000_000_000_000_000_000);
const empMinBidSize: BigInt = BigInt.fromU64(3_000_000_000_000_000_000);
const empPublicKeyX: BigInt = BigInt.fromU64(222);
const empPublicKeyY: BigInt = BigInt.fromU64(333);
const empPrivateKey: BigInt = BigInt.fromI32(111111111);

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

function _createAuctionLot(
  curator: Address = lotFeesCurator,
  curatorFee: i32 = lotFeesCuratorFee,
  protocolFee: i32 = lotFeesProtocolFee,
  referrerFee: i32 = lotFeesReferrerFee,
  derivativeVeecode: string = "",
  derivativeParams: Bytes = Bytes.fromUTF8(""),
): void {
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
    Bytes.fromUTF8(derivativeVeecode),
    false,
    derivativeParams,
  );
  mockLotFees(
    auctionHouse,
    LOT_ID,
    curator,
    false,
    curatorFee,
    protocolFee,
    referrerFee,
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

  if (derivativeVeecode === linearVestingVeecode) {
    mockGetModuleForVeecode(
      auctionHouse,
      linearVestingVeecode,
      derivativeModuleAddress,
    );

    mockTokenId(
      derivativeModuleAddress,
      BASE_TOKEN,
      derivativeParams,
      derivativeTokenId,
    );

    mockDecimals(
      derivativeModuleAddress,
      derivativeTokenId,
      lotBaseTokenDecimals,
    );

    mockBalanceOf(
      derivativeModuleAddress,
      BIDDER,
      derivativeTokenId,
      derivativeTokenBalance,
    );
  }

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

function _decryptBid(bidId: BigInt, amountOut: BigInt): void {
  mockEmpBid(
    auctionModuleAddress,
    LOT_ID,
    bidId,
    BIDDER,
    bidAmountIn,
    amountOut, // Decrypted
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
    //
  });

  afterEach(() => {
    clearStore();
  });

  test("BatchAuctionCreated created and stored", () => {
    _createAuctionLot();

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
    const batchAuctionLotRecord = getBatchAuctionLot(recordId);

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
      "created",
      "BatchEncryptedMarginalPriceLot: status",
    );
    assertBooleanEquals(
      empLotRecord.settlementSuccessful,
      false,
      "BatchEncryptedMarginalPriceLot: settlementSuccessful",
    );
    assertBigDecimalEquals(
      empLotRecord.marginalPrice,
      null,
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

  test("curator not set", () => {
    _createAuctionLot(Address.zero());

    const recordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();

    const batchAuctionLotRecord = getBatchAuctionLot(recordId);

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
  });

  test("curator fee not set", () => {
    _createAuctionLot(lotFeesCurator, 0);

    const recordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();

    const batchAuctionLotRecord = getBatchAuctionLot(recordId);

    assertBigDecimalEquals(
      batchAuctionLotRecord.curatorFee,
      BigDecimal.zero(),
      "BatchAuctionLot: curatorFee",
    );
  });

  test("protocol fee not set", () => {
    _createAuctionLot(lotFeesCurator, lotFeesCuratorFee, 0);

    const recordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();

    const batchAuctionLotRecord = getBatchAuctionLot(recordId);

    assertBigDecimalEquals(
      batchAuctionLotRecord.protocolFee,
      BigDecimal.zero(),
      "BatchAuctionLot: protocolFee",
    );
  });

  test("referrer fee not set", () => {
    _createAuctionLot(lotFeesCurator, lotFeesCuratorFee, lotFeesProtocolFee, 0);

    const recordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();

    const batchAuctionLotRecord = getBatchAuctionLot(recordId);

    assertBigDecimalEquals(
      batchAuctionLotRecord.referrerFee,
      BigDecimal.zero(),
      "BatchAuctionLot: referrerFee",
    );
  });

  test("BatchLinearVestingLot created and stored", () => {
    _createAuctionLot(
      lotFeesCurator,
      lotFeesCuratorFee,
      lotFeesProtocolFee,
      lotFeesProtocolFee,
      linearVestingVeecode,
      linearVestingParams,
    );

    const lotRecordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();
    const batchAuctonLotRecord = getBatchAuctionLot(lotRecordId);

    const lvRecordId =
      "mainnet-" +
      derivativeModuleAddress.toHexString() +
      "-" +
      derivativeTokenId.toString();

    // Check the BatchLinearVestingLot record
    assert.entityCount("BatchLinearVestingLot", 1);
    const linearVestingLotRecord = getBatchLinearVestingLot(lvRecordId);
    assertStringEquals(
      linearVestingLotRecord.id,
      lvRecordId,
      "BatchLinearVestingLot: id",
    );
    assertStringEquals(
      linearVestingLotRecord.lot,
      batchAuctonLotRecord.id,
      "BatchLinearVestingLot: lot",
    );
    assertBigIntEquals(
      linearVestingLotRecord.tokenId,
      derivativeTokenId,
      "BatchLinearVestingLot: tokenId",
    );
    assertBigIntEquals(
      linearVestingLotRecord.startTimestamp,
      BigInt.fromI32(linearVestingStart),
      "BatchLinearVestingLot: startTimestamp",
    );
    assertBigIntEquals(
      linearVestingLotRecord.expiryTimestamp,
      BigInt.fromI32(linearVestingExpiry),
      "BatchLinearVestingLot: expiryTimestamp",
    );

    // Check reverse lookup
    const auctionLotRecord = getBatchAuctionLot(lotRecordId);
    const linearVestingLotRecordLookup = auctionLotRecord.linearVesting.load();
    assertI32Equals(
      linearVestingLotRecordLookup.length,
      1,
      "BatchAuctionLot: linearVesting lookup length",
    );
    assertStringEquals(
      linearVestingLotRecordLookup[0].id,
      lvRecordId,
      "BatchAuctionLot: linearVesting lookup",
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
      "cancelled",
      "BatchEncryptedMarginalPriceLot: status",
    );
    assertBooleanEquals(
      empLotRecord.settlementSuccessful,
      false,
      "BatchEncryptedMarginalPriceLot: settlementSuccessful",
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

    _createBidWithId(BID_ID_ONE);
    _createBidWithId(BID_ID_TWO);

    _decryptBid(BID_ID_ONE, bidAmountOut);
    _decryptBid(BID_ID_TWO, BigInt.zero()); // Invalid or out of bounds amountOut

    // Update mocks
    mockEmpAuctionData(
      auctionModuleAddress,
      LOT_ID,
      0,
      0,
      1, // Decrypted
      0,
      BigInt.zero(),
      empMinPrice,
      empMinFilled,
      empMinBidSize,
      empPublicKeyX,
      empPublicKeyY,
      empPrivateKey,
    );
  });

  test("BatchBidDecrypted created and stored", () => {
    const lotRecordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();
    const bidOneRecordId = lotRecordId + "-" + BID_ID_ONE.toString();

    // BatchBidDecrypted record is created
    assert.entityCount("BatchBidDecrypted", 2);
    const batchBidDecryptedRecord = BatchBidDecrypted.load(bidOneRecordId);
    if (batchBidDecryptedRecord === null) {
      throw new Error(
        "Expected BatchBidDecrypted to exist for record id " + bidOneRecordId,
      );
    }

    assertStringEquals(
      batchBidDecryptedRecord.id,
      bidOneRecordId,
      "Bid one: id",
    );
    assertStringEquals(
      batchBidDecryptedRecord.lot,
      lotRecordId,
      "Bid one: lot",
    );
    assertStringEquals(
      batchBidDecryptedRecord.bid,
      bidOneRecordId,
      "Bid one: bid",
    );
    assertBigDecimalEquals(
      batchBidDecryptedRecord.amountIn,
      toDecimal(bidAmountIn, lotQuoteTokenDecimals),
      "Bid one: amountIn",
    );
    assertBigDecimalEquals(
      batchBidDecryptedRecord.amountOut,
      toDecimal(bidAmountOut, lotBaseTokenDecimals),
      "Bid one: amountOut",
    );

    // BatchBidDecrypted record is created for the bid that did not decrypt successfully
    const bidTwoRecordId = lotRecordId + "-" + BID_ID_TWO.toString();
    const batchBidDecryptedRecordTwo = BatchBidDecrypted.load(bidTwoRecordId);
    if (batchBidDecryptedRecordTwo === null) {
      throw new Error(
        "Expected BatchBidDecrypted to exist for record id " + bidTwoRecordId,
      );
    }

    assertStringEquals(
      batchBidDecryptedRecordTwo.id,
      bidTwoRecordId,
      "Bid two: id",
    );
    assertStringEquals(
      batchBidDecryptedRecordTwo.lot,
      lotRecordId,
      "Bid two: lot",
    );
    assertStringEquals(
      batchBidDecryptedRecordTwo.bid,
      bidTwoRecordId,
      "Bid two: bid",
    );
    assertBigDecimalEquals(
      batchBidDecryptedRecordTwo.amountIn,
      toDecimal(bidAmountIn, lotQuoteTokenDecimals),
      "Bid two: amountIn",
    );
    assertBigDecimalEquals(
      batchBidDecryptedRecordTwo.amountOut,
      BigDecimal.zero(),
      "Bid two: amountOut",
    );

    // BatchBid is updated
    const batchBidRecordOne = BatchBid.load(bidOneRecordId);
    if (batchBidRecordOne === null) {
      throw new Error(
        "Expected BatchBid to exist for record id " + bidOneRecordId,
      );
    }

    const bidAmountOutDecimal = toDecimal(bidAmountOut, lotBaseTokenDecimals);
    assertBigDecimalEquals(
      batchBidRecordOne.amountOut,
      bidAmountOutDecimal,
      "Bid one: amountOut",
    );
    assertBigIntEquals(
      batchBidRecordOne.rawAmountOut,
      bidAmountOut,
      "Bid one: rawAmountOut",
    );
    const submittedPriceDecimal = calculatePrice(
      bidAmountIn,
      lotQuoteTokenDecimals,
      bidAmountOut,
    );
    assertBigDecimalEquals(
      batchBidRecordOne.submittedPrice,
      submittedPriceDecimal,
      "Bid one: submittedPrice",
    );
    // TODO rawSubmittedPrice

    const batchBidRecordTwo = BatchBid.load(bidTwoRecordId);
    if (batchBidRecordTwo === null) {
      throw new Error(
        "Expected BatchBid to exist for record id " + bidTwoRecordId,
      );
    }

    assertBigDecimalEquals(
      batchBidRecordTwo.amountOut,
      null,
      "Bid two: amountOut",
    );
    assertBigIntEquals(
      batchBidRecordTwo.rawAmountOut,
      null,
      "Bid two: rawAmountOut",
    );
    assertBigDecimalEquals(
      batchBidRecordTwo.submittedPrice,
      null,
      "Bid two: submittedPrice",
    );

    // Check reverse lookups
    const batchBidRecordDecryptedLookup = batchBidRecordOne.decrypted.load();
    assertI32Equals(
      batchBidRecordDecryptedLookup.length,
      1,
      "Bid: decrypted lookup length",
    );
    assertStringEquals(
      batchBidRecordDecryptedLookup[0].id,
      bidOneRecordId,
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
      2,
      "BatchAuctionLot: bidsDecrypted lookup length",
    );
    assertStringEquals(
      batchAuctionLotRecordBidsDecryptedLookup[0].id,
      bidOneRecordId,
      "BatchAuctionLot: bidsDecrypted lookup",
    );
    assertStringEquals(
      batchAuctionLotRecordBidsDecryptedLookup[1].id,
      bidTwoRecordId,
      "BatchAuctionLot: bidsDecrypted lookup",
    );
  });
});

describe("abort", () => {
  beforeEach(() => {
    _createAuctionLot();

    _createBid();

    // Update lot status
    mockEmpAuctionData(
      auctionModuleAddress,
      LOT_ID,
      0,
      0,
      2, // Aborted (Settled)
      0,
      UINT256_MAX,
      empMinPrice,
      empMinFilled,
      empMinBidSize,
      empPublicKeyX,
      empPublicKeyY,
      BigInt.zero(),
    );
    mockEmpParent(auctionModuleAddress, auctionHouse);

    // Set bid outcome
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

    // Create event
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
    const empLotRecord = getBatchEncryptedMarginalPriceLot(recordId);
    assertStringEquals(
      empLotRecord.status,
      "aborted",
      "BatchEncryptedMarginalPriceLot: status",
    );
    assertBooleanEquals(
      empLotRecord.settlementSuccessful,
      false,
      "BatchEncryptedMarginalPriceLot: settlementSuccessful",
    );
    assertBigDecimalEquals(
      empLotRecord.marginalPrice,
      toDecimal(UINT256_MAX, lotQuoteTokenDecimals),
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

  test("BatchBidClaimed created and stored", () => {
    // Mock the bid status
    mockEmpBid(
      auctionModuleAddress,
      LOT_ID,
      BID_ID_ONE,
      BIDDER,
      bidAmountIn,
      BigInt.zero(),
      bidReferrer,
      2, // Claimed
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
    const recordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();
    const bidRecordId = recordId + "-" + BID_ID_ONE.toString();

    assert.entityCount("BatchBidClaimed", 1);
    const batchBidClaimedRecord = getBatchBidClaimed(recordId, BID_ID_ONE);

    assertStringEquals(
      batchBidClaimedRecord.id,
      bidRecordId,
      "BatchBidClaimed: id",
    );
    assertStringEquals(
      batchBidClaimedRecord.lot,
      recordId,
      "BatchBidClaimed: lot",
    );
    assertStringEquals(
      batchBidClaimedRecord.bid,
      bidRecordId,
      "BatchBidClaimed: bid",
    );

    // BatchBid is updated
    const batchBidRecord = getBatchBid(recordId, BID_ID_ONE);
    assertStringEquals(batchBidRecord.status, "claimed", "Bid: status");
    assertStringEquals(batchBidRecord.outcome, "lost", "Bid: outcome");

    // Check reverse lookups
    const batchBidRecordClaimedLookup = batchBidRecord.claimed.load();
    assertI32Equals(
      batchBidRecordClaimedLookup.length,
      1,
      "Bid: claimed lookup length",
    );
    assertStringEquals(
      batchBidRecordClaimedLookup[0].id,
      bidRecordId,
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

    _decryptBid(BID_ID_ONE, bidAmountOut);
    _decryptBid(BID_ID_TWO, bidAmountOut);
    _decryptBid(BID_ID_THREE, bidAmountOut);

    // Update auction data for settlement
    mockEmpAuctionData(
      auctionModuleAddress,
      LOT_ID,
      0,
      0,
      2, // Settled
      0,
      lotMarginalPrice,
      empMinPrice,
      empMinFilled,
      empMinBidSize,
      empPublicKeyX,
      empPublicKeyY,
      empPrivateKey,
    );

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
    mockEmpPartialFill(
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
      "settled",
      "BatchEncryptedMarginalPriceLot: status",
    );
    assertBooleanEquals(
      empLotRecord.settlementSuccessful,
      true,
      "BatchEncryptedMarginalPriceLot: settlementSuccessful",
    );
    assertBigDecimalEquals(
      empLotRecord.marginalPrice,
      toDecimal(lotMarginalPrice, lotQuoteTokenDecimals),
      "BatchEncryptedMarginalPriceLot: marginalPrice",
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

    // TODO sold, purchased, capacity are updated
  });

  test("BatchBidClaimed created and stored", () => {
    // Mock the bid status
    mockEmpBidClaim(
      auctionModuleAddress,
      LOT_ID,
      BID_ID_TWO,
      BIDDER,
      bidReferrer,
      bidAmountIn,
      bidAmountOut,
      BigInt.zero(),
    );
    mockEmpBid(
      auctionModuleAddress,
      LOT_ID,
      BID_ID_ONE,
      BIDDER,
      bidAmountIn,
      bidAmountOut,
      bidReferrer,
      2, // Claimed
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
    const recordId =
      "mainnet-" + auctionHouse.toHexString() + "-" + LOT_ID.toString();
    const bidRecordId = recordId + "-" + BID_ID_ONE.toString();

    assert.entityCount("BatchBidClaimed", 1);
    const batchBidClaimedRecord = getBatchBidClaimed(recordId, BID_ID_ONE);

    assertStringEquals(
      batchBidClaimedRecord.id,
      bidRecordId,
      "BatchBidClaimed: id",
    );
    assertStringEquals(
      batchBidClaimedRecord.lot,
      recordId,
      "BatchBidClaimed: lot",
    );
    assertStringEquals(
      batchBidClaimedRecord.bid,
      bidRecordId,
      "BatchBidClaimed: bid",
    );

    // BatchBid is updated
    const batchBidRecord = getBatchBid(recordId, BID_ID_ONE);
    assertStringEquals(batchBidRecord.status, "claimed", "Bid: status");
    assertStringEquals(batchBidRecord.outcome, "won", "Bid: outcome");

    // Check reverse lookups
    const batchBidRecordClaimedLookup = batchBidRecord.claimed.load();
    assertI32Equals(
      batchBidRecordClaimedLookup.length,
      1,
      "Bid: claimed lookup length",
    );
    assertStringEquals(
      batchBidRecordClaimedLookup[0].id,
      bidRecordId,
      "Bid: claimed lookup",
    );
  });
});

describe("linear vesting redemption", () => {
  beforeEach(() => {
    _createAuctionLot(
      lotFeesCurator,
      lotFeesCuratorFee,
      lotFeesProtocolFee,
      lotFeesProtocolFee,
      linearVestingVeecode,
      linearVestingParams,
    );
  });

  afterEach(() => {
    clearStore();
  });

  test("BatchLinearVestingRedemption created and stored", () => {
    const event = createLinearVestingRedeemEvent(
      derivativeTokenId,
      BIDDER,
      derivativeRedeemed,
      derivativeModuleAddress,
    );
    handleRedeemed(event);

    const lvLotRecordId =
      "mainnet-" +
      derivativeModuleAddress.toHexString() +
      "-" +
      derivativeTokenId.toString();

    // BatchLinearVestingRedeemed record is stored
    const recordId =
      "mainnet-" +
      derivativeModuleAddress.toHexString() +
      "-" +
      derivativeTokenId.toString() +
      "-" +
      event.transaction.hash.toHexString() +
      "-" +
      event.logIndex.toString();

    const batchLinearVestingRedemptionRecord =
      getBatchLinearVestingRedeemed(recordId);

    assertStringEquals(
      batchLinearVestingRedemptionRecord.id,
      recordId,
      "BatchLinearVestingRedemption: id",
    );
    assertStringEquals(
      batchLinearVestingRedemptionRecord.lot,
      lvLotRecordId,
      "BatchLinearVestingRedemption: lot",
    );
    assertBytesEquals(
      batchLinearVestingRedemptionRecord.bidder,
      BIDDER,
      "BatchLinearVestingRedemption: bidder",
    );
    assertBigDecimalEquals(
      batchLinearVestingRedemptionRecord.redeemed,
      toDecimal(derivativeRedeemed, lotBaseTokenDecimals),
      "BatchLinearVestingRedemption: redeemed",
    );
    assertBigDecimalEquals(
      batchLinearVestingRedemptionRecord.remaining,
      toDecimal(derivativeTokenBalance, lotBaseTokenDecimals),
      "BatchLinearVestingRedemption: remaining",
    );

    // Check reverse lookup
    const batchLinearVestingLotRecord = getBatchLinearVestingLot(lvLotRecordId);
    const batchLinearVestingLotRedeemedLookup =
      batchLinearVestingLotRecord.redemptions.load();
    assertI32Equals(
      batchLinearVestingLotRedeemedLookup.length,
      1,
      "BatchLinearVestingLot: redemptions lookup length",
    );
    assertStringEquals(
      batchLinearVestingLotRedeemedLookup[0].id,
      recordId,
      "BatchLinearVestingLot: redemptions lookup",
    );
  });
});
