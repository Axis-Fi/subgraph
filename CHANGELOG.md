# CHANGELOG

## 0.6.11 (2024-07-10)

- Fix an issue with duplicate records of BatchLinearVesting
- Shift subgraph deployments on Mantle to the Mantle Subgraph service

## 0.6.10 (2024-07-10)

- Add contracts for testnet 0.5 release
- Add deployment to Mantle Sepolia

## 0.6.9 (2024-07-09)

- Remove pruning of historical entities, as historical blocks are required for ongoing auctions.
- Avoid duplicate record keys when the same IPFS hash is used across different auctions
- Added BatchBidCreated entity
- Shift event records to use unique record keys
