/**
 *
 * Compression I: RLE Compression
You are attempting to solve a Coding Contract. You have 10 tries remaining, after which the contract will self-destruct.


Run-length encoding (RLE) is a data compression technique which encodes data as a series of runs of a repeated single character. Runs are encoded as a length, followed by the character itself. Lengths are encoded as a single ASCII digit; runs of 10 characters or more are encoded by splitting them into multiple runs.

You are given the following input string:
    SSSSSWWWWWWWWWWW7iiCCTGGGxxxxxg66666mmgggggggggddPPEEEEELLLL
Encode it using run-length encoding with the minimum possible output length.

Examples:
    aaaaabccc            ->  5a1b3c
    aAaAaA               ->  1a1A1a1A1a1A
    111112333            ->  511233
    zzzzzzzzzzzzzzzzzzz  ->  9z9z1z  (or 9z8z2z, etc.)
 */

const input = "SSSSSWWWWWWWWWWW7iiCCTGGGxxxxxg66666mmgggggggggddPPEEEEELLLL";

const examples = [
  ["aaaaabccc", "5a1b3c"],
  ["aAaAaA", "1a1A1a1A1a1A"],
  ["111112333", "511233"],
  ["zzzzzzzzzzzzzzzzzzz", "9z9z1z"],
];

function rle(s) {
  const result = [];
  let char = null;
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    if (char === null) {
      char = s[i];
      n++;
    } else if (s[i] !== char || n >= 9) {
      result.push([char, n]);
      char = s[i];
      n = 1;
    } else {
      n++;
    }
  }

  result.push([char, n]);

  return result.map(([c, n]) => n + c).join("");
}

console.log(
  examples.map(([test, expected]) => [rle(test), expected === rle(test)])
);
console.log(rle(input));
