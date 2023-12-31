# Poll Simulation App: A Durable Nonce Demo
## Introduction

The Poll Simulation app simulates a real-life poll mechanism, wherein voters are allowed to vote for a given set of time, and once the time comes for counting, the votes are counted, the count is publicly announced to everyone and the winner is declared. This is tough to build on-chain, as changing the state of an account on-chain is a public action, and hence if a user votes for someone, others would know and hence the count won't be hidden from the public until the voting has completed.

Durable nonces can be used to partially fix this. Instead of signing and sending the transaction when voting for your candidate, the dapp can let the user sign the transaction using durable nonces, serialise the transaction as shown above in the web3.js example, and save the serialised transactions in a database, until the time comes for counting.

For counting the votes, the dapp then needs to sync send or submit all the signed transactions one by one. With each submitted transaction, the state change will happen on-chain and the winner can be decided.

## How to use the dapp
[coming soon]

run the cron job to send tx with all the posts every 24 hours:
```
select
  cron.schedule(
    'invoke',
    '0 22 * * *', 
    $$
    select
      net.http_post(
         url:='https://ebjijwajksizqkcghwdv.supabase.co/functions/v1/count-votes',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_KEY"}'::jsonb,
          body:=concat('{"pollid": "3hY7MnnYtVSTVB7UxJePFKGNYVKPK3H5x5E2STshZiXV"}')::jsonb
      ) as request_id;
    $$
  );
```

## How to build the dapp locally
[coming soon]# frontend
- yarn
- yarn dev
