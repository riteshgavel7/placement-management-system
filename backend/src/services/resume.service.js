// 🚨 Ye line sabse upar honi chahiye warna code crash ho jayega
const { extractText: unpdfExtract } = require('unpdf');

exports.extractText = async (buffer) => {
    try {
        // 🔍 LOG: Debugging ke liye ki function call hua
        console.log("🛠️ Received buffer for extraction...");

        const uint8Array = new Uint8Array(buffer);
        const result = await unpdfExtract(uint8Array);

        let extractedText = "";
        if (typeof result.text === 'string') extractedText = result.text;
        else if (Array.isArray(result.text)) extractedText = result.text.join(' ');
        else if (result.pages) extractedText = result.pages.map(p => p.text).join(' ');

        if (!extractedText) throw new Error("Empty PDF");

        const cleanedText = extractedText.replace(/\s+/g, ' ').trim().substring(0, 3500);

        // 🔍 LOG: Terminal mein dikhayega ki PDF se kya nikal raha hai
       // console.log("\n--- 📄 PDF EXTRACTED TEXT PREVIEW ---");
       // console.log(cleanedText.substring(0, 2000) + "..."); 
       // console.log("--------------------------------------\n");

        return cleanedText;
    } catch (error) {
        // 🔍 LOG: Agar parsing fail hui toh kyo hui
        console.error("❌ PDF Parsing Error:", error.message);
        throw new Error("Parsing failed: " + error.message);
    }
};