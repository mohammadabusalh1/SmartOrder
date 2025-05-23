# Authentication Service

Authentication service for SmartOrder application using Express.js, GraphQL, and MongoDB.

## Features

- User registration
- User login with JWT authentication
- Password reset functionality
- Token refresh mechanism
- GraphQL API alongside REST API endpoints
- Status tracking for user accounts
- Last login timestamp tracking

## Database Schema

The User model follows this schema:

```
Table Users {
  user_id int [pk]
  full_name varchar
  email varchar [unique]
  password_hash varchar
  phone_number varchar [null, unique]
  user_type enum
  profile_picture_url varchar [null]
  email_verified_at timestamp [null]
  phone_verified_at timestamp [null]
  status enum
  last_login_at timestamp [null]
  created_at timestamp
  updated_at timestamp
}
```

## Project Structure

```
├── index.js                # Main entry point
├── package.json            # Dependencies and scripts
├── models/
│   └── User.js             # User model schema
├── middleware/
│   └── authentication.js   # Authentication middleware
├── routes/
│   └── auth.js             # REST API routes
├── graphql/
│   ├── typeDefs.js         # GraphQL type definitions
│   └── resolvers.js        # GraphQL resolvers
└── utils/
    └── auth.js             # Auth utility functions
```

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   PORT=4000
   MONGODB_URI=mongodb://localhost:27017/smartorder
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRY=1h
   JWT_REFRESH_SECRET=your_refresh_token_secret_here
   JWT_REFRESH_EXPIRY=7d
   EMAIL_SERVICE=smtp
   EMAIL_USER=your_email@example.com
   EMAIL_PASS=your_email_password
   ```
4. Start the server:
   ```
   npm start
   ```
   or for development with auto-reload:
   ```
   npm run dev
   ```

## API Endpoints

### REST API

#### User Registration
- **URL**: `/api/v1/auth/register`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "fullName": "Full Name",
    "email": "user@example.com",
    "password": "password123",
    "phoneNumber": "+966501234567",
    "userType": "customer" // or "restaurant_owner"
  }
  ```
- **Response**:
  ```json
  {
    "message": "User registration was successful. Please check your email.",
    "user": {
      "id": "user_id_here",
      "fullName": "Full Name",
      "email": "user@example.com",
      "userType": "customer"
    }
  }
  ```

#### User Login
- **URL**: `/api/v1/auth/login`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "accessToken": "jwt_access_token_here",
    "refreshToken": "jwt_refresh_token_here",
    "expiresIn": 3600,
    "user": {
      "id": "user_id_here",
      "fullName": "Full Name",
      "email": "user@example.com",
      "userType": "customer",
      "profileImageUrl": "url_or_null"
    }
  }
  ```

#### Forgot Password
- **URL**: `/api/v1/auth/forgot-password`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response**:
  ```json
  {
    "message": "If the email exists, password reset instructions have been sent."
  }
  ```

#### Reset Password
- **URL**: `/api/v1/auth/reset-password`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "resetToken": "unique_reset_token_from_email",
    "newPassword": "newStrongPassword123"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Your password was reset successfully. You can now log in with the new password."
  }
  ```

#### Refresh Token
- **URL**: `/api/v1/auth/refresh-token`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "refreshToken": "jwt_refresh_token_previously_issued"
  }
  ```
- **Response**:
  ```json
  {
    "accessToken": "new_jwt_access_token_here",
    "expiresIn": 3600
  }
  ```

#### Logout
- **URL**: `/api/v1/auth/logout`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer your_access_token`
- **Body**: Optional
  ```json
  {
    "refreshToken": "jwt_refresh_token_to_invalidate"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Successfully logged out."
  }
  ```

### GraphQL API

The GraphQL API is available at `/graphql` and provides the following mutations:

- `register`
- `login`
- `forgotPassword`
- `resetPassword`
- `refreshToken`
- `logout`

Example GraphQL mutation for registration:

```graphql
mutation {
  register(input: {
    fullName: "Full Name"
    email: "user@example.com"
    password: "password123"
    phoneNumber: "+966501234567"
    userType: "customer"
  }) {
    message
    user {
      id
      full_name
      email
      user_type
    }
  }
}
```

Example GraphQL query for user profile:

```graphql
query {
  me {
    id
    full_name
    email
    phone_number
    user_type
    profile_picture_url
    status
    last_login_at
    created_at
    updated_at
  }
}
```

## User Status

The system includes the following user statuses:

- `active`: User is active and can access the system
- `inactive`: User account has been deactivated (by user or admin)
- `suspended`: User account has been temporarily suspended (by admin)
- `pending`: User account is pending verification

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication with access and refresh tokens
- Secure password reset flow with time-limited tokens
- User verification capabilities
- Status tracking and enforcement
- Login timestamp tracking

## Testing

Run tests with:

```
npm test
```

## License

MIT 