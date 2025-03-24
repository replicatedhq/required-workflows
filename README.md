# required-workflows
Common workflows required for some or all replicatedhq repos

## Workflows
* **pr-labels.yml**: Fails if a PR does not have the necessary labels for Engineering metrics, will apply primary labels if the PR title contains a semantic type, for example:
    * `feat(ci)`, `feature(ci)`: Adds `type::feature`
    * `bug(ci)`: Adds `type::bug`
    * `chore(ci)`: Adds `type::chore`

## Actions
Any custom actions related to these workflows reside in `.github/actions`.

JavaScript actions must have their `dist` folders rebuilt if changed. Run `npm run all` in the action folder before committing and pushing.

* **pr-labels**: Implements the PR label check logic as outlined in the wiki.
