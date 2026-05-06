-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MistakeStatus" AS ENUM ('new', 'needs_review', 'mastered');

-- CreateEnum
CREATE TYPE "PartOfSpeech" AS ENUM ('noun', 'verb', 'adjective', 'adverb', 'other');

-- CreateEnum
CREATE TYPE "ThemeCategory" AS ENUM ('time', 'travel', 'emotion', 'life', 'food', 'shopping', 'nature', 'study', 'work', 'society', 'misc');

-- CreateEnum
CREATE TYPE "AutoKbSubCategory" AS ENUM ('numbers', 'date', 'frequency', 'age', 'direction', 'places', 'transportation', 'travel', 'feelings', 'emotions', 'relationships', 'family', 'body', 'housing', 'furniture', 'health', 'sports', 'hobbies', 'food', 'drinks', 'restaurant', 'dining', 'shopping', 'colors', 'clothing', 'animals', 'plants', 'weather', 'space', 'nature', 'school', 'language', 'learning_tools', 'jobs', 'office', 'business', 'politics', 'religion', 'law', 'events', 'other');

-- CreateTable
CREATE TABLE "Mistake" (
    "id" SERIAL NOT NULL,
    "language" TEXT NOT NULL,
    "learnerPrompt" TEXT NOT NULL DEFAULT '',
    "question" TEXT NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "aiAnswer" TEXT NOT NULL DEFAULT '',
    "aiExplanationJson" TEXT NOT NULL,
    "chatTranscriptJson" TEXT NOT NULL DEFAULT '[]',
    "screenshotPath" TEXT,
    "status" "MistakeStatus" NOT NULL DEFAULT 'new',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mistake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyEntry" (
    "id" SERIAL NOT NULL,
    "language" TEXT NOT NULL,
    "learnerPrompt" TEXT NOT NULL DEFAULT '',
    "term" TEXT NOT NULL,
    "lemma" TEXT NOT NULL DEFAULT '',
    "reading" TEXT NOT NULL DEFAULT '',
    "aiAnswer" TEXT NOT NULL,
    "summaryJson" TEXT NOT NULL DEFAULT '{}',
    "chatTranscriptJson" TEXT NOT NULL DEFAULT '[]',
    "isSimpleWord" BOOLEAN NOT NULL DEFAULT true,
    "screenshotPath" TEXT,
    "partOfSpeech" "PartOfSpeech" NOT NULL DEFAULT 'other',
    "partOfSpeech_zh" TEXT NOT NULL DEFAULT '其他',
    "partOfSpeech_en" TEXT NOT NULL DEFAULT 'other',
    "themeCategory" "ThemeCategory" NOT NULL DEFAULT 'misc',
    "themeCategory_zh" TEXT NOT NULL DEFAULT '其他',
    "themeCategory_en" TEXT NOT NULL DEFAULT 'misc',
    "subCategory" "AutoKbSubCategory" NOT NULL DEFAULT 'other',
    "subCategory_zh" TEXT NOT NULL DEFAULT '其他',
    "subCategory_en" TEXT NOT NULL DEFAULT 'other',
    "exampleSentence" TEXT,
    "exampleTranslation" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyEntry_pkey" PRIMARY KEY ("id")
);
