# Exchange Delisting — Incident Response Runbook

## Severity: High

## Trigger Conditions
- Exchange announces delisting of token
- Exchange requests delisting
- Exchange removes liquidity
- Exchange suspends trading

## Immediate Actions (0-15 minutes)

1. **Declare Incident**
   - Alert executive team
   - Alert treasury management team
   - Create incident channel: `#incident-delisting`
   - Set incident severity: High

2. **Assess Impact**
   - Identify which exchange is delisting
   - Check trading volume on that exchange
   - Check total liquidity impact
   - Check if other exchanges may follow

3. **Communicate with Exchange**
   - Contact exchange to understand reason
   - Attempt to reverse decision if possible
   - Negotiate timeline if delisting is inevitable
   - Request grace period for users to withdraw

## Short-Term Actions (15-60 minutes)

4. **Inform Community**
   - Announce delisting to community
   - Provide timeline for withdrawal
   - Provide instructions for withdrawing funds
   - Reassure that other exchanges remain available

5. **Protect Liquidity**
   - If treasury has funds on exchange: Withdraw immediately
   - If possible: Move liquidity to other exchanges
   - Engage market makers on other exchanges
   - Ensure sufficient liquidity on remaining exchanges

6. **Assess Operator Impact**
   - Check if operators use affected exchange for rewards
   - If yes: Provide alternative withdrawal methods
   - Communicate with operators about impact
   - Ensure operators can still receive rewards

## Medium-Term Actions (1-24 hours)

7. **Secure New Listings**
   - Contact alternative exchanges
   - Apply for listing on new exchanges
   - Accelerate pending listing applications
   - Consider DEX as alternative

8. **Treasury Management**
   - Review treasury distribution across exchanges
   - Consolidate treasury on secure exchanges
   - Consider moving treasury to cold storage
   - Diversify exchange holdings

9. **Market Maker Engagement**
   - Engage market makers on remaining exchanges
   - Provide incentives for liquidity provision
   - Ensure healthy order books
   - Monitor spread and depth

## Long-Term Actions (1-7 days)

10. **Root Cause Analysis**
    - Understand why delisting occurred
    - If compliance issue: Address immediately
    - If volume issue: Consider marketing to increase volume
    - If relationship issue: Repair relationship

11. **Rebuild Liquidity**
    - Focus on remaining exchanges
    - Implement liquidity mining if needed
    - Engage community to trade on remaining exchanges
    - Consider automated market maker (AMM) strategies

12. **Diversification Strategy**
    - Reduce reliance on single exchange
    - Target multiple exchange listings
    - Increase DEX presence
    - Implement cross-chain liquidity

## Recovery Indicators

- Liquidity restored on other exchanges
- Trading volume returns to normal
- Community confidence restored
- New exchange listings secured
- No further delistings

## Escalation

If multiple exchanges delist or liquidity completely dries up:
- Consider protocol migration
- Consider chain migration
- Consider token migration
- Prepare for potential shutdown

## Prevention

- Maintain listings on multiple exchanges
- Maintain DEX presence
- Regularly engage with exchange teams
- Monitor exchange relationships
- Maintain healthy trading volume
- Diversify liquidity across venues
