# Bitburner Scripts

Scripts for the game [Bitburner](https://bitburner.readthedocs.io/en/latest/)

## Quickstart

1. `npm install`
2. `npm run watch`
3. In the game, Options -> Remote API -> Connect
4. Edit scripts, they'll sync to the `home` server in Bitburner

## Notes

This is a pile of scripts crafted over time and not all of them are good or still in use. I'll tidy up sometime.

### why esbuild bundling?

it seemed fun

### `lib/env.ts`

To use some scripts that reach out into the outside world, you need to create `env.ts` and export constants with the secret values in them.

These are unique to each environment so it doesn't make sense to add a default for them to this repo.
