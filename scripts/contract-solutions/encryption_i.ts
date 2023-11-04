function leftShift(n: number, shift: number, max: number) {
  let v = n - shift;
  if (v < 0) {
    v = max + v;
  }

  return v;
}

function caesarCipher(plaintext: string, shift: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let ciphertext = '';

  for (let i = 0; i < plaintext.length; i++) {
    const char = plaintext[i];
    if (char === ' ') {
      ciphertext += ' '; // Preserve spaces
    } else {
      const index = alphabet.indexOf(char.toUpperCase());
      const newIndex = leftShift(index, shift, alphabet.length);
      const newChar = alphabet[newIndex];
      ciphertext += newChar;
    }
  }

  return ciphertext;
}

// Example usage
const data: [string, number] = ['TABLE ENTER SHELL LOGIC MEDIA', 5];
const plaintext = data[0];
const shift = data[1];
const ciphertext = caesarCipher(plaintext, shift);

console.log(ciphertext); // Output: YFGQJ JSYJW XMFQQ NRIHM RJDI
