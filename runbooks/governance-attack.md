# Governance Attack — Incident Response Runbook

## Severity: Critical

## Trigger Conditions
- Malicious proposal submitted
- Whale wallet attempting to pass malicious proposal
- Governance voting manipulated
- Treasury drain attempt via governance
- Authority takeover attempt

## Immediate Actions (0-15 minutes)

1. **Declare Incident**
   - Alert incident response team
   - Alert security team
   - Alert multisig signers
   - Create incident channel: `#incident-governance-attack`
   - Set incident severity: Critical

2. **Assess Attack**
   - Identify malicious proposal
   - Identify attacking wallets
   - Assess voting power of attacker
   - Assess likelihood of proposal passing

3. **Mobilize Defense**
   - Alert friendly whales to vote against
   - Alert community to vote against
   - If multisig can override: Prepare override
   - If emergency pause available: Prepare to pause

## Short-Term Actions (15-60 minutes)

4. **Defend Against Proposal**
   - Vote against malicious proposal
   - Rally community to vote against
   - Engage friendly whales to vote against
   - If proposal passes: Prepare emergency measures

5. **Protect Treasury**
   - If treasury at risk: Move funds to safe address
   - If authority at risk: Revoke authority
   - If protocol at risk: Emergency pause
   - If multisig available: Use multisig to override

6. **Communicate with Community**
   - Announce governance attack to community
   - Explain malicious proposal
   - Call for community defense
   - Provide voting instructions

## Medium-Term Actions (1-24 hours)

7. **Neutralize Attack**
   - If proposal passed: Emergency rollback if possible
   - If treasury drained: Attempt recovery
   - If authority compromised: Revoke and reassign
   - If protocol paused: Plan safe resumption

8. **Investigate Attacker**
   - Identify attacker identity if possible
   - Track attacker wallet movements
   - Report to exchanges if applicable
   - Consider legal action if applicable

9. **Secure Governance**
   - Review governance parameters
   - Implement voting delays
   - Implement proposal review process
   - Implement emergency override mechanism

## Long-Term Actions (1-7 days)

10. **Postmortem**
    - Document attack timeline
    - Identify governance vulnerabilities
    - Assess damage
    - Implement preventive measures

11. **Governance Reform**
    - Implement proposal review committee
    - Implement voting timelocks
    - Implement emergency pause for governance
    - Implement multisig override for critical proposals

12. **Community Trust Restoration**
    - Publish transparency report
    - Explain attack and response
    - Implement additional safeguards
    - Reassure community about protocol safety

## Recovery Indicators

- Attack neutralized
- Governance secured
- Treasury protected
- Community confidence restored
- New safeguards implemented

## Escalation

If governance completely compromised:
- Consider emergency fork
- Consider authority reset
- Consider protocol migration
- Consider legal action against attacker

## Prevention

- Implement proposal review process
- Implement voting timelocks
- Implement emergency override mechanism
- Maintain diverse governance participation
- Monitor for suspicious voting patterns
- Implement proposal deposit requirements
- Educate community on governance risks
