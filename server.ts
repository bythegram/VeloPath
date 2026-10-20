import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Harmonize Google Maps API key across variable names for client bundling
const mapsKey =
  process.env.VITE_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  "";

if (mapsKey) {
  process.env.VITE_GOOGLE_MAPS_API_KEY = mapsKey;
  process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY = mapsKey;
  process.env.GOOGLE_MAPS_PLATFORM_KEY = mapsKey;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Endpoint: Expose Maps API config to frontend
app.get("/api/maps-config", (_req, res) => {
  res.json({
    apiKey: mapsKey,
    hasKey: Boolean(mapsKey),
  });
});

// Secure, lazy-loaded Gemini API Instance
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required to access AI features.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Endpoint 1: Generate Bikepacking Stops
app.post("/api/gemini/stops", async (req, res) => {
  try {
    const { origin, destination, waypoints, totalDistance, totalDuration, personalGoals } = req.body;
    
    const client = getGeminiClient();
    
    const prompt = `You are an expert bikepacking guide. 
    A user is planning a bikepacking route with:
    - Origin: ${origin}
    - Destination: ${destination}
    - Waypoints: ${JSON.stringify(waypoints || [])}
    - Distance: ${totalDistance}
    - Duration: ${totalDuration}
    - Personal Rider Goals/Context: "${personalGoals || 'None specified'}"

    Suggest exactly 4-5 strategic stops along this cycling route. Categorize them appropriately (e.g. Campsite/Shelter, Water Refill, Food/Groceries, Scenic Rest). 
    Provide real or highly probable recommendations appropriate for cyclists/bikepackers.
    Return a clean JSON array of recommended stops.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional bicycle touring and bikepacking route engineer. You understand bike touring requirements like access to water, campgrounds, terrain challenges, and refuel frequencies. Always output strictly valid JSON conforming to the requested schema. No conversational filler or markdown code blocks.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "List of recommended stops along the route",
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Name of the stop or place" },
              category: { 
                type: Type.STRING, 
                description: "Type of stop",
                enum: ["Campsite", "Water Refill", "Food Stop", "Scenic View"] 
              },
              locationName: { type: Type.STRING, description: "Approximate address, city or park name" },
              description: { type: Type.STRING, description: "A supportive, informative description of what to find here, why it was chosen, and tips for the cyclist." },
              suggestedStage: { type: Type.STRING, description: "e.g., 'At roughly 45km', 'Midway', 'End of Day 1'" }
            },
            required: ["name", "category", "locationName", "description", "suggestedStage"]
          }
        }
      }
    });

    const text = response.text || "[]";
    const stops = JSON.parse(text.trim());
    res.json({ success: true, stops });
  } catch (error: any) {
    console.error("Error generating stops:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to generate recommended stops" });
  }
});

// Endpoint 2: Generate Customized Bikepacking Gear List
app.post("/api/gemini/gear", async (req, res) => {
  try {
    const { origin, destination, totalDistance, totalDuration, personalGoals } = req.body;
    
    const client = getGeminiClient();
    
    const prompt = `Create a customized bikepacking packing list for a trip from "${origin}" to "${destination}" of approximately ${totalDistance} (taking ${totalDuration}). 
    Rider personal goals & details: "${personalGoals || 'General touring'}".
    Provide specific gear items grouped into logical categories (e.g. Bike Bags, Camp Shelter, Cooking/Food, Hydration, Tools & Spares, Personal/Clothing). 
    Ensure items are tailored to the distance and duration. For example, a 4-day trip needs cooking gear and shelter, whereas a short 100km overnight might be simpler.
    Return a structured JSON object.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a seasoned bikepacker and gear expert. Provide essential, lightweight packing gear checklists. Always output strictly valid JSON conforming to the requested schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categories: {
              type: Type.ARRAY,
              description: "List of gear categories",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Category name, e.g. Shelter & Sleeping" },
                  items: {
                    type: Type.ARRAY,
                    description: "List of recommended items in this category",
                    items: { type: Type.STRING }
                  }
                },
                required: ["name", "items"]
              }
            }
          },
          required: ["categories"]
        }
      }
    });

    const text = response.text || "{}";
    const gearList = JSON.parse(text.trim());
    res.json({ success: true, gearList });
  } catch (error: any) {
    console.error("Error generating gear list:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to generate gear list" });
  }
});

// Endpoint 3: Resolve Google Maps Shortlinks (e.g. maps.app.goo.gl or goo.gl/maps)
app.post("/api/resolve-maps-url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, error: "A valid URL string is required" });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    // Follow redirects to get the final expanded destination URL
    const response = await fetch(targetUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    let finalUrl = response.url;

    // Check if the response HTML contains metadata or links with the actual Google Maps directions url
    const htmlText = await response.text();
    
    // 1. Check for canonical / og:url / twitter meta tags
    const ogMatch = htmlText.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i);
    const canonicalMatch = htmlText.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    const metaRefreshMatch = htmlText.match(/content=["']\d+;\s*url=([^"']+)["']/i);
    const windowLocationMatch = htmlText.match(/window\.location\s*=\s*["']([^"']+)["']/i);
    const mapDirLinkMatch = htmlText.match(/href=["'](https:\/\/[^"']*google\.com\/maps\/dir\/[^"']+)["']/i);

    if (mapDirLinkMatch && mapDirLinkMatch[1]) {
      finalUrl = mapDirLinkMatch[1];
    } else if (ogMatch && ogMatch[1] && (ogMatch[1].includes("/maps/") || ogMatch[1].includes("/dir/"))) {
      finalUrl = ogMatch[1];
    } else if (canonicalMatch && canonicalMatch[1] && (canonicalMatch[1].includes("/maps/") || canonicalMatch[1].includes("/dir/"))) {
      finalUrl = canonicalMatch[1];
    } else if (metaRefreshMatch && metaRefreshMatch[1]) {
      finalUrl = metaRefreshMatch[1];
    } else if (windowLocationMatch && windowLocationMatch[1]) {
      finalUrl = windowLocationMatch[1];
    }

    res.json({ success: true, resolvedUrl: finalUrl });
  } catch (error: any) {
    console.error("Error resolving Google Maps URL:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to resolve Google Maps URL" });
  }
});

// Vite middleware integration
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupServer();
