# /depin-deploy — Deployment Checklist

Generates a comprehensive deployment checklist for launching a DePIN network on Solana.

## Usage

```
/depin-deploy [environment]
```

## Environments

### Devnet
```
/depin-deploy devnet
```

Development environment for testing:
- Free SOL faucet
- No real value at stake
- Frequent resets
- Fast block times

### Testnet
```
/depin-deploy testnet
```

Pre-production environment:
- Simulated mainnet conditions
- Testnet SOL (simulated value)
- Stable environment
- Community testing

### Mainnet
```
/depin-deploy mainnet
```

Production environment:
- Real SOL at stake
- Permanent state
- Security critical
- Full monitoring required

## Output

The command generates a checklist organized by phase:

### Phase 1: Pre-Deployment

#### Smart Contract
- [ ] Security audit completed
- [ ] Audit findings addressed
- [ ] Code review by 2+ engineers
- [ ] Emergency pause tested
- [ ] Multisig configured
- [ ] Authority keys secured (HSM)
- [ ] Upgrade mechanism tested
- [ ] Gas optimization verified

#### Infrastructure
- [ ] RPC provider selected (primary + backup)
- [ ] Monitoring configured (Grafana + Prometheus)
- [ ] Alerting configured (PagerDuty/Slack)
- [ ] Log aggregation (Datadog/Loki)
- [ ] Error tracking (Sentry)
- [ ] Backup strategy implemented
- [ ] Disaster recovery tested

#### Oracle
- [ ] Oracle service deployed
- [ ] Oracle keys secured
- [ ] Failover mechanism tested
- [ ] Rate limits configured
- [ ] Monitoring operational
- [ ] Backup oracle configured

#### Documentation
- [ ] Operator documentation complete
- [ ] API documentation published
- [ ] Incident response runbooks ready
- [ ] Security guidelines published
- [ ] FAQ published

### Phase 2: Deployment

#### Smart Contract Deployment
- [ ] Build program for target network
- [ ] Deploy program
- [ ] Verify program on Solscan
- [ ] Initialize network config
- [ ] Set authority (multisig)
- [ ] Configure epoch parameters
- [ ] Set reward parameters
- [ ] Test emergency pause

#### Infrastructure Deployment
- [ ] Deploy monitoring stack
- [ ] Configure alert thresholds
- [ ] Test alert delivery
- [ ] Deploy log aggregation
- [ ] Configure error tracking
- [ ] Test backup/restore

#### Oracle Deployment
- [ ] Deploy oracle service
- [ ] Configure oracle keys
- [ ] Test oracle endpoints
- [ ] Configure rate limits
- [ ] Set up monitoring
- [ ] Test failover

### Phase 3: Verification

#### Smart Contract Verification
- [ ] All instructions tested
- [ ] Account constraints verified
- [ ] Access controls verified
- [ ] Emergency pause verified
- [ ] Multisig operations verified
- [ ] Upgrade mechanism verified

#### Infrastructure Verification
- [ ] Monitoring data flowing
- [ ] Alerts triggering correctly
- [ ] Logs aggregating
- [ ] Errors tracking
- [ ] Backup/restore tested
- [ ] Performance benchmarks met

#### Oracle Verification
- [ ] Oracle responding correctly
- [ ] Proof verification working
- [ ] Failover operational
- [ ] Rate limits effective
- [ ] Monitoring operational

### Phase 4: Operator Onboarding

#### Documentation
- [ ] Quick start guide published
- [ ] Hardware setup guide published
- [ ] Wallet connection guide published
- [ ] Troubleshooting guide published
- [ ] FAQ published

#### Support
- [ ] Support channels configured
- [ ] Support team trained
- [ ] Escalation paths defined
- [ ] SLA published

#### Incentives
- [ ] Early operator incentives configured
- [ ] Reward distribution tested
- [ ] Staking mechanism tested
- [ ] Breakeven analysis verified

### Phase 5: Post-Deployment

#### Monitoring
- [ ] 24/7 monitoring operational
- [ ] Alert coverage verified
- [ ] On-call rotation configured
- [ ] Incident response tested

#### Maintenance
- [ ] Maintenance schedule defined
- [ ] Upgrade process documented
- [ ] Backup schedule configured
- [ ] Key rotation schedule defined

#### Governance
- [ ] Governance mechanism configured
- [ ] Proposal process defined
- [ ] Voting mechanism tested
- [ ] Treasury management configured

## Mainnet-Specific Requirements

### Security
- [ ] HSM for authority keys
- [ ] Multi-sig (3/5 minimum)
- [ ] Time-delay for critical operations
- [ ] Bug bounty program launched
- [ ] Security partner engaged

### Compliance
- [ ] Legal review completed
- [ ] Regulatory assessment completed
- [ ] Terms of service published
- [ ] Privacy policy published
- [ ] KYC/AML if required

### Liquidity
- [ ] Token listing secured
- [ ] Liquidity provision planned
- [ ] Market maker engaged
- [ ] Treasury strategy defined

### Insurance
- [ ] Smart contract insurance
- [ ] Key person insurance
- [ ] Operational insurance
- [ ] Cyber insurance

## Example Checklist Output

```markdown
# Deployment Checklist: MyDePIN - Mainnet

## Phase 1: Pre-Deployment ✓

### Smart Contract
- [x] Security audit completed (Certik)
- [x] Audit findings addressed (3/3)
- [x] Code review by 2+ engineers
- [x] Emergency pause tested
- [x] Multisig configured (3/5)
- [ ] Authority keys secured (HSM) ← PENDING
- [x] Upgrade mechanism tested
- [x] Gas optimization verified

### Infrastructure
- [x] RPC provider selected (Helius + QuickNode backup)
- [x] Monitoring configured (Grafana + Prometheus)
- [x] Alerting configured (PagerDuty + Slack)
- [x] Log aggregation (Datadog)
- [x] Error tracking (Sentry)
- [x] Backup strategy implemented
- [x] Disaster recovery tested

### Oracle
- [x] Oracle service deployed (Switchboard v3)
- [x] Oracle keys secured (AWS KMS)
- [x] Failover mechanism tested
- [x] Rate limits configured (1000 req/min)
- [x] Monitoring operational
- [x] Backup oracle configured

### Documentation
- [x] Operator documentation complete
- [x] API documentation published
- [x] Incident response runbooks ready
- [x] Security guidelines published
- [x] FAQ published

## Phase 2: Deployment

### Smart Contract Deployment
- [ ] Build program for mainnet
- [ ] Deploy program
- [ ] Verify program on Solscan
- [ ] Initialize network config
- [ ] Set authority (multisig)
- [ ] Configure epoch parameters
- [ ] Set reward parameters
- [ ] Test emergency pause

## Status: 18/24 complete (75%)

## Blockers
1. Authority keys not yet secured in HSM
2. Awaiting final security review

## Next Steps
1. Secure authority keys in HSM (2 days)
2. Complete security review (1 day)
3. Deploy to mainnet (1 day)
4. Begin operator onboarding (ongoing)
```

## Follow-up Commands

After deployment:
- `/depin-audit` — Audit deployed network
- `/depin-design` — Review architecture
- Load `skill/incident-response-integration.md` — Incident response
