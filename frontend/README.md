# AI Voice Banking Frontend

Modern, intuitive Next.js frontend for the AI Voice Banking Assistant.

## Features

- 🔐 **Secure Authentication** - OTP-based login with voice biometric support
- 💰 **Banking Operations** - Transfer money, check balance, view transactions
- 🎤 **Voice Assistance** - Voice input helpers on every form field
- 📊 **Dashboard** - Clean overview of account and quick actions
- 🔔 **Reminders** - Set and manage payment alerts
- 💳 **Loans & Credit** - View loan details and EMI schedules
- 🎨 **Modern UI** - Professional, responsive design with Tailwind CSS

## Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and set:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Main dashboard
│   ├── login/             # Authentication
│   ├── transfer/          # Money transfer
│   ├── transactions/      # Transaction history
│   ├── loans/             # Loans & credit
│   └── reminders/         # Payment reminders
├── components/            # Reusable components
│   ├── VoiceHelper.tsx    # Voice input component
│   └── VoiceInputField.tsx # Form field with voice
├── lib/                   # Utilities
│   ├── api.ts             # API client
│   ├── utils.ts           # Helper functions
│   └── websocket.ts       # WebSocket client
└── public/                # Static assets
```

## Key Components

### VoiceHelper
Microphone button component that:
- Records audio from user's microphone
- Sends to backend for STT processing
- Receives transcript and fills form fields
- Plays TTS responses from assistant

### VoiceInputField
Form input with integrated voice helper button for hands-free data entry.

## API Integration

All API calls are centralized in `lib/api.ts`:
- `authApi` - Authentication endpoints
- `bankingApi` - Banking operations
- `dialogueApi` - Voice dialogue processing

The API client automatically:
- Adds JWT tokens to requests
- Handles token refresh
- Redirects to login on 401 errors

## Authentication Flow

1. User enters username/password → `POST /auth/login`
2. Backend returns OTP → User enters OTP
3. `POST /auth/token` → Returns access/refresh tokens
4. Tokens stored in localStorage
5. All subsequent requests include Bearer token

## Voice Features

- **Voice Input**: Click microphone button on any field to speak
- **Real-time Processing**: Audio sent to backend for STT → NLU → Response
- **Auto-fill**: Detected values automatically fill form fields
- **TTS Playback**: Assistant responses played as audio

## WebSocket Support

WebSocket client available in `lib/websocket.ts` for real-time voice streaming (ready for future enhancements).

## Styling

- **Tailwind CSS** for utility-first styling
- **Custom color palette** with primary blue theme
- **Responsive design** for mobile and desktop
- **Smooth animations** and transitions

## Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Notes

- Ensure backend is running on `http://localhost:8000` (or update `NEXT_PUBLIC_API_URL`)
- Browser microphone permissions required for voice features
- All API endpoints require authentication (except login/OTP)

