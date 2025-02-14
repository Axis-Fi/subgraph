# Axis Subgraphs

Subgraph definition for Axis Origin contracts

## Contributing

Please see the [contributing guide](./CONTRIBUTING.md) for more information.

## Deploy Guide

- Run `TARGET_NETWORK=<chain> pnpm deploy:graph`

> **Note**: If the provider is Goldsky, you must
>
> - authenticate first, [see how here](https://docs.goldsky.com/subgraphs/deploying-subgraphs)
> - add the network name to `GOLDSKY_DEPLOYMENTS`

## Hosting Services

There isn't a single hosting platform that supports all of the required chains. We deploy across multiple hosting services as a result.

| Subgraph         | Hosting Service |
| ---------------- | --------------- |
| arbitrum-one     | Alchemy         |
| arbitrum-sepolia | Alchemy         |
| base             | Alchemy         |
| base-sepolia     | Alchemy         |
| blast            | Goldsky         |
| blast-sepolia    | Goldsky         |
| mantle           | Goldsky         |
| mantle-sepolia   | Goldsky         |
| mode-mainnet     | Goldsky         |
| mode-testnet     | Goldsky         |

## Deployment Configuration

### Approach

While the `graph-cli` tooling supports injecting the address and start block values are build- or deployment-time, it is insufficient as data sources cannot be marked optional. Subsequently, the deployment for a chain that does not have an address for a particular contract version will fail.

Instead, the deployment scripts use `mustache` to read the target chain's values from `networks.json` and inject them into `subgraph-template.yaml`, which is then written to `subgraph.yaml` (the default location for the manifest file) and used in deployment. As described in [Optional Deployments](#optional-deployments), there is a `mustache` syntax that will mark a contract (aka data source) as optional.

### Adding a New Contract or Deployment

To add a new contract or deployment, a "data source" needs to be added in the `subgraph-template.yaml` file.

The contents of the data source should be the standard as defined in the subgraph manifest format, except for these:

- The value of the `network` field should be `{{network}}` (without quotes).
- The value of the `source.address` field should be `"{{<data source name>.address}}"` (with quotes)
- The value of the `source.startBlock` field should be `{{<data source name>.startBlock}}`

For example, a data source named `BatchAuctionHouse` would start with the following:

```yaml
- kind: ethereum
  name: BatchAuctionHouse
  network: { { network } }
  source:
    abi: BatchAuctionHouse
    address: "{{BatchAuctionHouse.address}}"
    startBlock: { { BatchAuctionHouse.startBlock } }
```

The deployment scripts will complain if there are missing template values.

### Adding a New Chain

To define a new chain, add the chain name at the top-level of `networks.json`. Each data source should have a second-level key, followed by `address` and `startBlock`.

For example:

```json
{
  "blast-sepolia": {
    "AtomicAuctionHouse": {
      "address": "0xaa000000F812284225Ec15cDB90419C468921814",
      "startBlock": 4652072
    }
  },
  "arbitrum-sepolia": {
    "AtomicAuctionHouse": {
      "address": "0xAa000000c0F79193A7f3a76C9a0b8b905e901fea",
      "startBlock": 37149532
    }
  }
}
```

### Optional Deployments

Not all contracts and versions are guaranteed to be deployed across all of the available chains. For this reason, data sources defined in the `subgraph-template.yaml` file should be wrapped with the data source key.

For example, if a V2 of the AtomicAuctionHouse were to be released, but is not yet deployed on all chains, or may not be deployed on all chains, the following would be added:

```yaml
  {{#AtomicAuctionHouseV2}}
  - kind: ethereum
    name: AtomicAuctionHouseV2
    network: {{network}}
    source:
      abi: AtomicAuctionHouse
      address: "{{AtomicAuctionHouseV2.address}}"
      startBlock: {{AtomicAuctionHouseV2.startBlock}}
          file: ./src/atomicAuctionHouse.ts
    ...
  {{/AtomicAuctionHouseV2}}
```

If the value in `networks.json` for a particular chain does not exist (e.g. `blast-sepolia.AtomicAuctionHouseV2`), then the content wrapped by `{{#AtomicAuctionHouseV2}}...{{/AtomicAuctionHouseV2}}` will be removed.
