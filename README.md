# QuizBlitz

QuizBlitz is a real-time multiplayer quiz platform with AI-generated questions, live host controls, organizer authentication, team collaboration, and CSV reporting.

Built with Next.js App Router, Firebase Authentication/Firestore, and a custom modern UI for host, player, and organizer workflows.

## Features

### Organizer and Access
- Email/password sign up and sign in for organizers
- Google sign in for organizers
- Organizer dashboard for managing quizzes
- Protected organizer routes (create, dashboard, host controls)

### Quiz Authoring and Session Flow
- Create quizzes manually or generate questions with AI (Groq API)
- Save quiz as draft
- Create and start quiz immediately
- Edit and delete draft quizzes (before first session starts)
- Re-run completed quizzes

### Team Collaboration
- Create teams from dashboard
- Invite members by email
- Team members can accept or decline team-up requests
- Team members can manage and start linked quizzes
- Per-quiz team strategy:
	- No team
	- Use existing team
	- Create a new team for that quiz

### Live Quiz Experience
- Join with room code or QR code
- Real-time player state and scoring
- Host controls for question progression, reveal, and end session
- Host-controlled live answer count visibility

### Results and Reporting
- Completed quiz results available anytime
- Reveal top winners one-by-one or all at once
- Top N display control on leaderboard
- CSV export report (always exports all users)
- Export includes:
	- Name
	- Correct answers
	- Average answer time
	- Optional columns (rank, score, attempts, accuracy, total questions)

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Firebase Auth
- Firebase Firestore
- Groq API (question generation)

## Project Structure

```text
app/
	api/
		generate-questions/route.ts
		network-ip/route.ts
	auth/page.tsx
	create/page.tsx
	dashboard/page.tsx
	dashboard/edit/[quizId]/page.tsx
	host/[sessionId]/page.tsx
	join/page.tsx
	lobby/[sessionId]/page.tsx
	play/[sessionId]/page.tsx
	results/[sessionId]/page.tsx
contexts/
	AuthContext.tsx
hooks/
	useOrganizerAuthGuard.ts
	useSession.ts
	useTimer.ts
lib/
	firebase.ts
	firestore.ts
	types.ts
```

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

Create `.env.local` in the project root and add:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
GROQ_API_KEY=
```

### 3. Configure Firebase

In Firebase Console:

1. Create project
2. Enable Authentication providers:
	 - Email/Password
	 - Google
3. Create Firestore database
4. Add web app and copy Firebase config values

### 4. Run development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Deploy to Vercel

### Option A: Vercel Dashboard

1. Import the repository in Vercel
2. Set root directory to this app folder (if monorepo)
3. Add environment variables (same keys as `.env.local`)
4. Deploy

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link
```

Add env values:

```bash
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY preview
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY development

vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN preview
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN development

vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID preview
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID development

vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET preview
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET development

vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID preview
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID development

vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID preview
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID development

vercel env add GROQ_API_KEY production
vercel env add GROQ_API_KEY preview
vercel env add GROQ_API_KEY development
```

Deploy:

```bash
vercel --prod
```

## Troubleshooting

### `auth/operation-not-allowed`

Enable Email/Password provider in Firebase Authentication settings.

### Build fails on Vercel

Checklist:

1. All required env vars are present in Vercel project settings
2. Correct root directory is selected in Vercel
3. Local build passes with `npm run build`
4. Re-deploy after updating env vars

### AI generation not working

Ensure `GROQ_API_KEY` is set for the environment where the app is deployed.

## Security Notes

- Keep Firestore security rules strict in production
- Avoid exposing service credentials in client code
- Rotate API keys if they were ever committed

## Roadmap Ideas

- Role-based team permissions (owner/editor/host)
- Scheduled quiz starts
- Email delivery for team invites
- Audit logs for quiz changes and session actions

## License

Add your preferred license here (for example MIT).
