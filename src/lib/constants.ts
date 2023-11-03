// Gap between the end of each script to keep
// Lower gaps speed things up but risk causing out-of-order runs
export const GAP = 50.0;

// Overgrow servers a little bit just to handle errors in hack amount
// Errors cane come up from increasing hack levels mid-batch
export const OVERGROW_FACTOR = 1.1;

// How much money do we want to take from the server each iteration?
// Value is a percentage of the maximum money on the server.
// Higher values will mean faster iterations but less money.
export const MONEY_PERCENT_PER_HACK = 0.025;

// Set to true to enable some debug logging
export const DEBUG = false;
