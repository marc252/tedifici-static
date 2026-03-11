export function validateAndFixRC(rc: string): string | null {
    // 1. Basic cleaning
    const raw = rc.toUpperCase().trim();
    if (raw.length < 18) return null; // Need at least the first 18 chars

    // 2. Extract components
    // Positions are 0-indexed in JS string
    // PC1: 0-6 (7 chars)
    // PC2: 7-13 (7 chars)
    // CARGO: 14-17 (4 chars)
    // DC: 18-19 (2 chars) - we will re-calculate these

    const pc1 = raw.substring(0, 7);
    const pc2 = raw.substring(7, 14);
    const cargo = raw.substring(14, 18);

    // 3. Define algo constants
    const weights = [13, 15, 12, 5, 4, 17, 9, 21, 3, 7, 1];
    const controlChars = "MQWERTYUIOPASDFGHJKLBZX"; // 0-22

    // Helper to get value of a char
    function getVal(char: string): number {
        if (/[0-9]/.test(char)) return parseInt(char, 10);

        // Letters A-Z (including Ñ?)
        // The mapping is A=1, B=2, etc.
        // We can use a lookup string
        const letters = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
        const idx = letters.indexOf(char);
        if (idx !== -1) return idx + 1;

        return 0; // Should not happen for valid chars
    }

    // Helper to calculate DC for a component + cargo
    function calculateDC(component: string, cargo: string): string {
        const str = component + cargo; // 11 chars
        let sum = 0;
        for (let i = 0; i < str.length; i++) {
            sum += getVal(str[i]) * weights[i];
        }
        const remainder = sum % 23;
        return controlChars[remainder];
    }

    // 4. Calculate proper DCs
    const dc1 = calculateDC(pc1, cargo);
    const dc2 = calculateDC(pc2, cargo);

    // 5. Construct valid RC
    const fixedRC = pc1 + pc2 + cargo + dc1 + dc2;
    return fixedRC;
}
