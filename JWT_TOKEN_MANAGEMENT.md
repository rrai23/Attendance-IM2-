# JWT Token Management Guide

## Overview

Your JWT token system now includes automatic token refresh functionality to enhance security and user experience.

## Current Token Configuration

### Token Lifetimes:
- **Regular Login**: 24 hours
- **Remember Me**: 30 days

### Security Features:
- **Automatic Refresh**: Tokens refresh within 2 hours of expiry
- **Session Management**: Tokens stored in database for tracking
- **Secure Storage**: Tokens stored in localStorage with proper key management

## Token Management System

### 1. Automatic Token Refresh

**Backend Endpoint**: `POST /api/auth/refresh`
- Automatically refreshes tokens within 2 hours of expiry
- Updates database session records
- Maintains user session continuity

**Frontend Integration**:
- Checks every 30 minutes for token refresh needs
- Automatically refreshes before expiry
- Handles refresh failures gracefully

### 2. Token Refresh Triggers

**When tokens are refreshed**:
- Within 2 hours of expiry (automatic)
- Manual refresh via API call
- After successful password change

**When tokens are invalidated**:
- User logout
- Token expiry
- Security breach detection
- Password change (all other sessions)

## Security Best Practices

### 1. **Do You Need to Periodically Change JWT Tokens?**

**YES** - Your system now automatically handles this:

✅ **Automatic Refresh**: Tokens refresh every ~22 hours (within 2 hours of 24h expiry)
✅ **Short Lifespan**: 24-hour tokens reduce exposure risk
✅ **Session Tracking**: Database tracks all active sessions
✅ **Graceful Handling**: Seamless user experience during refresh

### 2. **Additional Security Measures**

**Implemented**:
- Token rotation on refresh
- Session invalidation on logout
- Automatic cleanup of expired sessions
- Secure token storage

**Recommended Enhancements**:
- IP address validation
- Device fingerprinting
- Rate limiting on refresh attempts
- Anomaly detection for unusual access patterns

## API Endpoints

### Authentication Endpoints:
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - Single session logout
- `POST /api/auth/logout-all` - All sessions logout
- `GET /api/auth/verify` - Token verification

### Usage Examples:

```javascript
// Manual token refresh
const refreshResult = await authService.refreshToken();

// Check if token needs refresh
if (authService.needsTokenRefresh()) {
    await authService.refreshToken();
}

// Current user with fresh token
const user = authService.getCurrentUser();
```

## Token Lifecycle

```
Login → 24h Token → Auto-refresh @ 22h → New 24h Token → Repeat
                   ↓
                If refresh fails → Logout
```

## Security Benefits

1. **Reduced Attack Window**: 24-hour tokens limit exposure
2. **Automatic Rotation**: Regular token changes prevent reuse
3. **Session Tracking**: Database monitoring of all active sessions
4. **Graceful Expiry**: Users stay logged in seamlessly
5. **Breach Recovery**: Quick invalidation of compromised tokens

## Configuration Options

You can customize token behavior by setting environment variables:

```bash
JWT_SECRET=your-production-secret-key
JWT_EXPIRES_IN=24h
```

## Monitoring

**Server Logs** show:
- Token refresh attempts
- Successful/failed refreshes
- Session invalidations
- User login/logout events

**Frontend Logs** show:
- Automatic refresh checks
- Token expiry warnings
- Refresh success/failure

Your JWT token system now provides enterprise-grade security with automatic token rotation!
