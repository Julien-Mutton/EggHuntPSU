# 🥚 Egg Hunt — QR Code-Based Egg Hunt Platform

A digital egg hunt web application where players scan QR codes hidden around a physical location to earn points, unlock prizes, and compete on a leaderboard.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React + Vite, React Router, Axios |
| **Backend** | Django + Django REST Framework |
| **Database** | PostgreSQL |
| **Auth** | JWT (SimpleJWT) + OAuth (Python Social Auth / Google) |
| **QR Codes** | `qrcode` + `Pillow` |
| **PDF Export** | `reportlab` |

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL

### 1. Database Setup

```bash
# Create the PostgreSQL database
createdb egghunt
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env .env.local  # Edit as needed

# Run migrations
python manage.py migrate

# Seed test data (1 admin, 3 users, 10 eggs, 3 prizes)
python manage.py seed

# Start server
python manage.py runserver
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app runs at **http://localhost:5173** (frontend) and **http://localhost:8000** (backend).

### Test Accounts (from seed data)

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Admin |
| `alice` | `password123` | User |
| `bob` | `password123` | User |
| `charlie` | `password123` | User |

## Features

### Authentication
- **JWT Login/Register** — standard username/password with JWT tokens
- **OAuth (Google)** — via Python Social Auth. Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` in `.env`
- **Protected Routes** — role-based access control (admin vs user)
- **Redirect After Login** — scanning a QR code while logged out saves the URL, redirects back after login

### Egg Hunt Flow
1. Admin creates QR code eggs (with points, optional titles, labels, and GIF configs)
2. Admin exports eggs as printable PDF with QR codes
3. QR codes are printed and hidden around a location
4. Users scan a QR code → taken to `/redeem/<code>`
5. If not logged in, redirected to login, then back to redeem
6. Backend validates the code atomically (prevents race conditions)
7. User earns points, sees success screen with optional GIF
8. Already-redeemed codes show an error message

### Redemption Logic (Atomic)
- Uses `transaction.atomic()` + `select_for_update()` to prevent double-redemption
- Marks egg as redeemed, records user/timestamp, increments user's total points, creates audit record — all in one transaction

### Admin Tracking
Admins can see:
- **Egg Management Table** — all eggs with claimed/unclaimed status, who redeemed, when, points
- **Redemption History** — full audit trail of every redemption
- **Dashboard** — stats overview (total/redeemed/unclaimed)

### GIF Behavior
- Each egg can optionally have a GIF URL and `show_gif` flag
- If enabled, the GIF displays on the redemption success screen
- Different eggs can show different GIFs for varied reward experiences

### Leaderboard
- Ranked by total points (descending)
- Handles ties (same rank for same points)
- Highlights current user
- Medal icons for top 3

### Prize System
- Admins create prizes with point thresholds
- Users see all prizes with lock/unlock status and progress bars
- Prize unlocks when `user.total_points >= prize.points_required`

### QR Export
- Admin selects eggs → exports as PDF
- 3×4 grid layout per page
- Each QR code shows label text, title, code identifier, and points
- Ready for printing at events

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register/` | Register new user |
| POST | `/api/auth/login/` | JWT login |
| POST | `/api/auth/token/refresh/` | Refresh JWT |
| GET | `/api/auth/me/` | Current user profile |
| POST | `/api/auth/social/google/` | OAuth token exchange |

### Eggs (Admin)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/admin/eggs/generate/` | Batch-create eggs |
| GET | `/api/admin/eggs/` | List all eggs |
| GET/PATCH | `/api/admin/eggs/<id>/` | View/edit egg |
| POST | `/api/admin/eggs/export/` | Export QR PDF |

### Redemption
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/redeem/<code>/` | Redeem an egg |
| GET | `/api/admin/redemptions/` | All redemptions (admin) |
| GET | `/api/user/redemptions/` | User's redemptions |

### Leaderboard & Prizes
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/leaderboard/` | Ranked leaderboard |
| GET | `/api/prizes/` | List prizes |
| POST | `/api/admin/prizes/` | Create prize |
| PATCH/DELETE | `/api/admin/prizes/<id>/` | Edit/delete prize |

## Environment Variables

See `.env.example` in the project root. Key variables:

```
DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
SECRET_KEY
FRONTEND_URL
GOOGLE_OAUTH_CLIENT_ID (optional)
GOOGLE_OAUTH_CLIENT_SECRET (optional)
```

## Project Structure

```
EggHunt/
├── backend/
│   ├── egghunt/         # Django project settings
│   ├── accounts/        # User model, auth, OAuth
│   ├── eggs/            # Egg model, redemption, QR gen, PDF export
│   ├── rewards/         # Prize model & endpoints
│   ├── leaderboard/     # Leaderboard endpoint
│   └── media/           # Uploaded GIFs
├── frontend/
│   ├── src/
│   │   ├── api/         # Axios instance
│   │   ├── contexts/    # AuthContext
│   │   ├── components/  # Layout, ProtectedRoute
│   │   └── pages/       # All page components
│   └── ...
├── .env.example
└── README.md
```
# EggHuntPSU
