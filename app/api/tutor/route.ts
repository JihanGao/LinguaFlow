import { NextRequest, NextResponse } from "next/server";

import { runTutorConversation } from "@/lib/openai";
import { persistTutorScreenshot } from "@/lib/screenshot-upload";
import { Locale, TutorQualityMode } from "@/lib/types";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const language = String(formData.get("language") || "");
  const locale = (String(formData.get("locale") || "en") === "zh" ? "zh" : "en") as Locale;
  const qualityMode = (String(formData.get("qualityMode") || "fast") === "high"
    ? "high"
    : "fast") as TutorQualityMode;
  const messages = JSON.parse(String(formData.get("messages") || "[]"));
  const existingScreenshotPaths = JSON.parse(String(formData.get("existingScreenshotPaths") || "[]")) as string[];
  const screenshots = formData.getAll("screenshots");

  const screenshotPaths = [...existingScreenshotPaths];
  const newScreenshotPaths: string[] = [];
  const screenshotDataUrls: string[] = [];

  for (const screenshot of screenshots) {
    if (screenshot instanceof File && screenshot.size > 0) {
      const saved = await persistTutorScreenshot(screenshot);
      screenshotPaths.push(saved.publicPath);
      newScreenshotPaths.push(saved.publicPath);
      screenshotDataUrls.push(saved.dataUrl);
    }
  }

  try {
    const result = await runTutorConversation({
      language,
      locale,
      qualityMode,
      messages,
      screenshotDataUrls: screenshotDataUrls.length > 0 ? screenshotDataUrls : undefined
    });

    return NextResponse.json({
      ...result,
      screenshotPath: screenshotPaths[0] || null,
      screenshotPaths,
      newScreenshotPaths
    });
  } catch (error) {
    console.error("Tutor API error:", error);
    return NextResponse.json(
      { error: "Tutor request failed", details: String(error) },
      { status: 500 }
    );
  }
}
