import { BigDecimal, BigInt } from "@graphprotocol/graph-ts"

export const ZERO_INT: i32 = 0
export const ONE_INT: i32 = 1
export const TOTAL_NUMBER_OF_TOKENS = "2"
export const SECONDS_PER_DAY: i32 = 86000
export const HOURS_PER_DAY: i32 = 3600
export const INITIAL_TRANSFER_AMOUNT: i32 = 1000
export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export const BUNDLE_ID = "1" // This ID tracks is used to track the native token price in USD
export const NO_BUNDLE_ID = "0"
export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE_BD = BigDecimal.fromString('1')
export let BI_18 = BigInt.fromI32(18)