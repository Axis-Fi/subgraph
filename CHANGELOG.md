# CHANGELOG

## 1.0.1 (2024-08-22)

- Update to use [axis-core 1.0.1](https://github.com/Axis-Fi/axis-core/releases/tag/1.0.1) deployments
- Handle a change in how percentages are represented ([Axis-Fi/axis-core#216](https://github.com/Axis-Fi/axis-core/pull/216))

## 1.0.0 (2024-07-19)

- Production deployments

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
