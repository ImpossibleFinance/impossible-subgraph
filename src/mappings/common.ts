import { BigInt, BigDecimal, Address, Bytes, ethereum } from "@graphprotocol/graph-ts";

import { ImpossibleSwapFactory } from "../../generated/templates/ImpossiblePair/ImpossibleSwapFactory";
import { Bundle } from "../../generated/schema";
import { FACTORY_ADDRESS } from "./network_constants";
import { ADDRESS_ZERO, BUNDLE_ID, HOURS_PER_DAY, NO_BUNDLE_ID, ONE_BI, SECONDS_PER_DAY, ZERO_BD, ZERO_BI } from "./general_constants";
import { getNativeTokenPriceInUSD } from "./pricing";

export let factoryContract = ImpossibleSwapFactory.bind(Address.fromString(FACTORY_ADDRESS));

export function getDayID(event: ethereum.Event): number {
  let timestamp = event.block.timestamp.toI32();
  let dayID = timestamp / SECONDS_PER_DAY;

  return dayID;
}

export function getHour(event: ethereum.Event): number {
  let timestamp = event.block.timestamp.toI32();
  let hourIndex = timestamp / HOURS_PER_DAY;

  return hourIndex;
}

export function startHour(event: ethereum.Event): number {
  let hourIndex = getHour(event);
  let hourStartUnix = hourIndex * HOURS_PER_DAY;

  return hourStartUnix;
}

export function startDayTimestamp(event: ethereum.Event): number {
  let dayID = getDayID(event);
  let dayStartTimestamp = dayID * SECONDS_PER_DAY;

  return dayStartTimestamp;
}

export function updateBundlePrice(): void {
  let bundle = getBundle();
  bundle.bnbPrice = getNativeTokenPriceInUSD();
  bundle.save();
}

export function getBundle(): Bundle {
  let bundle = Bundle.load(BUNDLE_ID);
  if (bundle == null) {
    return nullBundle();
  }
  return bundle;
}

export function createBundle(): void {
  let bundle = getBundle();
  if (bundle.id == nullBundle().id) {
    bundle = new Bundle(BUNDLE_ID);
    bundle.bnbPrice = ZERO_BD;
    bundle.save();
  }
}

function nullBundle(): Bundle {
  let bundle = new Bundle(NO_BUNDLE_ID);
  bundle.bnbPrice = ZERO_BD;

  return bundle;
}


export function isEqualToZeroAddress(address: Address): boolean {
  if (address.equals(Address.fromString(ADDRESS_ZERO))) {
    return true;
  }
  return false;
}

export function isEqualToBigDecimalZero(value: BigDecimal): boolean {
  if (value.equals(ZERO_BD)) {
    return true;
  }
  return false;
}

export function convertBNBToDecimal(bnb: BigInt): BigDecimal {
  return bnb.toBigDecimal().div(exponentToBigDecimal(BigInt.fromI32(18)));
}

export function convertTokenToDecimal(tokenAmount: BigInt, exchangeDecimals: BigInt): BigDecimal {
  if (exchangeDecimals.equals(ZERO_BI)) {
    return tokenAmount.toBigDecimal();
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals));
}

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString("1");
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString("10"));
  }
  return bd;
}

export function stringToAddress(stringValue: string): Address {
  let address = Address.fromString(stringValue);
  return address;
}

export function i32ToBigInt(value: i32): BigInt {
  let convertedValue = BigInt.fromI32(value);
  return convertedValue;
}


export function bytesToAddress(bytesValue: Bytes): Address {
  let address = Address.fromBytes(bytesValue);
  return address;
}

export function hexStringToBytes(stringAddress: string): Bytes {
  let bytesValue = Bytes.fromHexString(stringAddress);
  return bytesValue;
}
