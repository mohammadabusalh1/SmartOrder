# SmartOrder Authentication Tests

This directory contains tests for the SmartOrder authentication service, focusing on customer registration requirements (FR-ACC-001).

## Test Structure

The tests are organized into the following files:

1. `registration.test.js` - Tests for UC-ACC-001: Create a New Customer Account Using Email
2. `social_registration.test.js` - Tests for UC-ACC-002: Creating a new customer account using social media accounts
3. `account_verification.test.js` - Tests for BR-ACC-003 (Terms Agreement) and BR-ACC-004 (Email Verification)

## Business Requirements Tested

### User Registration (FR-ACC-001)

These tests verify that users can:
- Create a new account with valid information
- Cannot register with existing email or phone number
- Must provide valid password according to security requirements
- Must accept Terms of Service and Privacy Policy

### Business Rules

The tests cover the following business rules:

1. **BR-ACC-001**: Email address must be unique for each customer account
2. **BR-ACC-002**: Password must meet minimum security requirements (at least 8 characters)
3. **BR-ACC-003**: User must agree to Terms of Service and Privacy Policy
4. **BR-ACC-004**: Account confirmation email and verification

## Running the Tests

To run the tests:

```bash
npm test
```

For testing a specific file:

```bash
npm test -- test/registration.test.js
```

## Test Cases Summary

### UC-ACC-001: Create a New Customer Account Using Email

- Register with valid information
- Cannot register with existing email
- Cannot register with existing phone number
- Cannot register with invalid/weak password

### UC-ACC-002: Social Media Registration

- Register with valid social media credentials
- Handle invalid social media tokens
- Handle existing email conflict with social registration

### BR-ACC-003: Terms of Service Agreement

- Cannot register without accepting terms
- Can register when accepting terms

### BR-ACC-004: Email Verification

- Verify email with valid token
- Reject verification with invalid token

## Mock Implementation Notes

Some functionality, particularly social media authentication and email verification, uses mock implementations since they would involve external services. In a real application, these would be implemented with actual OAuth providers and email services. 