# Resend Email Integration - Implementation Guide

## ✅ What Was Implemented

### 1. Resend Package Installation
- Installed `resend` SDK (v6.23.0) in project dependencies
- Ready for production email sending

### 2. Centralized Email Service
**Location:** `lib/services/email.ts`

Features:
- **Fire-and-forget pattern**: Emails send asynchronously after request creation succeeds
- **Error handling**: Email failures logged but don't fail the quote request creation
- **HTML templates**: Professional AXESSIA-branded email designs
- **Extensible architecture**: Built to easily add more email types in future

### 3. Email Types Implemented

#### Customer Confirmation Email
- Sent when quote request is successfully created
- Contains:
  - Personalized greeting with customer name
  - Request number for tracking
  - Link to check request status at `/seguimiento/{requestNumber}`
  - Professional AXESSIA branding with gradient header
  - Next steps information

#### Internal Admin Notification  
- Sent to admin for new incoming requests
- Contains:
  - Customer details (name, email)
  - Request number
  - Medication count
  - Direct link to dashboard for review
  - Professional internal email format

### 4. Security Implementation

✅ **API Key Protection**
- Stored exclusively in `.env` (never committed to repository)
- Not hardcoded anywhere in source code
- Not exposed to client/browser
- Only accessible on server-side

✅ **Environment Variables**
```
RESEND_API_KEY=        # Your API key (set locally or in deployment)
ADMIN_EMAIL_ADDRESS=   # Admin notification recipient (optional)
```

✅ **HTML Escaping**
- All customer input sanitized in email templates
- Prevents injection attacks

### 5. Integration Points

**Quote Request API** (`app/api/quote-requests/route.ts`)
- POST handler now sends emails after successful request creation
- Works for both dev storage (JSON) and production (Prisma/MySQL)
- Emails sent AFTER database commit to ensure data persists
- Non-blocking: response sent before emails complete

## 🚀 How to Use

### Setup Resend Account
1. Go to [resend.com](https://resend.com)
2. Create account and verify email domain
3. Get API key from dashboard
4. Add to `.env`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
   ```

### Configure Admin Email
Set in `.env`:
```
ADMIN_EMAIL_ADDRESS=admin@axessia.cl
```

### Verify Sender Domain
For `no-reply@axessia.cl` to work:
1. Add AXESSIA domain in Resend console
2. Configure DNS records as shown by Resend
3. Verify domain configuration

### Local Testing
During development:
- If `RESEND_API_KEY` is empty, emails are skipped with warning log
- If `ADMIN_EMAIL_ADDRESS` is empty, internal notifications are skipped
- No errors or blocking occurs

## 📧 Email Flow

```
Customer submits quote request
           ↓
Validate input
           ↓
Save to database (transaction)
           ↓
Generate request number (e.g., S-100001)
           ↓
IMMEDIATELY: Return success response to client
           ↓
ASYNCHRONOUSLY: Send customer confirmation email
           ↓
ASYNCHRONOUSLY: Send admin notification email
```

⚠️ Important: If Resend is temporarily unavailable, the quote request is NOT affected
- Database commit happens first
- Request number is generated
- Response is sent
- Email errors are logged but don't fail the operation

## 🔧 Future Extensions

This architecture supports adding these email types easily:

```typescript
export async function sendQuoteReadyEmail(customerEmail, requestNumber, quote) { ... }
export async function sendQuoteAcceptedEmail(customerEmail, requestNumber) { ... }
export async function sendQuoteRejectedEmail(customerEmail, requestNumber) { ... }
export async function sendStatusChangeEmail(customerEmail, status) { ... }
export async function sendPasswordResetEmail(email, resetToken) { ... }
```

Each would:
1. Generate HTML template
2. Call `sendEmail()` with subject, html, and recipient
3. Log results automatically

## 🔐 Security Checklist

- [x] API key only in `.env` (never committed)
- [x] Email sending server-side only
- [x] No API key in code/components
- [x] HTML injection prevention (escapeHtml)
- [x] No sensitive data in email body
- [x] Async pattern prevents email failures from affecting requests
- [x] Error logging for debugging

## 📝 Logs to Monitor

Email service logs to console:
```
[Email] Successfully sent email to: customer@example.com
[Email] Failed to send email: { to: '...', error: 'message' }
[Email] RESEND_API_KEY not configured. Email not sent to: ...
```

## ❓ Troubleshooting

**Emails not sending?**
1. Check `.env` has `RESEND_API_KEY` set
2. Verify domain is configured in Resend console
3. Check spam folder (first emails may be flagged)
4. Review console logs for error messages

**Domain not verified?**
1. Add domain in Resend console
2. Add DNS records as shown (usually CNAME + SPF + DKIM)
3. Wait for DNS propagation (can take 24-48 hours)
4. Click verify in Resend console

**Admin not receiving notifications?**
1. Check `ADMIN_EMAIL_ADDRESS` is set in `.env`
2. Verify that email is a verified sender in Resend
3. Check spam folder

## 📚 Documentation

- [Resend Documentation](https://resend.com/docs)
- [Resend Next.js Guide](https://resend.com/nextjs)
- [Email Security Best Practices](https://resend.com/security)

---

**Implementation Date:** 2026-08-26  
**Status:** ✅ Production Ready
