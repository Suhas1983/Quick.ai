import { GoogleGenAI } from "@google/genai";
import sql from "../configs/db.js";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary"
import fs from 'fs';
import pdf from 'pdf-parse/lib/pdf-parse.js'

const AI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue.",
      });
    }

    const response = await AI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Write an article of approximately ${length} words on: ${prompt}`,
    });

    const content = response.text;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${content}, 'article')
    `;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    res.json({
      success: true,
      content,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const generateBlogTitle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue.",
      });
    }

    if (!prompt || !prompt.trim()) {
      return res.json({
        success: false,
        message: "Please provide a topic or keyword.",
      });
    }

    const response = await AI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert content strategist and copywriter specializing in high-performing blog titles.

Generate 10 catchy, click-worthy blog titles for the following topic/keyword: "${prompt}"

Guidelines:
- Mix different styles: how-to, listicle, question-based, bold claim, curiosity-driven
- Keep each title under 70 characters where possible (good for SEO)
- Make them specific and benefit-driven, not generic
- Avoid clickbait that doesn't deliver on the promise
- Vary sentence structure across the 10 titles

Return ONLY a valid JSON array of 10 strings, no markdown, no extra text. Example format:
["Title 1", "Title 2", "Title 3"]`,
      config: {
        maxOutputTokens: 600,
        temperature: 0.9,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    let rawText = response.text?.trim();

    if (!rawText) {
      console.error("Empty response from Gemini:", JSON.stringify(response, null, 2));
      return res.status(500).json({
        success: false,
        message: "AI returned an empty response. Please try again.",
      });
    }

    // Strip markdown code fences if the model adds them anyway
    rawText = rawText.replace(/```json|```/g, "").trim();

    let titles;
    try {
      titles = JSON.parse(rawText);
    } catch (parseError) {
      console.error("Failed to parse titles JSON:", rawText);
      // Fallback: store raw text so nothing is lost
      titles = null;
    }

    const content = titles ? JSON.stringify(titles) : rawText;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${content}, 'Blog-title')
    `;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    res.json({
      success: true,
      content: titles || rawText,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish } = req.body;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This Feature is only available for Premium User",
      });
    }

    // declared outside the inner try so it's still in scope afterward
    let data;

    try {
      console.log("Calling ClipDrop...");

      const formData = new FormData();
      formData.append("prompt", prompt);

      const response = await axios.post(
        "https://clipdrop-api.co/text-to-image/v1",
        formData,
        {
          headers: {
            "x-api-key": process.env.CLIPDROP_API_KEY,
            // uncomment if you're using the `form-data` npm package
            // (not needed for native Node 18+ FormData):
            // ...formData.getHeaders(),
          },
          responseType: "arraybuffer",
        }
      );

      data = response.data;
      console.log("ClipDrop Success");
    } catch (error) {
      console.log("Status:", error.response?.status);

      if (error.response?.data) {
        console.log(
          "Response:",
          Buffer.from(error.response.data).toString("utf8")
        );
      }

      throw error;
    }

    // data is already a Buffer here when responseType is "arraybuffer"
    const base64Image = `data:image/png;base64,${Buffer.from(data).toString("base64")}`;
    const { secure_url } = await cloudinary.uploader.upload(base64Image);

    await sql`
      INSERT INTO creations (user_id, prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${secure_url}, 'Image', ${publish ?? false})
    `;

    res.json({
      success: true,
      content: secure_url,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
  
  
 export const removeImageBackground = async (req, res) => {
  try {
    const { userId } = req.auth();
    const image = req.file; // req.file IS the file object — there is no nested "image" key
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This Feature is only available for Premium User",
      });
    }

    if (!image) {
      return res.json({
        success: false,
        message: "Please upload an image.",
      });
    }

    const { secure_url } = await cloudinary.uploader.upload(image.path, {
      transformation: [
        {
          effect: 'background_removal',
          background_removal: 'remove_the_background'
        }
      ]
    });

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, 'Remove background from image', ${secure_url}, 'Image')
    `;

    res.json({
      success: true,
      content: secure_url,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};






export const removeImageObject = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { Object } = req.body;
    const image = req.file; // req.file IS the file object — no nested "image" key
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This Feature is only available for Premium User",
      });
    }

    if (!image) {
      return res.json({
        success: false,
        message: "Please upload an image.",
      });
    }

    if (!Object || !Object.trim()) {
      return res.json({
        success: false,
        message: "Please specify the object to remove.",
      });
    }

    const { public_id } = await cloudinary.uploader.upload(image.path);

    const imageUrl = cloudinary.url(public_id, {
      transformation: [{ effect: `gen_remove:${Object.trim()}` }],
      resource_type: 'image'
    });

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${`Removed ${Object} from image`}, ${imageUrl}, 'Image')
    `;

    res.json({
      success: true,
      content: imageUrl,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const resumeReview = async (req, res) => {
  const resume = req.file;

  try {
    const { userId } = req.auth();
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for Premium users",
      });
    }

    if (!resume) {
      return res.json({
        success: false,
        message: "No resume file was uploaded.",
      });
    }

    if (resume.mimetype !== "application/pdf") {
      return res.json({
        success: false,
        message: "Only PDF files are supported.",
      });
    }

    if (resume.size > 5 * 1024 * 1024) {
      return res.json({
        success: false,
        message: "Resume file size exceeds allowed size (5MB).",
      });
    }

    const dataBuffer = fs.readFileSync(resume.path);
    const pdfData = await pdf(dataBuffer);

    if (!pdfData.text || !pdfData.text.trim()) {
      return res.json({
        success: false,
        message: "Could not extract any text from this PDF. It may be scanned or image-based.",
      });
    }

    const prompt = `
You are an expert ATS (Applicant Tracking System) and career coach with years of experience reviewing resumes for hiring managers.

Analyze the resume below and write a detailed, honest review in a natural, conversational tone — as if you were personally coaching this candidate. Be specific and concrete: call out exact phrases, sections, or issues you notice (e.g. placeholder text, vague descriptions, missing metrics, generic verbs) rather than giving generic advice. Write in full sentences and short paragraphs under each heading, not just terse bullet fragments.

Resume:
${pdfData.text}

Structure your review with these headings:

## Overall ATS Score (out of 100)
Give a score and explain the reasoning behind it in a short paragraph.

## Overall Impression
A brief, honest take on the resume as a whole.

## Strengths
What's working well, with specific examples from the resume.

## Weaknesses
What's holding it back, with specific examples — be direct about real problems if you see them (placeholder text, vague claims, formatting issues, etc.).

## Missing Skills
Skills or keywords that are commonly expected for this candidate's apparent target roles but are absent.

## Grammar & Formatting Suggestions
Specific fixes, not general tips.

## Recommended Improvements
Concrete, actionable next steps.

## Suitable Job Roles
Roles that fit this candidate's actual experience level and background.

## Final Verdict
A short closing summary of where this resume stands and what matters most to fix first.
`;

    const response = await AI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 4096,
        temperature: 0.4,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const content = response.text;

    if (!content || !content.trim()) {
      return res.json({
        success: false,
        message: "The AI did not return a review. Please try again.",
      });
    }

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review')
    `;

    res.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    // Clean up the temp uploaded file regardless of outcome
    if (resume?.path) {
      fs.unlink(resume.path, (err) => {
        if (err) console.error("Failed to delete temp file:", err);
      });
    }
  }
};