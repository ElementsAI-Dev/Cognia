---
description: Security audit and vulnerability detection for web applications
---

# Security Workflow

Comprehensive security audit for identifying vulnerabilities and implementing fixes.

## Prerequisites

- Target folder path
- Access to dependency management files (package.json, Cargo.toml)
- Understanding of application's data flow

## Phase 1: Dependency Audit

1. **Check npm vulnerabilities**

   ```bash
   pnpm audit
   ```

2. **Check Rust vulnerabilities**

   ```bash
   cargo audit
   ```

3. **Review outdated packages**

   ```bash
   pnpm outdated
   cargo outdated
   ```

## Phase 2: Code Security Scan

### 2.1 Secrets Detection

Search for hardcoded secrets:

- [ ] API keys
- [ ] Passwords
- [ ] Private keys
- [ ] Connection strings
- [ ] Tokens

Patterns to grep:

```text
password\s*=
api[_-]?key\s*=
secret\s*=
token\s*=
private[_-]?key
-----BEGIN.*PRIVATE KEY-----
```

### 2.2 Input Validation

Check for:

- [ ] SQL injection vulnerabilities
- [ ] Command injection
- [ ] Path traversal
- [ ] XSS attack vectors
- [ ] SSRF vulnerabilities

### 2.3 Authentication & Authorization

Verify:

- [ ] Authentication on protected routes
- [ ] Authorization checks before actions
- [ ] Session management
- [ ] CSRF protection
- [ ] Rate limiting

### 2.4 Data Handling

Check:

- [ ] Sensitive data encryption
- [ ] Secure data transmission (HTTPS)
- [ ] Proper data sanitization
- [ ] PII handling compliance
- [ ] Logging of sensitive data (should not)

## Phase 3: Security Checklist

### Frontend (React/TypeScript)

- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] No `eval()` or `new Function()`
- [ ] Content Security Policy headers
- [ ] Secure cookie settings
- [ ] No sensitive data in localStorage without encryption
- [ ] Input validation on forms
- [ ] URL parameter sanitization

### Backend (Rust/Tauri)

- [ ] Command input validation
- [ ] File path sanitization
- [ ] Process execution safety
- [ ] IPC message validation
- [ ] Capability restrictions
- [ ] Resource access controls

### API Security

- [ ] Authentication required
- [ ] Input validation
- [ ] Output encoding
- [ ] Rate limiting
- [ ] Error message sanitization (no stack traces)
- [ ] CORS configuration

## Phase 4: Vulnerability Classification

### Critical (Fix Immediately)

- Remote code execution
- Authentication bypass
- Data breach exposure
- Privilege escalation

### High (Fix Within 24h)

- SQL/Command injection
- Stored XSS
- Sensitive data exposure
- Missing authentication

### Medium (Fix Within 1 Week)

- Reflected XSS
- CSRF vulnerabilities
- Information disclosure
- Insecure defaults

### Low (Fix in Next Sprint)

- Missing security headers
- Verbose error messages
- Outdated dependencies (no known exploits)
- Minor configuration issues

## Phase 5: Remediation

For each vulnerability:

1. **Document the issue**

   - Location (file:line)
   - Attack vector
   - Potential impact
   - CVSS score if applicable

2. **Implement fix**

   - Use established security patterns
   - Don't roll your own crypto
   - Follow OWASP guidelines

3. **Verify fix**

   - Test the specific vulnerability
   - Regression test
   - Code review

4. **Add prevention**

   - Add test case
   - Add linting rule if possible
   - Update security guidelines

## Output Format

```markdown
## Security Audit Report

### Summary
- Critical: X
- High: Y
- Medium: Z
- Low: W

### Findings

#### [CRITICAL] Issue Title
**Location**: `@/path/to/file.ts:line`
**Description**: What the vulnerability is
**Attack Vector**: How it could be exploited
**Remediation**: Specific fix recommendation
**Status**: Open/Fixed

### Recommendations
1. [Priority action items]

### Next Steps
- [Follow-up actions]
```

## Security Resources

- OWASP Top 10: https://owasp.org/Top10/
- CWE Database: https://cwe.mitre.org/
- Tauri Security: https://tauri.app/security/

## Important Notes

- **Never commit secrets** - use environment variables
- **Validate all inputs** - client and server side
- **Sanitize all outputs** - prevent injection
- **Least privilege** - minimize permissions
- **Defense in depth** - multiple security layers
- **Keep dependencies updated** - patch known vulnerabilities
