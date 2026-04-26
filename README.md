# GrammarLoop

GrammarLoop is a local-first MVP for saving language-learning mistakes and generating AI grammar explanations.

## Stack

- Next.js App Router
- TypeScript
- SQLite
- Prisma
- OpenAI API with local mock fallback
- Tailwind CSS

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env
```

Optional: edit `.env` to choose the OpenAI defaults:

```env
OPENAI_MODEL_DEFAULT="gpt-5-mini"
OPENAI_MODEL_HIGH_QUALITY="gpt-5.4"
OPENAI_REASONING_DEFAULT="medium"
OPENAI_REASONING_HIGH_QUALITY="high"
```

3. Create the database and run the seed:

```bash
npx prisma migrate dev --name init
```

4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

**If the page looks unstyled or broken after refresh:**
- Run `npm run dev:fresh` to clear the build cache and restart.
- Or use `npm run dev:watch` to auto-restart the server if it crashes.

## Notes

- If `OPENAI_API_KEY` is missing, the app still works and creates a mocked explanation.
- The tutor supports two explanation modes: a cheaper default mode and a higher-quality GPT-5.4 mode.
- Seed data includes Spanish, English, and Japanese examples.
- Prisma stores the SQLite database in `prisma/dev.db`.
- UI supports English and Chinese.
- New questions use a single chat-style prompt instead of separate fields.
- Screenshot upload is stored locally in `public/uploads`.
- Voice input uses the browser Web Speech API when supported.
