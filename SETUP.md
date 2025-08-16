# InstantChat Setup Instructions

## 🚀 Quick Start Guide

Follow these steps to get your InstantChat application running locally:

### 1. Prerequisites
- **Node.js 18+** installed on your system
- **PostgreSQL 12+** installed and running
- **npm** or **yarn** package manager

### 2. Database Setup

#### Create PostgreSQL Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE instant_chat;

# Exit psql
\q
```

#### Set Environment Variables
```bash
# Copy environment template
cp env.example .env

# Edit .env file with your database credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=instant_chat
DB_USER=postgres
DB_PASSWORD=your_actual_password
JWT_SECRET=your_super_secret_key_here
```

### 3. Install Dependencies
```bash
# Install all dependencies (frontend, backend, database)
npm run install:all
```

### 4. Initialize Database
```bash
# Run database setup (creates tables and demo data)
npm run db:setup
```

### 5. Start the Application
```bash
# Start both frontend and backend in development mode
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Demo Accounts**: 
  - Username: `testuser`, Password: `password123`
  - Username: `testuser2`, Password: `password123`

## 🔧 Manual Setup (Alternative)

If you prefer to set up components separately:

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Database Setup
```bash
cd database
npm install
npm run setup
```

## 📱 Features to Test

1. **User Authentication**
   - Register new account
   - Login with existing account
   - JWT token management

2. **Real-time Chat**
   - Create direct conversations
   - Create group conversations
   - Send and receive messages
   - Typing indicators
   - Online status

3. **Message Features**
   - Message history
   - Message search
   - Message editing
   - Message reactions

4. **User Management**
   - User search
   - Profile updates
   - Password changes

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Error
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL if stopped
sudo systemctl start postgresql
```

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :5000
lsof -i :5173

# Kill the process
kill -9 <PID>
```

#### Node Modules Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Environment Variables
Make sure your `.env` file has all required variables:
- Database credentials
- JWT secret
- Server port
- Frontend URL

### Database Permissions
Ensure your PostgreSQL user has proper permissions:
```sql
-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE instant_chat TO your_user;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO your_user;
```

## 🔒 Security Notes

- **Never commit** your `.env` file to version control
- Use a **strong JWT secret** in production
- **Change default passwords** for production use
- Enable **HTTPS** in production
- Configure **proper CORS** settings

## 📊 Database Schema

The application creates these tables:
- `users` - User accounts and profiles
- `conversations` - Chat conversations
- `conversation_participants` - Conversation membership
- `messages` - Chat messages with full-text search
- `message_reactions` - Message reactions
- `user_sessions` - JWT session management

## 🚀 Production Deployment

### Frontend (AWS S3)
```bash
# Build the application
npm run build

# Deploy to S3
aws s3 sync frontend/dist s3://your-bucket-name --delete
```

### Backend (AWS Elastic Beanstalk)
```bash
# Install EB CLI
pip install awsebcli

# Initialize EB application
eb init your-app-name --platform node.js --region us-east-1

# Deploy
eb deploy
```

### Environment Variables for Production
Set these in your production environment:
- Database connection (use RDS for production)
- JWT secret
- CORS origins
- SSL configuration

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [React Documentation](https://reactjs.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the console logs for errors
3. Verify all environment variables are set
4. Ensure database is accessible
5. Check if all ports are available

## 🎉 Success!

Once everything is running, you should see:
- Frontend loads at http://localhost:5173
- Backend API responds at http://localhost:5000/health
- Database tables are created with demo data
- Real-time chat functionality works
- Users can register, login, and start chatting

Happy coding! 🚀 