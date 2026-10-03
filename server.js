const express = require("express");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.static("public"));
const PORT= 5000;

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

async function generateUniqueShortCode() {
    let shortCode;
    let exists = true;

    while (exists) {
        shortCode = Math.random().toString(36).substring(2, 8);

        const { data } = await supabase
            .from("urls")
            .select("id")
            .eq("short_code", shortCode)
            .maybeSingle();

        exists = !!data;
    }

    return shortCode;
}

app.post("/shorten", async (req, res) => {
    const { url } = req.body;

    if (!url) {
    return res.status(400).json({
        error: "URL is required"
    });
}

try {
    new URL(url);
} catch {
    return res.status(400).json({
        error: "Please provide a valid URL"
    });
}

const shortCode = await generateUniqueShortCode();
    const { data, error } = await supabase
        .from("urls")
        .insert([
            {
                original_url: url,
                short_code: shortCode
            }
        ])
        .select();

    if (error) {
        return res.status(500).json({
            error: error.message
        });
    }

    res.json({
        message: "URL shortened successfully",
        shortUrl: `http://localhost:5000/${shortCode}`,
        data: data[0]
    });
});

app.get("/" , (req,res)=>{
    res.send("CodeAlpha URL Shortener Backend is running!");
});

app.get("/:shortCode", async (req, res) => {
    const { shortCode } = req.params;

    const { data, error } = await supabase
        .from("urls")
        .select("original_url")
        .eq("short_code", shortCode)
        .single();

    if (error || !data) {
        return res.status(404).send("Short URL not found");
    }

    res.redirect(data.original_url);
});

app.listen(PORT, ()=>{
    console.log(`Server running at http://localhost:${PORT}`);
});