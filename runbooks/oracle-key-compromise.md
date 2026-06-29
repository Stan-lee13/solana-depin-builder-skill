# Oracle Key Compromise — Incident Response Runbook

## Severity: Critical

## Trigger Conditions
- Oracle private key leaked or stolen
- Oracle signing key accessed by unauthorized party
- Oracle service showing unauthorized signatures
- Suspicious oracle activity detected

## Immediate Actions (0-15 minutes)

1. **Declare Incident**
   - Alert incident response team
   - Alert security team
   - Create incident channel: `#incident-oracle-compromise`
   - Set incident severity: Critical

2. **Pause Oracle Operations**
   - Immediately pause oracle service
   - Revoke oracle key permissions
   - Pause proof submissions on-chain (emergency pause)
   - Prevent any new oracle signatures

3. **Assess Scope**
   - Determine which key was compromised
   - Determine time window of compromise
   - Identify all transactions signed with compromised key
   - Assess impact on network state

## Short-Term Actions (15-60 minutes)

4. **Rotate Oracle Keys**
   - Generate new oracle keypair
   - Secure new key in HSM
   - Update oracle service with new key
   - Update on-chain oracle authority

5. **Verify Network State**
   - Audit all transactions during compromise window
   - Identify any fraudulent transactions
   - If fraudulent transactions found: Prepare rollback
   - Verify network integrity

6. **Communicate with Stakeholders**
   - Inform operators about oracle pause
   - Inform operators about key rotation
   - Provide timeline for oracle restoration
   - Reassure about network security

## Medium-Term Actions (1-24 hours)

7. **Restore Oracle Service**
   - Deploy oracle service with new key
   - Test oracle verification
   - Resume proof submissions
   - Monitor for anomalies

8. **Investigate Compromise**
   - Determine how key was compromised
   - Review access logs
   - Review security procedures
   - Identify security gaps

9. **Remediate Security Issues**
    - Patch identified vulnerabilities
    - Improve key storage procedures
    - Implement additional security measures
    - Review all key management procedures

## Long-Term Actions (1-7 days)

10. **Postmortem**
    - Conduct full security audit
    - Document incident timeline
    - Identify root cause
    - Implement preventive measures

11. **Compensation**
    - If operators affected: Consider compensation
    - If network state corrupted: Consider rollback
    - If financial losses occurred: Consider reimbursement
    - Communicate compensation plan to community

12. **Security Hardening**
    - Implement multi-factor authentication for key access
    - Implement key rotation schedule
    - Implement HSM for all keys
    - Implement regular security audits
    - Implement intrusion detection

## Recovery Indicators

- Oracle service restored with new key
- No fraudulent transactions detected
- Network integrity verified
- Security vulnerabilities patched
- Operators can submit proofs normally

## Escalation

If network state corrupted or significant fraud occurred:
- Consider emergency rollback
- Consider network pause
- Consider protocol upgrade
- Consider compensation fund deployment

## Prevention

- Store all keys in HSM
- Implement key rotation schedule
- Implement MFA for key access
- Regular security audits
- Monitor for key access anomalies
- Implement intrusion detection
- Limit key access to minimum personnel
