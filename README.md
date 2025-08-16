# InstantChat - Real-time Messaging Application

A production-ready real-time messaging application built with React, Node.js, Express, PostgreSQL, and Socket.IO.

## 🚀 Features

- **Real-time messaging** with WebSocket support
- **User authentication** with JWT tokens
- **1:1 and group conversations**
- **Message search** with full-text search capabilities
- **Typing indicators** and online status
- **Message reactions** and editing
- **Responsive design** with Tailwind CSS
- **Database optimization** with proper indexing
- **Production-ready** with security best practices

## 🛠️ Tech Stack

### Frontend
- React 18 with Hooks
- Tailwind CSS for styling
- Socket.IO client for real-time communication
- React Router for navigation
- Axios for HTTP requests

### Backend
- Node.js with Express
- Socket.IO for WebSocket server
- PostgreSQL database
- JWT authentication
- bcrypt for password hashing
- Input validation with express-validator

### Database
- PostgreSQL with optimized indexes
- Full-text search capabilities
- Proper foreign key relationships
- Automatic timestamp management

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd InstantChatApp
```

### 2. Install dependencies
```bash
npm run install:all
```

### 3. Set up environment variables
```bash
cp env.example .env
```
Edit `.env` file with your database credentials and JWT secret.

### 4. Set up PostgreSQL database
```bash
# Create database
createdb instant_chat

# Run database setup
npm run db:setup
```

### 5. Start the application
```bash
# Development mode (both frontend and backend)
npm run dev

# Or start separately
npm run dev:backend  # Backend on port 5000
npm run dev:frontend # Frontend on port 5173
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=instant_chat
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### Database Setup

The application includes database scripts for:
- Schema creation with optimized indexes
- Initial data seeding
- Migration support

```bash
npm run db:setup    # Create tables and initial data
npm run db:migrate  # Run migrations (if any)
npm run db:seed     # Seed additional data
```

## 📱 Usage

### Demo Accounts
The setup script creates two demo accounts:
- **Username**: `testuser`, **Password**: `password123`
- **Username**: `testuser2`, **Password**: `password123`

### Features
1. **User Registration/Login**: Secure authentication system
2. **Real-time Chat**: Instant messaging with WebSocket support
3. **Conversation Management**: Create 1:1 and group chats
4. **Message Search**: Full-text search through conversation history
5. **User Status**: Online/offline indicators
6. **Typing Indicators**: Real-time typing notifications

## 🏗️ Project Structure

```
InstantChatApp/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React contexts
│   │   └── utils/          # Utility functions
│   ├── package.json
│   └── vite.config.js
├── backend/                  # Node.js backend
│   ├── routes/             # API routes
│   ├── controllers/        # Business logic
│   ├── middleware/         # Express middleware
│   ├── models/             # Data models
│   ├── config/             # Configuration files
│   └── package.json
├── database/                 # Database scripts
│   ├── scripts/            # Setup and migration scripts
│   ├── schema.sql          # Database schema
│   └── package.json
├── package.json             # Root package.json
└── README.md
```

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS configuration
- Rate limiting
- Helmet.js security headers
- SQL injection prevention with parameterized queries

## 📊 Database Optimization

The database schema includes:
- **Indexes** on frequently queried fields
- **Full-text search** indexes for message content
- **Composite indexes** for conversation queries
- **Foreign key constraints** for data integrity
- **Automatic timestamp management**

## 🚀 Deployment

### Frontend (AWS S3)
```bash
# Build the frontend
npm run build

# Deploy to S3 bucket
aws s3 sync frontend/dist s3://your-chat-app-bucket --delete
```

### Backend (AWS Elastic Beanstalk)
```bash
# Create Elastic Beanstalk application
eb init your-chat-app --platform node.js --region us-east-1

# Deploy
eb deploy
```

### Environment Variables for Production
Set these in your deployment environment:
- Database connection details
- JWT secret
- CORS origins
- SSL configuration

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests (if configured)
cd frontend
npm test
```

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### User Endpoints
- `GET /api/users` - Get users (with search)
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/password` - Change password

### Conversation Endpoints
- `GET /api/conversations` - Get user conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get conversation details

### Message Endpoints
- `GET /api/messages/:conversationId` - Get messages
- `POST /api/messages/:conversationId` - Send message
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code examples

## 🔄 Updates

Stay updated with the latest changes:
- Watch the repository
- Check release notes
- Follow the development roadmap

---

**Built with ❤️ using modern web technologies** 