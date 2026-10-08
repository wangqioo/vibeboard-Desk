# Security Guidelines

## 🔐 CRITICAL: Never Commit Secrets

This project requires a Clawdbot Gateway token to function. **NEVER commit your token to git.**

### What NOT to Commit

❌ Gateway tokens  
❌ API keys  
❌ Passwords  
❌ Private keys  
❌ Personal URLs  
❌ Email addresses  

### Protected Files

These files are in `.gitignore` and should **never** be committed:

- `config.js` - Your local configuration with real tokens
- `*.local.html` - Local versions of HTML files with hardcoded tokens
- `*.local.js` - Local JavaScript files with secrets
- `.env` / `.env.local` - Environment variables
- `*.backup` / `*.bak` - Backup files that might contain tokens

### Safe Setup Process

#### Option 1: External Config File (Recommended)

1. **Copy the template:**
   ```bash
   cp config.example.js config.js
   ```

2. **Get your token:**
   ```bash
   clawdbot gateway config.get
   ```

3. **Add token to config.js:**
   ```javascript
   const CLAWDBOT_CONFIG = {
     token: 'your-actual-token-here'
   };
   ```

4. **Update HTML to use external config:**
   ```html
   <script src="config.js"></script>
   <script>
     // Now use CLAWDBOT_CONFIG.token
   </script>
   ```

5. **Verify it's protected:**
   ```bash
   git status
   # config.js should NOT appear in changes
   ```

#### Option 2: Local HTML Files

For quick testing, create a `.local.html` version:

1. **Copy the main file:**
   ```bash
   cp face.html face.local.html
   ```

2. **Add your token to face.local.html**
   (This file is ignored by git)

3. **Open the .local.html file in browser**

4. **NEVER commit the .local.html file**

### If You Accidentally Commit a Secret

**DO THIS IMMEDIATELY:**

1. **🚨 ROTATE THE TOKEN:**
   ```bash
   clawdbot gateway config.patch
   ```
   Generate a new gateway token

2. **📝 Document it:**
   Add entry to `memory/YYYY-MM-DD.md` explaining what happened

3. **⚠️ Notify others:**
   If it's a shared repo, tell collaborators the token is compromised

4. **🔍 Review history:**
   Check if other secrets were exposed

**DO NOT:**
- ❌ Just delete the file and commit - it's still in git history
- ❌ Try to rewrite git history unless you know what you're doing
- ❌ Assume the secret is safe because you deleted it

### Pre-Commit Checklist

Before running `git commit`, ALWAYS:

1. ✅ Run `git diff` and read EVERY changed line
2. ✅ Search for "token", "key", "password", "secret"
3. ✅ Verify no hardcoded credentials are present
4. ✅ Check that config.js is NOT in the commit
5. ✅ When in doubt, ask someone to review

### Why This Matters

- **Git history is permanent** - even if you delete a file, the secret stays in history
- **Public repos are scraped** - bots scan GitHub for exposed tokens within minutes
- **Rotation is required** - once exposed, assume the secret is compromised forever
- **Trust is fragile** - one leak can compromise an entire system

### Testing Without Real Tokens

The HTML files have a `USE_CLAWDBOT` flag:

```javascript
const USE_CLAWDBOT = false;  // Set to false for testing
```

When false, the interface uses mock responses. This lets you:
- Test the UI without a real gateway
- Share demos without exposing credentials
- Develop features offline

## Example: Secure Development Workflow

```bash
# 1. Clone the repo
git clone https://github.com/your-username/brainsy-face.git
cd brainsy-face

# 2. Create your local config (NOT committed)
cp config.example.js config.js
nano config.js  # Add your real token here

# 3. Update HTML to use external config
# Edit face.html to load config.js instead of hardcoding

# 4. Verify protection
git status
# config.js should NOT appear

# 5. Test it works
open face.html  # Should connect successfully

# 6. Make changes to code
nano face.html  # Edit features, styles, etc.

# 7. Before committing, audit for secrets
git diff | grep -i "token\|key\|password\|secret"
# Should return nothing

# 8. Commit safely
git add face.html README.md  # Only commit safe files
git commit -m "Add new feature"
git push
```

## Emergency Response Plan

If a token is exposed in a public commit:

### Step 1: Immediate Containment (0-5 minutes)
```bash
# Rotate the token IMMEDIATELY
clawdbot gateway config.patch
# Generate new gateway.token

# Verify old token is invalid
curl -H "Authorization: Bearer OLD_TOKEN" http://localhost:18789/v1/status
# Should return 401 Unauthorized
```

### Step 2: Assessment (5-15 minutes)
- Document what was exposed and when
- Check git history: `git log --all -- path/to/file.html`
- Identify all commits containing the secret
- List all branches and forks that may have it

### Step 3: Cleanup (15-60 minutes)
```bash
# Update all local files with new token
grep -r "OLD_TOKEN" . --exclude-dir=.git
# Replace in all files

# Test that everything works with new token
open face.html  # Should connect successfully

# Commit the fix (WITHOUT new token)
git add .
git commit -m "Security: Remove hardcoded tokens, use config.js"
git push
```

### Step 4: Documentation (1 hour)
- Update `memory/YYYY-MM-DD.md` with incident details
- Add lessons learned to `AGENTS.md`
- Review security procedures
- Update this file if needed

### Step 5: Prevention
- Add pre-commit hook to scan for secrets
- Set up automated scanning (e.g., GitHub secret scanning)
- Review all contributors' understanding of security
- Schedule regular security audits

## Resources

- [Clawdbot Security Docs](https://docs.clawd.bot/security)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Git History Rewriting](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History) (advanced)
- [.gitignore Best Practices](https://git-scm.com/docs/gitignore)

## Questions?

If you're unsure whether something is safe to commit:
1. **Don't commit it** - better safe than sorry
2. **Ask for review** - have someone check the diff
3. **Use git diff** - read every line before committing
4. **When in doubt, use config.js** - externalize all credentials

---

**Remember: Convenience is NOT worth compromising security.**

Build secure habits from the start. Your future self will thank you.
