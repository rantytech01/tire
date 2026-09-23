> [!IMPORTANT]
> Avoid rewriting published git history — force pushing, or rebasing/amending/squashing
> commits that are already pushed to `main` — since other tooling connected to this
> repository syncs from the pushed branch history and can lose track of prior state.
>
> Keep the `main` branch in a working state; commits pushed to it may be picked up
> and deployed automatically.
