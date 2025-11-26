# 🔄 SERVER RESTART REQUIRED

## ⚠️ CRITICAL: You MUST restart your server for the routes to work!

### Current Issue
The server is running OLD code. You have **TWO server processes** running:
- PID 15911 (old process from Nov 25)
- PID 2492 (newer process)

### Steps to Fix:

1. **Stop ALL server processes:**
   ```bash
   # Kill all Node.js server processes
   pkill -f "node index.js"
   
   # OR kill specific processes
   kill 15911 2492
   ```

2. **Verify they're stopped:**
   ```bash
   ps aux | grep "node index.js" | grep -v grep
   # Should return nothing
   ```

3. **Start the server fresh:**
   ```bash
   cd server
   npm start
   ```

4. **Check the console output - you MUST see:**
   ```
   📝 Registering direct message routes...
   ✅ Direct message routes registered:
      GET  /api/messages/conversations
      GET  /api/messages/unread/count
      POST /api/messages/send
      POST /api/messages/read
      GET  /api/messages/:userId
   ```

5. **Test the route:**
   - Visit: `http://localhost:3000/api/messages/test`
   - Should return JSON (not 404)

### If you still see 404 after restart:

1. Check server console for the messages above
2. Verify server is running on port 3001
3. Check for any error messages in console
4. Try: `curl http://localhost:3001/api/messages/test`

### Why restart is needed:
Node.js loads code when the server starts. Changes to route files require a server restart to take effect.

