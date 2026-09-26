# Security Guidelines — Kintsugi (Watsonx Hackathon)

## 🔒 Credential Management

### ✅ DO:

- ✅ Use environment variables for ALL credentials
- ✅ Copy `.env.example` → `apps/dashboard/.env.local` and add credentials there
- ✅ Keep every `.env` / `.env.local` in `.gitignore` (already configured)
- ✅ Use `process.env.VARIABLE_NAME` in code
- ✅ Review your commits before pushing (`git diff`)
- ✅ Use placeholders when asking AI assistants (Bob, etc.) for help
- ✅ Rotate a key from the **Projects** page (or the IBM Cloud console) before any public submission

### ❌ DON'T:

- ❌ Never hardcode API keys in code
- ❌ Never commit `.env` / `.env.local` files
- ❌ Never commit `.bob/mcp.json` (it holds the live MCP + watsonx keys) — commit `.bob/mock-mcp.json` instead
- ❌ Never share credentials in code comments
- ❌ Never commit files with "credential", "secret", or "password" in the name
- ❌ Never remove patterns from `.gitignore` or `.bobignore`
- ❌ Never paste credentials into an AI assistant prompt

## 🗝️ Where secrets live in this project

| File | Contains | Committed? |
|------|----------|------------|
| `apps/dashboard/.env.local` | IBM Cloudant / COS / watsonx keys | ❌ gitignored |
| `.bob/mcp.json` | Kintsugi MCP API key + watsonx keys | ❌ gitignored |
| `.env.example`, `apps/dashboard/.env.example` | placeholders only | ✅ yes |
| `.bob/mock-mcp.json` | placeholder MCP config | ✅ yes |

Kintsugi stores only a **SHA-256 hash** of each project API key in the database; the
raw `kts_live_…` key is shown once at creation and lives only in `.bob/mcp.json`.

## 🤖 Using AI Assistants Safely (Bob, Copilot, etc.)

AI assistants log prompts and code in session history. If you share credentials with
them, those credentials may be logged.

```
❌ BAD:  "Here's my API key: abc123xyz, help me use it"
✅ GOOD: "Help me use environment variables for my API key"

❌ BAD:  "Read my .env file and help me debug"
✅ GOOD: "Help me structure my .env file (I'll add credentials myself)"

❌ BAD:  const apiKey = "abc123xyz"
✅ GOOD: const apiKey = process.env.IBM_CLOUD_API_KEY
```

Protection in this repo:
- `.bobignore` prevents Bob from logging credential patterns
- `.gitignore` prevents `.env*`, `.bob/mcp.json`, and session files from being committed
- But YOU must not share credentials in prompts.

## 🚨 What Happens if You Expose Credentials?

If you accidentally commit a credential:

1. Your IBM Cloud account may be suspended immediately.
2. Remove the credential from repository history.
3. Rotate/revoke the exposed credential (Projects page for MCP keys; IBM Cloud IAM for service keys).
4. Your account is restored after verification.

## 📝 Using Environment Variables

### Node.js / TypeScript
```javascript
require("dotenv").config();
const apiKey = process.env.CLOUDANT_APIKEY;
```

### Python
```python
import os
from dotenv import load_dotenv
load_dotenv()
api_key = os.getenv("IBM_CLOUD_API_KEY")
```

## 🔍 Before You Commit Checklist

- [ ] No hardcoded credentials in code
- [ ] No `.env` / `.env.local` staged (`git status`)
- [ ] `.bob/mcp.json` is NOT staged
- [ ] No files with credentials in their name
- [ ] Reviewed `git diff` for sensitive data
- [ ] All credentials are read from environment variables
- [ ] No credentials shared with AI assistants

## 🆘 Need Help?

Contact hackathon support through the mentor channel.

## 📚 Additional Resources

- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [IBM Cloud Security](https://cloud.ibm.com/docs/account?topic=account-security)
- [Environment Variables Guide](https://12factor.net/config)
