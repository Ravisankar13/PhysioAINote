# Movement Analysis Deployment Guide

## Issue: Camera Access in Production

The Movement Analysis page works in Replit preview but may fail in production deployment due to browser security requirements for camera access.

## Why This Happens

### 1. **HTTPS Requirement**
- Camera access (`getUserMedia`) only works on:
  - `localhost` (used by Replit preview)
  - Secure HTTPS connections
  - The production deployment MUST use HTTPS

### 2. **Browser Permissions**
- Production sites require explicit camera permissions
- Users must click "Allow" when prompted
- Some browsers may block camera access by default

### 3. **Mixed Content Issues**
- If your site uses HTTPS but loads resources over HTTP, browsers block camera access
- MediaPipe library loads from CDN which must be HTTPS

## Solutions

### For Deployment on Replit

1. **Ensure HTTPS is enabled**:
   - Replit deployments automatically use HTTPS
   - Access your site using `https://` not `http://`
   - Example: `https://your-app.replit.app`

2. **Browser Settings**:
   - Chrome: Click the camera icon in the address bar → Allow
   - Firefox: Click the camera icon → Allow
   - Safari: Settings → Websites → Camera → Allow for your domain

3. **Clear Browser Cache**:
   - Sometimes cached HTTP redirects can cause issues
   - Clear cache and cookies for your domain
   - Try in an incognito/private window

### Troubleshooting Steps

1. **Check Console for Errors**:
   ```
   - Open browser DevTools (F12)
   - Look for errors like:
     - "getUserMedia is not supported"
     - "Permission denied"
     - "Not allowed in insecure context"
   ```

2. **Verify HTTPS**:
   - Check the URL bar for the padlock icon
   - Ensure URL starts with `https://`
   - No "Not Secure" warnings

3. **Test Camera Access**:
   - Visit https://webrtc.github.io/samples/src/content/getusermedia/gum/
   - If this works, your browser supports camera access
   - If not, check browser/OS camera permissions

### Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Not Secure Context" | Use HTTPS URL, not HTTP |
| "Permission Denied" | Allow camera in browser prompt |
| "getUserMedia undefined" | Update browser or use Chrome/Firefox |
| "Camera in use" | Close other apps using camera |
| Mixed content warning | Ensure all resources load via HTTPS |

### Testing Locally vs Production

- **Local (Replit Preview)**: Works because localhost is considered secure
- **Production**: Must use HTTPS and have proper permissions

### Camera Status Indicators

The app now shows camera status:
- 🔄 **Initializing**: Camera starting up
- ⚠️ **Permission Needed**: Allow camera access
- ❌ **Error**: Check troubleshooting tips shown on screen

## Deployment Checklist

- [ ] Deploy with HTTPS enabled
- [ ] Test in multiple browsers
- [ ] Clear cache before testing
- [ ] Allow camera permissions when prompted
- [ ] Check browser console for errors
- [ ] Verify MediaPipe CDN loads (check Network tab)

## Contact Support

If issues persist after following this guide:
1. Check browser console for specific error messages
2. Test on different devices/browsers
3. Verify your deployment URL uses HTTPS
4. Ensure no browser extensions are blocking camera access