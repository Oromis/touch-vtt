export default {
  roundToDecimals(number, decimals) {
    const scalingFactor = 10 ** decimals
    return Math.round(number * scalingFactor) / scalingFactor
  }
}
