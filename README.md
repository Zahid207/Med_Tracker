# MedTracker — Freelancer Invoice & Payment Management

A full-stack invoice management app built for freelancers. Create professional invoices, track payments, manage clients, and get AI-powered insights — all in one place.

---

## Live Demo

[med-tracker-mocha.vercel.app)](http://med-tracker-mocha.vercel.app/) 

---

## Features

- **Invoice Management** — Create, edit, and export professional PDF invoices
- **Payment Tracking** — Record full or partial payments, track overdue invoices
- **Client Management** — Manage client profiles with invoice history
- **Dashboard** — Visualize monthly income, top clients, and payment stats
- **AI-Powered Assistant** — Ask MedAI about your payments, clients, or due balances
- **File Uploads** — Upload logos and signatures via UploadThing
- **Authentication** — Secure login with NextAuth.js
- **Multi-user** — Each user sees only their own data

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | MongoDB Atlas |
| Auth | NextAuth.js |
| File Upload | UploadThing |
| AI Assistant | Google Gemini API |
| Deploy | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- UploadThing account
- Google Gemini API key

### Installation

```bash
# Clone the repo
git clone https://github.com/Zahid207/Med_Tracker.git

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```env
NEXTAUTH_URL=YourNextAuthUrl
NEXTAUTH_SECRET=YourSecret
UPLOADTHING_TOKEN=YourUploadthingTokenHere
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=YourGeminiApiKey
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
medtracker/
├── app/
│   ├── api/
│   │   ├── ai_chat/        # AI chatbot route
│   │   ├── auth/           # NextAuth route
│   │   ├── client/         # Client API
│   │   ├── invoice/        # Invoice API
│   │   ├── uploadthing/    # File upload API
│   │   └── user/           # User API
│   ├── clients/            # Clients page
│   ├── invoices/           # Invoices page
│   ├── payments/           # Payments page
│   ├── signin/             # Sign in page
│   ├── layout.js
│   └── page.js
├── components/
│   ├── layout/
│   │   └── Sidebar.js
│   ├── modals/
│   │   ├── AddClient.js
│   │   ├── ChatBot.js
│   │   ├── Invoice.js
│   │   └── RecordPayment.js
│   ├── providers/
│   │   └── SessionWrapper.js
│   └── states/
│       ├── SigninFirst.js
│       └── Welcome.js
├── lib/
│   └── mongodb.js
├── utils/
│   └── uploadthing.js
└── .env.example
```

---

## Database Collections

| Collection | Documents |
|---|---|
| users | User accounts |
| clients | Client profiles |
| invoices | Invoice records |

---

## Author

**Your Name**
- GitHub: [@Zahid207](https://github.com/Zahid207)
- LinkedIn: [Zahidul Islam sajib](https://www.linkedin.com/in/zahidul-islam-sajib/)
