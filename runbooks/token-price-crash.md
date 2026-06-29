# Token Price Crash — Incident Response Runbook

## Severity: Critical

## Trigger Conditions
- Token price drops >50% within 24 hours
- Token price drops >80% within 7 days
- Liquidity dries up (<$10K daily volume)
- Market cap drops below operational runway

## Immediate Actions (0-15 minutes)

1. **Declare Incident**
   - Alert incident response team via PagerDuty
   - Create incident channel in Slack: `#incident-token-crash`
   - Set incident severity: Critical

2. **Assess Situation**
   - Check token price on all exchanges
   - Check trading volume across exchanges
   - Check for large sell orders on order books
   - Check for whale wallet movements (using Solscan)
   - Check for negative news or FUD

3. **Protect Treasury**
   - If treasury is in token: Consider converting to stablecoin
   - If treasury is in SOL: Hold (SOL is more stable)
   - Pause any treasury spending
   - Review upcoming token emissions

## Short-Term Actions (15-60 minutes)

4. **Communicate with Community**
   - Post announcement on Discord/Twitter
   - Be transparent about the situation
   - Reassure operators that network operations continue
   - Emphasize that node rewards are not affected (if true)

5. **Review Operator Economics**
   - Calculate new breakeven for operators
   - If operators are underwater: Consider emergency reward boost
   - Communicate with operators about impact

6. **Check for Market Manipulation**
   - Review trading patterns for wash trading
   - Check for coordinated sell-offs
   - Report suspicious activity to exchanges if applicable

## Medium-Term Actions (1-24 hours)

7. **Stabilize Token Price**
   - If treasury allows: Buy back tokens to support price
   - Engage market makers to provide liquidity
   - Consider token burn if treasury allows
   - Reduce token emissions temporarily

8. **Review Tokenomics**
   - Assess if current tokenomics are sustainable
   - Consider adjusting emission schedule
   - Review vesting schedules for team/investors
   - Consider implementing buyback program

9. **Engage Exchanges**
   - Contact listed exchanges about situation
   - Request additional liquidity if needed
   - Discuss potential delisting risks

## Long-Term Actions (1-7 days)

10. **Root Cause Analysis**
    - Determine cause of price crash
    - If external factor: Document and communicate
    - If internal issue: Address immediately
    - Conduct postmortem

11. **Rebuild Confidence**
    - Publish transparency report
    - Highlight network metrics (nodes, uptime, growth)
    - Share roadmap and upcoming milestones
    - Consider partnership announcements

12. **Adjust Strategy**
    - If tokenomics broken: Redesign
    - If market conditions changed: Pivot strategy
    - If operator economics broken: Adjust rewards
    - Consider stablecoin rewards as alternative

## Recovery Indicators

- Token price stabilizes (no further drops for 48 hours)
- Trading volume returns to normal levels
- Liquidity returns to healthy levels
- Operator economics remain viable
- Community sentiment improves

## Escalation

If token price drops >90% or liquidity completely dries up:
- Consider emergency protocol halt
- Evaluate network viability
- Consider migration to new token or chain
- Prepare for potential shutdown

## Prevention

- Maintain treasury in multiple assets (SOL, USDC, token)
- Implement buyback program during bull markets
- Diversify exchange listings
- Maintain healthy liquidity reserves
- Regular stress testing of tokenomics
