# Account Management API - Quick Reference

## For Mobile Team Integration

This guide provides quick reference for integrating account management features into the Revelia mobile app.

---

## 1. Change Password

### Endpoint
```
PATCH /api/auth/change-password
```

### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Request
```typescript
interface ChangePasswordRequest {
  currentPassword: string;  // User's current password
  newPassword: string;      // New password (min 8 chars)
}
```

### Response (Success - 200)
```typescript
interface ChangePasswordResponse {
  success: true;
  message: "Password changed successfully";
}
```

### Error Responses

**400 - Validation Error**
```json
{
  "success": false,
  "error": "New password must be at least 8 characters"
}
```

**400 - Social Auth User**
```json
{
  "success": false,
  "error": "Password change not available for social auth users"
}
```

**401 - Wrong Password**
```json
{
  "success": false,
  "error": "Current password is incorrect"
}
```

### Mobile Implementation Notes

1. **Check Auth Provider First**
   - Only show "Change Password" option for email auth users
   - Hide for Apple/Google sign-in users
   ```typescript
   if (user.authProvider === 'email') {
     // Show change password option
   }
   ```

2. **Password Validation**
   - Minimum 8 characters
   - Show strength indicator
   - Validate before sending request

3. **UI Flow**
   - Show current password field
   - Show new password field
   - Show confirm new password field
   - Validate passwords match on client side
   - Show success message after change
   - Optionally log user out and require re-login

4. **Error Handling**
   - Show specific error messages to user
   - For 401, highlight current password field
   - For 400, highlight new password field

---

## 2. Export Data

### Endpoint
```
POST /api/account/export
```

### Headers
```
Authorization: Bearer {token}
```

### Request
No body required

### Response (Success - 200)
```typescript
interface ExportDataResponse {
  success: true;
  data: {
    message: string;  // "Your data export will be sent to your email within 24 hours."
    dataSize: {
      readings: number;
      compatibility: number;
      insights: number;
    };
  };
}
```

### Mobile Implementation Notes

1. **UI Placement**
   - Settings > Privacy > Export My Data
   - Or Settings > Account > Download My Data

2. **User Flow**
   - Show explanation of what data will be exported
   - Show confirmation dialog
   - Make API call
   - Show success message with email delivery time
   - Show data size summary

3. **GDPR Compliance**
   - Make this option easily discoverable
   - No restrictions on how often user can export
   - Clear messaging about what's included

4. **Example UI Text**
   ```
   Title: "Export Your Data"
   
   Description: "Download a copy of all your data including:
   • Your profile information
   • All readings (face, palm, combined)
   • Compatibility readings
   • Daily insights and forecasts
   
   We'll send a JSON file to your email within 24 hours."
   
   Button: "Request Export"
   
   Success: "Export requested! We'll send your data to {email} within 24 hours.
   You have {X} readings, {Y} compatibility readings, and {Z} insights."
   ```

---

## 3. Delete Account

### Endpoint
```
DELETE /api/account
```

### Headers
```
Authorization: Bearer {token}
```

### Request
No body required

### Response (Success - 200)
```typescript
interface DeleteAccountResponse {
  success: true;
  message: "Account and all associated data have been permanently deleted";
}
```

### Mobile Implementation Notes

1. **UI Placement**
   - Settings > Account > Delete Account
   - Use red/destructive color
   - Place at bottom of settings

2. **User Flow - CRITICAL**
   ```
   Step 1: User taps "Delete Account"
   
   Step 2: Show warning dialog
   "Are you sure you want to delete your account?
   
   This will permanently delete:
   • Your profile and birth data
   • All your readings
   • All compatibility readings
   • All saved insights
   • All uploaded images
   
   This action cannot be undone."
   
   Buttons: [Cancel] [Delete Account]
   
   Step 3: Show second confirmation
   "This is your last chance!
   
   Your account will be permanently deleted and cannot be recovered.
   
   Type DELETE to confirm:"
   
   Input field: [____]
   Buttons: [Cancel] [Permanently Delete]
   
   Step 4: Make API call
   
   Step 5: On success:
   - Clear all local data
   - Clear auth token
   - Navigate to welcome/login screen
   - Show toast: "Your account has been deleted"
   ```

3. **What Gets Deleted**
   - User account
   - User profile
   - All readings (face, palm, combined)
   - All compatibility readings
   - All insight caches
   - All images (face, palm, partner images)
   - Everything from database and cloud storage

4. **After Deletion**
   - User cannot login with same credentials
   - All data is permanently removed
   - User can create new account with same email

5. **Error Handling**
   - If API call fails, show error and don't log out
   - Allow user to retry
   - If partial deletion occurs, backend logs will show details

6. **Example Code**
   ```typescript
   async function deleteAccount() {
     // Show first confirmation
     const confirmed1 = await showConfirmDialog({
       title: "Delete Account?",
       message: "This will permanently delete all your data...",
       destructive: true
     });
     
     if (!confirmed1) return;
     
     // Show second confirmation with text input
     const confirmed2 = await showTextConfirmDialog({
       title: "Last Chance!",
       message: "Type DELETE to confirm",
       confirmText: "DELETE",
       destructive: true
     });
     
     if (!confirmed2) return;
     
     try {
       // Make API call
       const response = await api.delete('/account');
       
       if (response.success) {
         // Clear local data
         await clearAllLocalData();
         await clearAuthToken();
         
         // Navigate to welcome screen
         navigation.reset({
           index: 0,
           routes: [{ name: 'Welcome' }]
         });
         
         // Show success message
         showToast('Your account has been deleted');
       }
     } catch (error) {
       showError('Failed to delete account. Please try again.');
     }
   }
   ```

---

## Testing Checklist

### Change Password
- [ ] Email user can change password
- [ ] Social auth user sees appropriate message
- [ ] Wrong current password shows error
- [ ] Weak password shows validation error
- [ ] Can login with new password after change
- [ ] Cannot login with old password after change

### Export Data
- [ ] Request succeeds and shows confirmation
- [ ] Shows data size summary
- [ ] Can request multiple times
- [ ] Works for users with no data
- [ ] Works for users with lots of data

### Delete Account
- [ ] Shows proper warnings
- [ ] Requires confirmation
- [ ] Successfully deletes account
- [ ] Cannot login after deletion
- [ ] Profile not accessible after deletion
- [ ] Can create new account with same email
- [ ] All local data cleared
- [ ] Navigates to welcome screen

---

## Common Issues

### Issue: "Password change not available for social auth users"
**Solution:** Check `user.authProvider` before showing change password option

### Issue: User deleted account but can still see data
**Solution:** Ensure you're clearing all local data and auth token after deletion

### Issue: Export data not received
**Solution:** Currently returns confirmation only. In production, will send email.

---

## Support

For questions or issues:
1. Check backend logs for detailed error messages
2. Verify authentication token is valid
3. Ensure API base URL is correct
4. Check network connectivity

---

## API Base URL

**Development:** `http://localhost:8001/api`
**Production:** `https://api.revelia.me/api` (update when deployed)
