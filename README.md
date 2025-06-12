# TalentHub - AI-Powered HR Dashboard

A comprehensive HR dashboard for managing recruitment, candidates, and hiring processes with AI-powered interview assistants and resume analysis.

## 🚀 Features

### Core Functionality
- **Job Management**: Create, edit, and manage job postings with detailed requirements and custom interview questions
- **Candidate Management**: Upload resumes, analyze candidate profiles, and track applications
- **AI Resume Analysis**: Automated resume parsing and candidate matching using VLM (Vision Language Models)
- **Interview Scheduling**: Schedule and manage candidate interviews with integrated call management
- **AI Interview Assistants**: Create and manage AI-powered voice assistants for automated interviews

### Advanced Features
- **Multi-step Resume Upload**: Wizard-based resume upload with candidate information collection
- **Job Association**: Associate existing candidates with multiple job positions
- **Real-time Analysis**: Run resume analysis with live status updates
- **Glass Morphism UI**: Modern, elegant interface with glass effects and animations
- **Responsive Design**: Fully responsive across desktop, tablet, and mobile devices

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **State Management**: React Context API
- **Authentication**: Google OAuth 2.0

### Backend Integration
- **Main API**: FastAPI (localhost:8000)
- **Assistant API**: FastAPI (localhost:8001)
- **Authentication**: JWT tokens with localStorage storage

## 📁 Project Structure

```
├── app/                          # Next.js App Router pages
│   ├── dashboard/               # Protected dashboard routes
│   │   ├── candidates/         # Candidate management pages
│   │   ├── jobs/              # Job management pages
│   │   ├── settings/          # Settings and configuration
│   │   └── super-admin/       # Super admin functionality
│   ├── login/                 # Authentication page
│   └── globals.css           # Global styles
├── components/                 # Reusable React components
│   ├── candidates/           # Candidate-specific components
│   ├── assistants/          # AI assistant management
│   ├── jobs/               # Job-related components
│   ├── layout/            # Layout components (navbar, sidebar)
│   ├── theme-provider.tsx # Theme management
│   └── ui/               # shadcn/ui components
├── lib/                     # Utility libraries
│   ├── api/               # API client functions
│   ├── context/          # React contexts
│   ├── hooks/           # Custom React hooks
│   └── utils.ts        # Utility functions
├── styles/               # Additional stylesheets
│   ├── glass-effects.css # Glass morphism effects
│   └── components.css   # Component-specific styles
└── middleware.ts        # Next.js middleware
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Backend APIs running on:
  - Main API: `http://localhost:8000`
  - Assistant API: `http://localhost:8001`

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd talenthub-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔐 Authentication

The application uses Google OAuth 2.0 for authentication:

1. **Setup Google OAuth**:
   - Create a project in Google Cloud Console
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized origins: `http://localhost:3000`

2. **Authentication Flow**:
   - Users sign in with Google
   - JWT tokens stored in localStorage
   - Automatic token refresh handling
   - Protected routes with middleware

## 📊 API Integration

### Main API Endpoints (localhost:8000)

#### Jobs
- `GET /jobs/` - List all jobs
- `POST /jobs/` - Create new job
- `GET /jobs/{id}` - Get job details
- `PUT /jobs/{id}` - Update job
- `DELETE /jobs/{id}` - Delete job

#### Candidates
- `GET /candidates/` - List candidates
- `POST /candidates/upload-resume` - Upload general resume
- `POST /candidates/upload-resume-for-job/{job_id}` - Upload resume for specific job
- `POST /candidates/analyze-resume/{candidate_id}` - Analyze candidate resume
- `POST /candidates/{candidate_id}/associate-job/{job_id}` - Associate candidate with job

#### Calls
- `POST /calls/schedule` - Schedule interview call

### Assistant API Endpoints (localhost:8001)

#### Assistants
- `POST /vapi/assistants/create` - Create new assistant
- `GET /vapi/assistants/customer/{customer_id}` - Get customer assistant
- `GET /vapi/assistants/{assistant_id}` - Get assistant by ID
- `PUT /vapi/assistants/{assistant_id}` - Update assistant
- `DELETE /vapi/assistants/managed/{assistant_id}` - Delete assistant
- `GET /vapi/assistants/customer/{customer_id}/list` - List customer assistants

## 🎨 UI Components

### Custom Components

#### Resume Upload Wizard
Multi-step wizard for uploading candidate resumes:
```typescript
<ResumeUploadWizard
  mode="job-specific" // or "general"
  jobId="job-123"
  onSuccess={(result) => console.log(result)}
  onCancel={() => setOpen(false)}
/>
```

#### Job Association Dialog
Dialog for associating candidates with jobs:
```typescript
<JobAssociationDialog
  candidateId="candidate-123"
  onAssociated={() => refreshData()}
/>
```

#### Schedule Call Dialog
Dialog for scheduling candidate interviews:
```typescript
<ScheduleCallDialog
  candidateId="candidate-123"
  jobId="job-123"
  onScheduled={() => refreshCalls()}
/>
```

### Glass Morphism Effects
The application features modern glass morphism effects:
- Navbar with backdrop blur
- Sidebar with layered backgrounds
- Card components with glass styling
- Animated particles and gradients

## 🔧 Configuration

### Tailwind Configuration
Custom colors and animations defined in `tailwind.config.ts`:
- Primary/secondary color schemes
- Glass effect utilities
- Custom animations
- Responsive breakpoints


## 🚀 Deployment

### Build for Production
```bash
npm run build
npm start
```

### Environment Variables for Production
```env
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-production-google-client-id
```





## 🔍 Troubleshooting

### Common Issues

1. **Authentication Issues**
   - Verify Google Client ID is correct
   - Check authorized origins in Google Console
   - Clear localStorage and cookies

2. **API Connection Issues**
   - Ensure backend APIs are running
   - Check CORS configuration
   - Verify API base URLs in environment variables

3. **Build Issues**
   - Clear `.next` folder and rebuild
   - Check for TypeScript errors
   - Verify all dependencies are installed

### Debug Mode
Enable debug logging by setting:
```env
NODE_ENV=development
```


### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for code formatting
- Write meaningful commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki



---

Built with ❤️ by the TalentHub Team
