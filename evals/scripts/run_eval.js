const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const BASE_URL = process.env.EVAL_BASE_URL || 'http://localhost:3000';
const AMOUNT_TOLERANCE = 0.02; // 2% tolerance on amount

async function runEval() {
    console.log("🧪 Starting FinBuddy OCR Evaluation...");
    console.log("===========================================");

    const groundTruthPath = path.join(__dirname, '../data/ground_truth.json');
    if (!fs.existsSync(groundTruthPath)) {
        console.error("❌ ground_truth.json not found at", groundTruthPath);
        process.exit(1);
    }

    const tests = JSON.parse(fs.readFileSync(groundTruthPath, 'utf8'));
    console.log(`Found ${tests.length} ground-truth test(s)\n`);

    const results = { passed: 0, failed: 0, skipped: 0 };

    for (const test of tests) {
        const imagePath = path.join(__dirname, '../..', test.image_path);

        if (!fs.existsSync(imagePath)) {
            console.warn(`⚠️  [SKIP] ${test.id} — image not found: ${test.image_path}`);
            results.skipped++;
            continue;
        }

        console.log(`\n🔍 Testing: ${test.id}`);

        let actual;
        try {
            // Upload image as form data to the full-process endpoint
            // Note: eval uses a dedicated /api/ocr/eval endpoint that accepts raw image bytes
            // and returns parsed JSON without writing to the database.
            const imageBuffer = fs.readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');
            const ext = path.extname(imagePath).slice(1).toLowerCase();
            const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;

            const res = await fetch(`${BASE_URL}/api/ocr/eval`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image, mimeType }),
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            }

            actual = await res.json();
        } catch (err) {
            console.error(`  ❌ [FAIL] ${test.id} — API error: ${err.message}`);
            results.failed++;
            continue;
        }

        const expected = test.expected;
        let testPassed = true;

        // Check amount (within tolerance)
        if (expected.amount !== undefined) {
            const diff = Math.abs(actual.amount - expected.amount) / expected.amount;
            if (diff > AMOUNT_TOLERANCE) {
                console.error(`  ❌ amount: got ${actual.amount}, expected ${expected.amount} (${(diff * 100).toFixed(1)}% off)`);
                testPassed = false;
            } else {
                console.log(`  ✅ amount: ${actual.amount} (within ${AMOUNT_TOLERANCE * 100}% of ${expected.amount})`);
            }
        }

        // Check category (exact match)
        if (expected.category !== undefined) {
            if (actual.category !== expected.category) {
                console.error(`  ❌ category: got "${actual.category}", expected "${expected.category}"`);
                testPassed = false;
            } else {
                console.log(`  ✅ category: ${actual.category}`);
            }
        }

        // Check items count
        if (expected.items_count !== undefined) {
            const actualCount = actual.items?.length ?? 0;
            if (actualCount !== expected.items_count) {
                console.error(`  ❌ items count: got ${actualCount}, expected ${expected.items_count}`);
                testPassed = false;
            } else {
                console.log(`  ✅ items count: ${actualCount}`);
            }
        }

        // Check item names (case-insensitive substring match)
        if (expected.items) {
            for (const expectedItem of expected.items) {
                const found = actual.items?.some(
                    (i) => i.name?.toLowerCase().includes(expectedItem.name.toLowerCase())
                );
                if (!found) {
                    console.error(`  ❌ item not found: "${expectedItem.name}"`);
                    testPassed = false;
                } else {
                    console.log(`  ✅ item found: "${expectedItem.name}"`);
                }
            }
        }

        if (testPassed) {
            results.passed++;
        } else {
            results.failed++;
        }
    }

    const total = results.passed + results.failed;
    const accuracy = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 'N/A';

    console.log("\n===========================================");
    console.log(`📊 RESULTS: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped`);
    console.log(`🎯 Accuracy: ${accuracy}% (target: 95%+)`);
    console.log("===========================================");

    if (results.failed > 0) process.exit(1);
}

runEval().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
