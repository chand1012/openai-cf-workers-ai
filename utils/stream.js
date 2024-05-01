export async function streamToBuffer(stream) {
    const chunks = [];
    const reader = stream.getReader();

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            chunks.push(value);
        }

        // Concatenate all chunks into a single Uint8Array
        const concatenated = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;

        for (const chunk of chunks) {
            concatenated.set(chunk, offset);
            offset += chunk.length;
        }

        return concatenated;
    } finally {
        reader.releaseLock();
    }
}
