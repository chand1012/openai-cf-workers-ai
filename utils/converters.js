export function uint8ArrayToBase64(uint8Array) {
	let string = '';

	// Convert each byte in the Uint8Array to a character
	uint8Array.forEach(byte => {
		string += String.fromCharCode(byte);
	});

	// Convert the binary string to Base64
	return btoa(string);
}
